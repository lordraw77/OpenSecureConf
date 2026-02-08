# OpenSecureConf Python Client

[![PyPI version](https://badge.fury.io/py/opensecureconf-client.svg)](https://badge.fury.io/py/opensecureconf-client)
[![Python](https://img.shields.io/pypi/pyversions/opensecureconf-client.svg)](https://pypi.org/project/opensecureconf-client/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Python client library for interacting with the [OpenSecureConf API](https://github.com/lordraw77/OpenSecureConf), providing encrypted configuration management with clustering support, automatic retry logic, multi-environment support, and comprehensive monitoring capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
  - [Multi-Environment Support](#multi-environment-support)
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
- 🌍 **Multi-Environment Support**: Same configuration key across different environments (production, staging, development)
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

# Create a configuration (environment is REQUIRED)
config = client.create(
    key="database",
    value={"host": "localhost", "port": 5432, "username": "admin", "password": "secret"},
    environment="production",  # REQUIRED
    category="config"
)
print(f"Created: {config['key']} in {config['environment']}")

# Read a configuration (environment is REQUIRED)
db_config = client.read("database", "production")
print(f"Host: {db_config['value']['host']}")

# Update a configuration (environment is REQUIRED)
updated = client.update(
    key="database",
    environment="production",  # REQUIRED
    value={"host": "db.example.com", "port": 5432, "username": "admin", "password": "secret"}
)

# List all production configurations
configs = client.list_all(environment="production")
for cfg in configs:
    print(f"- {cfg['key']}: {cfg['environment']}")

# Delete a configuration (environment is REQUIRED)
client.delete("database", "production")

# Close the client
client.close()
```

### Multi-Environment Configuration

```python
from opensecureconf_client import OpenSecureConfClient

with OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars"
) as client:
    # Create same key in different environments
    prod_db = client.create(
        "database",
        {"host": "db.prod.com", "port": 5432},
        "production",
        "config"
    )
    
    staging_db = client.create(
        "database",
        {"host": "db.staging.com", "port": 5432},
        "staging",
        "config"
    )
    
    dev_db = client.create(
        "database",
        {"host": "localhost", "port": 5432},
        "development",
        "config"
    )
    
    # Read from specific environment
    prod_config = client.read("database", "production")
    staging_config = client.read("database", "staging")
    
    print(f"Production: {prod_config['value']['host']}")
    print(f"Staging: {staging_config['value']['host']}")
    
    # Update only staging
    client.update("database", "staging", {"host": "db-new.staging.com", "port": 5432})
    
    # Delete only development
    client.delete("database", "development")
    # Production and staging remain untouched
```

### Using Context Manager (Recommended)

```python
from opensecureconf_client import OpenSecureConfClient

with OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars"
) as client:
    # Create and use configurations
    config = client.create("app", {"version": "1.0.0", "debug": False}, "production")
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

### Multi-Environment Support

OpenSecureConf now supports having the same configuration key in different environments, allowing you to maintain separate configurations for production, staging, development, etc.

```python
# Create same key in multiple environments
environments = ["production", "staging", "development"]
configs = {
    "production": {"host": "db.prod.com", "port": 5432, "ssl": True},
    "staging": {"host": "db.staging.com", "port": 5432, "ssl": True},
    "development": {"host": "localhost", "port": 5432, "ssl": False}
}

for env in environments:
    client.create("database", configs[env], env, "config")

# Read from specific environment
prod_db = client.read("database", "production")
dev_db = client.read("database", "development")

print(f"Production uses: {prod_db['value']['host']}")
print(f"Development uses: {dev_db['value']['host']}")

# List all environments
all_environments = client.list_environments()
print(f"Available environments: {', '.join(all_environments)}")

# List configurations for specific environment
prod_configs = client.list_all(environment="production")
print(f"Production has {len(prod_configs)} configurations")

# Update only in specific environment
client.update("database", "staging", {"host": "db-v2.staging.com", "port": 5433})

# Delete from specific environment
client.delete("database", "development")
# Production and staging remain untouched
```

### Basic CRUD Operations

#### Create Configuration

```python
# Create a configuration (environment is REQUIRED)
config = client.create(
    key="api_settings",
    value={"base_url": "https://api.example.com", "timeout": 30, "retries": 3},
    environment="production",  # REQUIRED
    category="config"
)

# Create with validation
if not client.exists("api_settings", "production"):
    config = client.create(
        "api_settings",
        {"base_url": "https://api.example.com"},
        "production"
    )
```

#### Read Configuration

```python
# Read a specific configuration (environment is REQUIRED)
config = client.read("api_settings", "production")
print(f"API URL: {config['value']['base_url']}")

# Safe read with default value
config = client.get_or_default(
    "optional_setting",
    "production",
    default={"enabled": False, "timeout": 30}
)
```

#### Update Configuration

```python
# Update existing configuration (environment is REQUIRED)
updated = client.update(
    key="api_settings",
    environment="production",  # REQUIRED, cannot be changed
    value={"base_url": "https://api.example.com", "timeout": 60, "retries": 5},
    category="config"
)
```

#### Delete Configuration

```python
# Delete a configuration (environment is REQUIRED)
result = client.delete("api_settings", "production")
print(result["message"])

# Conditional delete
if client.exists("temporary_config", "staging"):
    client.delete("temporary_config", "staging")
```

#### List Configurations

```python
# List all configurations
all_configs = client.list_all()
print(f"Total configurations: {len(all_configs)}")

# List by environment
prod_configs = client.list_all(environment="production")
for config in prod_configs:
    print(f"- {config['key']}: {config['value']}")

# List by category
db_configs = client.list_all(category="database")

# List by both environment and category
prod_db_configs = client.list_all(category="database", environment="production")

# Get count
total = client.count()
prod_count = client.count(environment="production")
print(f"Production configs: {prod_count}/{total}")
```

### Cluster Awareness

Monitor and interact with OpenSecureConf clusters:

```python
# Check cluster status
status = client.get_cluster_status()
if status['enabled']:
    print(f"Cluster Mode: {status['mode']}")  # REPLICA  
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

### Batch Operations

Perform multiple operations efficiently:

#### Bulk Create

```python
# Create multiple configurations at once (environment REQUIRED for each)
configs_to_create = [
    {
        "key": "service1",
        "value": {"url": "http://service1.local", "timeout": 30},
        "environment": "production",  # REQUIRED
        "category": "microservices"
    },
    {
        "key": "service1",
        "value": {"url": "http://service1.staging.local", "timeout": 30},
        "environment": "staging",  # REQUIRED (same key, different environment)
        "category": "microservices"
    },
    {
        "key": "service2",
        "value": {"url": "http://service2.local", "timeout": 60},
        "environment": "production",  # REQUIRED
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
# Read multiple configurations at once (environment REQUIRED for each)
items = [
    {"key": "service1", "environment": "production"},
    {"key": "service1", "environment": "staging"},
    {"key": "service2", "environment": "production"},
    {"key": "api_settings", "environment": "production"}
]

# Read all (stop on first error)
configs = client.bulk_read(items)

# Read all (skip missing keys)
configs = client.bulk_read(items, ignore_errors=True)
for config in configs:
    print(f"{config['key']} ({config['environment']}): {config['value']}")
```

#### Bulk Delete

```python
# Delete multiple configurations (environment REQUIRED for each)
items_to_delete = [
    {"key": "temp1", "environment": "staging"},
    {"key": "temp2", "environment": "staging"},
    {"key": "temp3", "environment": "development"}
]

# Delete all (stop on first error)
result = client.bulk_delete(items_to_delete)

# Delete all (continue on errors)
result = client.bulk_delete(items_to_delete, ignore_errors=True)
print(f"Deleted: {len(result['deleted'])}")
print(f"Failed: {len(result['failed'])}")

# Inspect failures
for failure in result['failed']:
    print(f"Failed to delete '{failure['key']}' from '{failure['environment']}': {failure['error']}")
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
    config = client.read("my_config", "production")
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
# Check if a key exists in specific environment
if client.exists("database", "production"):
    print("Configuration exists in production")
    config = client.read("database", "production")
else:
    print("Configuration does not exist in production")
    config = client.create("database", {"host": "localhost"}, "production")
```

#### Get with Default

```python
# Get configuration or return default (environment REQUIRED)
config = client.get_or_default(
    "optional_feature",
    "production",
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

# Count by environment
prod_count = client.count(environment="production")
staging_count = client.count(environment="staging")
print(f"Production: {prod_count}, Staging: {staging_count}")

# Count by category
db_count = client.count(category="database")

# Count by both
prod_db_count = client.count(category="database", environment="production")
```

#### List Categories and Environments

```python
# Get all unique categories
categories = client.list_categories()
print(f"Available categories: {', '.join(categories)}")

# Get all unique environments
environments = client.list_environments()
print(f"Available environments: {', '.join(environments)}")

# Process by environment
for env in environments:
    count = client.count(environment=env)
    print(f"{env}: {count} configurations")
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
config = client.create("test", {"data": "value"}, "production")
# Output: 2026-02-05 12:00:00 - opensecureconf_client - INFO - POST /configs - Status: 201 - Duration: 0.045s
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

### Working with Multiple Environments

```python
from opensecureconf_client_enhanced import OpenSecureConfClient

with OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-key"
) as client:
    # Define configurations for different environments
    environments = {
        "production": {
            "database": {"host": "db.prod.com", "port": 5432, "ssl": True},
            "api_url": "https://api.prod.com",
            "debug": False
        },
        "staging": {
            "database": {"host": "db.staging.com", "port": 5432, "ssl": True},
            "api_url": "https://api.staging.com",
            "debug": True
        },
        "development": {
            "database": {"host": "localhost", "port": 5432, "ssl": False},
            "api_url": "http://localhost:3000",
            "debug": True
        }
    }
    
    # Create configurations for all environments
    for env_name, configs in environments.items():
        for key, value in configs.items():
            client.create(key, value, env_name, "config")
            print(f"Created {key} for {env_name}")
    
    # Read environment-specific configuration
    prod_db = client.read("database", "production")
    print(f"Production database: {prod_db['value']['host']}")
    
    # Update only staging environment
    client.update("api_url", "staging", "https://api-v2.staging.com")
    
    # Delete development configurations
    dev_configs = client.list_all(environment="development")
    for config in dev_configs:
        client.delete(config['key'], "development")
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
config = client.create("shared_config", {"data": "value"}, "production")
# This configuration is now available on all nodes

config = client.read("distributed_config", "production")
 
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

##### Configuration CRUD

###### `create(key: str, value: Union[Dict, str, int, bool, list], environment: str, category: Optional[str] = None) -> Dict[str, Any]`

Create a new encrypted configuration entry.

**Parameters:**
- `key`: Configuration key (1-255 characters)
- `value`: Configuration data (dict, string, int, bool, or list)
- `environment`: Environment identifier (REQUIRED, max 100 characters)
- `category`: Optional category for grouping (max 100 characters)

**Returns:** Dictionary with created configuration

**Raises:**
- `ConfigurationExistsError`: If (key, environment) already exists
- `ValueError`: If parameters are invalid

**Example:**
```python
# Same key in different environments
prod_config = client.create("database", {"host": "db.prod.com"}, "production", "config")
staging_config = client.create("database", {"host": "db.staging.com"}, "staging", "config")
```

###### `read(key: str, environment: str) -> Dict[str, Any]`

Read and decrypt a configuration entry by key and environment.

**Parameters:**
- `key`: Configuration key to retrieve
- `environment`: Environment identifier (REQUIRED)

**Returns:** Dictionary with configuration

**Raises:**
- `ConfigurationNotFoundError`: If (key, environment) does not exist
- `ValueError`: If parameters are invalid

**Example:**
```python
prod_config = client.read("database", "production")
staging_config = client.read("database", "staging")
```

###### `update(key: str, environment: str, value: Union[Dict, str, int, bool, list], category: Optional[str] = None) -> Dict[str, Any]`

Update an existing configuration entry.

**Parameters:**
- `key`: Configuration key to update
- `environment`: Environment identifier (REQUIRED, cannot be changed)
- `value`: New configuration data
- `category`: Optional new category

**Returns:** Dictionary with updated configuration

**Raises:**
- `ConfigurationNotFoundError`: If (key, environment) does not exist
- `ValueError`: If parameters are invalid

**Example:**
```python
updated = client.update("database", "production", {"host": "db-new.prod.com"})
```

###### `delete(key: str, environment: str) -> Dict[str, str]`

Delete a configuration entry permanently from specific environment.

**Parameters:**
- `key`: Configuration key to delete
- `environment`: Environment identifier (REQUIRED)

**Returns:** Dictionary with success message

**Raises:**
- `ConfigurationNotFoundError`: If (key, environment) does not exist
- `ValueError`: If parameters are invalid

**Example:**
```python
# Delete from staging only
result = client.delete("database", "staging")
# Production remains untouched
```

###### `list_all(category: Optional[str] = None, environment: Optional[str] = None) -> List[Dict[str, Any]]`

List all configurations with optional filters.

**Parameters:**
- `category`: Optional category filter
- `environment`: Optional environment filter

**Returns:** List of configuration dictionaries

**Example:**
```python
# List all production configurations
prod_configs = client.list_all(environment="production")

# List all database configurations
db_configs = client.list_all(category="database")

# List production database configurations
configs = client.list_all(category="database", environment="production")
```

##### Batch Operations

###### `bulk_create(configs: List[Dict[str, Any]], ignore_errors: bool = False) -> List[Dict[str, Any]]`

Create multiple configurations in batch.

**Parameters:**
- `configs`: List of configuration dictionaries with 'key', 'value', 'environment' (REQUIRED), and optional 'category'
- `ignore_errors`: Continue on errors and return partial results

**Returns:** List of created configurations

**Raises:**
- `ValueError`: If configs format is invalid or environment is missing
- `OpenSecureConfError`: If creation fails and ignore_errors is False

**Example:**
```python
configs = [
    {"key": "db", "value": {"host": "localhost"}, "environment": "production", "category": "config"},
    {"key": "db", "value": {"host": "localhost"}, "environment": "staging", "category": "config"}
]
results = client.bulk_create(configs)
```

###### `bulk_read(items: List[Dict[str, str]], ignore_errors: bool = False) -> List[Dict[str, Any]]`

Read multiple configurations in batch.

**Parameters:**
- `items`: List of dictionaries with 'key' and 'environment' fields
- `ignore_errors`: Skip missing keys and return partial results

**Returns:** List of configuration dictionaries

**Example:**
```python
items = [
    {"key": "database", "environment": "production"},
    {"key": "database", "environment": "staging"}
]
configs = client.bulk_read(items)
```

###### `bulk_delete(items: List[Dict[str, str]], ignore_errors: bool = False) -> Dict[str, Any]`

Delete multiple configurations in batch.

**Parameters:**
- `items`: List of dictionaries with 'key' and 'environment' fields
- `ignore_errors`: Continue on errors

**Returns:** Dictionary with summary: `{"deleted": [...], "failed": [...]}`

**Example:**
```python
items = [
    {"key": "temp1", "environment": "staging"},
    {"key": "temp2", "environment": "staging"}
]
result = client.bulk_delete(items)
```

##### Utility Methods

###### `exists(key: str, environment: str) -> bool`

Check if a configuration key exists in specific environment.

**Parameters:**
- `key`: Configuration key to check
- `environment`: Environment identifier (REQUIRED)

**Returns:** `True` if key exists in the environment, `False` otherwise

**Example:**
```python
if client.exists("database", "production"):
    config = client.read("database", "production")
```

###### `get_or_default(key: str, environment: str, default: Union[Dict, str, int, bool, list]) -> Dict[str, Any]`

Get configuration or return default if not found.

**Parameters:**
- `key`: Configuration key to retrieve
- `environment`: Environment identifier (REQUIRED)
- `default`: Default value to return if not found

**Returns:** Configuration dictionary or default

**Example:**
```python
config = client.get_or_default("optional", "production", {"enabled": False})
```

###### `count(category: Optional[str] = None, environment: Optional[str] = None) -> int`

Count configurations, optionally filtered by category and/or environment.

**Parameters:**
- `category`: Optional category filter
- `environment`: Optional environment filter

**Returns:** Number of configurations

**Example:**
```python
total = client.count()
prod_count = client.count(environment="production")
```

###### `list_categories() -> List[str]`

Get list of all unique categories.

**Returns:** Sorted list of category names

**Example:**
```python
categories = client.list_categories()
```

###### `list_environments() -> List[str]`

Get list of all unique environments.

**Returns:** Sorted list of environment names

**Example:**
```python
environments = client.list_environments()
print(f"Environments: {', '.join(environments)}")
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
    config = client.create("key", {"value": "data"}, "production")
# Session automatically closed
```

## ⚠️ Error Handling

### Exception Hierarchy

```
OpenSecureConfError (base exception)
├── AuthenticationError          # Invalid or missing credentials
├── ConfigurationNotFoundError   # Configuration (key, environment) does not exist
├── ConfigurationExistsError     # Configuration (key, environment) already exists
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
    config = client.create("mykey", {"data": "value"}, "production")
except AuthenticationError:
    print("Authentication failed - check your user_key and api_key")
except ConfigurationExistsError:
    print("Configuration already exists in this environment - use update() instead")
    config = client.update("mykey", "production", {"data": "new_value"})
except ConfigurationNotFoundError:
    print("Configuration not found in specified environment")
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
    config = client.read("important_config", "production")
except ConfigurationNotFoundError:
    # Create with defaults if not found
    config = client.create("important_config", {"default": "value"}, "production")

# 2. Use exists() to avoid exceptions
if not client.exists("optional_config", "production"):
    client.create("optional_config", {"data": "value"}, "production")

# 3. Use get_or_default() for optional configurations
config = client.get_or_default("optional", "production", {"enabled": False})

# 4. Handle bulk operation failures
result = client.bulk_delete(items, ignore_errors=True)
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
    config = client.create("key", {"data": "value"}, "production")

# ❌ Avoid: Manual cleanup required
client = OpenSecureConfClient(base_url="...", user_key="...")
config = client.create("key", {"data": "value"}, "production")
client.close()  # Easy to forget
```

### 2. Always Specify Environment

```python
# ✅ Good: Explicit environment
config = client.create("api_url", "https://api.com", "production")
prod_config = client.read("api_url", "production")

# ❌ Error: Environment is now required
# config = client.create("api_url", "https://api.com")  # This will fail
```

### 3. Use Multi-Environment Configuration

```python
# ✅ Good: Separate configurations per environment
for env in ["production", "staging", "development"]:
    client.create("database", get_db_config(env), env, "config")

# ❌ Avoid: Mixing environments in one key
client.create("database_prod", prod_config, "production")
client.create("database_staging", staging_config, "production")
```

### 4. Check Existence Before Operations

```python
# ✅ Good: Avoid exceptions
if not client.exists("config", "production"):
    client.create("config", {"data": "value"}, "production")

# ❌ Avoid: Exception handling for flow control
try:
    client.create("config", {"data": "value"}, "production")
except ConfigurationExistsError:
    pass
```

### 5. Use Batch Operations for Multiple Items

```python
# ✅ Good: Single batch operation
items = [
    {"key": "config1", "environment": "production"},
    {"key": "config2", "environment": "production"}
]
configs = client.bulk_read(items, ignore_errors=True)

# ❌ Avoid: Multiple individual requests
configs = []
for item in items:
    try:
        configs.append(client.read(item["key"], item["environment"]))
    except:
        pass
```

### 6. Enable Retry for Production

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

### 7. Use Structured Logging

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

### 8. Secure Credential Management

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

### 9. Monitor Cluster Health

```python
# ✅ Good: Regular health checks
if client.ping():
    status = client.get_cluster_status()
    if status['enabled']:
        if status['healthy_nodes'] < status['total_nodes']:
            logger.warning(f"Cluster degraded: {status['healthy_nodes']}/{status['total_nodes']}")

# ❌ Avoid: No health monitoring
config = client.read("config", "production")  # Might fail silently in degraded cluster
```

### 10. Organize by Environment

```python
# ✅ Good: Clear environment separation
environments = client.list_environments()
for env in environments:
    configs = client.list_all(environment=env)
    print(f"{env}: {len(configs)} configurations")

# ❌ Avoid: Mixing all environments
all_configs = client.list_all()  # Hard to manage
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

***

**Made with ❤️ by the OpenSecureConf Team**