# OpenSecureConf 🔐

**Encrypted Configuration Manager with Clustering, REST API, Multithreading & Prometheus Metrics**

A Python-based secure configuration management system with hybrid encryption, distributed clustering (REPLICA/FEDERATED modes), thread-safe operations, RESTful API distribution, and comprehensive Prometheus metrics monitoring. Features async endpoints for maximum concurrency, automatic salt synchronization, optional API key authentication, and structured async logging.

[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Features

- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 with 480k iterations + Fernet cipher (AES-128-CBC + HMAC-SHA256)
- 🌐 **Distributed Clustering**: REPLICA (active-active replication) or FEDERATED (distributed storage) modes
- 🔄 **Auto Salt Sync**: Automatic encryption salt distribution across cluster nodes with bootstrap logic
- 💾 **Thread-Safe Storage**: SQLite with connection pooling and concurrent access support
- 🌐 **Async REST API**: Non-blocking endpoints with asyncio.to_thread() for parallel requests
- ⚡ **Multithreading**: Multiple worker processes for high-performance concurrent operations
- 🔑 **Enhanced Security**: 64-byte (512-bit) salt for maximum collision resistance
- 🔐 **API Key Authentication**: Optional API key protection for all endpoints (including inter-node communication)
- 📊 **Prometheus Metrics**: Complete observability with HTTP metrics, cluster health, and operation tracking
- 📝 **Structured Async Logging**: Non-blocking JSON/console logs with code location tracking (file, line, function)
- ⚙️ **Environment Configuration**: Full control via environment variables
- 🏥 **Health Monitoring**: Automatic health checking and cluster status reporting
- ✅ **Production Ready**: Input validation, header authentication, connection pooling, fault tolerance
- 📈 **High Performance**: 100-200+ requests/second with 4 workers per node

## 📋 Requirements

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
cryptography==42.0.0
pydantic==2.5.0
sqlalchemy==2.0.25
python-dotenv==1.0.0
httpx==0.27.0
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
OSC_CLUSTER_MODE=replica  # or federated
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
| `OSC_DATABASE_PATH` | SQLite database file path | `configurations.db` | No |
| `OSC_SALT_FILE_PATH` | Encryption salt file path | `encryption.salt` | No |
| `OSC_MIN_USER_KEY_LENGTH` | Minimum length for user encryption key | `8` | No |
| `OSC_API_KEY_REQUIRED` | Enable API key authentication (`true`/`false`) | `false` | No |
| `OSC_API_KEY` | API key for authentication | `your-super-secret-api-key-here` | If enabled |
| `OSC_CLUSTER_ENABLED` | Enable clustering (`true`/`false`) | `false` | No |
| `OSC_CLUSTER_MODE` | Cluster mode: `replica` or `federated` | `replica` | If clustering |
| `OSC_CLUSTER_NODE_ID` | Unique node identifier (host:port) | `node-{PORT}` | If clustering |
| `OSC_CLUSTER_NODES` | Comma-separated list of other nodes | `""` | If clustering |
| `OSC_CLUSTER_SYNC_INTERVAL` | Sync interval in seconds (REPLICA only) | `30` | No |
| `OSC_LOG_LEVEL` | Logging level (DEBUG/INFO/WARNING/ERROR/CRITICAL) | `INFO` | No |
| `OSC_LOG_FORMAT` | Log format: `json` or `console` | `json` | No |
| `OSC_LOG_FILE` | Log file path (optional, defaults to stdout) | `None` | No |

## 🌐 Cluster Modes

### REPLICA Mode (Active-Active Replication)

**Characteristics:**
- All nodes maintain a complete copy of all configurations
- Write operations (CREATE/UPDATE/DELETE) are automatically broadcast to all healthy nodes
- Background synchronization runs every N seconds to ensure consistency
- High availability: any node can serve any request
- Automatic failover: if a node fails, others continue with full data

**When to use:**
- High availability is critical
- Frequent reads, moderate writes
- Small to medium cluster size (2-5 nodes)
- Data set is not too large (replicated everywhere)

**Configuration:**
```bash
OSC_CLUSTER_MODE=replica
OSC_CLUSTER_SYNC_INTERVAL=30  # Sync every 30 seconds
```

### FEDERATED Mode (Distributed Storage)

**Characteristics:**
- Each node stores only the configurations it receives directly
- No automatic replication
- Read operations: if key not found locally, queries all other nodes
- List operations: aggregates results from all nodes
- Load distribution: data distributed geographically/logically

**When to use:**
- Large data volumes
- Geographic distribution of configurations
- Data segregation by region/datacenter
- Large cluster size (5+ nodes)
- Frequent writes, moderate reads

**Configuration:**
```bash
OSC_CLUSTER_MODE=federated
# No sync interval needed
```

## 📊 Prometheus Metrics

OpenSecureConf exposes comprehensive metrics at the `/metrics` endpoint for monitoring with Prometheus, Grafana, or other observability tools.

### Available Metrics

#### HTTP Metrics
- `osc_http_requests_total` - Total HTTP requests by method, endpoint, status code
- `osc_http_request_duration_seconds` - Request latency histogram by method and endpoint

#### Configuration Operations
- `osc_config_operations_total` - Total config operations (create, read, update, delete, list) by status
- `osc_config_entries_total` - Current number of configuration entries

#### Cluster Metrics
- `osc_cluster_nodes_total` - Total number of cluster nodes
- `osc_cluster_nodes_healthy` - Number of healthy cluster nodes
- `osc_cluster_sync_duration_seconds` - Cluster synchronization duration histogram

#### Encryption & Errors
- `osc_encryption_operations_total` - Total encryption/decryption operations
- `osc_api_errors_total` - Total API errors by endpoint and error type

### Prometheus Configuration Example

```yaml
scrape_configs:
  - job_name: 'opensecureconf'
    static_configs:
      - targets:
        - 'localhost:9001'
        - 'localhost:9002'
        - 'localhost:9003'
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Accessing Metrics

```bash
# Get metrics from any node
curl http://localhost:9001/metrics

# Example output:
# osc_http_requests_total{endpoint="/configs",method="POST",status_code="201"} 42.0
# osc_config_operations_total{operation="create",status="success"} 42.0
# osc_cluster_nodes_healthy 3.0
# osc_cluster_nodes_total 3.0
```

## 📝 Structured Async Logging

OpenSecureConf features a sophisticated async logging system with zero performance impact on API operations.

### Features
- **Asynchronous**: Logs written in background thread with 10k message buffer
- **Structured**: JSON or console format with consistent fields
- **Code Location**: Automatic file, line, function tracking
- **Node Aware**: Includes node_id in cluster deployments
- **Configurable**: Runtime level changes, file rotation (100MB per file, 5 backups)

### Log Format (JSON)

```json
{
  "timestamp": "2026-01-14T10:30:45.123456Z",
  "level": "INFO",
  "event": "config_created",
  "file": "api.py",
  "line": 234,
  "function": "create_configuration",
  "location": "api.py:create_configuration:234",
  "node_id": "node1:9000",
  "key": "database_config",
  "category": "database"
}
```

### Using the Logger

```python
from async_logger import get_logger

logger = get_logger(__name__)

# Simple log
logger.info("operation_completed", duration_ms=42)

# With context
logger.debug("database_query", query="SELECT * FROM configs", rows=10)

# Error with exception
try:
    dangerous_operation()
except Exception as e:
    logger.error("operation_failed", error=str(e), exc_info=True)
```

### Log Level Configuration

```bash
# Set via environment
export OSC_LOG_LEVEL=DEBUG

# Or change at runtime via API (future feature)
# curl -X POST /admin/log-level -d '{"level": "DEBUG"}'
```

## 🏃 Quick Start

### Standalone Mode (Single Node)

```bash
# Disable clustering for single node
export OSC_CLUSTER_ENABLED=false
export OSC_LOG_LEVEL=INFO
export OSC_LOG_FORMAT=console
python api.py
```

### Cluster Mode - REPLICA (3 Nodes)

**Terminal 1 - Node 1:**
```bash
export OSC_CLUSTER_ENABLED=true
export OSC_CLUSTER_MODE=replica
export OSC_CLUSTER_NODE_ID=localhost:9001
export OSC_CLUSTER_NODES=localhost:9002,localhost:9003
export OSC_HOST_PORT=9001
export OSC_API_KEY=cluster-secret-123
export OSC_LOG_FILE=/var/log/osc/node1.log
python api.py
```

**Terminal 2 - Node 2:**
```bash
export OSC_CLUSTER_ENABLED=true
export OSC_CLUSTER_MODE=replica
export OSC_CLUSTER_NODE_ID=localhost:9002
export OSC_CLUSTER_NODES=localhost:9001,localhost:9003
export OSC_HOST_PORT=9002
export OSC_API_KEY=cluster-secret-123
export OSC_LOG_FILE=/var/log/osc/node2.log
python api.py
```

**Terminal 3 - Node 3:**
```bash
export OSC_CLUSTER_ENABLED=true
export OSC_CLUSTER_MODE=replica
export OSC_CLUSTER_NODE_ID=localhost:9003
export OSC_CLUSTER_NODES=localhost:9001,localhost:9002
export OSC_HOST_PORT=9003
export OSC_API_KEY=cluster-secret-123
export OSC_LOG_FILE=/var/log/osc/node3.log
python api.py
```

### Docker Compose - REPLICA Cluster with Metrics

```yaml
version: '3.8'

services:
  node1:
    build: .
    container_name: opensecureconf-node1
    ports:
      - "9001:9000"
    environment:
      - OSC_HOST=0.0.0.0
      - OSC_HOST_PORT=9000
      - OSC_WORKERS=2
      - OSC_DATABASE_PATH=/app/data/configurations.db
      - OSC_SALT_FILE_PATH=/app/data/encryption.salt
      - OSC_MIN_USER_KEY_LENGTH=8
      - OSC_API_KEY_REQUIRED=true
      - OSC_API_KEY=cluster-secret-key-123
      - OSC_CLUSTER_ENABLED=true
      - OSC_CLUSTER_MODE=replica
      - OSC_CLUSTER_NODE_ID=node1:9000
      - OSC_CLUSTER_NODES=node2:9000,node3:9000
      - OSC_CLUSTER_SYNC_INTERVAL=30
      - OSC_LOG_LEVEL=INFO
      - OSC_LOG_FORMAT=json
      - OSC_LOG_FILE=/app/logs/node1.log
    volumes:
      - ./data/node1:/app/data
      - ./logs/node1:/app/logs
    networks:
      - cluster_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/cluster/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  node2:
    build: .
    container_name: opensecureconf-node2
    ports:
      - "9002:9000"
    environment:
      - OSC_HOST=0.0.0.0
      - OSC_HOST_PORT=9000
      - OSC_WORKERS=2
      - OSC_DATABASE_PATH=/app/data/configurations.db
      - OSC_SALT_FILE_PATH=/app/data/encryption.salt
      - OSC_MIN_USER_KEY_LENGTH=8
      - OSC_API_KEY_REQUIRED=true
      - OSC_API_KEY=cluster-secret-key-123
      - OSC_CLUSTER_ENABLED=true
      - OSC_CLUSTER_MODE=replica
      - OSC_CLUSTER_NODE_ID=node2:9000
      - OSC_CLUSTER_NODES=node1:9000,node3:9000
      - OSC_CLUSTER_SYNC_INTERVAL=30
      - OSC_LOG_LEVEL=INFO
      - OSC_LOG_FORMAT=json
      - OSC_LOG_FILE=/app/logs/node2.log
    volumes:
      - ./data/node2:/app/data
      - ./logs/node2:/app/logs
    networks:
      - cluster_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/cluster/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  node3:
    build: .
    container_name: opensecureconf-node3
    ports:
      - "9003:9000"
    environment:
      - OSC_HOST=0.0.0.0
      - OSC_HOST_PORT=9000
      - OSC_WORKERS=2
      - OSC_DATABASE_PATH=/app/data/configurations.db
      - OSC_SALT_FILE_PATH=/app/data/encryption.salt
      - OSC_MIN_USER_KEY_LENGTH=8
      - OSC_API_KEY_REQUIRED=true
      - OSC_API_KEY=cluster-secret-key-123
      - OSC_CLUSTER_ENABLED=true
      - OSC_CLUSTER_MODE=replica
      - OSC_CLUSTER_NODE_ID=node3:9000
      - OSC_CLUSTER_NODES=node1:9000,node2:9000
      - OSC_CLUSTER_SYNC_INTERVAL=30
      - OSC_LOG_LEVEL=INFO
      - OSC_LOG_FORMAT=json
      - OSC_LOG_FILE=/app/logs/node3.log
    volumes:
      - ./data/node3:/app/data
      - ./logs/node3:/app/logs
    networks:
      - cluster_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/cluster/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - cluster_network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - cluster_network

networks:
  cluster_network:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
```

**Start the cluster with monitoring:**
```bash
docker-compose up -d

# Verify cluster status
curl -H "X-API-Key: cluster-secret-key-123" http://localhost:9001/cluster/status
curl -H "X-API-Key: cluster-secret-key-123" http://localhost:9002/cluster/status
curl -H "X-API-Key: cluster-secret-key-123" http://localhost:9003/cluster/status

# Check metrics
curl http://localhost:9001/metrics

# Access Grafana
# http://localhost:3000 (admin/admin)

# Access Prometheus
# http://localhost:9090
```

## 📖 API Usage

### Standard Configuration Endpoints

#### CREATE Configuration (REPLICA: broadcasts to all nodes)

```bash
curl -X POST "http://localhost:9001/configs" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "database_prod",
    "value": {
      "host": "prod-server.com",
      "port": 5432,
      "username": "admin",
      "password": "super_secret"
    },
    "category": "database"
  }'
```

#### READ Configuration

```bash
curl -X GET "http://localhost:9002/configs/database_prod" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"
```

#### UPDATE Configuration

```bash
curl -X PUT "http://localhost:9001/configs/database_prod" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {"host": "new-server.com", "port": 5433},
    "category": "database"
  }'
```

#### DELETE Configuration

```bash
curl -X DELETE "http://localhost:9001/configs/database_prod" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"
```

#### LIST All Configurations

```bash
# List all
curl -X GET "http://localhost:9001/configs" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"

# Filter by category
curl -X GET "http://localhost:9001/configs?category=database" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"
```

### Monitoring & Cluster Endpoints

#### Cluster Status

```bash
curl -X GET "http://localhost:9001/cluster/status" \
  -H "X-API-Key: cluster-secret-key-123"
```

**Response:**
```json
{
  "enabled": true,
  "mode": "replica",
  "node_id": "node1:9000",
  "total_nodes": 2,
  "healthy_nodes": 2
}
```

#### Health Check

```bash
curl http://localhost:9001/cluster/health
```

**Response:**
```json
{
  "status": "healthy",
  "node_id": "node1:9000"
}
```

#### Prometheus Metrics

```bash
curl http://localhost:9001/metrics
```

## 🔒 Security

### Hybrid Key Derivation
- **Random Component**: 64-byte (512-bit) salt generated with `secrets.token_bytes()`
- **User Component**: User-defined key provided via `X-User-Key` header
- **Cluster Sync**: Salt is automatically synchronized across all nodes on startup with bootstrap logic

### Encryption Details
- **Algorithm**: PBKDF2-HMAC-SHA256 with 480,000 iterations (OWASP recommended)
- **Cipher**: Fernet (AES-128 in CBC mode with HMAC-SHA256 authentication)
- **Storage**: All values encrypted at rest in SQLite database
- **Thread Safety**: Connection pooling with check_same_thread=False

### Cluster Security
- **API Key**: Same API key required on all nodes for inter-node communication
- **Salt Distribution**: Automatic bootstrap with deterministic node selection (alphabetical order)
- **Network**: Use private network for cluster communication in production
- **TLS**: Enable HTTPS for all inter-node communication in production

### Best Practices
✅ Use strong user keys (minimum 12+ characters, mixed case, numbers, symbols)  
✅ Set `OSC_MIN_USER_KEY_LENGTH` to at least 12 in production  
✅ **Always enable API key authentication in cluster mode** (`OSC_API_KEY_REQUIRED=true`)  
✅ Use strong, random API keys (generate with `openssl rand -hex 32`)  
✅ Use the **same API key on all cluster nodes**  
✅ Store `OSC_DATABASE_PATH` and `OSC_SALT_FILE_PATH` in persistent volumes  
✅ Use private network (VPC/VLAN) for cluster communication  
✅ Use HTTPS/TLS in production environments  
✅ Configure firewall to allow only cluster nodes on cluster ports  
✅ Monitor cluster health with `/cluster/status` and Prometheus metrics  
✅ Regular backups of database and salt file  
✅ Enable structured logging with `OSC_LOG_FILE` for audit trails  
❌ Never commit `.env`, `encryption.salt`, or database files to version control  
❌ Never use default API keys in production  
❌ Never expose cluster without API key authentication  

## 🔐 Encryption Salt Management in Cluster

### Automatic Salt Synchronization with Bootstrap Logic

**Bootstrap Process:**
1. All nodes start simultaneously
2. Nodes check if they have an `encryption.salt` file locally
3. If some nodes have salt, they distribute it to nodes that don't
4. If **no node has salt**, the **bootstrap node** (first alphabetically by node_id) generates it
5. Bootstrap node distributes salt to all other nodes
6. Other nodes wait and retry fetching salt from bootstrap node
7. All nodes end up with identical salt

**Bootstrap Node Selection:**
- Deterministic: first node alphabetically by `node_id` (e.g., `node1:9000` < `node2:9000`)
- Ensures exactly one node generates salt when cluster starts fresh
- Other nodes automatically wait for bootstrap node to complete generation

### Verification

```bash
# Check salt on all nodes (should be identical)
docker exec opensecureconf-node1 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node2 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node3 sha256sum /app/data/encryption.salt

# All hashes must be identical!
# Example output:
# 5f7b8c3d2e1a9f0b4c6d8e2a7f1b5c9d3e8a2f7b1c5d9e3a8f2b7c1d5e9a3f8  encryption.salt
```

### Log Messages During Salt Sync

```json
{"timestamp": "2026-01-14T10:00:01Z", "level": "INFO", "event": "salt_bootstrap_needed", "node_id": "node2:9000"}
{"timestamp": "2026-01-14T10:00:01Z", "level": "INFO", "event": "salt_generation_started", "bootstrap_node": "node1:9000"}
{"timestamp": "2026-01-14T10:00:01Z", "level": "INFO", "event": "salt_generated", "size_bytes": 64}
{"timestamp": "2026-01-14T10:00:03Z", "level": "INFO", "event": "salt_sent_success", "target_node": "node2:9000"}
{"timestamp": "2026-01-14T10:00:03Z", "level": "INFO", "event": "salt_received_success", "source_node": "node1:9000"}
```

## ⚡ Performance

### Cluster Performance

**REPLICA Mode (3 nodes):**
- **Write Operations**: ~80-150 req/s (includes broadcast overhead)
- **Read Operations**: 300-600+ req/s (distributed load)
- **Latency**: Low (all data local)

**FEDERATED Mode (3 nodes):**
- **Write Operations**: 100-200+ req/s per node (no broadcast)
- **Read Operations**: 50-150 req/s (may require cross-node queries)
- **Latency**: Variable (depends on data location)

### Multithreading Configuration

```bash
# For 4-core CPU per node
export OSC_WORKERS=8  # 2x cores

# For 8-core CPU per node
export OSC_WORKERS=16  # 2x cores
```

### Expected Performance per Node
- **Single Worker**: 10-20 requests/second
- **4 Workers**: 100-200+ requests/second
- **8 Workers**: 200-400+ requests/second

### Logging Performance
- **Async Queue**: 10,000 message buffer
- **Zero Blocking**: All log writes happen in background thread
- **File Rotation**: 100MB per file, 5 backups
- **Overhead**: < 1ms per log call (queue insertion only)

## 📁 Project Structure

```
OpenSecureConf/
├── config_manager.py           # Core encryption & database logic
├── cluster_manager.py          # Cluster management with metrics
├── async_logger.py             # Structured async logging system (NEW)
├── api.py                      # FastAPI REST endpoints with clustering & metrics
├── test_example.py             # Usage examples and test suite
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container image definition
├── docker-compose.yml          # Docker Compose cluster setup
├── prometheus.yml              # Prometheus configuration (NEW)
├── .env.example                # Example environment configuration
├── .env                        # Your environment (gitignored)
├── README.md                   # This file
└── logs/                       # Log files directory (NEW)
```

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py .

# Create data and logs directories
RUN mkdir -p /app/data /app/logs

# Environment defaults
ENV OSC_HOST=0.0.0.0
ENV OSC_HOST_PORT=9000
ENV OSC_WORKERS=4
ENV OSC_CLUSTER_ENABLED=false
ENV OSC_LOG_LEVEL=INFO
ENV OSC_LOG_FORMAT=json

EXPOSE 9000

VOLUME ["/app/data", "/app/logs"]

CMD ["python", "api.py"]
```

## 🎯 Use Cases

### With Clustering & Observability

- **High Availability Systems**: REPLICA mode for mission-critical configurations with Prometheus monitoring
- **Geographic Distribution**: FEDERATED mode for multi-region deployments with centralized metrics
- **Microservices at Scale**: Centralized config with horizontal scaling and structured logging
- **Disaster Recovery**: Automatic failover with REPLICA mode and comprehensive audit logs
- **Load Balancing**: Distribute read load across cluster nodes with performance metrics
- **Multi-Datacenter**: FEDERATED mode for data sovereignty with per-node monitoring
- **Development/Staging/Production**: Separate clusters per environment with unified observability
- **Compliance & Auditing**: Structured JSON logs with code location tracking for security audits

### General

- **Credential Vaulting**: Secure storage for API keys, passwords, tokens
- **Environment Settings**: Manage configurations with environment variables
- **Secret Management**: On-premise alternative to cloud secret managers
- **Multi-Tenant Systems**: Per-user encryption keys with cluster-wide API key

## 🧪 Testing

### Cluster Testing with Metrics (REPLICA)

```bash
# Start cluster
docker-compose up -d

# Wait for startup
sleep 10

# Test write on node1
curl -X POST http://localhost:9001/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":{"foo":"bar"},"category":"test"}'

# Read from node2 (replication!)
curl http://localhost:9002/configs/test \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"

# Check metrics
curl http://localhost:9001/metrics | grep osc_config_operations_total

# Check cluster status
curl http://localhost:9001/cluster/status \
  -H "X-API-Key: cluster-secret-key-123"

# View logs
docker logs opensecureconf-node1 | tail -20
```

## 🐳 Production Deployment

### Kubernetes Deployment with Monitoring

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opensecureconf-config
data:
  OSC_HOST: "0.0.0.0"
  OSC_HOST_PORT: "9000"
  OSC_WORKERS: "4"
  OSC_DATABASE_PATH: "/app/data/configurations.db"
  OSC_SALT_FILE_PATH: "/app/data/encryption.salt"
  OSC_MIN_USER_KEY_LENGTH: "12"
  OSC_API_KEY_REQUIRED: "true"
  OSC_CLUSTER_ENABLED: "true"
  OSC_CLUSTER_MODE: "replica"
  OSC_CLUSTER_SYNC_INTERVAL: "30"
  OSC_LOG_LEVEL: "INFO"
  OSC_LOG_FORMAT: "json"
  OSC_LOG_FILE: "/app/logs/opensecureconf.log"
---
apiVersion: v1
kind: Secret
metadata:
  name: opensecureconf-secret
type: Opaque
stringData:
  OSC_API_KEY: your-production-api-key-here
---
apiVersion: v1
kind: Service
metadata:
  name: opensecureconf
  labels:
    app: opensecureconf
spec:
  type: ClusterIP
  selector:
    app: opensecureconf
  ports:
    - name: http
      port: 9000
      targetPort: 9000
    - name: metrics
      port: 9000
      targetPort: 9000
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: opensecureconf
  labels:
    app: opensecureconf
spec:
  selector:
    matchLabels:
      app: opensecureconf
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: opensecureconf
spec:
  serviceName: opensecureconf
  replicas: 3
  selector:
    matchLabels:
      app: opensecureconf
  template:
    metadata:
      labels:
        app: opensecureconf
    spec:
      containers:
      - name: opensecureconf
        image: opensecureconf:latest
        ports:
        - name: http
          containerPort: 9000
        envFrom:
        - configMapRef:
            name: opensecureconf-config
        env:
        - name: OSC_API_KEY
          valueFrom:
            secretKeyRef:
              name: opensecureconf-secret
              key: OSC_API_KEY
        - name: OSC_CLUSTER_NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: OSC_CLUSTER_NODES
          value: "opensecureconf-0.opensecureconf:9000,opensecureconf-1.opensecureconf:9000,opensecureconf-2.opensecureconf:9000"
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
        livenessProbe:
          httpGet:
            path: /cluster/health
            port: 9000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /cluster/health
            port: 9000
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 5Gi
  - metadata:
      name: logs
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern async web framework
- [Cryptography](https://cryptography.io/) - Secure encryption primitives
- [SQLAlchemy](https://www.sqlalchemy.org/) - Database ORM
- [httpx](https://www.python-httpx.org/) - Async HTTP client
- [structlog](https://www.structlog.org/) - Structured logging
- [Prometheus Client](https://github.com/prometheus/client_python) - Metrics collection

## 📚 Additional Documentation

- **Cluster Guide**: See `CLUSTER_GUIDE.md` for detailed clustering setup
- **API Documentation**: Interactive docs at `http://localhost:9000/docs`
- **Metrics Reference**: Prometheus metrics documentation in `METRICS.md`
- **Logging Guide**: Structured logging best practices in `LOGGING.md`

---

**Made with ❤️ for secure distributed configuration management**

**Version**: 2.1.0 (January 2026)  
**Maintainer**: OpenSecureConf Team  
**Support**: GitHub Issues
