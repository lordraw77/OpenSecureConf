# server/core/sse_manager.py
# pylint: disable=broad-except
# pylint: disable=unused-argument
# pylint: disable=line-too-long
# pylint: disable=unused-variable
# pylint: disable=unused-import
# pylint: disable=consider-using-with
# pylint: disable=no-else-return
# pylint: disable=too-many-instance-attributes
# pylint: disable=too-many-arguments
# pylint: disable=too-many-positional-arguments
# pylint: disable=redefined-outer-name
# pylint: disable=global-statement
# pylint: disable=import-error
# pylint: disable=pointless-string-statement
# pylint: disable=invalid-name
# pylint: disable=ungrouped-imports
import asyncio
import uuid
from typing import Dict, Set, Optional
from collections import defaultdict
from datetime import datetime
from dataclasses import dataclass, field
import logging

try:
    from prometheus_client import Counter, Gauge, Histogram
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

from core.models import SSESubscription, SSEEvent, SSEEventType

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@dataclass
class SSEStatistics:
    """
    Comprehensive statistics for SSE operations.
    
    Tracks subscription lifecycle, event delivery, connection health,
    and performance metrics for monitoring and debugging.
    """
    # Subscription metrics
    total_subscriptions_created: int = 0
    active_subscriptions: int = 0
    total_subscriptions_closed: int = 0
    
    # Event delivery metrics
    events_sent_by_type: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    total_events_sent: int = 0
    events_dropped_queue_full: int = 0
    
    # Connection health metrics
    keepalive_sent: int = 0
    disconnections_detected: int = 0
    
    # Performance metrics
    average_subscription_duration_seconds: float = 0.0
    max_queue_size_reached: int = 0
    
    # Subscription breakdown
    subscriptions_by_key: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    subscriptions_by_environment: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    subscriptions_by_category: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    subscriptions_wildcard: int = 0  # No filters
    
    # Timing metrics
    last_event_sent_at: Optional[datetime] = None
    last_subscription_created_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        """Convert statistics to dictionary for API responses."""
        return {
            "subscriptions": {
                "total_created": self.total_subscriptions_created,
                "active": self.active_subscriptions,
                "closed": self.total_subscriptions_closed,
                "wildcard": self.subscriptions_wildcard,
                "by_key": dict(self.subscriptions_by_key),
                "by_environment": dict(self.subscriptions_by_environment),
                "by_category": dict(self.subscriptions_by_category),
                "last_created_at": self.last_subscription_created_at.isoformat() if self.last_subscription_created_at else None
            },
            "events": {
                "total_sent": self.total_events_sent,
                "by_type": dict(self.events_sent_by_type),
                "dropped_queue_full": self.events_dropped_queue_full,
                "last_sent_at": self.last_event_sent_at.isoformat() if self.last_event_sent_at else None
            },
            "connection_health": {
                "keepalive_sent": self.keepalive_sent,
                "disconnections_detected": self.disconnections_detected
            },
            "performance": {
                "average_subscription_duration_seconds": round(self.average_subscription_duration_seconds, 2),
                "max_queue_size_reached": self.max_queue_size_reached
            }
        }


class SSEManager:
    """
    Manages Server-Sent Events (SSE) subscriptions and event broadcasting.
    
    This manager handles real-time configuration change notifications to subscribed
    clients using the SSE protocol. It supports fine-grained filtering by key,
    environment, and category, with efficient indexing for fast event routing.
    
    Features:
        - Granular subscription filters (key, environment, category, combinations)
        - Efficient event routing using multiple indices
        - Automatic connection management and cleanup
        - Queue overflow protection with configurable limits
        - Keep-alive mechanism for connection stability
        - Comprehensive statistics and Prometheus metrics
        - Thread-safe operations with asyncio locks
    
    Architecture:
        - Subscriptions stored in a dict with unique IDs
        - Three index dictionaries for O(1) lookup by key/env/category
        - Per-subscription asyncio.Queue for event buffering
        - Background cleanup and statistics tracking
    
    Example:
```python
        # Create manager instance
        manager = SSEManager(metrics_registry=REGISTRY)
        
        # Subscribe to production database changes
        sub_id, queue = await manager.subscribe(
            key="database",
            environment="production"
        )
        
        # Broadcast event
        await manager.broadcast_event(
            event_type=SSEEventType.UPDATED,
            key="database",
            environment="production",
            category="config"
        )
        
        # Get statistics
        stats = await manager.get_stats()
```
    """
    
    def __init__(
        self,
        max_queue_size: int = 100,
        keepalive_interval: int = 30,
        metrics_registry=None
    ):
        """
        Initialize the SSE manager.
        
        Args:
            max_queue_size: Maximum events to buffer per subscription queue
            keepalive_interval: Seconds between keep-alive messages
            metrics_registry: Optional Prometheus registry for metrics
        """
        # Subscription storage
        # Format: {subscription_id: (queue, subscription_info, created_at)}
        self.subscriptions: Dict[str, tuple[asyncio.Queue, SSESubscription, datetime]] = {}
        
        # Indices for fast lookup
        self.by_key: Dict[str, Set[str]] = defaultdict(set)
        self.by_environment: Dict[str, Set[str]] = defaultdict(set)
        self.by_category: Dict[str, Set[str]] = defaultdict(set)
        
        # Configuration
        self.max_queue_size = max_queue_size
        self.keepalive_interval = keepalive_interval
        
        # Statistics
        self.stats = SSEStatistics()
        self._stats_lock = asyncio.Lock()
        
        # Thread safety
        self._lock = asyncio.Lock()
        
        # Prometheus metrics
        self._setup_metrics(metrics_registry)
    
    def _setup_metrics(self, registry):
        """
        Initialize Prometheus metrics for monitoring.
        
        Creates counters, gauges, and histograms for tracking SSE operations.
        Metrics are registered with the provided Prometheus registry.
        """
        if not PROMETHEUS_AVAILABLE or registry is None:
            self.metrics_enabled = False
            return
        
        self.metrics_enabled = True
        
        try:
            # Subscription metrics
            self.metric_active_subscriptions = Gauge(
                'sse_active_subscriptions',
                'Number of active SSE subscriptions',
                registry=registry
            )
            
            self.metric_subscriptions_total = Counter(
                'sse_subscriptions_total',
                'Total SSE subscriptions created',
                registry=registry
            )
            
            self.metric_subscriptions_closed = Counter(
                'sse_subscriptions_closed_total',
                'Total SSE subscriptions closed',
                registry=registry
            )
            
            # Event metrics
            self.metric_events_sent = Counter(
                'sse_events_sent_total',
                'Total SSE events sent',
                ['event_type'],
                registry=registry
            )
            
            self.metric_events_dropped = Counter(
                'sse_events_dropped_total',
                'Total SSE events dropped due to full queue',
                registry=registry
            )
            
            # Connection metrics
            self.metric_keepalive_sent = Counter(
                'sse_keepalive_sent_total',
                'Total keep-alive messages sent',
                registry=registry
            )
            
            self.metric_disconnections = Counter(
                'sse_disconnections_total',
                'Total client disconnections detected',
                registry=registry
            )
            
            # Performance metrics
            self.metric_subscription_duration = Histogram(
                'sse_subscription_duration_seconds',
                'Duration of SSE subscriptions in seconds',
                registry=registry
            )
            
            self.metric_queue_size = Gauge(
                'sse_queue_size',
                'Current queue size for subscriptions',
                ['subscription_id'],
                registry=registry
            )
            
        except Exception as e:
            logger.warning(f"Failed to initialize Prometheus metrics: {e}")
            self.metrics_enabled = False
    
    async def subscribe(
        self,
        key: Optional[str] = None,
        environment: Optional[str] = None,
        category: Optional[str] = None
    ) -> tuple[str, asyncio.Queue]:
        """
        Create a new SSE subscription with optional filters.
        
        Subscriptions can filter events by key, environment, category, or any
        combination. If no filters are provided, all events are received.
        
        Args:
            key: Filter events for this specific configuration key
            environment: Filter events for this environment (e.g., "production")
            category: Filter events for this category (e.g., "database")
        
        Returns:
            Tuple of (subscription_id, event_queue):
                - subscription_id: Unique identifier for this subscription
                - event_queue: asyncio.Queue to receive SSEEvent objects
        
        Example:
```python
            # Subscribe to all production events
            sub_id, queue = await manager.subscribe(environment="production")
            
            # Subscribe to specific key in staging
            sub_id, queue = await manager.subscribe(
                key="api_token",
                environment="staging"
            )
            
            # Subscribe to all database configs
            sub_id, queue = await manager.subscribe(category="database")
```
        """
        subscription_id = str(uuid.uuid4())
        queue = asyncio.Queue(maxsize=self.max_queue_size)
        created_at = datetime.now()
        
        subscription = SSESubscription(
            subscription_id=subscription_id,
            key=key,
            environment=environment,
            category=category
        )
        
        async with self._lock:
            self.subscriptions[subscription_id] = (queue, subscription, created_at)
            
            # Update indices
            if key:
                self.by_key[key].add(subscription_id)
            if environment:
                self.by_environment[environment].add(subscription_id)
            if category:
                self.by_category[category].add(subscription_id)
        
        # Update statistics
        async with self._stats_lock:
            self.stats.total_subscriptions_created += 1
            self.stats.active_subscriptions += 1
            self.stats.last_subscription_created_at = created_at
            
            if key:
                self.stats.subscriptions_by_key[key] += 1
            if environment:
                self.stats.subscriptions_by_environment[environment] += 1
            if category:
                self.stats.subscriptions_by_category[category] += 1
            if not key and not environment and not category:
                self.stats.subscriptions_wildcard += 1
        
        # Update Prometheus metrics
        if self.metrics_enabled:
            self.metric_subscriptions_total.inc()
            self.metric_active_subscriptions.set(self.stats.active_subscriptions)
        
        logger.info(
            f"New SSE subscription: {subscription_id} "
            f"(key={key}, env={environment}, cat={category})"
        )
        # logger.info(f"New SSE subscription: {subscription_id}",  subscription_id=subscription_id, key=key, environment=environment, category=category)
        

        return subscription_id, queue
    
    async def unsubscribe(self, subscription_id: str):
        """
        Remove an SSE subscription and clean up resources.
        
        Called automatically when a client disconnects or explicitly closes
        the connection. Updates indices, statistics, and Prometheus metrics.
        
        Args:
            subscription_id: Unique identifier of the subscription to remove
        
        Example:
```python
            await manager.unsubscribe(subscription_id)
```
        """
        async with self._lock:
            if subscription_id not in self.subscriptions:
                return
            
            _, subscription, created_at = self.subscriptions[subscription_id]
            
            # Calculate subscription duration
            duration = (datetime.now() - created_at).total_seconds()
            
            # Remove from indices
            if subscription.key:
                self.by_key[subscription.key].discard(subscription_id)
                if not self.by_key[subscription.key]:
                    del self.by_key[subscription.key]
            
            if subscription.environment:
                self.by_environment[subscription.environment].discard(subscription_id)
                if not self.by_environment[subscription.environment]:
                    del self.by_environment[subscription.environment]
            
            if subscription.category:
                self.by_category[subscription.category].discard(subscription_id)
                if not self.by_category[subscription.category]:
                    del self.by_category[subscription.category]
            
            # Remove subscription
            del self.subscriptions[subscription_id]
        
        # Update statistics
        async with self._stats_lock:
            self.stats.active_subscriptions -= 1
            self.stats.total_subscriptions_closed += 1
            
            if subscription.key:
                self.stats.subscriptions_by_key[subscription.key] -= 1
            if subscription.environment:
                self.stats.subscriptions_by_environment[subscription.environment] -= 1
            if subscription.category:
                self.stats.subscriptions_by_category[subscription.category] -= 1
            if not subscription.key and not subscription.environment and not subscription.category:
                self.stats.subscriptions_wildcard -= 1
            
            # Update average duration
            total_duration = (
                self.stats.average_subscription_duration_seconds * 
                self.stats.total_subscriptions_closed
            )
            self.stats.average_subscription_duration_seconds = (
                total_duration / self.stats.total_subscriptions_closed
                if self.stats.total_subscriptions_closed > 0 else 0
            )
        
        # Update Prometheus metrics
        if self.metrics_enabled:
            self.metric_subscriptions_closed.inc()
            self.metric_active_subscriptions.set(self.stats.active_subscriptions)
            self.metric_subscription_duration.observe(duration)
        
        logger.info(
            f"SSE subscription removed: {subscription_id} "
            f"(duration={duration:.2f}s)"
        )
    
    async def broadcast_event(
        self,
        event_type: SSEEventType,
        key: str,
        environment: str,
        category: Optional[str] = None,
        data: Optional[dict] = None,
        node_id: Optional[str] = None
    ):
        """
        Broadcast an event to all matching subscriptions.
        
        Events are routed only to subscriptions whose filters match the event
        attributes. Uses efficient indexing for O(1) lookup performance.
        
        Args:
            event_type: Type of event (CREATED, UPDATED, DELETED, SYNC)
            key: Configuration key that changed
            environment: Environment where the change occurred
            category: Optional category of the configuration
            data: Optional additional data to include in the event
            node_id: Optional cluster node ID that originated the change
        
        Raises:
            Does not raise exceptions - logs warnings for full queues
        
        Example:
```python
            await manager.broadcast_event(
                event_type=SSEEventType.UPDATED,
                key="database_url",
                environment="production",
                category="database",
                data={"changed_fields": ["host", "port"]}
            )
```
        """
        event = SSEEvent(
            event_type=event_type,
            key=key,
            environment=environment,
            category=category,
            timestamp=datetime.now(),
            node_id=node_id,
            data=data
        )
        
        # Find matching subscriptions using indices
        matching_ids = self._find_matching_subscriptions(key, environment, category)
        
        sent_count = 0
        dropped_count = 0
        
        async with self._lock:
            for sub_id in matching_ids:
                if sub_id not in self.subscriptions:
                    continue
                
                queue, _, _ = self.subscriptions[sub_id]
                
                try:
                    queue.put_nowait(event)
                    sent_count += 1
                    
                    # Track max queue size
                    queue_size = queue.qsize()
                    if self.metrics_enabled:
                        self.metric_queue_size.labels(subscription_id=sub_id).set(queue_size)
                    
                except asyncio.QueueFull:
                    dropped_count += 1
                    logger.warning(
                        f"Queue full for subscription {sub_id}, dropping event "
                        f"(type={event_type}, key={key}, env={environment})"
                    )
        
        # Update statistics
        if sent_count > 0 or dropped_count > 0:
            async with self._stats_lock:
                self.stats.total_events_sent += sent_count
                self.stats.events_sent_by_type[event_type] += sent_count
                self.stats.events_dropped_queue_full += dropped_count
                self.stats.last_event_sent_at = datetime.now()
                
                # Track max queue size reached
                if dropped_count > 0:
                    self.stats.max_queue_size_reached = max(
                        self.stats.max_queue_size_reached,
                        self.max_queue_size
                    )
            
            # Update Prometheus metrics
            if self.metrics_enabled:
                self.metric_events_sent.labels(event_type=event_type).inc(sent_count)
                if dropped_count > 0:
                    self.metric_events_dropped.inc(dropped_count)
            
            logger.debug(
                f"Broadcast {event_type} event for {key}@{environment} "
                f"(sent={sent_count}, dropped={dropped_count})"
            )
    
    def _find_matching_subscriptions(
        self,
        key: str,
        environment: str,
        category: Optional[str]
    ) -> Set[str]:
        """
        Find subscription IDs that match the given event attributes.
        
        Uses index lookups for efficient O(1) performance. A subscription matches
        if all its filters (key, environment, category) match the event, or if
        the subscription has no filters (wildcard).
        
        Args:
            key: Event key to match
            environment: Event environment to match
            category: Optional event category to match
        
        Returns:
            Set of subscription IDs that should receive this event
        """
        matching = set()
        
        # Check all subscriptions for matches
        for sub_id, (_, subscription, _) in self.subscriptions.items():
            if subscription.matches(key, environment, category):
                matching.add(sub_id)
        
        return matching
    
    async def send_keepalive(self, subscription_id: str):
        """
        Send a keep-alive event to maintain connection.
        
        Called periodically by the SSE endpoint to prevent connection timeouts.
        Updates statistics and Prometheus metrics.
        
        Args:
            subscription_id: Subscription to send keep-alive to
        """
        async with self._stats_lock:
            self.stats.keepalive_sent += 1
        
        if self.metrics_enabled:
            self.metric_keepalive_sent.inc()
    
    async def record_disconnection(self):
        """
        Record a client disconnection event.
        
        Called when a client connection is detected as closed. Updates
        statistics and Prometheus metrics for monitoring.
        """
        async with self._stats_lock:
            self.stats.disconnections_detected += 1
        
        if self.metrics_enabled:
            self.metric_disconnections.inc()
    
    async def get_stats(self) -> dict:
        """
        Get comprehensive SSE statistics.
        
        Returns detailed metrics about subscriptions, events, connection health,
        and performance. Useful for monitoring dashboards and debugging.
        
        Returns:
            Dictionary containing:
                - subscriptions: Active/total/closed counts, breakdowns by filter
                - events: Total sent, by type, dropped events
                - connection_health: Keep-alives, disconnections
                - performance: Average duration, max queue size
        
        Example:
```python
            stats = await manager.get_stats()
            print(f"Active subscriptions: {stats['subscriptions']['active']}")
            print(f"Events sent: {stats['events']['total_sent']}")
```
        """
        async with self._stats_lock:
            return self.stats.to_dict()

    async def get_subscription_details(self) -> list[dict]:
        """
        Get detailed information about each active subscription.
        
        Returns:
            List of dictionaries with subscription details:
                - subscription_id
                - filters (key, environment, category)
                - created_at
                - duration_seconds
                - queue_size
        
        Example:
```python
            details = await manager.get_subscription_details()
            for sub in details:
                print(f"{sub['subscription_id']}: {sub['filters']}")
```
        """
        details = []
        now = datetime.now()

        async with self._lock:
            for sub_id, (queue, subscription, created_at) in self.subscriptions.items():
                duration = (now - created_at).total_seconds()
                details.append({
                    "subscription_id": sub_id,
                    "filters": {
                        "key": subscription.key,
                        "environment": subscription.environment,
                        "category": subscription.category
                    },
                    "created_at": created_at.isoformat(),
                    "duration_seconds": round(duration, 2),
                    "queue_size": queue.qsize(),
                    "queue_max_size": self.max_queue_size
                })

        return details


# Global singleton instance
sse_manager = SSEManager()