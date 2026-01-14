# OpenSecureConf 🔐

**Encrypted Configuration Manager with Clustering, REST API & Multithreading**

A Python-based secure configuration management system with hybrid encryption, distributed clustering (REPLICA/FEDERATED modes), thread-safe operations, and RESTful API distribution. Features async endpoints for maximum concurrency, automatic salt synchronization, and optional API key authentication.

[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Features

- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 with 480k iterations + Fernet cipher (AES-128-CBC + HMAC-SHA256)
- 🌐 **Distributed Clustering**: REPLICA (active-active replication) or FEDERATED (distributed storage) modes
- 🔄 **Auto Salt Sync**: Automatic encryption salt distribution across cluster nodes
- 💾 **Thread-Safe Storage**: SQLite with connection pooling and concurrent access support
- 🌐 **Async REST API**: Non-blocking endpoints with asyncio.to_thread() for parallel requests
- ⚡ **Multithreading**: Multiple worker processes for high-performance concurrent operations
- 🔑 **Enhanced Security**: 64-byte (512-bit) salt for maximum collision resistance
- 🔐 **API Key Authentication**: Optional API key protection for all endpoints (including inter-node communication)
- ⚙️ **Environment Configuration**: Full control via environment variables
- 🏥 **Health Monitoring**: Automatic health checking and cluster status reporting
- ✅ **Production Ready**: Input validation, header authentication, connection pooling, fault tolerance
- 📊 **High Performance**: 100-200+ requests/second with 4 workers per node

## 📋 Requirements

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
cryptography==42.0.0
pydantic==2.5.0
sqlalchemy==2.0.25
python-dotenv==1.0.0
httpx==0.27.0
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
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
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

## 🏃 Quick Start

### Standalone Mode (Single Node)

```bash
# Disable clustering for single node
export OSC_CLUSTER_ENABLED=false
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
python api.py
```

### Docker Compose - REPLICA Cluster

```yaml
version: '3.8'

services:
  node1:
    build: .
    container_name: opensecureconf-node1
    ports:
      - "9001:9000"
    environment:
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
    volumes:
      - ./data/node1:/app/data
    networks:
      - cluster_network

  node2:
    build: .
    container_name: opensecureconf-node2
    ports:
      - "9002:9000"
    environment:
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
    volumes:
      - ./data/node2:/app/data
    networks:
      - cluster_network

  node3:
    build: .
    container_name: opensecureconf-node3
    ports:
      - "9003:9000"
    environment:
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
    volumes:
      - ./data/node3:/app/data
    networks:
      - cluster_network

networks:
  cluster_network:
    driver: bridge
```

**Start the cluster:**
```bash
docker-compose up -d

# Verify cluster status
curl -H "X-API-Key: cluster-secret-key-123" http://localhost:9001/cluster/status
curl -H "X-API-Key: cluster-secret-key-123" http://localhost:9002/cluster/status
curl -H "X-API-Key: cluster-secret-key-123" http://localhost:9003/cluster/status
```

### Docker Compose - FEDERATED Cluster

Change `OSC_CLUSTER_MODE=federated` in the docker-compose file above.

Server runs on configured ports (9001, 9002, 9003)  
Interactive docs at `http://localhost:9001/docs` (for node1)

## 📖 API Usage

### Cluster Endpoints

#### Check Cluster Status

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

#### Health Check (No Auth)

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

### Standard Configuration Endpoints

All standard endpoints work the same in cluster mode:

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

**In REPLICA mode:** Configuration is automatically replicated to node2 and node3.

#### READ Configuration

```bash
# Read from any node - data is available everywhere (REPLICA)
curl -X GET "http://localhost:9002/configs/database_prod" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"
```

**In FEDERATED mode:** If not found on node2, queries node1 and node3 automatically.

#### UPDATE Configuration (REPLICA: broadcasts to all nodes)

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

#### DELETE Configuration (REPLICA: broadcasts to all nodes)

```bash
curl -X DELETE "http://localhost:9001/configs/database_prod" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"
```

#### LIST All Configurations

```bash
# REPLICA: Lists from local node (all nodes have same data)
# FEDERATED: Aggregates from all nodes
curl -X GET "http://localhost:9001/configs" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"

# Filter by category
curl -X GET "http://localhost:9001/configs?category=database" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MySecretKey123"
```

### Check Root Status

```bash
curl -X GET "http://localhost:9001/" \
  -H "X-API-Key: cluster-secret-key-123"
```

**Response:**
```json
{
  "service": "OpenSecureConf API",
  "version": "2.0.0",
  "features": ["encryption", "multithreading", "async", "api-key-auth", "clustering"],
  "api_key_required": true,
  "cluster_enabled": true,
  "cluster_mode": "replica",
  "endpoints": {
    "create": "POST /configs",
    "read": "GET /configs/{key}",
    "update": "PUT /configs/{key}",
    "delete": "DELETE /configs/{key}",
    "list": "GET /configs",
    "cluster_status": "GET /cluster/status"
  }
}
```

## 🔒 Security

### Hybrid Key Derivation
- **Random Component**: 64-byte (512-bit) salt generated with `secrets.token_bytes()`
- **User Component**: User-defined key provided via `X-User-Key` header
- **Cluster Sync**: Salt is automatically synchronized across all nodes on startup

### Encryption Details
- **Algorithm**: PBKDF2-HMAC-SHA256 with 480,000 iterations (OWASP recommended)
- **Cipher**: Fernet (AES-128 in CBC mode with HMAC-SHA256 authentication)
- **Storage**: All values encrypted at rest in SQLite database
- **Thread Safety**: Connection pooling with check_same_thread=False

### Cluster Security
- **API Key**: Same API key required on all nodes for inter-node communication
- **Salt Distribution**: Automatic bootstrap with deterministic node selection
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
✅ Monitor cluster health with `/cluster/status` endpoint  
✅ Regular backups of database and salt file  
❌ Never commit `.env`, `encryption.salt`, or database files to version control  
❌ Never use default API keys in production  
❌ Never expose cluster without API key authentication  

## 🔐 Encryption Salt Management in Cluster

### Automatic Salt Synchronization

**Bootstrap Process:**
1. All nodes start simultaneously
2. Nodes check if they have an `encryption.salt` file
3. **Bootstrap node** (first alphabetically by node_id) generates the salt
4. Bootstrap node distributes salt to all other nodes
5. Other nodes receive and save the salt
6. All nodes end up with identical salt

### Verification

```bash
# Check salt on all nodes (should be identical)
docker exec opensecureconf-node1 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node2 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node3 sha256sum /app/data/encryption.salt

# All hashes must be identical!
```

### Manual Salt Distribution (if needed)

```bash
# Generate on first node
docker exec node1 cat /app/data/encryption.salt > encryption.salt

# Copy to other nodes before starting
docker cp encryption.salt node2:/app/data/
docker cp encryption.salt node3:/app/data/

# Verify
docker exec node2 sha256sum /app/data/encryption.salt
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

### Cluster Sizing Recommendations

**REPLICA Mode:**
- ✅ 2-5 nodes: Optimal
- ⚠️ 6-10 nodes: Manageable but high overhead
- ❌ 10+ nodes: Not recommended (use FEDERATED)

**FEDERATED Mode:**
- ✅ 5-50 nodes: Optimal
- ⚠️ 50+ nodes: Consider sharding

## 📁 Project Structure

```
OpenSecureConf/
├── config_manager.py           # Core encryption & database logic
├── cluster_manager.py          # Cluster management (NEW)
├── api.py                      # FastAPI REST endpoints with clustering
├── test_example.py             # Usage examples and test suite
├── requirements.txt            # Python dependencies (includes httpx)
├── Dockerfile                  # Container image definition
├── docker-compose-replica.yml  # REPLICA cluster setup
├── docker-compose-federated.yml # FEDERATED cluster setup
├── .env.example                # Example environment configuration
├── .env                        # Your environment (gitignored)
├── CLUSTER_GUIDE.md            # Detailed clustering guide (NEW)
├── CLUSTER_MANAGER_DOCS.md     # API documentation (NEW)
└── cluster_examples.py         # Code examples (NEW)
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

# Create data directory
RUN mkdir -p /app/data

# Environment defaults
ENV OSC_HOST_PORT=9000
ENV OSC_WORKERS=4
ENV OSC_CLUSTER_ENABLED=false

EXPOSE 9000

VOLUME ["/app/data"]

CMD ["python", "api.py"]
```

## 🎯 Use Cases

### With Clustering

- **High Availability Systems**: REPLICA mode for mission-critical configurations
- **Geographic Distribution**: FEDERATED mode for multi-region deployments
- **Microservices at Scale**: Centralized config with horizontal scaling
- **Disaster Recovery**: Automatic failover with REPLICA mode
- **Load Balancing**: Distribute read load across cluster nodes
- **Multi-Datacenter**: FEDERATED mode for data sovereignty
- **Development/Staging/Production**: Separate clusters per environment

### General

- **Credential Vaulting**: Secure storage for API keys, passwords, tokens
- **Environment Settings**: Manage configurations with environment variables
- **Secret Management**: On-premise alternative to cloud secret managers
- **Multi-Tenant Systems**: Per-user encryption keys with cluster-wide API key

## 🧪 Testing

### Single Node Testing

```bash
export OSC_CLUSTER_ENABLED=false
export OSC_API_KEY_REQUIRED=false
export OSC_HOST_PORT=9000
python api.py

# In another terminal
python test_example.py
```

### Cluster Testing (REPLICA)

```bash
# Start cluster
docker-compose -f docker-compose-replica.yml up -d

# Wait for startup (10 seconds)
sleep 10

# Test write on node1, read from node2
curl -X POST http://localhost:9001/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -H "Content-Type: application/json" \
  -d '{"key":"test","value":{"foo":"bar"},"category":"test"}'

# Should work thanks to replication!
curl http://localhost:9002/configs/test \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"

# Check cluster status
curl http://localhost:9001/cluster/status \
  -H "X-API-Key: cluster-secret-key-123"
```

### Cluster Testing (FEDERATED)

```bash
# Start cluster
docker-compose -f docker-compose-federated.yml up -d

# Write to node1
curl -X POST http://localhost:9001/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -d '{"key":"eu-config","value":{"region":"eu"}}'

# Write to node2
curl -X POST http://localhost:9002/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -d '{"key":"us-config","value":{"region":"us"}}'

# Read eu-config from node2 (distributed query!)
curl http://localhost:9002/configs/eu-config \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"

# List all from any node (aggregated!)
curl http://localhost:9003/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"
```

## 🐳 Production Deployment

### Kubernetes Deployment (REPLICA Cluster)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opensecureconf-config
data:
  OSC_HOST_PORT: "9000"
  OSC_WORKERS: "4"
  OSC_DATABASE_PATH: "/app/data/configurations.db"
  OSC_SALT_FILE_PATH: "/app/data/encryption.salt"
  OSC_MIN_USER_KEY_LENGTH: "12"
  OSC_API_KEY_REQUIRED: "true"
  OSC_CLUSTER_ENABLED: "true"
  OSC_CLUSTER_MODE: "replica"
  OSC_CLUSTER_SYNC_INTERVAL: "30"
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
spec:
  type: ClusterIP
  selector:
    app: opensecureconf
  ports:
    - port: 9000
      targetPort: 9000
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
        - containerPort: 9000
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
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
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

Built with [FastAPI](https://fastapi.tiangolo.com/), [Cryptography](https://cryptography.io/), [SQLAlchemy](https://www.sqlalchemy.org/), and [httpx](https://www.python-httpx.org/)

---

**Made with ❤️ for secure distributed configuration management**
