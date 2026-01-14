"""
OpenSecureConf Python Client

A Python client library for interacting with the OpenSecureConf API,
which provides encrypted configuration management with multithreading support.
"""

from typing import Any, Dict, List, Optional

import requests
from requests.exceptions import Timeout


class OpenSecureConfError(Exception):
    """Base exception for OpenSecureConf client errors."""


class AuthenticationError(OpenSecureConfError):
    """Raised when authentication fails (invalid or missing user key)."""


class ConfigurationNotFoundError(OpenSecureConfError):
    """Raised when a requested configuration key does not exist."""


class ConfigurationExistsError(OpenSecureConfError):
    """Raised when attempting to create a configuration that already exists."""


class OpenSecureConfClient:
    """
    Client for interacting with the OpenSecureConf API.

    This client provides methods to create, read, update, delete, and list
    encrypted configuration entries stored in an OpenSecureConf service.

    Attributes:
        base_url (str): The base URL of the OpenSecureConf API server.
        user_key (str): The encryption key used for authentication and encryption/decryption.
        api_key (Optional[str]): Optional API key for additional authentication.
        timeout (int): Request timeout in seconds.

    Example:
        >>> client = OpenSecureConfClient(
        ...     base_url="http://localhost:9000",
        ...     user_key="my-secret-key-123",
        ...     api_key="optional-api-key"
        ... )
        >>> config = client.create("database", {"host": "localhost", "port": 5432})
        >>> print(config["value"])
        {'host': 'localhost', 'port': 5432}
    """

    def __init__(
        self,
        base_url: str,
        user_key: str,
        api_key: Optional[str] = None,
        timeout: int = 30,
        verify_ssl: bool = True
    ):
        """
        Initialize the OpenSecureConf client.

        Args:
            base_url: The base URL of the OpenSecureConf API (e.g., "http://localhost:9000")
            user_key: User encryption key for authentication (minimum 8 characters)
            api_key: Optional API key for additional authentication
            timeout: Request timeout in seconds (default: 30)
            verify_ssl: Whether to verify SSL certificates (default: True)

        Raises:
            ValueError: If user_key is shorter than 8 characters
        """
        if len(user_key) < 8:
            raise ValueError("User key must be at least 8 characters long")

        self.base_url = base_url.rstrip("/")
        self.user_key = user_key
        self.api_key = api_key
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        self._session = requests.Session()

        # Setup headers
        headers = {
            "x-user-key": self.user_key, 
            "Content-Type": "application/json"
        }

        # Add X-API-Key header if api_key is provided
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        self._session.headers.update(headers)

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Any:
        """
        Make an HTTP request to the API with error handling.

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

        try:
            response = self._session.request(method, url, **kwargs)

            if response.status_code == 401:
                raise AuthenticationError(
                    "Authentication failed: invalid or missing user key"
                )
            if response.status_code == 404:
                raise ConfigurationNotFoundError("Configuration not found")
            if response.status_code == 400:
                error_detail = response.json().get("detail", "Bad request")
                if "already exists" in error_detail.lower():
                    raise ConfigurationExistsError(error_detail)
                raise OpenSecureConfError(f"Bad request: {error_detail}")
            if response.status_code >= 400:
                error_detail = response.json().get("detail", "Unknown error")
                raise OpenSecureConfError(
                    f"API error ({response.status_code}): {error_detail}"
                )

            if response.status_code == 204 or not response.content:
                return None

            return response.json()

        except (ConnectionError, Timeout) as e:
            raise ConnectionError(
                f"Failed to connect to {self.base_url}: {str(e)}"
            ) from e
        except ValueError as e:
            raise OpenSecureConfError(f"Invalid JSON response: {str(e)}") from e

    def get_service_info(self) -> Dict[str, Any]:
        """
        Get information about the OpenSecureConf service.

        Returns:
            Dictionary containing service metadata and available endpoints

        Example:
            >>> info = client.get_service_info()
            >>> print(info["version"])
            1.0.0
        """
        return self._make_request("GET", "/")

    def create(
        self, key: str, value: Dict[str, Any], category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new encrypted configuration entry.

        Args:
            key: Unique configuration key (1-255 characters)
            value: Configuration data as dictionary (will be encrypted)
            category: Optional category for grouping (max 100 characters)

        Returns:
            Dictionary containing the created configuration with fields:
            - id: Configuration ID
            - key: Configuration key
            - value: Configuration value (decrypted)
            - category: Configuration category (if set)

        Raises:
            ConfigurationExistsError: If configuration key already exists
            ValueError: If key is invalid

        Example:
            >>> config = client.create(
            ...     key="database",
            ...     value={"host": "localhost", "port": 5432},
            ...     category="production"
            ... )
        """
        if not key or len(key) > 255:
            raise ValueError("Key must be between 1 and 255 characters")

        payload = {"key": key, "value": value, "category": category}

        return self._make_request("POST", "/configs", json=payload)

    def read(self, key: str) -> Dict[str, Any]:
        """
        Read and decrypt a configuration entry by key.

        Args:
            key: Configuration key to retrieve

        Returns:
            Dictionary containing the configuration with decrypted value

        Raises:
            ConfigurationNotFoundError: If configuration key does not exist

        Example:
            >>> config = client.read("database")
            >>> print(config["value"]["host"])
            localhost
        """
        return self._make_request("GET", f"/configs/{key}")

    def update(
        self, key: str, value: Dict[str, Any], category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an existing configuration entry with new encrypted value.

        Args:
            key: Configuration key to update
            value: New configuration data as dictionary (will be encrypted)
            category: Optional new category

        Returns:
            Dictionary containing the updated configuration with decrypted value

        Raises:
            ConfigurationNotFoundError: If configuration key does not exist

        Example:
            >>> config = client.update(
            ...     key="database",
            ...     value={"host": "db.example.com", "port": 5432}
            ... )
        """
        payload = {"value": value, "category": category}

        return self._make_request("PUT", f"/configs/{key}", json=payload)

    def delete(self, key: str) -> Dict[str, str]:
        """
        Delete a configuration entry permanently.

        Args:
            key: Configuration key to delete

        Returns:
            Dictionary with success message

        Raises:
            ConfigurationNotFoundError: If configuration key does not exist

        Example:
            >>> result = client.delete("database")
            >>> print(result["message"])
            Configuration 'database' deleted successfully
        """
        return self._make_request("DELETE", f"/configs/{key}")

    def list_all(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all configurations with optional category filter.
        All values are automatically decrypted.

        Args:
            category: Optional filter by category

        Returns:
            List of configuration dictionaries with decrypted values

        Example:
            >>> configs = client.list_all(category="production")
            >>> for config in configs:
            ...     print(f"{config['key']}: {config['value']}")
        """
        params = {"category": category} if category else {}
        return self._make_request("GET", "/configs", params=params)

    def close(self):
        """
        Close the underlying HTTP session.

        Should be called when the client is no longer needed to free resources.

        Example:
            >>> client.close()
        """
        self._session.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - automatically closes session."""
        self.close()


__all__ = [
    "OpenSecureConfClient",
    "OpenSecureConfError",
    "AuthenticationError",
    "ConfigurationNotFoundError",
    "ConfigurationExistsError",
]
