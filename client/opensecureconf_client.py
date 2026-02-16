"""
OpenSecureConf Python Client - Enhanced Edition

A Python client library for interacting with the OpenSecureConf API,
which provides encrypted configuration management with clustering support.

Enhanced Features:
- Automatic retry logic with exponential backoff
- Cluster awareness (status, health)
- Connection pooling
- Structured logging
- Batch operations
- Enhanced input validation
- Health check utilities
- Support for multiple value types (dict, str, int, bool, list)
- Multi-environment support (same key in different environments)
- Environment-based configuration isolation
- **Real-time SSE event streaming with automatic reconnection**
"""

from typing import Any, Dict, List, Optional, Union, Callable, Awaitable
import logging
import time
import requests
import asyncio
import json

from requests.adapters import HTTPAdapter
from requests.exceptions import Timeout, RequestException
import requests
from urllib3.util.retry import Retry
from datetime import datetime
from dataclasses import dataclass, field

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

# ============================================================================
# EXCEPTIONS
# ============================================================================


class OpenSecureConfError(Exception):
    """Base exception for OpenSecureConf client errors."""


class AuthenticationError(OpenSecureConfError):
    """Raised when authentication fails (invalid or missing user key)."""


class ConfigurationNotFoundError(OpenSecureConfError):
    """Raised when a requested configuration key does not exist."""


class ConfigurationExistsError(OpenSecureConfError):
    """Raised when attempting to create a configuration that already exists."""


class ClusterError(OpenSecureConfError):
    """Raised when cluster operations fail."""

class SSEError(OpenSecureConfError):
    """Raised when SSE operations fail."""


class SSENotAvailableError(SSEError):
    """Raised when SSE functionality is not available (httpx not installed)."""


# ============================================================================
# SSE DATA CLASSES
# ============================================================================


@dataclass
class SSEEventData:
    """
    Represents a received SSE event with parsed data.
    
    Attributes:
        event_type: Type of event (connected, created, updated, deleted, sync)
        key: Configuration key that was affected (None for 'connected' events)
        environment: Environment where the change occurred (None for 'connected')
        category: Optional category of the configuration
        timestamp: When the event occurred (ISO 8601 format)
        node_id: Optional cluster node that originated the change
        data: Optional additional event-specific data
        subscription_id: Subscription ID (only for 'connected' events)
        raw_data: Raw JSON data from the event
    
    Example:
```python
        event = SSEEventData(
            event_type="updated",
            key="database",
            environment="production",
            category="config",
            timestamp="2026-02-15T10:30:00Z",
            node_id="node1:9000",
            data=None,
            subscription_id=None,
            raw_data={...}
        )
```
    """
    event_type: str
    key: Optional[str] = None
    environment: Optional[str] = None
    category: Optional[str] = None
    timestamp: Optional[str] = None
    node_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    subscription_id: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SSEStatistics:
    """
    Statistics for SSE connection and event tracking.
    
    Attributes:
        events_received: Total number of events received
        events_by_type: Count of events by type
        keepalives_received: Number of keep-alive messages
        reconnections: Number of reconnection attempts
        connected_at: When the connection was established
        last_event_at: When the last event was received
        errors: Number of errors encountered
    """
    events_received: int = 0
    events_by_type: Dict[str, int] = field(default_factory=lambda: {
        "connected": 0,
        "created": 0,
        "updated": 0,
        "deleted": 0,
        "sync": 0
    })
    keepalives_received: int = 0
    reconnections: int = 0
    connected_at: Optional[datetime] = None
    last_event_at: Optional[datetime] = None
    errors: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert statistics to dictionary for serialization."""
        return {
            "events_received": self.events_received,
            "events_by_type": dict(self.events_by_type),
            "keepalives_received": self.keepalives_received,
            "reconnections": self.reconnections,
            "connected_at": self.connected_at.isoformat() if self.connected_at else None,
            "last_event_at": self.last_event_at.isoformat() if self.last_event_at else None,
            "errors": self.errors,
            "uptime_seconds": (
                (datetime.now() - self.connected_at).total_seconds()
                if self.connected_at else 0
            )
        }


# ============================================================================
# SSE CLIENT
# ============================================================================


class SSEClient:
    """
    Asynchronous SSE client for real-time configuration change notifications.
    
    Connects to OpenSecureConf SSE endpoint and streams events in real-time.
    Supports automatic reconnection, event filtering, callbacks, and statistics.
    
    Features:
        - Granular filtering by key, environment, and category
        - Automatic reconnection with exponential backoff
        - Event callbacks for custom handling
        - Connection statistics and monitoring
        - Keep-alive handling
        - Proper timeout configuration
        - Context manager support
    
    Example:
```python
        import asyncio
        from opensecureconf_client import SSEClient
        
        async def on_event(event: SSEEventData):
            print(f"Config {event.key} {event.event_type} in {event.environment}")
        
        async def main():
            client = SSEClient(
                base_url="http://localhost:9000",
                api_key="your-api-key",
                environment="production",
                on_event=on_event
            )
            
            async with client:
                await client.connect()
        
        asyncio.run(main())
```
    """
    
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        key: Optional[str] = None,
        environment: Optional[str] = None,
        category: Optional[str] = None,
        on_event: Optional[Callable[[SSEEventData], Awaitable[None]]] = None,
        auto_reconnect: bool = True,
        max_reconnect_attempts: int = -1,  # -1 = infinite
        reconnect_delay: float = 5.0,
        reconnect_backoff: float = 2.0,
        max_reconnect_delay: float = 60.0,
        log_level: str = "INFO"
    ):
        """
        Initialize SSE client.
        
        Args:
            base_url: Base URL of OpenSecureConf API
            api_key: Optional API key for authentication
            key: Optional filter by specific configuration key
            environment: Optional filter by environment
            category: Optional filter by category
            on_event: Optional async callback for event handling
            auto_reconnect: Enable automatic reconnection on disconnect
            max_reconnect_attempts: Maximum reconnection attempts (-1 = infinite)
            reconnect_delay: Initial delay between reconnections (seconds)
            reconnect_backoff: Backoff multiplier for reconnection delay
            max_reconnect_delay: Maximum reconnection delay (seconds)
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
        Raises:
            SSENotAvailableError: If httpx library is not installed
        """
        if not HTTPX_AVAILABLE:
            raise SSENotAvailableError(
                "SSE functionality requires httpx. Install with: pip install httpx"
            )
        
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.filters = {
            "key": key,
            "environment": environment,
            "category": category
        }
        self.on_event = on_event
        self.auto_reconnect = auto_reconnect
        self.max_reconnect_attempts = max_reconnect_attempts
        self.reconnect_delay = reconnect_delay
        self.reconnect_backoff = reconnect_backoff
        self.max_reconnect_delay = max_reconnect_delay
        
        # Setup logging
        self.logger = logging.getLogger(f"{__name__}.SSE")
        self.logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        # State
        self.stats = SSEStatistics()
        self._client: Optional[httpx.AsyncClient] = None
        self._connection_task: Optional[asyncio.Task] = None
        self._is_running = False
        self._should_stop = False
        self._subscription_id: Optional[str] = None
        
        # Timeout configuration (infinite read for SSE)
        self._timeout = httpx.Timeout(
            connect=10.0,
            read=None,  # Infinite read timeout for SSE
            write=10.0,
            pool=None
        )
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._create_client()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
    
    async def _create_client(self):
        """Create httpx async client with proper configuration."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self._timeout)
            self.logger.debug("HTTP client created")
    
    async def connect(self) -> None:
        """
        Connect to SSE stream and start receiving events.
        
        This method starts a background task that maintains the SSE connection.
        If auto_reconnect is enabled, it will automatically reconnect on failure.
        
        Raises:
            SSEError: If connection fails and auto_reconnect is disabled
        
        Example:
```python
            async with client:
                await client.connect()
                # Keep running to receive events
                await asyncio.sleep(3600)
```
        """
        if self._is_running:
            self.logger.warning("SSE client is already connected")
            return
        
        await self._create_client()
        self._should_stop = False
        self._is_running = True
        
        # Start connection task
        self._connection_task = asyncio.create_task(self._connection_loop())
        self.logger.info("SSE connection started")
    
    async def disconnect(self) -> None:
        """
        Disconnect from SSE stream and cleanup resources.
        
        Stops the background connection task and closes the HTTP client.
        
        Example:
```python
            await client.disconnect()
```
        """
        self._should_stop = True
        self._is_running = False
        
        # Cancel connection task
        if self._connection_task and not self._connection_task.done():
            self._connection_task.cancel()
            try:
                await self._connection_task
            except asyncio.CancelledError:
                pass
        
        # Close HTTP client
        if self._client:
            await self._client.aclose()
            self._client = None
        
        self.logger.info("SSE connection closed")
    
    async def _connection_loop(self) -> None:
        """
        Main connection loop with automatic reconnection.
        
        Maintains SSE connection and handles reconnection with exponential backoff.
        """
        reconnect_attempts = 0
        current_delay = self.reconnect_delay
        
        while not self._should_stop:
            try:
                await self._listen()
                
                # Connection closed gracefully
                if self._should_stop:
                    break
                
                # Reset reconnection delay on successful connection
                reconnect_attempts = 0
                current_delay = self.reconnect_delay
                
            except asyncio.CancelledError:
                self.logger.info("Connection loop cancelled")
                break
            
            except Exception as e:
                self.stats.errors += 1
                self.logger.error(f"Connection error: {e}")
                
                if not self.auto_reconnect:
                    raise SSEError(f"SSE connection failed: {e}") from e
                
                # Check reconnection limit
                if self.max_reconnect_attempts >= 0 and reconnect_attempts >= self.max_reconnect_attempts:
                    self.logger.error(
                        f"Max reconnection attempts ({self.max_reconnect_attempts}) reached"
                    )
                    break
                
                # Reconnect with exponential backoff
                reconnect_attempts += 1
                self.stats.reconnections += 1
                
                self.logger.info(
                    f"Reconnecting in {current_delay:.1f}s (attempt {reconnect_attempts})"
                )
                await asyncio.sleep(current_delay)
                
                # Increase delay with backoff
                current_delay = min(
                    current_delay * self.reconnect_backoff,
                    self.max_reconnect_delay
                )
    
    async def _listen(self) -> None:
        """
        Establish SSE connection and process events.
        
        Connects to the SSE endpoint and processes incoming events until
        the connection is closed or an error occurs.
        """
        # Build request parameters
        params = {k: v for k, v in self.filters.items() if v is not None}
        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        
        url = f"{self.base_url}/sse/subscribe"
        
        self.logger.info(f"Connecting to SSE: {url}")
        self.logger.debug(f"Filters: {params}")
        
        async with self._client.stream(
            "GET",
            url,
            params=params,
            headers=headers
        ) as response:
            if response.status_code != 200:
                error_msg = f"SSE connection failed: HTTP {response.status_code}"
                self.logger.error(error_msg)
                raise SSEError(error_msg)
            
            self.stats.connected_at = datetime.now()
            self.logger.info("✅ Connected to SSE stream")
            
            current_event = None
            
            async for line in response.aiter_lines():
                if self._should_stop:
                    break
                
                # Parse SSE format
                if line.startswith("event: "):
                    current_event = line[7:].strip()
                
                elif line.startswith("data: "):
                    data_str = line[6:].strip()
                    await self._handle_event_data(current_event, data_str)
                    current_event = None
                
                elif line.startswith(": "):
                    # Keep-alive comment
                    self.stats.keepalives_received += 1
                    self.logger.debug(f"Keep-alive: {line[2:]}")
                
                elif line == "":
                    # Empty line separates messages
                    pass
    
    async def _handle_event_data(self, event_type: Optional[str], data_str: str) -> None:
        """
        Parse and handle event data from SSE stream.
        
        Args:
            event_type: Type of event (connected, created, updated, deleted, sync)
            data_str: JSON string containing event data
        """
        try:
            raw_data = json.loads(data_str)
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse event data: {e}")
            return
        
        # Update statistics
        self.stats.events_received += 1
        self.stats.last_event_at = datetime.now()
        if event_type:
            self.stats.events_by_type[event_type] = (
                self.stats.events_by_type.get(event_type, 0) + 1
            )
        
        # Parse event data
        event_data = SSEEventData(
            event_type=event_type or "unknown",
            key=raw_data.get("key"),
            environment=raw_data.get("environment"),
            category=raw_data.get("category"),
            timestamp=raw_data.get("timestamp"),
            node_id=raw_data.get("node_id"),
            data=raw_data.get("data"),
            subscription_id=raw_data.get("subscription_id"),
            raw_data=raw_data
        )
        
        # Log event
        if event_type == "connected":
            self._subscription_id = event_data.subscription_id
            self.logger.info(
                f"🔗 Connected - Subscription ID: {self._subscription_id}"
            )
            self.logger.debug(f"Filters: {raw_data.get('filters')}")
        else:
            icons = {
                "created": "✨",
                "updated": "🔄",
                "deleted": "🗑️",
                "sync": "🔄"
            }
            icon = icons.get(event_type, "📢")
            self.logger.info(
                f"{icon} {event_type.upper()}: {event_data.key}@{event_data.environment}"
            )
        
        # Call user callback
        if self.on_event:
            try:
                await self.on_event(event_data)
            except Exception as e:
                self.logger.error(f"Error in event callback: {e}")
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get SSE connection statistics.
        
        Returns:
            Dictionary with connection statistics including:
            - events_received: Total events received
            - events_by_type: Breakdown by event type
            - keepalives_received: Number of keep-alive messages
            - reconnections: Number of reconnection attempts
            - connected_at: Connection timestamp
            - last_event_at: Last event timestamp
            - uptime_seconds: Connection uptime
        
        Example:
```python
            stats = client.get_statistics()
            print(f"Events received: {stats['events_received']}")
            print(f"Uptime: {stats['uptime_seconds']:.0f}s")
```
        """
        return self.stats.to_dict()
    
    def is_connected(self) -> bool:
        """
        Check if SSE client is currently connected.
        
        Returns:
            True if connected and receiving events, False otherwise
        
        Example:
```python
            if client.is_connected():
                print("Receiving events")
```
        """
        return self._is_running and not self._should_stop
    
    def get_subscription_id(self) -> Optional[str]:
        """
        Get the current subscription ID.
        
        Returns:
            Subscription ID if connected, None otherwise
        
        Example:
```python
            sub_id = client.get_subscription_id()
            print(f"Subscription ID: {sub_id}")
```
        """
        return self._subscription_id





# ============================================================================
# CLIENT
# ============================================================================


class OpenSecureConfClient:
    """
    Enhanced client for interacting with the OpenSecureConf API.

    This client provides methods to create, read, update, delete, and list
    encrypted configuration entries stored in an OpenSecureConf service.

    Attributes:
        base_url (str): The base URL of the OpenSecureConf API server.
        user_key (str): The encryption key used for authentication and encryption/decryption.
        api_key (Optional[str]): Optional API key for additional authentication.
        timeout (int): Request timeout in seconds.
        logger (logging.Logger): Logger instance for debugging.

    Example:
        >>> client = OpenSecureConfClient(
        ...     base_url="http://localhost:9000",
        ...     user_key="my-secret-key-123",
        ...     api_key="optional-api-key",
        ...     enable_retry=True,
        ...     log_level="INFO"
        ... )
        >>> # Same key in different environments
        >>> prod_config = client.create("database", {"host": "db.prod.com", "port": 5432}, 
        ...                              "production", "config")
        >>> staging_config = client.create("database", {"host": "db.staging.com", "port": 5432}, 
        ...                                 "staging", "config")
        
    Example:
        >>> client = OpenSecureConfClient(
        ...     base_url="http://localhost:9000",
        ...     user_key="my-secret-key-123",
        ...     api_key="optional-api-key",
        ...     enable_retry=True,
        ...     log_level="INFO"
        ... )
        >>> # Same key in different environments
        >>> prod_config = client.create("database", {"host": "db.prod.com", "port": 5432}, 
        ...                              "production", "config")
        >>> staging_config = client.create("database", {"host": "db.staging.com", "port": 5432}, 
        ...                                 "staging", "config")
        >>> 
        >>> # Subscribe to real-time events
        >>> async def on_update(event):
        ...     print(f"Config updated: {event.key}")
        >>> 
        >>> sse_client = client.create_sse_client(
        ...     environment="production",
        ...     on_event=on_update
        ... )
        
    """

    def __init__(
        self,
        base_url: str,
        user_key: str,
        api_key: Optional[str] = None,
        timeout: int = 30,
        verify_ssl: bool = True,
        enable_retry: bool = True,
        max_retries: int = 3,
        backoff_factor: float = 1.0,
        pool_connections: int = 10,
        pool_maxsize: int = 20,
        log_level: str = "WARNING"
    ):
        """
        Initialize the OpenSecureConf client with enhanced features.

        Args:
            base_url: The base URL of the OpenSecureConf API (e.g., "http://localhost:9000")
            user_key: User encryption key for authentication (minimum 8 characters)
            api_key: Optional API key for additional authentication
            timeout: Request timeout in seconds (default: 30)
            verify_ssl: Whether to verify SSL certificates (default: True)
            enable_retry: Enable automatic retry with exponential backoff (default: True)
            max_retries: Maximum number of retries for failed requests (default: 3)
            backoff_factor: Backoff factor for retry delays (default: 1.0)
            pool_connections: Number of connection pools (default: 10)
            pool_maxsize: Maximum pool size (default: 20)
            log_level: Logging level (default: WARNING)

        Raises:
            ValueError: If user_key is shorter than 8 characters or invalid parameters
        """
        # Validation
        if len(user_key) < 8:
            raise ValueError("User key must be at least 8 characters long")
        if not base_url:
            raise ValueError("base_url cannot be empty")
        if timeout <= 0:
            raise ValueError("timeout must be positive")
        if max_retries < 0:
            raise ValueError("max_retries must be non-negative")

        # Configuration
        self.base_url = base_url.rstrip("/")
        self.user_key = user_key
        self.api_key = api_key
        self.timeout = timeout
        self.verify_ssl = verify_ssl

        # Setup logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(getattr(logging, log_level.upper(), logging.WARNING))
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)

        # Initialize session
        self._session = requests.Session()

        # Setup connection pooling
        adapter = HTTPAdapter(
            pool_connections=pool_connections,
            pool_maxsize=pool_maxsize
        )

        # Setup retry strategy if enabled
        if enable_retry:
            retry_strategy = Retry(
                total=max_retries,
                backoff_factor=backoff_factor,
                status_forcelist=[429, 500, 502, 503, 504],
                allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"]
            )
            adapter = HTTPAdapter(
                max_retries=retry_strategy,
                pool_connections=pool_connections,
                pool_maxsize=pool_maxsize
            )
            self.logger.info(f"Retry enabled: max_retries={max_retries}, backoff_factor={backoff_factor}")

        self._session.mount("http://", adapter)
        self._session.mount("https://", adapter)

        # Setup headers
        headers = {
            "x-user-key": self.user_key,
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        self._session.headers.update(headers)
        self.logger.info(f"Client initialized for {self.base_url}")

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Any:
        """
        Make an HTTP request to the API with error handling and logging.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            **kwargs: Additional arguments to pass to requests

        Returns:
            Response JSON data

        Raises:
            AuthenticationError: If authentication fails
            ConfigurationNotFoundError: If configuration not found
            ConfigurationExistsError: If configuration already exists
            OpenSecureConfError: For other API errors
            ConnectionError: If connection to server fails
        """
        url = f"{self.base_url}{endpoint}"
        kwargs.setdefault("timeout", self.timeout)
        kwargs.setdefault("verify", self.verify_ssl)

        start_time = time.time()
        self.logger.debug(f"{method} {url}")

        try:
            response = self._session.request(method, url, **kwargs)
            duration = time.time() - start_time
            self.logger.info(
                f"{method} {endpoint} - Status: {response.status_code} - Duration: {duration:.3f}s"
            )

            # Handle error responses
            if response.status_code == 401:
                self.logger.error("Authentication failed: invalid or missing user key")
                raise AuthenticationError(
                    "Authentication failed: invalid or missing user key"
                )

            if response.status_code == 403:
                self.logger.error("Forbidden: invalid API key")
                raise AuthenticationError("Forbidden: invalid API key")

            if response.status_code == 404:
                error_detail = response.json().get("detail", "Configuration not found")
                self.logger.warning(f"Not found: {error_detail}")
                raise ConfigurationNotFoundError(error_detail)

            if response.status_code == 400:
                error_detail = response.json().get("detail", "Bad request")
                if "already exists" in error_detail.lower():
                    self.logger.warning(f"Configuration exists: {error_detail}")
                    raise ConfigurationExistsError(error_detail)
                self.logger.error(f"Bad request: {error_detail}")
                raise OpenSecureConfError(f"Bad request: {error_detail}")

            if response.status_code >= 400:
                error_detail = response.json().get("detail", "Unknown error")
                self.logger.error(f"API error {response.status_code}: {error_detail}")
                raise OpenSecureConfError(
                    f"API error ({response.status_code}): {error_detail}"
                )

            # Handle successful responses
            if response.status_code == 204 or not response.content:
                return None

            return response.json()

        except (ConnectionError, Timeout) as e:
            self.logger.error(f"Connection error: {str(e)}")
            raise ConnectionError(
                f"Failed to connect to {self.base_url}: {str(e)}"
            ) from e
        except RequestException as e:
            self.logger.error(f"Request error: {str(e)}")
            raise OpenSecureConfError(f"Request failed: {str(e)}") from e
        except ValueError as e:
            self.logger.error(f"Invalid JSON response: {str(e)}")
            raise OpenSecureConfError(f"Invalid JSON response: {str(e)}") from e

    # ========================================================================
    # HEALTH & STATUS
    # ========================================================================

    def ping(self) -> bool:
        """
        Check if the API server is reachable and responding.

        Returns:
            True if server is healthy, False otherwise

        Example:
            >>> if client.ping():
            ...     print("Server is healthy")
        """
        try:
            self.get_service_info()
            self.logger.debug("Ping successful")
            return True
        except Exception as e:
            self.logger.warning(f"Ping failed: {str(e)}")
            return False

    def get_service_info(self) -> Dict[str, Any]:
        """
        Get information about the OpenSecureConf service.

        Returns:
            Dictionary containing service metadata and available endpoints

        Example:
            >>> info = client.get_service_info()
            >>> print(info["version"])
            2.2.0
        """
        return self._make_request("GET", "/")

    # ========================================================================
    # CLUSTER OPERATIONS
    # ========================================================================

    def get_cluster_status(self) -> Dict[str, Any]:
        """
        Get cluster status and node information.

        Returns:s
            Dictionary containing cluster status with fields:
            - enabled: Whether clustering is enabled
            - mode: Cluster mode (replica )
            - node_id: Current node identifier
            - total_nodes: Total number of nodes in cluster
            - healthy_nodes: Number of healthy nodes

        Raises:
            ClusterError: If cluster status cannot be retrieved

        Example:
            >>> status = client.get_cluster_status()
            >>> print(f"Cluster mode: {status['mode']}")
            >>> print(f"Healthy nodes: {status['healthy_nodes']}/{status['total_nodes']}")
        """
        try:
            return self._make_request("GET", "/cluster/status")
        except OpenSecureConfError as e:
            raise ClusterError(f"Failed to get cluster status: {str(e)}") from e

    def get_cluster_health(self) -> Dict[str, Any]:
        """
        Check cluster node health.

        Returns:
            Dictionary containing health status

        Example:
            >>> health = client.get_cluster_health()
            >>> print(health["status"])
            healthy
        """
        try:
            return self._make_request("GET", "/cluster/health")
        except OpenSecureConfError as e:
            raise ClusterError(f"Failed to check cluster health: {str(e)}") from e

    # ========================================================================
    # CONFIGURATION CRUD OPERATIONS
    # ========================================================================

    def create(
        self,
        key: str,
        value: Union[Dict[str, Any], str, int, bool, list],
        environment: str,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new encrypted configuration entry.

        Args:
            key: Configuration key (1-255 characters)
            value: Configuration data (dict, string, int, bool, or list - will be encrypted)
            environment: Environment identifier (REQUIRED, max 100 characters)
            category: Optional category for grouping (max 100 characters)

        Returns:
            Dictionary containing the created configuration with fields:
            - id: Configuration ID
            - key: Configuration key
            - value: Configuration value (decrypted)
            - environment: Environment identifier
            - category: Configuration category (if set)

        Raises:
            ConfigurationExistsError: If configuration (key, environment) already exists
            ValueError: If key or environment is invalid

        Example:
            >>> # Same key in different environments
            >>> prod_config = client.create("database", {"host": "db.prod.com", "port": 5432}, 
            ...                              "production", "config")
            >>> staging_config = client.create("database", {"host": "db.staging.com", "port": 5432}, 
            ...                                 "staging", "config")
            >>> # String value
            >>> client.create("api_token", "secret-123", "production", "auth")
            >>> # Integer value
            >>> client.create("max_retries", 3, "production")
            >>> # Boolean value
            >>> client.create("debug", False, "development", "settings")
        """
        # Enhanced validation
        if not key or not isinstance(key, str):
            raise ValueError("Key must be a non-empty string")
        if len(key) > 255:
            raise ValueError("Key must be between 1 and 255 characters")
        if not environment or not isinstance(environment, str):
            raise ValueError("Environment is required and must be a non-empty string")
        if len(environment) > 100:
            raise ValueError("Environment must be max 100 characters")
        if category and len(category) > 100:
            raise ValueError("Category must be max 100 characters")

        payload = {
            "key": key, 
            "value": value, 
            "environment": environment,
            "category": category
        }
        return self._make_request("POST", "/configs", json=payload)

    def read(self, key: str, environment: str) -> Dict[str, Any]:
        """
        Read and decrypt a configuration entry by key and environment.

        Args:
            key: Configuration key to retrieve
            environment: Environment identifier (REQUIRED)

        Returns:
            Dictionary containing the configuration with decrypted value
            The value can be dict, str, int, bool, or list depending on what was stored

        Raises:
            ConfigurationNotFoundError: If configuration (key, environment) does not exist
            ValueError: If key or environment is invalid

        Example:
            >>> prod_config = client.read("database", "production")
            >>> staging_config = client.read("database", "staging")
            >>> print(prod_config["value"])  # Different from staging
            >>> print(prod_config["environment"])  # "production"
        """
        if not key or not isinstance(key, str):
            raise ValueError("Key must be a non-empty string")
        if not environment or not isinstance(environment, str):
            raise ValueError("Environment is required and must be a non-empty string")

        params = {"environment": environment}
        return self._make_request("GET", f"/configs/{key}", params=params)

    def update(
        self,
        key: str,
        environment: str,
        value: Union[Dict[str, Any], str, int, bool, list],
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an existing configuration entry with new encrypted value.

        Args:
            key: Configuration key to update
            environment: Environment identifier (REQUIRED, cannot be changed)
            value: New configuration data (dict, string, int, bool, or list - will be encrypted)
            category: Optional new category

        Returns:
            Dictionary containing the updated configuration with decrypted value

        Raises:
            ConfigurationNotFoundError: If configuration (key, environment) does not exist
            ValueError: If key or environment is invalid

        Example:
            >>> # Update production config only
            >>> config = client.update("database", "production", 
            ...                        {"host": "db-new.prod.com", "port": 5432})
            >>> # Update with string and category
            >>> config = client.update("api_token", "staging", "new-token-456", "auth")
        """
        if not key or not isinstance(key, str):
            raise ValueError("Key must be a non-empty string")
        if not environment or not isinstance(environment, str):
            raise ValueError("Environment is required and must be a non-empty string")
        if category and len(category) > 100:
            raise ValueError("Category must be max 100 characters")

        payload = {"value": value, "category": category}
        params = {"environment": environment}
        return self._make_request("PUT", f"/configs/{key}", json=payload, params=params)

    def delete(self, key: str, environment: str) -> Dict[str, str]:
        """
        Delete a configuration entry permanently from specific environment.

        Args:
            key: Configuration key to delete
            environment: Environment identifier (REQUIRED)

        Returns:
            Dictionary with success message

        Raises:
            ConfigurationNotFoundError: If configuration (key, environment) does not exist
            ValueError: If key or environment is invalid

        Example:
            >>> # Delete from staging only
            >>> result = client.delete("database", "staging")
            >>> # Production and development environments remain untouched
            >>> print(result["message"])
            Configuration 'database' deleted successfully
        """
        if not key or not isinstance(key, str):
            raise ValueError("Key must be a non-empty string")
        if not environment or not isinstance(environment, str):
            raise ValueError("Environment is required and must be a non-empty string")

        params = {"environment": environment}
        return self._make_request("DELETE", f"/configs/{key}", params=params)

    def list_all(self, category: Optional[str] = None, environment: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all configurations with optional category and environment filters.
        All values are automatically decrypted.

        Args:
            category: Optional filter by category
            environment: Optional filter by environment

        Returns:
            List of configuration dictionaries with decrypted values
            Each value can be dict, str, int, bool, or list

        Example:
            >>> # List all
            >>> configs = client.list_all()
            >>> # Filter by environment
            >>> prod_configs = client.list_all(environment="production")
            >>> # Filter by category
            >>> db_configs = client.list_all(category="database")
            >>> # Filter by both
            >>> configs = client.list_all(category="database", environment="production")
        """
        params = {}
        if category:
            params["category"] = category
        if environment:
            params["environment"] = environment

        return self._make_request("GET", "/configs", params=params)

    # ========================================================================
    # BATCH OPERATIONS
    # ========================================================================

    def bulk_create(
        self,
        configs: List[Dict[str, Any]],
        ignore_errors: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Create multiple configurations in batch.

        Args:
            configs: List of configuration dictionaries with 'key', 'value', 
                    'environment' (REQUIRED), and optional 'category'
                    Value can be dict, str, int, bool, or list
            ignore_errors: If True, continue on errors and return partial results

        Returns:
            List of created configuration dictionaries

        Raises:
            ValueError: If configs format is invalid or environment is missing
            OpenSecureConfError: If creation fails and ignore_errors is False

        Example:
            >>> configs = [
            ...     {"key": "db", "value": {"host": "localhost"}, 
            ...      "environment": "production", "category": "config"},
            ...     {"key": "db", "value": {"host": "localhost"}, 
            ...      "environment": "staging", "category": "config"},
            ...     {"key": "token", "value": "secret-123", 
            ...      "environment": "production", "category": "auth"}
            ... ]
            >>> results = client.bulk_create(configs)
            >>> print(f"Created {len(results)} configurations")
        """
        if not isinstance(configs, list):
            raise ValueError("configs must be a list")

        results = []
        errors = []

        for i, config in enumerate(configs):
            if not isinstance(config, dict):
                raise ValueError(f"Config at index {i} must be a dictionary")
            if "key" not in config or "value" not in config:
                raise ValueError(f"Config at index {i} missing required 'key' or 'value'")
            if "environment" not in config:
                raise ValueError(f"Config at index {i} missing required 'environment'")

            try:
                result = self.create(
                    key=config["key"],
                    value=config["value"],
                    environment=config["environment"],
                    category=config.get("category")
                )
                results.append(result)
                self.logger.info(
                    f"Bulk create: created '{config['key']}' in '{config['environment']}'"
                )
            except Exception as e:
                error_msg = f"Failed to create '{config['key']}' in '{config['environment']}': {str(e)}"
                self.logger.error(error_msg)
                errors.append({
                    "key": config["key"], 
                    "environment": config["environment"],
                    "error": str(e)
                })
                if not ignore_errors:
                    raise OpenSecureConfError(error_msg) from e

        if errors:
            self.logger.warning(f"Bulk create completed with {len(errors)} errors")

        return results

    def bulk_read(
        self,
        items: List[Dict[str, str]],
        ignore_errors: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Read multiple configurations in batch.

        Args:
            items: List of dictionaries with 'key' and 'environment' fields
            ignore_errors: If True, skip missing keys and return partial results

        Returns:
            List of configuration dictionaries

        Raises:
            ValueError: If items format is invalid

        Example:
            >>> items = [
            ...     {"key": "database", "environment": "production"},
            ...     {"key": "database", "environment": "staging"},
            ...     {"key": "api_token", "environment": "production"}
            ... ]
            >>> configs = client.bulk_read(items)
            >>> print(f"Retrieved {len(configs)} configurations")
        """
        if not isinstance(items, list):
            raise ValueError("items must be a list")

        results = []
        errors = []

        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"Item at index {i} must be a dictionary")
            if "key" not in item or "environment" not in item:
                raise ValueError(f"Item at index {i} missing required 'key' or 'environment'")

            try:
                result = self.read(item["key"], item["environment"])
                results.append(result)
            except ConfigurationNotFoundError as e:
                self.logger.warning(
                    f"Bulk read: key '{item['key']}' not found in '{item['environment']}'"
                )
                errors.append({
                    "key": item["key"],
                    "environment": item["environment"],
                    "error": str(e)
                })
                if not ignore_errors:
                    raise
            except Exception as e:
                self.logger.error(
                    f"Bulk read: failed to read '{item['key']}' from '{item['environment']}': {str(e)}"
                )
                errors.append({
                    "key": item["key"],
                    "environment": item["environment"],
                    "error": str(e)
                })
                if not ignore_errors:
                    raise

        return results

    def bulk_delete(
        self,
        items: List[Dict[str, str]],
        ignore_errors: bool = False
    ) -> Dict[str, Any]:
        """
        Delete multiple configurations in batch.

        Args:
            items: List of dictionaries with 'key' and 'environment' fields
            ignore_errors: If True, continue on errors

        Returns:
            Dictionary with summary: {
                "deleted": [{"key": "...", "environment": "..."}],
                "failed": [{"key": "...", "environment": "...", "error": "..."}]
            }

        Raises:
            ValueError: If items format is invalid

        Example:
            >>> items = [
            ...     {"key": "temp1", "environment": "staging"},
            ...     {"key": "temp2", "environment": "staging"},
            ...     {"key": "temp3", "environment": "development"}
            ... ]
            >>> result = client.bulk_delete(items)
            >>> print(f"Deleted: {len(result['deleted'])}, Failed: {len(result['failed'])}")
        """
        if not isinstance(items, list):
            raise ValueError("items must be a list")

        deleted = []
        failed = []

        for i, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"Item at index {i} must be a dictionary")
            if "key" not in item or "environment" not in item:
                raise ValueError(f"Item at index {i} missing required 'key' or 'environment'")

            try:
                self.delete(item["key"], item["environment"])
                deleted.append({"key": item["key"], "environment": item["environment"]})
                self.logger.info(
                    f"Bulk delete: deleted '{item['key']}' from '{item['environment']}'"
                )
            except Exception as e:
                self.logger.error(
                    f"Bulk delete: failed to delete '{item['key']}' from '{item['environment']}': {str(e)}"
                )
                failed.append({
                    "key": item["key"],
                    "environment": item["environment"],
                    "error": str(e)
                })
                if not ignore_errors:
                    raise

        return {"deleted": deleted, "failed": failed}

    # ========================================================================
    # UTILITY METHODS
    # ========================================================================

    def exists(self, key: str, environment: str) -> bool:
        """
        Check if a configuration key exists in specific environment.

        Args:
            key: Configuration key to check
            environment: Environment identifier (REQUIRED)

        Returns:
            True if key exists in the specified environment, False otherwise

        Example:
            >>> if client.exists("database", "production"):
            ...     print("Configuration exists in production")
            >>> if not client.exists("database", "development"):
            ...     print("Configuration does not exist in development")
        """
        try:
            self.read(key, environment)
            return True
        except ConfigurationNotFoundError:
            return False

    def get_or_default(
        self,
        key: str,
        environment: str,
        default: Union[Dict[str, Any], str, int, bool, list]
    ) -> Dict[str, Any]:
        """
        Get configuration value or return default if not found.

        Args:
            key: Configuration key to retrieve
            environment: Environment identifier (REQUIRED)
            default: Default value to return if key not found (any supported type)

        Returns:
            Configuration dictionary or default value wrapped in dict format

        Example:
            >>> # Dict default
            >>> config = client.get_or_default(
            ...     "database", "production", {"host": "localhost", "port": 5432}
            ... )
            >>> # String default
            >>> config = client.get_or_default("token", "staging", "default-token")
        """
        try:
            return self.read(key, environment)
        except ConfigurationNotFoundError:
            return {
                "key": key,
                "value": default,
                "environment": environment,
                "category": None
            }

    def count(self, category: Optional[str] = None, environment: Optional[str] = None) -> int:
        """
        Count total configurations, optionally filtered by category and/or environment.

        Args:
            category: Optional category filter
            environment: Optional environment filter

        Returns:
            Number of configurations

        Example:
            >>> total = client.count()
            >>> prod_count = client.count(environment="production")
            >>> db_prod_count = client.count(category="database", environment="production")
        """
        configs = self.list_all(category=category, environment=environment)
        return len(configs)

    def list_categories(self) -> List[str]:
        """
        Get list of all unique categories.

        Returns:
            List of category names

        Example:
            >>> categories = client.list_categories()
            >>> print(f"Categories: {', '.join(categories)}")
        """
        configs = self.list_all()
        categories = set()
        for config in configs:
            cat = config.get("category")
            if cat:
                categories.add(cat)
        return sorted(list(categories))

    def list_environments(self) -> List[str]:
        """
        Get list of all unique environments.

        Returns:
            List of environment names

        Example:
            >>> environments = client.list_environments()
            >>> print(f"Environments: {', '.join(environments)}")
            Environments: development, production, staging
        """
        configs = self.list_all()
        environments = set()
        for config in configs:
            env = config.get("environment")
            if env:
                environments.add(env)
        return sorted(list(environments))

    # ========================================================================
    # SESSION MANAGEMENT
    # ========================================================================

    def close(self):
        """
        Close the underlying HTTP session.
        Should be called when the client is no longer needed to free resources.

        Example:
            >>> client.close()
        """
        self._session.close()
        self.logger.info("Client session closed")

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - automatically closes session."""
        self.close()

    def __repr__(self):
        """String representation of client."""
        return f"OpenSecureConfClient(base_url='{self.base_url}')"

# ========================================================================
    # SSE METHODS (NEW)
    # ========================================================================

    def create_sse_client(
        self,
        key: Optional[str] = None,
        environment: Optional[str] = None,
        category: Optional[str] = None,
        on_event: Optional[Callable[[SSEEventData], Awaitable[None]]] = None,
        auto_reconnect: bool = True,
        max_reconnect_attempts: int = -1,
        log_level: Optional[str] = None
    ) -> SSEClient:
        """
        Create an SSE client for real-time configuration change notifications.
        
        The SSE client connects to the server's SSE endpoint and receives
        events when configurations are created, updated, or deleted. Events
        can be filtered by key, environment, and category.
        
        Args:
            key: Optional filter by specific configuration key
            environment: Optional filter by environment
            category: Optional filter by category
            on_event: Optional async callback function for event handling
            auto_reconnect: Enable automatic reconnection on disconnect
            max_reconnect_attempts: Maximum reconnection attempts (-1 = infinite)
            log_level: Optional logging level (inherits from client if not specified)
        
        Returns:
            SSEClient instance ready to connect
        
        Raises:
            SSENotAvailableError: If httpx library is not installed
        
        Example:
```python
            import asyncio
            
            # Define event handler
            async def on_config_change(event: SSEEventData):
                print(f"Event: {event.event_type}")
                print(f"Key: {event.key}@{event.environment}")
                
                if event.event_type == "updated":
                    # Reload configuration
                    config = client.read(event.key, event.environment)
                    print(f"New value: {config['value']}")
            
            # Create SSE client
            sse = client.create_sse_client(
                environment="production",
                on_event=on_config_change
            )
            
            # Connect and listen
            async def main():
                async with sse:
                    await sse.connect()
                    # Keep running to receive events
                    await asyncio.sleep(3600)
            
            asyncio.run(main())
```
        
        Filter Examples:
```python
            # Subscribe to all events
            sse = client.create_sse_client()
            
            # Subscribe to production events only
            sse = client.create_sse_client(environment="production")
            
            # Subscribe to specific key in staging
            sse = client.create_sse_client(
                key="database",
                environment="staging"
            )
            
            # Subscribe to all database configurations
            sse = client.create_sse_client(category="database")
            
            # Subscribe to specific key + category
            sse = client.create_sse_client(
                key="api_token",
                category="auth",
                environment="production"
            )
```
        """
        return SSEClient(
            base_url=self.base_url,
            api_key=self.api_key,
            key=key,
            environment=environment,
            category=category,
            on_event=on_event,
            auto_reconnect=auto_reconnect,
            max_reconnect_attempts=max_reconnect_attempts,
            log_level=log_level or self.logger.level
        )


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "OpenSecureConfClient",
    "SSEClient",
    "SSEEventData",
    "SSEStatistics",
    "OpenSecureConfError",
    "AuthenticationError",
    "ConfigurationNotFoundError",
    "ConfigurationExistsError",
    "ClusterError",
    "SSEError",
    "SSENotAvailableError",
]
