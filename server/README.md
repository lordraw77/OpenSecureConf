# OpenSecureConf 🔐

**Encrypted Configuration Manager with Clustering, REST API, Real-Time SSE, Multithreading, Timestamps & Prometheus Metrics**

A Python-based secure configuration management system with hybrid encryption, distributed clustering (REPLICA modes), thread-safe operations, RESTful API distribution, **real-time Server-Sent Events (SSE) notifications**, comprehensive statistics, backup/import capabilities, and Prometheus metrics monitoring. Features async endpoints for maximum concurrency, automatic salt synchronization, optional API key authentication, HTTPS/SSL support, timestamp tracking, environment-based segregation, and structured async logging.

[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Features

### Core Features
- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 with 480k iterations + Fernet cipher (AES-128-CBC + HMAC-SHA256)
- 🌐 **Distributed Clustering**: REPLICA (active-active replication) modes
- 🔄 **Auto Salt Sync**: Automatic encryption salt distribution across cluster nodes with bootstrap logic
- 💾 **Thread-Safe Storage**: SQLite with connection pooling and concurrent access support
- 🌐 **Async REST API**: Non-blocking endpoints with asyncio.to_thread() for parallel requests
- ⚡ **Multithreading**: Multiple worker processes for high-performance concurrent operations
- 🔑 **Enhanced Security**: 64-byte (512-bit) salt for maximum collision resistance
- 🔐 **API Key Authentication**: Optional API key protection for all endpoints (including inter-node communication)
- 🔒 **HTTPS/SSL Support**: Optional TLS encryption for secure communication with certificate-based authentication

### New Features (v2.3.0)
- 📡 **Real-Time SSE Events**: Server-Sent Events for instant configuration change notifications
- 🎯 **Granular Event Filtering**: Subscribe to events by key, environment, category, or combinations
- 🔄 **Auto-Reconnection**: Automatic SSE reconnection with exponential backoff
- 📊 **SSE Statistics**: Comprehensive metrics on subscriptions, events, and connection health
- 💓 **Keep-Alive Management**: Automatic connection maintenance with configurable intervals
- ⏰ **Timestamp Tracking**: Automatic created_at and updated_at timestamps for all configurations
- 🌍 **Environment Management**: Environment field for logical segregation (dev, staging, production)
- 📊 **Short/Full Modes**: Flexible response formats with or without timestamps
- 📈 **Statistics Endpoints**: Comprehensive statistics on keys, categories, environments, and operations
- 💾 **Backup/Import**: Encrypted backup and restore functionality with password protection
- 🔍 **Cluster Distribution**: Detailed cluster synchronization status and key distribution analytics
- 📊 **Operations Tracking**: Read/write operations statistics in human-readable JSON format
- 🔒 **HTTPS Configuration**: Optional SSL/TLS support for production deployments

### Monitoring & Observability
- 📊 **Prometheus Metrics**: Complete observability with HTTP metrics, cluster health, operation tracking, and SSE metrics
- 📝 **Structured Async Logging**: Non-blocking JSON/console logs with code location tracking (file, line, function)
- 🏥 **Health Monitoring**: Automatic health checking and cluster status reporting
- 📈 **High Performance**: 100-200+ requests/second with 4 workers per node
- 📡 **SSE Monitoring**: Real-time event delivery tracking and subscription analytics

### Production Ready
- ⚙️ **Environment Configuration**: Full control via environment variables
- ✅ **Input Validation**: Comprehensive validation with Pydantic models
- 🔒 **Header Authentication**: API key-based security
- 🔄 **Connection Pooling**: Optimized database connections
- 🛡️ **Fault Tolerance**: Automatic error handling and recovery
- 🔐 **SSL/TLS Support**: Production-grade HTTPS encryption

## 📋 Requirements
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
cryptography==42.0.0
pydantic==2.5.0
sqlalchemy==2.0.25
python-dotenv==1.0.0
httpx==0.27.0
sse-starlette==2.1.0
structlog>=23.0.0
prometheus-client>=0.19.0
```

## 🔧 Installation
```bash
# Clone the repository
git clone https://github.com/your-username/OpenSecureConf.git
cd OpenSecureConf

# Install dependencies
pip install -r requirements.txt
```

## ⚙️ Configuration

Create a `.env` file or set environment variables:
```bash
# Server Settings
OSC_HOST=0.0.0.0
OSC_HOST_PORT=9000
OSC_WORKERS=4

# HTTPS/SSL Configuration (Optional)
OSC_HTTPS_ENABLED=false
OSC_SSL_CERTFILE=./cert.pem
OSC_SSL_KEYFILE=./key.pem
OSC_SSL_KEYFILE_PASSWORD=  # Optional: password for encrypted private key
OSC_SSL_CA_CERTS=  # Optional: CA certificate bundle for client verification

# Database Configuration
OSC_DATABASE_PATH=/app/data/configurations.db

# Encryption Configuration
OSC_SALT_FILE_PATH=/app/data/encryption.salt

# Security Settings
OSC_MIN_USER_KEY_LENGTH=8

# API Key Authentication (optional but recommended for cluster)
OSC_API_KEY_REQUIRED=true
OSC_API_KEY=your-super-secret-api-key-here

# Cluster Configuration
OSC_CLUSTER_ENABLED=true
OSC_CLUSTER_MODE=replica  
OSC_CLUSTER_NODE_ID=node1:9000
OSC_CLUSTER_NODES=node2:9000,node3:9000
OSC_CLUSTER_SYNC_INTERVAL=30

# Logging Configuration
OSC_LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
OSC_LOG_FORMAT=json  # json or console
OSC_LOG_FILE=/app/logs/opensecureconf.log  # Optional, defaults to stdout
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OSC_HOST` | Server bind address | `127.0.0.1` | No |
| `OSC_HOST_PORT` | Server port | `9000` | No |
| `OSC_WORKERS` | Number of worker processes | `4` | No |
| `OSC_HTTPS_ENABLED` | Enable HTTPS/SSL (`true`/`false`) | `false` | No |
| `OSC_SSL_CERTFILE` | Path to SSL certificate file | `./cert.pem` | If HTTPS enabled |
| `OSC_SSL_KEYFILE` | Path to SSL private key file | `./key.pem` | If HTTPS enabled |
| `OSC_SSL_KEYFILE_PASSWORD` | Password for encrypted private key | `None` | No |
| `OSC_SSL_CA_CERTS` | Path to CA certificate bundle | `None` | No |
| `OSC_DATABASE_PATH` | SQLite database file path | `configurations.db` | No |
| `OSC_SALT_FILE_PATH` | Encryption salt file path | `encryption.salt` | No |
| `OSC_MIN_USER_KEY_LENGTH` | Minimum length for user encryption key | `8` | No |
| `OSC_API_KEY_REQUIRED` | Enable API key authentication (`true`/`false`) | `false` | No |
| `OSC_API_KEY` | API key for authentication | `your-super-secret-api-key-here` | If enabled |
| `OSC_CLUSTER_ENABLED` | Enable clustering (`true`/`false`) | `false` | No |
| `OSC_CLUSTER_MODE` | Cluster mode: `replica`   | `replica` | If clustering |
| `OSC_CLUSTER_NODE_ID` | Unique node identifier (host:port) | `node-{PORT}` | If clustering |
| `OSC_CLUSTER_NODES` | Comma-separated list of other nodes | `""` | If clustering |
| `OSC_CLUSTER_SYNC_INTERVAL` | Sync interval in seconds (REPLICA only) | `30` | No |
| `OSC_LOG_LEVEL` | Logging level (DEBUG/INFO/WARNING/ERROR/CRITICAL) | `INFO` | No |
| `OSC_LOG_FORMAT` | Log format: `json` or `console` | `json` | No |
| `OSC_LOG_FILE` | Log file path (optional, defaults to stdout) | `None` | No |

## 📚 API Endpoints

### Configuration Management

#### Create Configuration
```bash
POST /configs
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key
Body:
{
  "key": "database_url",
  "value": {"host": "localhost", "port": 5432},
  "category": "database",
  "environment": "production"
}

Response (201):
{
  "id": 1,
  "key": "database_url",
  "category": "database",
  "environment": "production",
  "value": {"host": "localhost", "port": 5432},
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:00:00Z"
}
```

#### Read Configuration
```bash
GET /configs/{key}?environment=production&mode=short
GET /configs/{key}?environment=production&mode=full
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key

Response (short mode):
{
  "id": 1,
  "key": "database_url",
  "category": "database",
  "environment": "production",
  "value": {"host": "localhost", "port": 5432}
}

Response (full mode):
{
  "id": 1,
  "key": "database_url",
  "category": "database",
  "environment": "production",
  "value": {"host": "localhost", "port": 5432},
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:30:00Z"
}
```

#### Update Configuration
```bash
PUT /configs/{key}?environment=production
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key
Body:
{
  "value": {"host": "newhost", "port": 5432},
  "category": "database"
}

Response (200):
{
  "id": 1,
  "key": "database_url",
  "category": "database",
  "environment": "production",
  "value": {"host": "newhost", "port": 5432},
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-15T10:35:00Z"
}
```

#### Delete Configuration
```bash
DELETE /configs/{key}?environment=production
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key

Response (200):
{
  "message": "Configuration 'database_url' deleted successfully"
}
```

#### List Configurations
```bash
GET /configs?category=database&environment=production&mode=short
GET /configs?mode=full
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key

Response:
[
  {
    "id": 1,
    "key": "database_url",
    "category": "database",
    "environment": "production",
    "value": {"host": "localhost", "port": 5432},
    "created_at": "2026-01-15T10:00:00Z",  // Only in full mode
    "updated_at": "2026-01-15T10:35:00Z"   // Only in full mode
  }
]
```

### Server-Sent Events (SSE) - Real-Time Notifications

#### Subscribe to Configuration Changes
```bash
GET /sse/subscribe?environment=production&category=database
Headers:
  - X-API-Key: your-api-key

# Establishes persistent SSE connection
# Receives real-time events when configurations change

Event Types:
  - connected: Initial connection confirmation
  - created: New configuration created
  - updated: Configuration updated
  - deleted: Configuration deleted
  - sync: Cluster synchronization event

Event Format:
event: updated
data: {
  "key": "database_url",
  "environment": "production",
  "category": "database",
  "timestamp": "2026-02-15T10:30:00Z",
  "node_id": "node1:9000",
  "data": null
}
```

**Filter Examples:**
```bash
# Subscribe to all events
GET /sse/subscribe

# Subscribe to production events only
GET /sse/subscribe?environment=production

# Subscribe to specific key in staging
GET /sse/subscribe?key=database&environment=staging

# Subscribe to all database configurations
GET /sse/subscribe?category=database

# Subscribe to specific key + environment
GET /sse/subscribe?key=api_token&environment=production&category=auth
```

#### Get SSE Statistics
```bash
GET /sse/stats
Headers:
  - X-API-Key: your-api-key

Response:
{
  "subscriptions": {
    "total_created": 150,
    "active": 12,
    "closed": 138,
    "wildcard": 3,
    "by_key": {"database": 5, "api_token": 2},
    "by_environment": {"production": 8, "staging": 4},
    "by_category": {"database": 5, "api": 7},
    "last_created_at": "2026-02-15T10:30:00Z"
  },
  "events": {
    "total_sent": 1523,
    "by_type": {
      "created": 234,
      "updated": 982,
      "deleted": 156,
      "sync": 151
    },
    "dropped_queue_full": 3,
    "last_sent_at": "2026-02-15T10:35:22Z"
  },
  "connection_health": {
    "keepalive_sent": 3421,
    "disconnections_detected": 138
  },
  "performance": {
    "average_subscription_duration_seconds": 245.67,
    "max_queue_size_reached": 100
  }
}
```

#### Get Active Subscriptions
```bash
GET /sse/subscriptions
Headers:
  - X-API-Key: your-api-key

Response:
[
  {
    "subscription_id": "123e4567-e89b-12d3-a456-426614174000",
    "filters": {
      "key": "database",
      "environment": "production",
      "category": null
    },
    "created_at": "2026-02-15T10:30:00Z",
    "duration_seconds": 125.45,
    "queue_size": 0,
    "queue_max_size": 100
  }
]
```

#### SSE Health Check
```bash
GET /sse/health

Response:
{
  "status": "healthy",
  "active_subscriptions": 12,
  "total_events_sent": 1523
}
```

### Statistics & Monitoring

#### Get Statistics
```bash
GET /stats
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key

Response:
{
  "total_keys": 150,
  "total_categories": 8,
  "total_environments": 3,
  "keys_by_category": {
    "database": 25,
    "api": 40,
    "cache": 15,
    "uncategorized": 70
  },
  "keys_by_environment": {
    "production": 80,
    "staging": 50,
    "development": 20
  }
}
```

#### Get Operations Statistics
```bash
GET /stats/operations
Headers:
  - X-API-Key: your-api-key

Response:
{
  "read_operations": {
    "success": 15420,
    "not_found": 230,
    "error": 12
  },
  "write_operations": {
    "create_success": 1250,
    "create_error": 15,
    "update_success": 890,
    "update_not_found": 5,
    "delete_success": 120
  },
  "encryption_operations": {
    "encrypt": 2160,
    "decrypt": 15420
  },
  "total_http_requests": {
    "GET_/configs_200": 15420,
    "POST_/configs_201": 1250,
    "PUT_/configs/{key}_200": 890
  }
}
```

### Cluster Management

[Previous cluster endpoints remain the same...]

### Backup & Import

[Previous backup endpoints remain the same...]

### Monitoring

#### Prometheus Metrics
```bash
GET /metrics

Response (Prometheus format):
# HELP osc_config_operations_total Total configuration operations
# TYPE osc_config_operations_total counter
osc_config_operations_total{operation="create",status="success"} 42.0
osc_config_operations_total{operation="read",status="success"} 1523.0

# HELP osc_cluster_nodes_healthy Number of healthy cluster nodes
# TYPE osc_cluster_nodes_healthy gauge
osc_cluster_nodes_healthy 3.0

# HELP sse_active_subscriptions Number of active SSE subscriptions
# TYPE sse_active_subscriptions gauge
sse_active_subscriptions 12.0

# HELP sse_events_sent_total Total SSE events sent
# TYPE sse_events_sent_total counter
sse_events_sent_total{event_type="updated"} 982.0

# HELP sse_subscriptions_total Total SSE subscriptions created
# TYPE sse_subscriptions_total counter
sse_subscriptions_total 150.0
```

## 📡 Real-Time SSE Usage Examples

### Python Client with SSE
```python
import asyncio
from opensecureconf_client import OpenSecureConfClient, SSEEventData

# Create client
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="your-user-key",
    api_key="your-api-key",
    log_level="INFO"
)

# Define event handler
async def on_config_change(event: SSEEventData):
    """Called when configuration changes occur"""
    if event.event_type == "updated":
        print(f"Config updated: {event.key}@{event.environment}")
        # Reload configuration
        config = client.read(event.key, event.environment)
        print(f"New value: {config['value']}")
    
    elif event.event_type == "created":
        print(f"New config created: {event.key}@{event.environment}")
    
    elif event.event_type == "deleted":
        print(f"Config deleted: {event.key}@{event.environment}")

# Create SSE client with filters
sse = client.create_sse_client(
    environment="production",      # Only production events
    category="database",            # Only database configs
    on_event=on_config_change,     # Event callback
    auto_reconnect=True,           # Auto-reconnect on failure
    log_level="INFO"
)

# Connect and listen
async def main():
    async with sse:
        await sse.connect()
        
        # Keep running to receive events
        while True:
            await asyncio.sleep(60)
            
            # Display statistics
            stats = sse.get_statistics()
            print(f"Events received: {stats['events_received']}")
            print(f"Uptime: {stats['uptime_seconds']:.0f}s")

asyncio.run(main())
```

### JavaScript/Browser Client
```javascript
// Connect to SSE endpoint
const eventSource = new EventSource(
    'http://localhost:9000/sse/subscribe?environment=production&category=api',
    {
        headers: {
            'X-API-Key': 'your-api-key'
        }
    }
);

// Handle connection
eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('Connected:', data.subscription_id);
});

// Handle configuration updates
eventSource.addEventListener('updated', (event) => {
    const data = JSON.parse(event.data);
    console.log(`Config ${data.key} updated in ${data.environment}`);
    console.log(`Changed at: ${data.timestamp}`);
    
    // Reload configuration
    fetch(`/configs/${data.key}?environment=${data.environment}`, {
        headers: {
            'X-API-Key': 'your-api-key',
            'X-User-Key': 'your-user-key'
        }
    })
    .then(response => response.json())
    .then(config => {
        console.log('New value:', config.value);
        // Update application configuration
        updateAppConfig(config);
    });
});

// Handle created events
eventSource.addEventListener('created', (event) => {
    const data = JSON.parse(event.data);
    console.log(`New config: ${data.key}@${data.environment}`);
});

// Handle deleted events
eventSource.addEventListener('deleted', (event) => {
    const data = JSON.parse(event.data);
    console.log(`Config deleted: ${data.key}@${data.environment}`);
});

// Handle errors
eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
};
```

### curl SSE Example
```bash
# Subscribe to production database events
curl -N -H "X-API-Key: your-api-key" \
  "http://localhost:9000/sse/subscribe?environment=production&category=database"

# Output:
event: connected
data: {"subscription_id":"abc123","filters":{"key":null,"environment":"production","category":"database"}}

event: updated
data: {"key":"database","environment":"production","category":"database","timestamp":"2026-02-15T10:30:00Z"}

: keep-alive 2026-02-15T10:30:30Z

event: created
data: {"key":"cache","environment":"production","category":"database","timestamp":"2026-02-15T10:31:00Z"}
```

## 📊 Prometheus Metrics

OpenSecureConf exposes comprehensive metrics at the `/metrics` endpoint for monitoring with Prometheus, Grafana, or other observability tools.

### Available Metrics

#### HTTP Metrics
- `osc_http_requests_total` - Total HTTP requests by method, endpoint, status code
- `osc_http_request_duration_seconds` - Request latency histogram by method and endpoint

#### Configuration Operations
- `osc_config_operations_total` - Total config operations (create, read, update, delete, list) by status
- `osc_config_read_operations_total` - Total read operations by status
- `osc_config_write_operations_total` - Total write operations (create/update/delete) by status
- `osc_config_entries_total` - Current number of configuration entries

#### SSE Metrics (New)
- `sse_active_subscriptions` - Number of active SSE subscriptions
- `sse_subscriptions_total` - Total SSE subscriptions created
- `sse_subscriptions_closed_total` - Total SSE subscriptions closed
- `sse_events_sent_total` - Total SSE events sent by event type
- `sse_events_dropped_total` - Total SSE events dropped due to full queue
- `sse_keepalive_sent_total` - Total keep-alive messages sent
- `sse_disconnections_total` - Total client disconnections detected
- `sse_subscription_duration_seconds` - Duration of SSE subscriptions histogram
- `sse_queue_size` - Current queue size for subscriptions

#### Cluster Metrics
- `osc_cluster_nodes_total` - Total number of cluster nodes
- `osc_cluster_nodes_healthy` - Number of healthy cluster nodes
- `osc_cluster_sync_duration_seconds` - Cluster synchronization duration histogram

#### Encryption & Errors
- `osc_encryption_operations_total` - Total encryption/decryption operations
- `osc_api_errors_total` - Total API errors by endpoint and error type

## 🎯 Use Cases

### With Real-Time SSE Notifications

- **Live Configuration Updates**: Applications automatically reload configs when changed
- **Distributed Cache Invalidation**: Invalidate caches across services on config updates
- **Real-Time Feature Flags**: Toggle features across all instances instantly
- **Config Change Notifications**: Alert teams when critical configs are modified
- **Audit Trail Streaming**: Stream configuration changes to audit systems in real-time
- **Multi-Region Synchronization**: Propagate config changes across regions instantly
- **Development Hot Reload**: Automatically reload application configs during development
- **Compliance Monitoring**: Real-time monitoring of configuration changes for compliance

### With Clustering, Timestamps & Observability

- **High Availability Systems**: REPLICA mode for mission-critical configurations with Prometheus monitoring
- **Microservices at Scale**: Centralized config with horizontal scaling and structured logging
- **Disaster Recovery**: Automatic failover with REPLICA mode, backup/import, and comprehensive audit logs
- **Load Balancing**: Distribute read load across cluster nodes with performance metrics
- **Environment Segregation**: Separate configurations by environment (dev/staging/prod) with statistics
- **Audit & Compliance**: Timestamp tracking for all changes with structured JSON logs
- **Configuration Versioning**: Track creation and update times for configuration lifecycle management
- **Backup & Recovery**: Encrypted backups with password protection for disaster recovery

## 🧪 Testing

### Complete Testing Example with SSE
```bash
# Start cluster
docker-compose up -d
sleep 10

# Terminal 1: Subscribe to SSE events
curl -N -H "X-API-Key: cluster-secret-key-123" \
  "http://localhost:9001/sse/subscribe?environment=production" &

# Terminal 2: Create configuration (will trigger SSE event)
curl -X POST http://localhost:9001/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -H "Content-Type: application/json" \
  -d '{
    "key":"test",
    "value":{"foo":"bar"},
    "category":"test",
    "environment":"production"
  }'

# Terminal 1 will receive:
# event: created
# data: {"key":"test","environment":"production","category":"test","timestamp":"2026-02-15T10:30:00Z"}

# Update configuration (will trigger SSE event)
curl -X PUT "http://localhost:9001/configs/test?environment=production" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -H "Content-Type: application/json" \
  -d '{
    "value":{"foo":"baz"},
    "category":"test"
  }'

# Terminal 1 will receive:
# event: updated
# data: {"key":"test","environment":"production","category":"test","timestamp":"2026-02-15T10:31:00Z"}

# Get SSE statistics
curl http://localhost:9001/sse/stats \
  -H "X-API-Key: cluster-secret-key-123"

# Get active subscriptions
curl http://localhost:9001/sse/subscriptions \
  -H "X-API-Key: cluster-secret-key-123"
```

### Python SSE Test Script
```python
import asyncio
import httpx
from opensecureconf_client import OpenSecureConfClient

# Create client
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="test123",
    api_key="cluster-secret-key-123"
)

# Event counter
events_received = 0

async def on_event(event):
    global events_received
    events_received += 1
    print(f"Event {events_received}: {event.event_type} - {event.key}@{event.environment}")

async def test_sse():
    # Create SSE client
    sse = client.create_sse_client(
        environment="production",
        on_event=on_event
    )
    
    # Start SSE connection
    async with sse:
        await sse.connect()
        
        # Wait for connection
        await asyncio.sleep(1)
        
        # Create config (should trigger event)
        client.create("test1", {"value": 1}, "production", "test")
        await asyncio.sleep(1)
        
        # Update config (should trigger event)
        client.update("test1", "production", {"value": 2})
        await asyncio.sleep(1)
        
        # Delete config (should trigger event)
        client.delete("test1", "production")
        await asyncio.sleep(1)
        
        # Get statistics
        stats = sse.get_statistics()
        print(f"\nSSE Statistics:")
        print(f"  Events received: {stats['events_received']}")
        print(f"  By type: {stats['events_by_type']}")
        
        assert events_received >= 3, f"Expected at least 3 events, got {events_received}"
        print("\n✅ SSE test passed!")

asyncio.run(test_sse())
```

## 🐳 Production Deployment

### Docker Compose with SSE Support
```yaml
version: '3.8'

services:
  node1:
    image: opensecureconf:2.3.0
    container_name: opensecureconf-node1
    environment:
      OSC_HOST: 0.0.0.0
      OSC_HOST_PORT: 9000
      OSC_WORKERS: 4
      OSC_HTTPS_ENABLED: "true"
      OSC_SSL_CERTFILE: /app/certs/fullchain.pem
      OSC_SSL_KEYFILE: /app/certs/privkey.pem
      OSC_DATABASE_PATH: /app/data/configurations.db
      OSC_SALT_FILE_PATH: /app/data/encryption.salt
      OSC_MIN_USER_KEY_LENGTH: 12
      OSC_API_KEY_REQUIRED: "true"
      OSC_API_KEY: cluster-secret-key-123
      OSC_CLUSTER_ENABLED: "true"
      OSC_CLUSTER_MODE: replica
      OSC_CLUSTER_NODE_ID: node1:9000
      OSC_CLUSTER_NODES: https://node2:9000,https://node3:9000
      OSC_CLUSTER_SYNC_INTERVAL: 30
      OSC_LOG_LEVEL: INFO
      OSC_LOG_FORMAT: json
      OSC_LOG_FILE: /app/logs/opensecureconf.log
    ports:
      - "9001:9000"
    volumes:
      - ./data/node1:/app/data
      - ./logs/node1:/app/logs
      - ./certs:/app/certs:ro
    networks:
      - opensecureconf
    healthcheck:
      test: ["CMD", "curl", "-f", "-k", "https://localhost:9000/sse/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Similar configuration for node2 and node3...

networks:
  opensecureconf:
    driver: bridge
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern async web framework
- [Uvicorn](https://www.uvicorn.org/) - Lightning-fast ASGI server with SSL support
- [sse-starlette](https://github.com/sysid/sse-starlette) - Server-Sent Events for FastAPI
- [Cryptography](https://cryptography.io/) - Secure encryption primitives
- [SQLAlchemy](https://www.sqlalchemy.org/) - Database ORM
- [httpx](https://www.python-httpx.org/) - Async HTTP client
- [structlog](https://www.structlog.org/) - Structured logging
- [Prometheus Client](https://github.com/prometheus/client_python) - Metrics collection

## 📚 Additional Documentation
- **API Documentation**: Interactive docs at `http://localhost:9000/docs`

---

**Made with ❤️ for secure distributed configuration management with real-time notifications**

**Version**: 3.1.0 (February 2026)  
**Maintainer**: OpenSecureConf Team  
**Support**: GitHub Issues