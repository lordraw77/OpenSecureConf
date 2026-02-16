# OpenSecureConf Python Client

[![PyPI version](https://badge.fury.io/py/opensecureconf-client.svg)](https://badge.fury.io/py/opensecureconf-client)
[![Python](https://img.shields.io/pypi/pyversions/opensecureconf-client.svg)](https://pypi.org/project/opensecureconf-client/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Python client library for interacting with the [OpenSecureConf API](https://github.com/lordraw77/OpenSecureConf), providing encrypted configuration management with clustering support, **real-time Server-Sent Events (SSE) notifications**, automatic retry logic, multi-environment support, and comprehensive monitoring capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Features](#core-features)
  - [Multi-Environment Support](#multi-environment-support)
  - [Basic CRUD Operations](#basic-crud-operations)
  - [Real-Time SSE Events](#real-time-sse-events)
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
- 📦 **Lightweight**: Minimal dependencies (only `requests`, `urllib3`, and `httpx`)

### Real-Time Features (New!)
- 📡 **Server-Sent Events (SSE)**: Real-time configuration change notifications
- 🎯 **Granular Event Filtering**: Subscribe by key, environment, category, or combinations
- 🔄 **Auto-Reconnection**: Automatic reconnection with exponential backoff
- 💓 **Keep-Alive Management**: Automatic connection maintenance
- 📊 **SSE Statistics**: Comprehensive metrics on events and connections

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

### With SSE Support (Recommended)
```bash
pip install opensecureconf-client[sse]
```

### Development Installation
```bash
pip install opensecureconf-client[dev,sse]
```

### From Source
```bash
git clone https://github.com/lordraw77/OpenSecureConf.git
cd OpenSecureConf/client
pip install -e ".[sse]"
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

### Real-Time Configuration Updates with SSE
```python
import asyncio
from opensecureconf_client import OpenSecureConfClient, SSEEventData

# Create synchronous client for CRUD operations
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars",
    api_key="cluster-secret-key-123"
)

# Define event handler
async def on_config_change(event: SSEEventData):
    """Called when configuration changes occur"""
    if event.event_type == "updated":
        print(f"🔄 Config updated: {event.key}@{event.environment}")
        # Reload configuration in your application
        config = client.read(event.key, event.environment)
        print(f"   New value: {config['value']}")
    
    elif event.event_type == "created":
        print(f"✨ New config: {event.key}@{event.environment}")
    
    elif event.event_type == "deleted":
        print(f"🗑️  Config deleted: {event.key}@{event.environment}")

# Create SSE client with filters
async def main():
    sse = client.create_sse_client(
        environment="production",      # Only production events
        category="database",            # Only database configs
        on_event=on_config_change,     # Event callback
        auto_reconnect=True,           # Auto-reconnect on failure
        log_level="INFO"
    )
    
    # Connect and listen
    async with sse:
        await sse.connect()
        
        # Keep running to receive events
        while True:
            await asyncio.sleep(60)
            
            # Display statistics
            stats = sse.get_statistics()
            print(f"📊 Events received: {stats['events_received']}")
            print(f"   Uptime: {stats['uptime_seconds']:.0f}s")

# Run the event listener
asyncio.run(main())
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

## 🎯 Core Features

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

### Real-Time SSE Events

Subscribe to real-time configuration change notifications using Server-Sent Events (SSE).

#### Basic SSE Usage
```python
import asyncio
from opensecureconf_client import OpenSecureConfClient, SSEEventData

client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-key",
    api_key="api-key"
)

async def on_event(event: SSEEventData):
    """Handle incoming SSE events"""
    print(f"Event: {event.event_type}")
    print(f"Key: {event.key}@{event.environment}")
    print(f"Category: {event.category}")
    print(f"Timestamp: {event.timestamp}")

async def main():
    # Create SSE client
    sse = client.create_sse_client(
        environment="production",
        on_event=on_event
    )
    
    # Connect and listen
    async with sse:
        await sse.connect()
        await asyncio.sleep(3600)  # Listen for 1 hour

asyncio.run(main())
```

#### SSE Event Filtering
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

# Subscribe to specific key + environment + category
sse = client.create_sse_client(
    key="api_token",
    environment="production",
    category="auth"
)
```

#### SSE Event Types

Events are emitted for the following operations:

- **`connected`**: Initial connection confirmation
- **`created`**: New configuration created
- **`updated`**: Configuration updated
- **`deleted`**: Configuration deleted
- **`sync`**: Cluster synchronization event

#### SSE Statistics
```python
async def main():
    sse = client.create_sse_client(environment="production")
    
    async with sse:
        await sse.connect()
        
        # Wait for some events
        await asyncio.sleep(60)
        
        # Get statistics
        stats = sse.get_statistics()
        
        print(f"Events received: {stats['events_received']}")
        print(f"By type: {stats['events_by_type']}")
        print(f"Keep-alives: {stats['keepalives_received']}")
        print(f"Reconnections: {stats['reconnections']}")
        print(f"Uptime: {stats['uptime_seconds']:.0f}s")
        print(f"Errors: {stats['errors']}")
```

#### Advanced SSE Example: Auto-Reload Configuration
```python
import asyncio
from opensecureconf_client import OpenSecureConfClient, SSEEventData

class ConfigManager:
    """Configuration manager with auto-reload on changes"""
    
    def __init__(self, client: OpenSecureConfClient, environment: str):
        self.client = client
        self.environment = environment
        self.configs = {}
        self.sse = None
    
    async def initialize(self):
        """Load initial configs and start SSE listener"""
        # Load all configurations
        configs = self.client.list_all(environment=self.environment)
        for config in configs:
            self.configs[config['key']] = config['value']
        
        # Start SSE listener
        self.sse = self.client.create_sse_client(
            environment=self.environment,
            on_event=self._on_config_change,
            auto_reconnect=True
        )
        
        async with self.sse:
            await self.sse.connect()
            await asyncio.Future()  # Run forever
    
    async def _on_config_change(self, event: SSEEventData):
        """Handle configuration changes"""
        if event.event_type == "updated":
            # Reload updated configuration
            config = self.client.read(event.key, event.environment)
            self.configs[event.key] = config['value']
            print(f"✅ Reloaded: {event.key}")
        
        elif event.event_type == "created":
            # Add new configuration
            config = self.client.read(event.key, event.environment)
            self.configs[event.key] = config['value']
            print(f"✅ Added: {event.key}")
        
        elif event.event_type == "deleted":
            # Remove deleted configuration
            self.configs.pop(event.key, None)
            print(f"✅ Removed: {event.key}")
    
    def get(self, key: str, default=None):
        """Get configuration value"""
        return self.configs.get(key, default)

# Usage
async def main():
    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-key"
    )
    
    manager = ConfigManager(client, environment="production")
    await manager.initialize()

asyncio.run(main())
```

#### SSE with Multiple Filters
```python
import asyncio
from opensecureconf_client import OpenSecureConfClient

async def main():
    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-key"
    )
    
    # Create multiple SSE clients with different filters
    tasks = []
    
    # Monitor all production events
    sse_prod = client.create_sse_client(
        environment="production",
        on_event=lambda e: print(f"[PROD] {e.event_type}: {e.key}")
    )
    tasks.append(sse_prod.connect())
    
    # Monitor all database configs
    sse_db = client.create_sse_client(
        category="database",
        on_event=lambda e: print(f"[DB] {e.event_type}: {e.key}")
    )
    tasks.append(sse_db.connect())
    
    # Monitor specific key
    sse_api = client.create_sse_client(
        key="api_token",
        on_event=lambda e: print(f"[API] {e.event_type}: {e.key}")
    )
    tasks.append(sse_api.connect())
    
    # Run all listeners
    await asyncio.gather(*tasks)

asyncio.run(main())
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

### SSE with Custom Reconnection Strategy
```python
from opensecureconf_client import OpenSecureConfClient

client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-key"
)

sse = client.create_sse_client(
    environment="production",
    auto_reconnect=True,
    max_reconnect_attempts=10,      # Try 10 times then stop
    reconnect_delay=5.0,             # Start with 5 second delay
    reconnect_backoff=2.0,           # Double delay each attempt
    max_reconnect_delay=60.0,        # Max 60 seconds between attempts
    log_level="DEBUG"
)
```

### SSE Connection Monitoring
```python
import asyncio
from opensecureconf_client import OpenSecureConfClient

async def monitor_sse():
    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-key"
    )
    
    sse = client.create_sse_client(environment="production")
    
    async with sse:
        await sse.connect()
        
        # Monitor connection status
        while True:
            if sse.is_connected():
                stats = sse.get_statistics()
                print(f"✅ Connected - Events: {stats['events_received']}")
            else:
                print("❌ Disconnected")
            
            await asyncio.sleep(10)

asyncio.run(monitor_sse())
```

### Combining CRUD and SSE
```python
import asyncio
from opensecureconf_client import OpenSecureConfClient, SSEEventData

# Synchronous client for CRUD
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-key"
)

# Track changes
changes = []

async def on_event(event: SSEEventData):
    changes.append({
        'type': event.event_type,
        'key': event.key,
        'environment': event.environment,
        'timestamp': event.timestamp
    })

async def main():
    # Start SSE listener
    sse = client.create_sse_client(
        environment="production",
        on_event=on_event
    )
    
    async with sse:
        await sse.connect()
        await asyncio.sleep(1)  # Wait for connection
        
        # Perform CRUD operations (will trigger events)
        client.create("test1", {"value": 1}, "production")
        await asyncio.sleep(0.5)
        
        client.update("test1", "production", {"value": 2})
        await asyncio.sleep(0.5)
        
        client.delete("test1", "production")
        await asyncio.sleep(0.5)
        
        # Check captured events
        print(f"Captured {len(changes)} events:")
        for change in changes:
            print(f"  - {change['type']}: {change['key']}")

asyncio.run(main())
```

 
## 📚 API Reference

### OpenSecureConfClient

Main client class for interacting with OpenSecureConf API.

### SSEClient (New!)

Asynchronous client for real-time configuration change notifications.

#### Constructor
```python
SSEClient(
    base_url: str,
    api_key: Optional[str] = None,
    key: Optional[str] = None,
    environment: Optional[str] = None,
    category: Optional[str] = None,
    on_event: Optional[Callable[[SSEEventData], Awaitable[None]]] = None,
    auto_reconnect: bool = True,
    max_reconnect_attempts: int = -1,
    reconnect_delay: float = 5.0,
    reconnect_backoff: float = 2.0,
    max_reconnect_delay: float = 60.0,
    log_level: str = "INFO"
)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `base_url` | `str` | Required | Base URL of the OpenSecureConf API |
| `api_key` | `Optional[str]` | `None` | API key for authentication |
| `key` | `Optional[str]` | `None` | Filter by specific configuration key |
| `environment` | `Optional[str]` | `None` | Filter by environment |
| `category` | `Optional[str]` | `None` | Filter by category |
| `on_event` | `Optional[Callable]` | `None` | Async callback for event handling |
| `auto_reconnect` | `bool` | `True` | Enable automatic reconnection |
| `max_reconnect_attempts` | `int` | `-1` | Max reconnection attempts (-1 = infinite) |
| `reconnect_delay` | `float` | `5.0` | Initial delay between reconnections (seconds) |
| `reconnect_backoff` | `float` | `2.0` | Backoff multiplier for reconnection delay |
| `max_reconnect_delay` | `float` | `60.0` | Maximum reconnection delay (seconds) |
| `log_level` | `str` | `"INFO"` | Logging level |

#### Methods

##### `async connect() -> None`

Connect to SSE stream and start receiving events.

**Example:**
```python
async with sse:
    await sse.connect()
    await asyncio.sleep(3600)  # Listen for 1 hour
```

##### `async disconnect() -> None`

Disconnect from SSE stream and cleanup resources.

**Example:**
```python
await sse.disconnect()
```

##### `get_statistics() -> Dict[str, Any]`

Get comprehensive SSE connection statistics.

**Returns:** Dictionary with statistics including:
- `events_received`: Total events received
- `events_by_type`: Breakdown by event type
- `keepalives_received`: Number of keep-alive messages
- `reconnections`: Number of reconnection attempts
- `uptime_seconds`: Connection uptime
- `errors`: Number of errors

**Example:**
```python
stats = sse.get_statistics()
print(f"Events: {stats['events_received']}")
```

##### `is_connected() -> bool`

Check if SSE client is currently connected.

**Returns:** `True` if connected, `False` otherwise

**Example:**
```python
if sse.is_connected():
    print("Receiving events")
```

##### `get_subscription_id() -> Optional[str]`

Get the current subscription ID.

**Returns:** Subscription ID if connected, `None` otherwise

**Example:**
```python
sub_id = sse.get_subscription_id()
print(f"Subscription: {sub_id}")
```

### SSEEventData

Data class representing a received SSE event.

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `event_type` | `str` | Event type (connected, created, updated, deleted, sync) |
| `key` | `Optional[str]` | Configuration key affected |
| `environment` | `Optional[str]` | Environment where change occurred |
| `category` | `Optional[str]` | Configuration category |
| `timestamp` | `Optional[str]` | When event occurred (ISO 8601) |
| `node_id` | `Optional[str]` | Cluster node that originated change |
| `data` | `Optional[Dict]` | Additional event-specific data |
| `subscription_id` | `Optional[str]` | Subscription ID (for connected events) |
| `raw_data` | `Dict` | Raw JSON data from event |

### OpenSecureConfClient.create_sse_client()

Create an SSE client for real-time notifications.
```python
client.create_sse_client(
    key: Optional[str] = None,
    environment: Optional[str] = None,
    category: Optional[str] = None,
    on_event: Optional[Callable[[SSEEventData], Awaitable[None]]] = None,
    auto_reconnect: bool = True,
    max_reconnect_attempts: int = -1,
    log_level: Optional[str] = None
) -> SSEClient
```

**Example:**
```python
sse = client.create_sse_client(
    environment="production",
    on_event=my_event_handler
)
```

## ⚠️ Error Handling

### Exception Hierarchy
```
OpenSecureConfError (base exception)
├── AuthenticationError          # Invalid or missing credentials
├── ConfigurationNotFoundError   # Configuration (key, environment) does not exist
├── ConfigurationExistsError     # Configuration (key, environment) already exists
├── ClusterError                 # Cluster operation failed
├── SSEError                     # SSE operation failed
└── SSENotAvailableError         # httpx library not installed
```

### SSE Error Handling
```python
from opensecureconf_client import (
    OpenSecureConfClient,
    SSEError,
    SSENotAvailableError
)

try:
    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-key"
    )
    
    sse = client.create_sse_client(environment="production")
    
except SSENotAvailableError:
    print("SSE requires httpx library")
    print("Install with: pip install opensecureconf-client[sse]")

except SSEError as e:
    print(f"SSE error: {e}")

# Handle SSE connection errors
async def main():
    try:
        async with sse:
            await sse.connect()
            await asyncio.sleep(3600)
    
    except SSEError as e:
        print(f"SSE connection failed: {e}")
    
    except asyncio.CancelledError:
        print("SSE connection cancelled")

asyncio.run(main())
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


### 11. Use SSE for Real-Time Updates (New!)
```python
# ✅ Good: Real-time configuration updates
async def start_config_watcher():
    sse = client.create_sse_client(
        environment="production",
        on_event=reload_app_config,
        auto_reconnect=True
    )
    
    async with sse:
        await sse.connect()
        # Application automatically reloads on config changes

# ❌ Avoid: Polling for changes
while True:
    configs = client.list_all(environment="production")
    # Check for changes...
    await asyncio.sleep(10)  # Inefficient polling
```

### 12. Filter SSE Events Appropriately
```python
# ✅ Good: Specific filters reduce noise
sse = client.create_sse_client(
    key="database",              # Only this key
    environment="production"     # Only this environment
)

# ❌ Avoid: No filters when you only need specific events
sse = client.create_sse_client()  # Receives ALL events
# Then filters in callback - inefficient
```

### 13. Handle SSE Reconnections Gracefully
```python
# ✅ Good: Configure reconnection strategy
sse = client.create_sse_client(
    environment="production",
    auto_reconnect=True,
    max_reconnect_attempts=10,
    reconnect_delay=5.0
)

async def on_event(event):
    if event.event_type == "connected":
        # Reload all configs after reconnection
        reload_all_configs()

# ❌ Avoid: No reconnection handling
sse = client.create_sse_client(
    environment="production",
    auto_reconnect=False  # Fails permanently on disconnect
)
```

### 14. Monitor SSE Connection Health
```python
# ✅ Good: Regular health monitoring
async def monitor():
    while True:
        if sse.is_connected():
            stats = sse.get_statistics()
            if stats['errors'] > 0:
                logger.warning(f"SSE errors: {stats['errors']}")
        else:
            logger.error("SSE disconnected")
        
        await asyncio.sleep(60)

# ❌ Avoid: No monitoring, silent failures
async with sse:
    await sse.connect()
    await asyncio.sleep(3600)  # Hope it stays connected
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

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:]

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [OpenSecureConf Server](https://github.com/lordraw77/OpenSecureConf)
- [PyPI Package](https://pypi.org/project/opensecureconf-client/)
- [Issue Tracker](https://github.com/lordraw77/OpenSecureConf/issues)
- [Documentation](https://github.com/lordraw77/OpenSecureConf/tree/main/docs)
 
## 📮 Support

- 💬 GitHub Discussions: [opensecureconf/discussions](https://github.com/lordraw77/OpenSecureConf/discussions)
- 🐛 Bug Reports: [opensecureconf/issues](https://github.com/lordraw77/OpenSecureConf/issues)

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Encryption powered by [cryptography](https://cryptography.io/)
- HTTP client using [requests](https://requests.readthedocs.io/)
- SSE support via [httpx](https://www.python-httpx.org/)

---

**Made with ❤️ by the OpenSecureConf Team**

**Version**: 3.1.0 (February 2026)