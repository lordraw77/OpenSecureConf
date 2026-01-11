# OpenSecureConf Python Client

A Python client library for interacting with the [OpenSecureConf API](https://github.com/lordraw77/OpenSecureConf), which provides encrypted configuration management with multithreading support.

## Features

- 🔐 **Encrypted Configuration Management**: Securely store and retrieve encrypted configurations
- 🚀 **Simple API**: Intuitive interface for CRUD operations
- 🛡️ **Type-Safe**: Fully typed with comprehensive error handling
- ⚡ **Async Support**: Works with OpenSecureConf's asynchronous API
- 🔄 **Context Manager**: Automatic resource cleanup
- 📦 **Lightweight**: Minimal dependencies (only `requests`)

## Installation

```bash
pip install opensecureconf-client
```

## Quick Start

```python
from opensecureconf_client import OpenSecureConfClient

# Initialize the client
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars"
)

# Create a configuration
config = client.create(
    key="database",
    value={"host": "localhost", "port": 5432, "username": "admin"},
    category="production"
)

# Read a configuration
config = client.read("database")
print(config["value"])  # {'host': 'localhost', 'port': 5432, 'username': 'admin'}

# Update a configuration
client.update(
    key="database",
    value={"host": "db.example.com", "port": 5432, "username": "admin"}
)

# List all configurations
configs = client.list_all(category="production")
for cfg in configs:
    print(f"{cfg['key']}: {cfg['value']}")

# Delete a configuration
client.delete("database")

# Close the client (or use context manager)
client.close()
```

## Using Context Manager

```python
from opensecureconf_client import OpenSecureConfClient

with OpenSecureConfClient(base_url="http://localhost:9000", user_key="my-key") as client:
    config = client.create("app", {"version": "1.0.0"})
    print(config)
# Session automatically closed
```

## API Reference

### `OpenSecureConfClient`

Main client class for interacting with the OpenSecureConf API.

#### Constructor

```python
OpenSecureConfClient(
    base_url: str,
    user_key: str,
    timeout: int = 30,
    verify_ssl: bool = True
)
```

**Parameters:**
- `base_url`: The base URL of the OpenSecureConf API server
- `user_key`: User encryption key for authentication (minimum 8 characters)
- `timeout`: Request timeout in seconds (default: 30)
- `verify_ssl`: Whether to verify SSL certificates (default: True)

#### Methods

##### `get_service_info() -> Dict[str, Any]`

Get information about the OpenSecureConf service.

##### `create(key: str, value: Dict[str, Any], category: Optional[str] = None) -> Dict[str, Any]`

Create a new encrypted configuration entry.

##### `read(key: str) -> Dict[str, Any]`

Read and decrypt a configuration entry by key.

##### `update(key: str, value: Dict[str, Any], category: Optional[str] = None) -> Dict[str, Any]`

Update an existing configuration entry.

##### `delete(key: str) -> Dict[str, str]`

Delete a configuration entry permanently.

##### `list_all(category: Optional[str] = None) -> List[Dict[str, Any]]`

List all configurations with optional category filter.

## Error Handling

The client provides specific exceptions for different error scenarios:

```python
from opensecureconf_client import (
    OpenSecureConfClient,
    AuthenticationError,
    ConfigurationNotFoundError,
    ConfigurationExistsError,
    OpenSecureConfError
)

try:
    config = client.create("mykey", {"data": "value"})
except AuthenticationError:
    print("Invalid user key")
except ConfigurationExistsError:
    print("Configuration already exists")
except ConfigurationNotFoundError:
    print("Configuration not found")
except OpenSecureConfError as e:
    print(f"API error: {e}")
```

## Exception Hierarchy

- `OpenSecureConfError` (base exception)
  - `AuthenticationError` - Invalid or missing user key
  - `ConfigurationNotFoundError` - Configuration key does not exist
  - `ConfigurationExistsError` - Configuration key already exists

## Requirements

- Python 3.8 or higher
- requests >= 2.28.0

## Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/lordraw77/OpenSecureConf.git
cd opensecureconf-client

# Install with development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run tests with coverage
pytest --cov=opensecureconf_client

# Format code
black opensecureconf_client.py

# Lint code
flake8 opensecureconf_client.py
```

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- [OpenSecureConf API Documentation](https://github.com/lordraw77/OpenSecureConf)
- [Issue Tracker](https://github.com/lordraw77/OpenSecureConf/issues)
- [PyPI Package](https://pypi.org/project/opensecureconf-client/)
