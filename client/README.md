# OpenSecureConf Python Client

[![PyPI version](https://badge.fury.io/py/opensecureconf-client.svg)](https://badge.fury.io/py/opensecureconf-client)
[![Python](https://img.shields.io/pypi/pyversions/opensecureconf-client.svg)](https://pypi.org/project/opensecureconf-client/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Python client library for interacting with the [OpenSecureConf API](https://github.com/lordraw77/OpenSecureConf), providing encrypted configuration management with clustering support, automatic retry logic, and comprehensive monitoring capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
  - [Basic CRUD Operations](#basic-crud-operations)
  - [Cluster Awareness](#cluster-awareness)
  - [Batch Operations](#batch-operations)
  - [Retry Logic](#retry-logic)
  - [Health Checks](#health-checks)
  - [Utility Methods](#utility-methods)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Configuration Options](#configuration-options)
- [Best Practices](#best-practices)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Capabilities
- 🔐 **Encrypted Configuration Management**: Securely store and retrieve encrypted configurations using PBKDF2 + Fernet
- 🚀 **Simple & Intuitive API**: Clean interface for CRUD operations
- 🛡️ **Type-Safe**: Fully typed with comprehensive error handling
- 📦 **Lightweight**: Minimal dependencies (only `requests` and `urllib3`)

### Enhanced Features
- 🔄 **Automatic Retry Logic**: Exponential backoff for transient failures
- 🌐 **Cluster Awareness**: Monitor and interact with clustered deployments
- ⚡ **Connection Pooling**: Optimized HTTP connection management
- 📊 **Structured Logging**: Built-in logging for debugging and monitoring
- 🔢 **Batch Operations**: Efficient bulk create, read, and delete operations
- 🏥 **Health Checks**: Built-in connectivity and cluster health monitoring
- 🎯 **Utility Methods**: Convenient helpers for common operations
- 🔌 **Context Manager**: Automatic resource cleanup

## 📦 Installation

### Standard Installation

```bash
pip install opensecureconf-client
```

### Development Installation

```bash
pip install opensecureconf-client[dev]
```

### From Source

```bash
git clone https://github.com/lordraw77/OpenSecureConf.git
cd OpenSecureConf/client
pip install -e .
```

## 🚀 Quick Start

### Basic Usage

```python
from opensecureconf_client import OpenSecureConfClient

# Initialize the client
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars",
    api_key="cluster-secret-key-123"  # Optional: if API key authentication is enabled
)

# Create a configuration
config = client.create(
    key="database",
    value={"host": "localhost", "port": 5432, "username": "admin", "password": "secret"},
    category="production"
)
print(f"Created: {config['key']}")

# Read a configuration
db_config = client.read("database")
print(f"Host: {db_config['value']['host']}")

# Update a configuration
updated = client.update(
    key="database",
    value={"host": "db.example.com", "port": 5432, "username": "admin", "password": "secret"}
)

# List all configurations
configs = client.list_all(category="production")
for cfg in configs:
    print(f"- {cfg['key']}: {cfg['category']}")

# Delete a configuration
client.delete("database")

# Close the client
client.close()
```

### Using Context Manager (Recommended)

```python
from opensecureconf_client import OpenSecureConfClient

with OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars"
) as client:
    # Create and use configurations
    config = client.create("app", {"version": "1.0.0", "debug": False})
    print(config)
    # Session automatically closed when exiting context
```

### Enhanced Client with All Features

```python
from opensecureconf_client_enhanced import OpenSecureConfClient

# Initialize with advanced features
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars",
    api_key="cluster-secret-key-123",
    enable_retry=True,          # Enable automatic retry
    max_retries=3,              # Max retry attempts
    backoff_factor=1.0,         # Exponential backoff factor
    pool_connections=20,        # Connection pool size
    pool_maxsize=50,            # Max pool size
    log_level="INFO"            # Logging level
)

# Use all the enhanced features...
```

## 🎯 Core Features

### Basic CRUD Operations

#### Create Configuration

```python
# Create a simple configuration
config = client.create(
    key="api_settings",
    value={"base_url": "https://api.example.com", "timeout": 30, "retries": 3},
    category="production"
)

# Create with validation
if not client.exists("api_settings"):
    config = client.create("api_settings", {"base_url": "https://api.example.com"})
```

#### Read Configuration

```python
# Read a specific configuration
config = client.read("api_settings")
print(f"API URL: {config['value']['base_url']}")

# Safe read with default value
config = client.get_or_default(
    "optional_setting",
    default={"enabled": False, "timeout": 30}
)
```

#### Update Configuration

```python
# Update existing configuration
updated = client.update(
    key="api_settings",
    value={"base_url": "https://api.example.com", "timeout": 60, "retries": 5},
    category="production"
)
```

#### Delete Configuration

```python
# Delete a single configuration
result = client.delete("api_settings")
print(result["message"])

# Conditional delete
if client.exists("temporary_config"):
    client.delete("temporary_config")
```

#### List Configurations

```python
# List all configurations
all_configs = client.list_all()
print(f"Total configurations: {len(all_configs)}")

# List by category
prod_configs = client.list_all(category="production")
for config in prod_configs:
    print(f"- {config['key']}: {config['value']}")

# Get count
total = client.count()
prod_count = client.count(category="production")
print(f"Production configs: {prod_count}/{total}")
```

### Cluster Awareness

Monitor and interact with OpenSecureConf clusters:

```python
# Check cluster status
status = client.get_cluster_status()
if status['enabled']:
    print(f"Cluster Mode: {status['mode']}")  # REPLICA or FEDERATED
    print(f"Node ID: {status['node_id']}")
    print(f"Healthy Nodes: {status['healthy_nodes']}/{status['total_nodes']}")
else:
    print("Clustering is disabled")

# Check node health
health = client.get_cluster_health()
print(f"Node Status: {health['status']}")
```

**Cluster Modes:**
- **REPLICA**: Active-active replication with automatic synchronization
- **FEDERATED**: Distributed storage with cross-node queries

### Batch Operations

Perform multiple operations efficiently:

#### Bulk Create

```python
# Create multiple configurations at once
configs_to_create = [
    {
        "key": "service1",
        "value": {"url": "http://service1.local", "timeout": 30},
        "category": "microservices"
    },
    {
        "key": "service2",
        "value": {"url": "http://service2.local", "timeout": 60},
        "category": "microservices"
    },
    {
        "key": "service3",
        "value": {"url": "http://service3.local", "timeout": 45},
        "category": "microservices"
    }
]

# Create all configurations (stop on first error)
results = client.bulk_create(configs_to_create)
print(f"Created {len(results)} configurations")

# Create all configurations (continue on errors)
results = client.bulk_create(configs_to_create, ignore_errors=True)
print(f"Created {len(results)} configurations")
```

#### Bulk Read

```python
# Read multiple configurations at once
keys = ["service1", "service2", "service3", "api_settings"]

# Read all (stop on first error)
configs = client.bulk_read(keys)

# Read all (skip missing keys)
configs = client.bulk_read(keys, ignore_errors=True)
for config in configs:
    print(f"{config['key']}: {config['value']['url']}")
```

#### Bulk Delete

```python
# Delete multiple configurations
keys_to_delete = ["temp1", "temp2", "temp3"]

# Delete all (stop on first error)
result = client.bulk_delete(keys_to_delete)

# Delete all (continue on errors)
result = client.bulk_delete(keys_to_delete, ignore_errors=True)
print(f"Deleted: {len(result['deleted'])}")
print(f"Failed: {len(result['failed'])}")

# Inspect failures
for failure in result['failed']:
    print(f"Failed to delete '{failure['key']}': {failure['error']}")
```

### Retry Logic

The enhanced client includes automatic retry with exponential backoff:

```python
# Configure retry behavior
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-key",
    enable_retry=True,
    max_retries=5,              # Retry up to 5 times
    backoff_factor=2.0,         # 2^n seconds between retries
    timeout=30
)

# Automatic retry on transient failures (429, 500, 502, 503, 504)
try:
    config = client.read("my_config")
except Exception as e:
    print(f"Failed after {client.max_retries} retries: {e}")
```

**Retry Strategy:**
- Status codes: `429, 500, 502, 503, 504`
- HTTP methods: All methods including POST
- Backoff: `backoff_factor * (2 ^ retry_count)` seconds

### Health Checks

Built-in health monitoring:

```python
# Simple ping check
if client.ping():
    print("✓ Server is healthy and reachable")
else:
    print("✗ Server is not reachable")

# Get detailed service information
info = client.get_service_info()
print(f"Service: {info['service']}")
print(f"Version: {info['version']}")
print(f"Features: {', '.join(info['features'])}")
print(f"Cluster Enabled: {info['cluster_enabled']}")

# Monitor cluster health
if info['cluster_enabled']:
    health = client.get_cluster_health()
    print(f"Cluster Health: {health['status']}")
```

### Utility Methods

Convenient helper methods:

#### Check Existence

```python
# Check if a key exists
if client.exists("database"):
    print("Configuration exists")
    config = client.read("database")
else:
    print("Configuration does not exist")
    config = client.create("database", {"host": "localhost"})
```

#### Get with Default

```python
# Get configuration or return default
config = client.get_or_default(
    "optional_feature",
    default={"enabled": False, "timeout": 30}
)

# Use the configuration
if config['value']['enabled']:
    timeout = config['value']['timeout']
```

#### Count Configurations

```python
# Count all configurations
total = client.count()
print(f"Total configurations: {total}")

# Count by category
prod_count = client.count(category="production")
dev_count = client.count(category="development")
print(f"Production: {prod_count}, Development: {dev_count}")
```

#### List Categories

```python
# Get all unique categories
categories = client.list_categories()
print(f"Available categories: {', '.join(categories)}")

# Process by category
for category in categories:
    count = client.count(category=category)
    print(f"{category}: {count} configurations")
```

## 🔧 Advanced Usage

### Custom Connection Pooling

```python
from opensecureconf_client_enhanced import OpenSecureConfClient

# Configure connection pooling for high-traffic scenarios
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-key",
    pool_connections=50,    # Number of connection pools
    pool_maxsize=100,       # Maximum pool size
    timeout=60              # Request timeout
)
```

### Structured Logging

```python
import logging

# Enable detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-key",
    log_level="DEBUG"  # DEBUG, INFO, WARNING, ERROR
)

# All operations will be logged
config = client.create("test", {"data": "value"})
# Output: 2026-01-14 17:00:00 - opensecureconf_client - INFO - POST /configs - Status: 201 - Duration: 0.045s
```

### SSL Configuration

```python
# Disable SSL verification (not recommended for production)
client = OpenSecureConfClient(
    base_url="https://localhost:9000",
    user_key="my-key",
    verify_ssl=False
)

# Use custom SSL certificate
import requests
session = requests.Session()
session.verify = '/path/to/ca-bundle.crt'

client = OpenSecureConfClient(
    base_url="https://localhost:9000",
    user_key="my-key",
    verify_ssl=True
)
client._session = session
```

### Environment-Based Configuration

```python
import os
from opensecureconf_client_enhanced import OpenSecureConfClient

# Load from environment variables
client = OpenSecureConfClient(
    base_url=os.getenv("OSC_URL", "http://localhost:9000"),
    user_key=os.getenv("OSC_USER_KEY"),
    api_key=os.getenv("OSC_API_KEY"),
    enable_retry=os.getenv("OSC_RETRY", "true").lower() == "true",
    max_retries=int(os.getenv("OSC_MAX_RETRIES", "3")),
    log_level=os.getenv("OSC_LOG_LEVEL", "INFO")
)
```

### Working with Clusters

```python
from opensecureconf_client_enhanced import OpenSecureConfClient

# Connect to any node in the cluster
client = OpenSecureConfClient(
    base_url="http://node1.example.com:9000",  # Can be any node
    user_key="my-key",
    api_key="cluster-secret-key"
)

# Check cluster topology
status = client.get_cluster_status()
print(f"Connected to: {status['node_id']}")
print(f"Cluster mode: {status['mode']}")

# In REPLICA mode: writes are automatically replicated
config = client.create("shared_config", {"data": "value"})
# This configuration is now available on all nodes

# In FEDERATED mode: reads check all nodes
config = client.read("distributed_config")
# This searches across all federated nodes

# Monitor cluster health
if status['healthy_nodes'] < status['total_nodes']:
    print(f"Warning: {status['total_nodes'] - status['healthy_nodes']} nodes are down")
```

## 📚 API Reference

### OpenSecureConfClient

Main client class for interacting with OpenSecureConf API.

#### Constructor

```python
OpenSecureConfClient(
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
)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `base_url` | `str` | Required | Base URL of the OpenSecureConf API server |
| `user_key` | `str` | Required | User encryption key (minimum 8 characters) |
| `api_key` | `Optional[str]` | `None` | API key for authentication (if enabled on server) |
| `timeout` | `int` | `30` | Request timeout in seconds |
| `verify_ssl` | `bool` | `True` | Verify SSL certificates |
| `enable_retry` | `bool` | `True` | Enable automatic retry with exponential backoff |
| `max_retries` | `int` | `3` | Maximum number of retry attempts |
| `backoff_factor` | `float` | `1.0` | Exponential backoff multiplier |
| `pool_connections` | `int` | `10` | Number of connection pools to cache |
| `pool_maxsize` | `int` | `20` | Maximum size of the connection pool |
| `log_level` | `str` | `"WARNING"` | Logging level (DEBUG, INFO, WARNING, ERROR) |

#### Methods

##### Health & Status

###### `ping() -> bool`

Check if the API server is reachable.

**Returns:** `True` if server is healthy, `False` otherwise

**Example:**
```python
if client.ping():
    print("Server is online")
```

###### `get_service_info() -> Dict[str, Any]`

Get information about the OpenSecureConf service.

**Returns:** Dictionary with service metadata
- `service`: Service name
- `version`: API version
- `features`: List of enabled features
- `cluster_enabled`: Whether clustering is enabled
- `cluster_mode`: Cluster mode (if enabled)

**Example:**
```python
info = client.get_service_info()
print(f"Version: {info['version']}")
```

##### Cluster Operations

###### `get_cluster_status() -> Dict[str, Any]`

Get cluster status and node information.

**Returns:** Dictionary with cluster status
- `enabled`: Whether clustering is enabled
- `mode`: Cluster mode (replica or federated)
- `node_id`: Current node identifier
- `total_nodes`: Total number of nodes
- `healthy_nodes`: Number of healthy nodes

**Raises:** `ClusterError` if cluster status cannot be retrieved

**Example:**
```python
status = client.get_cluster_status()
print(f"Healthy: {status['healthy_nodes']}/{status['total_nodes']}")
```

###### `get_cluster_health() -> Dict[str, Any]`

Check cluster node health.

**Returns:** Dictionary with health status

**Example:**
```python
health = client.get_cluster_health()
print(f"Status: {health['status']}")
```

##### Configuration CRUD

###### `create(key: str, value: Dict[str, Any], category: Optional[str] = None) -> Dict[str, Any]`

Create a new encrypted configuration entry.

**Parameters:**
- `key`: Unique configuration key (1-255 characters)
- `value`: Configuration data as dictionary
- `category`: Optional category for grouping (max 100 characters)

**Returns:** Dictionary with created configuration

**Raises:**
- `ConfigurationExistsError`: If key already exists
- `ValueError`: If parameters are invalid

**Example:**
```python
config = client.create(
    "database",
    {"host": "localhost", "port": 5432},
    category="production"
)
```

###### `read(key: str) -> Dict[str, Any]`

Read and decrypt a configuration entry.

**Parameters:**
- `key`: Configuration key to retrieve

**Returns:** Dictionary with configuration

**Raises:**
- `ConfigurationNotFoundError`: If key does not exist
- `ValueError`: If key is invalid

**Example:**
```python
config = client.read("database")
print(config['value'])
```

###### `update(key: str, value: Dict[str, Any], category: Optional[str] = None) -> Dict[str, Any]`

Update an existing configuration entry.

**Parameters:**
- `key`: Configuration key to update
- `value`: New configuration data
- `category`: Optional new category

**Returns:** Dictionary with updated configuration

**Raises:**
- `ConfigurationNotFoundError`: If key does not exist
- `ValueError`: If parameters are invalid

**Example:**
```python
updated = client.update("database", {"host": "db.example.com", "port": 5432})
```

###### `delete(key: str) -> Dict[str, str]`

Delete a configuration entry permanently.

**Parameters:**
- `key`: Configuration key to delete

**Returns:** Dictionary with success message

**Raises:**
- `ConfigurationNotFoundError`: If key does not exist
- `ValueError`: If key is invalid

**Example:**
```python
result = client.delete("database")
print(result['message'])
```

###### `list_all(category: Optional[str] = None) -> List[Dict[str, Any]]`

List all configurations with optional category filter.

**Parameters:**
- `category`: Optional category filter

**Returns:** List of configuration dictionaries

**Example:**
```python
configs = client.list_all(category="production")
```

##### Batch Operations

###### `bulk_create(configs: List[Dict[str, Any]], ignore_errors: bool = False) -> List[Dict[str, Any]]`

Create multiple configurations in batch.

**Parameters:**
- `configs`: List of configuration dictionaries
- `ignore_errors`: Continue on errors and return partial results

**Returns:** List of created configurations

**Raises:**
- `ValueError`: If configs format is invalid
- `OpenSecureConfError`: If creation fails and ignore_errors is False

**Example:**
```python
configs = [
    {"key": "db1", "value": {"host": "localhost"}, "category": "prod"},
    {"key": "db2", "value": {"host": "remote"}, "category": "prod"}
]
results = client.bulk_create(configs)
```

###### `bulk_read(keys: List[str], ignore_errors: bool = False) -> List[Dict[str, Any]]`

Read multiple configurations in batch.

**Parameters:**
- `keys`: List of configuration keys
- `ignore_errors`: Skip missing keys and return partial results

**Returns:** List of configuration dictionaries

**Example:**
```python
configs = client.bulk_read(["db1", "db2", "api"])
```

###### `bulk_delete(keys: List[str], ignore_errors: bool = False) -> Dict[str, Any]`

Delete multiple configurations in batch.

**Parameters:**
- `keys`: List of configuration keys
- `ignore_errors`: Continue on errors

**Returns:** Dictionary with summary: `{"deleted": [...], "failed": [...]}`

**Example:**
```python
result = client.bulk_delete(["temp1", "temp2", "temp3"])
print(f"Deleted: {len(result['deleted'])}")
```

##### Utility Methods

###### `exists(key: str) -> bool`

Check if a configuration key exists.

**Parameters:**
- `key`: Configuration key to check

**Returns:** `True` if key exists, `False` otherwise

**Example:**
```python
if client.exists("database"):
    config = client.read("database")
```

###### `get_or_default(key: str, default: Dict[str, Any]) -> Dict[str, Any]`

Get configuration or return default if not found.

**Parameters:**
- `key`: Configuration key to retrieve
- `default`: Default value to return if not found

**Returns:** Configuration dictionary or default

**Example:**
```python
config = client.get_or_default("optional", {"enabled": False})
```

###### `count(category: Optional[str] = None) -> int`

Count configurations, optionally filtered by category.

**Parameters:**
- `category`: Optional category filter

**Returns:** Number of configurations

**Example:**
```python
total = client.count()
prod_count = client.count(category="production")
```

###### `list_categories() -> List[str]`

Get list of all unique categories.

**Returns:** Sorted list of category names

**Example:**
```python
categories = client.list_categories()
print(f"Categories: {', '.join(categories)}")
```

##### Session Management

###### `close()`

Close the underlying HTTP session.

**Example:**
```python
client.close()
```

###### Context Manager

The client supports context manager protocol for automatic cleanup.

**Example:**
```python
with OpenSecureConfClient(base_url="...", user_key="...") as client:
    config = client.create("key", {"value": "data"})
# Session automatically closed
```

## ⚠️ Error Handling

### Exception Hierarchy

```
OpenSecureConfError (base exception)
├── AuthenticationError          # Invalid or missing credentials
├── ConfigurationNotFoundError   # Configuration key does not exist
├── ConfigurationExistsError     # Configuration key already exists
└── ClusterError                 # Cluster operation failed
```

### Handling Errors

```python
from opensecureconf_client import (
    OpenSecureConfClient,
    AuthenticationError,
    ConfigurationNotFoundError,
    ConfigurationExistsError,
    ClusterError,
    OpenSecureConfError
)

try:
    config = client.create("mykey", {"data": "value"})
except AuthenticationError:
    print("Authentication failed - check your user_key and api_key")
except ConfigurationExistsError:
    print("Configuration already exists - use update() instead")
    config = client.update("mykey", {"data": "new_value"})
except ConfigurationNotFoundError:
    print("Configuration not found")
except ClusterError as e:
    print(f"Cluster error: {e}")
except OpenSecureConfError as e:
    print(f"API error: {e}")
except ConnectionError as e:
    print(f"Connection error: {e}")
```

### Best Practices for Error Handling

```python
# 1. Use specific exceptions first
try:
    config = client.read("important_config")
except ConfigurationNotFoundError:
    # Create with defaults if not found
    config = client.create("important_config", {"default": "value"})

# 2. Use exists() to avoid exceptions
if not client.exists("optional_config"):
    client.create("optional_config", {"data": "value"})

# 3. Use get_or_default() for optional configurations
config = client.get_or_default("optional", {"enabled": False})

# 4. Handle bulk operation failures
result = client.bulk_delete(keys, ignore_errors=True)
if result['failed']:
    print(f"Some deletions failed: {result['failed']}")
```

## ⚙️ Configuration Options

### Production Configuration

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
import os

# Production-ready configuration
client = OpenSecureConfClient(
    base_url=os.getenv("OSC_URL"),
    user_key=os.getenv("OSC_USER_KEY"),
    api_key=os.getenv("OSC_API_KEY"),
    timeout=60,                     # Longer timeout for production
    verify_ssl=True,                # Always verify SSL in production
    enable_retry=True,
    max_retries=5,                  # More retries for reliability
    backoff_factor=2.0,             # Aggressive backoff
    pool_connections=50,            # Large pool for high traffic
    pool_maxsize=100,
    log_level="INFO"                # Moderate logging
)
```

### Development Configuration

```python
# Development-friendly configuration
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="dev-key-12345678",
    api_key="dev-api-key",
    timeout=30,
    verify_ssl=False,               # Self-signed certs in dev
    enable_retry=False,             # Fail fast in development
    pool_connections=5,             # Smaller pool
    pool_maxsize=10,
    log_level="DEBUG"               # Verbose logging for debugging
)
```

### Environment Variables

Recommended environment variables:

```bash
# Required
export OSC_URL="http://localhost:9000"
export OSC_USER_KEY="your-secure-key-min-8-chars"

# Optional
export OSC_API_KEY="cluster-secret-key-123"
export OSC_TIMEOUT="30"
export OSC_VERIFY_SSL="true"
export OSC_RETRY="true"
export OSC_MAX_RETRIES="3"
export OSC_BACKOFF_FACTOR="1.0"
export OSC_POOL_CONNECTIONS="10"
export OSC_POOL_MAXSIZE="20"
export OSC_LOG_LEVEL="INFO"
```

## 💡 Best Practices

### 1. Use Context Managers

```python
# ✅ Good: Automatic cleanup
with OpenSecureConfClient(base_url="...", user_key="...") as client:
    config = client.create("key", {"data": "value"})

# ❌ Avoid: Manual cleanup required
client = OpenSecureConfClient(base_url="...", user_key="...")
config = client.create("key", {"data": "value"})
client.close()  # Easy to forget
```

### 2. Check Existence Before Operations

```python
# ✅ Good: Avoid exceptions
if not client.exists("config"):
    client.create("config", {"data": "value"})

# ❌ Avoid: Exception handling for flow control
try:
    client.create("config", {"data": "value"})
except ConfigurationExistsError:
    pass
```

### 3. Use Batch Operations for Multiple Items

```python
# ✅ Good: Single batch operation
keys = ["config1", "config2", "config3"]
configs = client.bulk_read(keys, ignore_errors=True)

# ❌ Avoid: Multiple individual requests
configs = []
for key in keys:
    try:
        configs.append(client.read(key))
    except:
        pass
```

### 4. Enable Retry for Production

```python
# ✅ Good: Resilient to transient failures
client = OpenSecureConfClient(
    base_url="...",
    user_key="...",
    enable_retry=True,
    max_retries=3
)

# ❌ Avoid: No retry, fails on transient errors
client = OpenSecureConfClient(
    base_url="...",
    user_key="...",
    enable_retry=False
)
```

### 5. Use Structured Logging

```python
# ✅ Good: Enable logging for production monitoring
client = OpenSecureConfClient(
    base_url="...",
    user_key="...",
    log_level="INFO"
)

# ❌ Avoid: Silent failures in production
client = OpenSecureConfClient(
    base_url="...",
    user_key="...",
    log_level="ERROR"  # Misses important info
)
```

### 6. Secure Credential Management

```python
# ✅ Good: Load from environment or secrets manager
import os
from opensecureconf_client import OpenSecureConfClient

client = OpenSecureConfClient(
    base_url=os.getenv("OSC_URL"),
    user_key=os.getenv("OSC_USER_KEY"),
    api_key=os.getenv("OSC_API_KEY")
)

# ❌ Avoid: Hardcoded credentials
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="hardcoded-key-12345",  # Never do this!
    api_key="hardcoded-api-key"
)
```

### 7. Monitor Cluster Health

```python
# ✅ Good: Regular health checks
if client.ping():
    status = client.get_cluster_status()
    if status['enabled']:
        if status['healthy_nodes'] < status['total_nodes']:
            logger.warning(f"Cluster degraded: {status['healthy_nodes']}/{status['total_nodes']}")

# ❌ Avoid: No health monitoring
config = client.read("config")  # Might fail silently in degraded cluster
```

## 🔨 Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/lordraw77/OpenSecureConf.git
cd OpenSecureConf/client

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install in development mode with all dependencies
pip install -e ".[dev]"
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=opensecureconf_client --cov-report=html

# Run specific test file
pytest tests/test_client.py

# Run with verbose output
pytest -v

# Run with logging
pytest -s
```

### Code Quality

```bash
# Format code
black opensecureconf_client.py
black tests/

# Sort imports
isort opensecureconf_client.py tests/

# Lint code
flake8 opensecureconf_client.py
pylint opensecureconf_client.py

# Type checking
mypy opensecureconf_client.py

# Security check
bandit -r opensecureconf_client.py
```

### Building Distribution

```bash
# Build package
python -m build

# Check distribution
twine check dist/*

# Upload to TestPyPI
twine upload --repository testpypi dist/*

# Upload to PyPI
twine upload dist/*
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Reporting Issues

- Use the [GitHub issue tracker](https://github.com/lordraw77/OpenSecureConf/issues)
- Include minimal reproducible example
- Specify Python version and client version
- Include relevant logs (with sensitive data removed)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`pytest`)
6. Format code (`black`, `isort`)
7. Lint code (`flake8`, `pylint`)
8. Commit your changes (`git commit -m 'Add amazing feature'`)
9. Push to the branch (`git push origin feature/amazing-feature`)
10. Open a Pull Request

### Code Style

- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Use type hints
- Write docstrings for all public methods
- Maintain test coverage above 90%
- Add examples for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [OpenSecureConf Server](https://github.com/lordraw77/OpenSecureConf)
- [PyPI Package](https://pypi.org/project/opensecureconf-client/)
- [Issue Tracker](https://github.com/lordraw77/OpenSecureConf/issues)
- [Documentation](https://github.com/lordraw77/OpenSecureConf/tree/main/docs)
- [Changelog](https://github.com/lordraw77/OpenSecureConf/blob/main/CHANGELOG.md)

## 📮 Support

- 📧 Email: support@opensecureconf.dev
- 💬 GitHub Discussions: [opensecureconf/discussions](https://github.com/lordraw77/OpenSecureConf/discussions)
- 🐛 Bug Reports: [opensecureconf/issues](https://github.com/lordraw77/OpenSecureConf/issues)

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Encryption powered by [cryptography](https://cryptography.io/)
- HTTP client using [requests](https://requests.readthedocs.io/)

---

**Made with ❤️ by the OpenSecureConf Team**
