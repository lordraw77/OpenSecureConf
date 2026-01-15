# OpenSecureConf 🔐

**Encrypted Configuration Manager with Clustering, REST API, Multithreading, Timestamps & Prometheus Metrics**

A Python-based secure configuration management system with hybrid encryption, distributed clustering (REPLICA/FEDERATED modes), thread-safe operations, RESTful API distribution, comprehensive statistics, backup/import capabilities, and Prometheus metrics monitoring. Features async endpoints for maximum concurrency, automatic salt synchronization, optional API key authentication, timestamp tracking, environment-based segregation, and structured async logging.

[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Features

### Core Features
- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 with 480k iterations + Fernet cipher (AES-128-CBC + HMAC-SHA256)
- 🌐 **Distributed Clustering**: REPLICA (active-active replication) or FEDERATED (distributed storage) modes
- 🔄 **Auto Salt Sync**: Automatic encryption salt distribution across cluster nodes with bootstrap logic
- 💾 **Thread-Safe Storage**: SQLite with connection pooling and concurrent access support
- 🌐 **Async REST API**: Non-blocking endpoints with asyncio.to_thread() for parallel requests
- ⚡ **Multithreading**: Multiple worker processes for high-performance concurrent operations
- 🔑 **Enhanced Security**: 64-byte (512-bit) salt for maximum collision resistance
- 🔐 **API Key Authentication**: Optional API key protection for all endpoints (including inter-node communication)

### New Features (v2.2.0)
- ⏰ **Timestamp Tracking**: Automatic created_at and updated_at timestamps for all configurations
- 🌍 **Environment Management**: Environment field for logical segregation (dev, staging, production)
- 📊 **Short/Full Modes**: Flexible response formats with or without timestamps
- 📈 **Statistics Endpoints**: Comprehensive statistics on keys, categories, environments, and operations
- 💾 **Backup/Import**: Encrypted backup and restore functionality with password protection
- 🔍 **Cluster Distribution**: Detailed cluster synchronization status and key distribution analytics
- 📊 **Operations Tracking**: Read/write operations statistics in human-readable JSON format

### Monitoring & Observability
- 📊 **Prometheus Metrics**: Complete observability with HTTP metrics, cluster health, and operation tracking
- 📝 **Structured Async Logging**: Non-blocking JSON/console logs with code location tracking (file, line, function)
- 🏥 **Health Monitoring**: Automatic health checking and cluster status reporting
- 📈 **High Performance**: 100-200+ requests/second with 4 workers per node

### Production Ready
- ⚙️ **Environment Configuration**: Full control via environment variables
- ✅ **Input Validation**: Comprehensive validation with Pydantic models
- 🔒 **Header Authentication**: API key-based security
- 🔄 **Connection Pooling**: Optimized database connections
- 🛡️ **Fault Tolerance**: Automatic error handling and recovery

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
GET /configs/{key}?mode=short
GET /configs/{key}?mode=full
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
PUT /configs/{key}
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key
Body:
{
  "value": {"host": "newhost", "port": 5432},
  "category": "database",
  "environment": "production"
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
DELETE /configs/{key}
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

#### Cluster Status
```bash
GET /cluster/status
Headers:
  - X-API-Key: your-api-key

Response:
{
  "enabled": true,
  "mode": "replica",
  "node_id": "node1:9000",
  "total_nodes": 3,
  "healthy_nodes": 3
}
```

#### Cluster Distribution
```bash
GET /cluster/distribution
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key

Response:
{
  "cluster_mode": "replica",
  "is_replica": true,
  "all_nodes_synced": true,
  "nodes_distribution": [
    {
      "node_id": "node1:9000",
      "is_local": true,
      "is_healthy": true,
      "keys_count": 150
    },
    {
      "node_id": "node2:9000",
      "is_local": false,
      "is_healthy": true,
      "keys_count": 150
    },
    {
      "node_id": "node3:9000",
      "is_local": false,
      "is_healthy": true,
      "keys_count": 150
    }
  ]
}
```

### Backup & Import

#### Create Backup
```bash
POST /backup?category=database&environment=production
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key
  - X-Backup-Password: strong-backup-password

Response:
{
  "backup_data": "Zm9vYmFy...base64-encoded-encrypted-data...==",
  "total_keys": 150,
  "backup_timestamp": "2026-01-15T10:00:00Z",
  "backup_id": "backup-1737024000"
}
```

#### Import Backup
```bash
POST /import?overwrite=false
Headers:
  - X-API-Key: your-api-key
  - X-User-Key: user-encryption-key
  - X-Backup-Password: strong-backup-password
Query Parameters:
  - backup_data: Zm9vYmFy...base64-encoded-encrypted-data...==
  - overwrite: false (skip existing keys) or true (overwrite existing keys)

Response:
{
  "message": "Import completed",
  "backup_id": "backup-1737024000",
  "backup_timestamp": "2026-01-15T10:00:00Z",
  "total_in_backup": 150,
  "imported": 145,
  "skipped": 5,
  "failed": 0,
  "failed_keys": []
}
```

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
```

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
- `osc_config_read_operations_total` - Total read operations by status
- `osc_config_write_operations_total` - Total write operations (create/update/delete) by status
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
  "timestamp": "2026-01-15T10:43:12.456Z",
  "level": "INFO",
  "event": "operation_completed",
  "file": "api.py",
  "line": 142,
  "function": "create_configuration",
  "location": "api.py:create_configuration:142",
  "node_id": "node-9000",
  "user_id": 123,
  "duration_ms": 45
}
```

## 🎯 Use Cases

### With Clustering, Timestamps & Observability

- **High Availability Systems**: REPLICA mode for mission-critical configurations with Prometheus monitoring
- **Geographic Distribution**: FEDERATED mode for multi-region deployments with centralized metrics
- **Microservices at Scale**: Centralized config with horizontal scaling and structured logging
- **Disaster Recovery**: Automatic failover with REPLICA mode, backup/import, and comprehensive audit logs
- **Load Balancing**: Distribute read load across cluster nodes with performance metrics
- **Multi-Datacenter**: FEDERATED mode for data sovereignty with per-node monitoring
- **Environment Segregation**: Separate configurations by environment (dev/staging/prod) with statistics
- **Audit & Compliance**: Timestamp tracking for all changes with structured JSON logs
- **Configuration Versioning**: Track creation and update times for configuration lifecycle management
- **Backup & Recovery**: Encrypted backups with password protection for disaster recovery

### General

- **Credential Vaulting**: Secure storage for API keys, passwords, tokens
- **Environment Settings**: Manage configurations with environment variables
- **Secret Management**: On-premise alternative to cloud secret managers
- **Multi-Tenant Systems**: Per-user encryption keys with cluster-wide API key

## 🧪 Testing

### Complete Testing Example (REPLICA with Statistics)

```bash
# Start cluster
docker-compose up -d

# Wait for startup
sleep 10

# Create configuration with environment
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

# Read from node2 with full mode (includes timestamps)
curl "http://localhost:9002/configs/test?mode=full" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"

# Get statistics
curl http://localhost:9001/stats \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"

# Get operations statistics
curl http://localhost:9001/stats/operations \
  -H "X-API-Key: cluster-secret-key-123"

# Check cluster distribution
curl http://localhost:9001/cluster/distribution \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"

# Create backup
curl -X POST "http://localhost:9001/backup" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -H "X-Backup-Password: mybackuppass" > backup.json

# Import backup on another node
BACKUP_DATA=$(cat backup.json | jq -r '.backup_data')
curl -X POST "http://localhost:9002/import?overwrite=false&backup_data=$BACKUP_DATA" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -H "X-Backup-Password: mybackuppass"

# Check metrics
curl http://localhost:9001/metrics | grep osc_config_operations_total

# Check cluster status
curl http://localhost:9001/cluster/status \
  -H "X-API-Key: cluster-secret-key-123"

# View logs
docker logs opensecureconf-node1 | tail -20
```

## 🐳 Production Deployment

### Docker Compose Example

```yaml
version: '3.8'

services:
  node1:
    image: opensecureconf:2.2.0
    container_name: opensecureconf-node1
    environment:
      OSC_HOST: 0.0.0.0
      OSC_HOST_PORT: 9000
      OSC_WORKERS: 4
      OSC_DATABASE_PATH: /app/data/configurations.db
      OSC_SALT_FILE_PATH: /app/data/encryption.salt
      OSC_MIN_USER_KEY_LENGTH: 12
      OSC_API_KEY_REQUIRED: "true"
      OSC_API_KEY: cluster-secret-key-123
      OSC_CLUSTER_ENABLED: "true"
      OSC_CLUSTER_MODE: replica
      OSC_CLUSTER_NODE_ID: node1:9000
      OSC_CLUSTER_NODES: node2:9000,node3:9000
      OSC_CLUSTER_SYNC_INTERVAL: 30
      OSC_LOG_LEVEL: INFO
      OSC_LOG_FORMAT: json
      OSC_LOG_FILE: /app/logs/opensecureconf.log
    ports:
      - "9001:9000"
    volumes:
      - ./data/node1:/app/data
      - ./logs/node1:/app/logs
    networks:
      - opensecureconf

  node2:
    image: opensecureconf:2.2.0
    container_name: opensecureconf-node2
    environment:
      OSC_HOST: 0.0.0.0
      OSC_HOST_PORT: 9000
      OSC_WORKERS: 4
      OSC_DATABASE_PATH: /app/data/configurations.db
      OSC_SALT_FILE_PATH: /app/data/encryption.salt
      OSC_MIN_USER_KEY_LENGTH: 12
      OSC_API_KEY_REQUIRED: "true"
      OSC_API_KEY: cluster-secret-key-123
      OSC_CLUSTER_ENABLED: "true"
      OSC_CLUSTER_MODE: replica
      OSC_CLUSTER_NODE_ID: node2:9000
      OSC_CLUSTER_NODES: node1:9000,node3:9000
      OSC_CLUSTER_SYNC_INTERVAL: 30
      OSC_LOG_LEVEL: INFO
      OSC_LOG_FORMAT: json
      OSC_LOG_FILE: /app/logs/opensecureconf.log
    ports:
      - "9002:9000"
    volumes:
      - ./data/node2:/app/data
      - ./logs/node2:/app/logs
    networks:
      - opensecureconf

  node3:
    image: opensecureconf:2.2.0
    container_name: opensecureconf-node3
    environment:
      OSC_HOST: 0.0.0.0
      OSC_HOST_PORT: 9000
      OSC_WORKERS: 4
      OSC_DATABASE_PATH: /app/data/configurations.db
      OSC_SALT_FILE_PATH: /app/data/encryption.salt
      OSC_MIN_USER_KEY_LENGTH: 12
      OSC_API_KEY_REQUIRED: "true"
      OSC_API_KEY: cluster-secret-key-123
      OSC_CLUSTER_ENABLED: "true"
      OSC_CLUSTER_MODE: replica
      OSC_CLUSTER_NODE_ID: node3:9000
      OSC_CLUSTER_NODES: node1:9000,node2:9000
      OSC_CLUSTER_SYNC_INTERVAL: 30
      OSC_LOG_LEVEL: INFO
      OSC_LOG_FORMAT: json
      OSC_LOG_FILE: /app/logs/opensecureconf.log
    ports:
      - "9003:9000"
    volumes:
      - ./data/node3:/app/data
      - ./logs/node3:/app/logs
    networks:
      - opensecureconf

networks:
  opensecureconf:
    driver: bridge
```

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
        image: opensecureconf:2.2.0
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

**Version**: 2.2.0 (January 2026)  
**Maintainer**: OpenSecureConf Team  
**Support**: GitHub Issues
