# OpenSecureConf 🔐

**Secure Configuration Management System with Clustering, Python Client & REST API**

A complete Python-based solution for encrypted configuration management featuring a FastAPI server with hybrid encryption, distributed clustering (REPLICA/FEDERATED modes), and a PyPI-published client library. Store, retrieve, and distribute encrypted settings securely with multithreading support and async operations.

## Badges

### General
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![PyPI](https://img.shields.io/pypi/v/opensecureconf-client)](https://pypi.org/project/opensecureconf-client/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/lordraw77/OpenSecureConf?style=social)](https://github.com/lordraw77/OpenSecureConf)

### Docker
[![Docker Hub](https://img.shields.io/docker/pulls/lordraw/open-secureconfiguration?logo=docker)](https://hub.docker.com/r/lordraw/open-secureconfiguration)
[![Docker Image Size](https://img.shields.io/docker/image-size/lordraw/open-secureconfiguration?logo=docker)](https://hub.docker.com/r/lordraw/open-secureconfiguration)
[![Docker Stars](https://img.shields.io/docker/stars/lordraw/open-secureconfiguration?logo=docker)](https://hub.docker.com/r/lordraw/open-secureconfiguration)
[![Docker Latest](https://img.shields.io/docker/v/lordraw/open-secureconfiguration/latest?label=latest&logo=docker)](https://hub.docker.com/r/lordraw/open-secureconfiguration/tags)

### Security & Encryption
[![Encryption](https://img.shields.io/badge/🔐_encryption-AES--128--CBC_+_HMAC-red)](https://cryptography.io)
[![KDF](https://img.shields.io/badge/🔑_KDF-PBKDF2_(480k_iter)-orange)](https://owasp.org)
[![Salt](https://img.shields.io/badge/salt-512bit_random-green)](https://cryptography.io)
[![OWASP](https://img.shields.io/badge/OWASP-2023+_compliant-darkgreen)](https://owasp.org)

![Security](https://img.shields.io/badge/security-military_grade-darkred?style=for-the-badge&logo=lock)
![Encryption](https://img.shields.io/badge/encryption-AES_128_CBC-red?style=for-the-badge&logo=keycdn)
![KDF](https://img.shields.io/badge/KDF-PBKDF2_HMAC_SHA256-orange?style=for-the-badge&logo=1password)

### Code Quality - Pylint
![server pylint Score](serverpylint.svg)
![gui pylint Score](guipylint.svg)
![client pylint Score](clientpylint.svg)

### Security - Bandit
![server bandit Score](serverbandit.svg)
![gui bandit Score](guibandit.svg)
![client bandit Score](clientbandit.svg)

## 🎯 Overview

OpenSecureConf provides a complete ecosystem for secure configuration management:

- **🖥️ Server**: FastAPI-based REST API with hybrid encryption (PBKDF2 + Fernet)
- **🌐 Clustering**: REPLICA (active-active replication) or FEDERATED (distributed storage) modes
- **🔄 Auto Salt Sync**: Automatic encryption salt distribution across cluster nodes
- **📦 Client**: Python library published on PyPI for easy integration
- **🔒 Security**: Military-grade encryption with 64-byte salt and 480k iterations
- **⚡ Performance**: Async operations with multithreading support (100-200+ req/s per node)
- **💾 Storage**: Thread-safe SQLite with connection pooling
- **🏥 High Availability**: Automatic failover and health monitoring

## 🚀 Quick Start

### Install the Client

```bash
pip install opensecureconf-client
```

### Use in Your Python Code

```python
from opensecureconf_client import OpenSecureConfClient

# Connect to your OpenSecureConf server (or cluster)
client = OpenSecureConfClient(
    base_url="http://localhost:9000",  # Any node in cluster
    user_key="my-secure-key-min-8-chars",
    api_key="cluster-secret-key-123"   # If API key is enabled
)

# Store encrypted configuration (automatically replicated in REPLICA mode)
config = client.create(
    key="database",
    value={"host": "localhost", "port": 5432, "password": "secret"},
    category="production"
)

# Retrieve and decrypt (from any node in cluster)
db_config = client.read("database")
print(db_config["value"])  # {'host': 'localhost', 'port': 5432, 'password': 'secret'}
```

### Deploy a Cluster with Docker Compose

```bash
# Clone repository
git clone https://github.com/lordraw77/OpenSecureConf.git
cd OpenSecureConf/server

# Start 3-node REPLICA cluster
docker-compose -f docker-compose-replica.yml up -d

# Verify cluster status
curl -H "X-API-Key: cluster-secret-key-123" http://localhost:9001/cluster/status
```

## 📁 Repository Structure

```
OpenSecureConf/
├── server/                          # FastAPI REST API server
│   ├── api.py                      # REST endpoints (async with clustering)
│   ├── config_manager.py           # Encryption & database logic
│   ├── cluster_manager.py          # Cluster management (NEW)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose-replica.yml  # REPLICA cluster setup (NEW)
│   ├── docker-compose-federated.yml # FEDERATED cluster setup (NEW)
│   ├── CLUSTER_GUIDE.md            # Clustering documentation (NEW)
│   ├── CLUSTER_MANAGER_DOCS.md     # Technical API docs (NEW)
│   ├── cluster_examples.py         # Code examples (NEW)
│   └── README.md
│
├── client/                          # Python client library
│   ├── opensecureconf_client.py
│   ├── pyproject.toml              # PyPI package configuration
│   ├── example_usage.py
│   ├── README.md
│   └── dist/                       # Built packages for PyPI
│
└── README.md                       # This file
```

## 🌐 Cluster Modes

### REPLICA Mode (Active-Active Replication)

**Perfect for high availability and disaster recovery.**

- All nodes maintain a complete copy of all configurations
- Write operations automatically broadcast to all healthy nodes
- Background synchronization ensures consistency
- Any node can serve any request
- Automatic failover if a node fails

**Use when:**
- High availability is critical
- Frequent reads, moderate writes
- 2-5 nodes cluster
- Data set is manageable

```bash
# Start REPLICA cluster
docker-compose -f docker-compose-replica.yml up -d

# Write to node1, read from node2 - data is everywhere!
curl -X POST http://localhost:9001/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -d '{"key":"config","value":{"foo":"bar"}}'

curl http://localhost:9002/configs/config \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"
```

### FEDERATED Mode (Distributed Storage)

**Perfect for geographic distribution and large datasets.**

- Each node stores only its own configurations
- No automatic replication
- Cross-node queries when data not found locally
- Aggregated list operations across all nodes
- Load distribution

**Use when:**
- Large data volumes
- Geographic distribution required
- Data segregation by region/datacenter
- 5+ nodes cluster
- Frequent writes

```bash
# Start FEDERATED cluster
docker-compose -f docker-compose-federated.yml up -d

# Write to different nodes
curl -X POST http://localhost:9001/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -d '{"key":"eu-config","value":{"region":"eu"}}'

curl -X POST http://localhost:9002/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -d '{"key":"us-config","value":{"region":"us"}}'

# Read eu-config from node2 (cross-node query!)
curl http://localhost:9002/configs/eu-config \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123"
```

## 🔧 Server Setup

### Standalone Mode (Single Node)

```bash
cd server
pip install -r requirements.txt

# Run single node
export CLUSTER_ENABLED=false
python api.py
```

### Cluster Mode

#### Environment Configuration

```bash
# Server Settings
export HOST_PORT=9000
export WORKERS=4

# Security
export API_KEY_REQUIRED=true
export API_KEY=cluster-secret-key-123

# Cluster Configuration
export CLUSTER_ENABLED=true
export CLUSTER_MODE=replica  # or federated
export CLUSTER_NODE_ID=node1:9000
export CLUSTER_NODES=node2:9000,node3:9000
export CLUSTER_SYNC_INTERVAL=30  # seconds (REPLICA only)
```

#### Docker Compose (Recommended)

```bash
# REPLICA cluster (3 nodes)
docker-compose -f docker-compose-replica.yml up -d

# FEDERATED cluster (3 nodes)
docker-compose -f docker-compose-federated.yml up -d

# Check logs
docker-compose logs -f

# Stop cluster
docker-compose down
```

Server will be available at:
- Node 1: `http://localhost:9001` (docs: `/docs`)
- Node 2: `http://localhost:9002`
- Node 3: `http://localhost:9003`

### Server Features

- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 (480k iterations) + Fernet cipher
- 🌐 **Distributed Clustering**: REPLICA or FEDERATED modes with auto-discovery
- 🔄 **Auto Salt Sync**: Bootstrap node generates and distributes salt automatically
- 🌐 **Async REST API**: Non-blocking endpoints with `asyncio.to_thread()`
- ⚡ **Multithreading**: Multiple worker processes per node
- 💾 **Thread-Safe Storage**: SQLite with connection pooling
- 🔑 **API Key Protection**: Inter-node communication secured with API keys
- 🏥 **Health Monitoring**: Automatic health checks and status reporting
- ✅ **Production Ready**: Input validation, error handling, fault tolerance

## 📦 Client Library

### Installation

```bash
pip install opensecureconf-client
```

Or from source:
```bash
cd client
pip install -e .
```

### Client Features

- 🚀 **Simple API**: Intuitive CRUD operations
- 🌐 **Cluster Support**: Works seamlessly with clustered servers
- 🔐 **API Key Support**: Optional API key authentication
- 🛡️ **Type-Safe**: Full type hints and error handling
- 🔄 **Context Manager**: Automatic resource cleanup
- 📦 **Lightweight**: Only depends on `requests`
- 🔌 **PyPI Published**: Easy installation and version management

### Usage Examples

#### Basic Operations with Cluster

```python
from opensecureconf_client import OpenSecureConfClient

# Initialize client (connects to any node)
client = OpenSecureConfClient(
    base_url="http://localhost:9001",  # Primary node
    user_key="your-encryption-key",
    api_key="cluster-secret-key-123"   # Required if API_KEY_REQUIRED=true
)

# CREATE (in REPLICA mode, automatically replicated to all nodes)
config = client.create("api_key", {"token": "abc123"}, category="secrets")

# READ (from any node - REPLICA: local, FEDERATED: may query other nodes)
config = client.read("api_key")

# UPDATE (in REPLICA mode, automatically updated on all nodes)
client.update("api_key", {"token": "xyz789"})

# DELETE (in REPLICA mode, automatically deleted from all nodes)
client.delete("api_key")

# LIST (REPLICA: from local node, FEDERATED: aggregated from all nodes)
all_configs = client.list_all(category="secrets")

# Close connection
client.close()
```

#### Using Context Manager

```python
with OpenSecureConfClient(
    base_url="http://localhost:9001",
    user_key="my-key",
    api_key="cluster-secret-key-123"
) as client:
    config = client.create("temp", {"data": "value"})
    print(config)
# Automatically closes session
```

#### Error Handling

```python
from opensecureconf_client import (
    AuthenticationError,
    ConfigurationNotFoundError,
    ConfigurationExistsError
)

try:
    config = client.create("mykey", {"data": "value"})
except AuthenticationError:
    print("Invalid user key or API key")
except ConfigurationExistsError:
    print("Configuration already exists")
except ConfigurationNotFoundError:
    print("Configuration not found")
```

#### Client Failover (Multiple Nodes)

```python
# Connect to multiple nodes for high availability
nodes = [
    "http://localhost:9001",
    "http://localhost:9002",
    "http://localhost:9003"
]

for node_url in nodes:
    try:
        client = OpenSecureConfClient(
            base_url=node_url,
            user_key="my-key",
            api_key="cluster-secret-key-123"
        )
        config = client.read("important_config")
        print(f"Connected to {node_url}")
        break
    except Exception as e:
        print(f"Node {node_url} failed: {e}")
        continue
```

## 🔒 Security Architecture

### Encryption Process

1. **Random Salt Generation**: 64-byte (512-bit) salt via `secrets.token_bytes()`
2. **Salt Synchronization**: Bootstrap node distributes salt to all cluster nodes
3. **Key Derivation**: PBKDF2-HMAC-SHA256 with 480,000 iterations (OWASP recommended)
4. **Encryption**: Fernet cipher (AES-128-CBC + HMAC-SHA256)
5. **Storage**: Encrypted values stored in SQLite with thread-safe access

### Authentication

#### User Key (Required)
All API requests require the `X-User-Key` header for encryption/decryption:

```bash
curl -X GET "http://localhost:9000/configs/mykey" \
  -H "X-User-Key: YourSecretKey123"
```

#### API Key (Optional but Recommended for Cluster)
Enable API key authentication for inter-node communication:

```bash
curl -X GET "http://localhost:9000/configs/mykey" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: YourSecretKey123"
```

### Cluster Security

- **API Key**: Same API key required on all nodes for secure inter-node communication
- **Salt Distribution**: Automatic bootstrap with deterministic node selection (alphabetical)
- **Network**: Use private network (VPC/VLAN) for cluster communication in production
- **TLS**: Enable HTTPS for all communication in production
- **Firewall**: Restrict cluster ports to only known nodes

### Best Practices

✅ **Use strong user keys**: Minimum 12 characters, mixed case, numbers, symbols  
✅ **Always enable API key in cluster mode**: `API_KEY_REQUIRED=true`  
✅ **Use strong API keys**: Generate with `openssl rand -hex 32`  
✅ **Same API key on all nodes**: Required for inter-node communication  
✅ **Secure salt file**: Keep `server/encryption.salt` backed up  
✅ **Use private network**: VPC/VLAN for cluster communication  
✅ **Use HTTPS/TLS**: Always in production  
✅ **Regular backups**: Database and salt file  
✅ **Monitor cluster health**: Use `/cluster/status` endpoint  
✅ **Worker configuration**: Set workers to 2-4x CPU cores per node  
❌ **Never commit**: Don't commit `.env`, `encryption.salt`, or database files  
❌ **Never use default keys**: Change API keys in production  
❌ **Never expose cluster without API key**: Always use authentication  

## 🔐 Encryption Salt Management in Cluster

### Automatic Salt Synchronization

**Bootstrap Process (Automatic):**

1. All nodes start simultaneously
2. Each node checks for existing `encryption.salt` file
3. **Bootstrap node** (first alphabetically by node_id) generates the salt
4. Bootstrap node waits 2 seconds for other nodes to be ready
5. Bootstrap node distributes salt to all other nodes via POST `/cluster/salt`
6. Other nodes wait for bootstrap node and request salt via GET `/cluster/salt`
7. All nodes end up with identical salt (verified by hash)

**Startup Logs:**
```
node1: 🎲 This node (node1:9000) is bootstrap node - generating salt...
node1: ✅ Salt generated and saved
node1: 📤 Distributing generated salt to cluster...
node1:    ✅ Salt sent to node2:9000
node1:    ✅ Salt sent to node3:9000

node2: ⏳ Waiting for bootstrap node (node1:9000) to generate salt...
node2: ✅ Salt received from node1:9000 (attempt 1)

node3: ⏳ Waiting for bootstrap node (node1:9000) to generate salt...
node3: ✅ Salt received from node1:9000 (attempt 1)
```

### Verification

```bash
# Check salt on all nodes (must be identical)
docker exec opensecureconf-node1 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node2 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node3 sha256sum /app/data/encryption.salt

# All hashes must match!
# Example output:
# a1b2c3... /app/data/encryption.salt  (all nodes same hash)
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

## 🌐 API Endpoints

### Cluster Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cluster/status` | API Key | Get cluster status and health |
| GET | `/cluster/health` | None | Health check (for load balancers) |
| GET | `/cluster/salt` | API Key | Get salt file (inter-node only) |
| POST | `/cluster/salt` | API Key | Receive salt file (inter-node only) |
| GET | `/cluster/configs` | API Key + User Key | Get all configs (for sync) |

### Standard Configuration Endpoints

All endpoints require `X-User-Key` header (and `X-API-Key` if enabled).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service information |
| POST | `/configs` | Create configuration (broadcasts in REPLICA) |
| GET | `/configs/{key}` | Read configuration (cross-node query in FEDERATED) |
| PUT | `/configs/{key}` | Update configuration (broadcasts in REPLICA) |
| DELETE | `/configs/{key}` | Delete configuration (broadcasts in REPLICA) |
| GET | `/configs?category=X` | List configurations (aggregates in FEDERATED) |

### Example API Calls

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
  "healthy_nodes": 2,
  "nodes": [
    {
      "node_id": "node2:9000",
      "host": "node2",
      "port": 9000,
      "is_healthy": true,
      "last_seen": "2026-01-13T18:00:00"
    },
    {
      "node_id": "node3:9000",
      "host": "node3",
      "port": 9000,
      "is_healthy": true,
      "last_seen": "2026-01-13T18:00:00"
    }
  ]
}
```

#### Create Configuration

```bash
# REPLICA: Automatically broadcasts to all nodes
curl -X POST "http://localhost:9001/configs" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MyKey123" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "db",
    "value": {"host": "localhost", "port": 5432},
    "category": "prod"
  }'
```

#### Read Configuration

```bash
# REPLICA: Read from any node (data is local)
# FEDERATED: May query other nodes if not found locally
curl -X GET "http://localhost:9002/configs/db" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MyKey123"
```

#### Update Configuration

```bash
# REPLICA: Automatically broadcasts to all nodes
curl -X PUT "http://localhost:9001/configs/db" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MyKey123" \
  -H "Content-Type: application/json" \
  -d '{"value": {"host": "prod.server.com", "port": 5433}}'
```

#### Delete Configuration

```bash
# REPLICA: Automatically broadcasts to all nodes
curl -X DELETE "http://localhost:9001/configs/db" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MyKey123"
```

#### List Configurations

```bash
# REPLICA: Lists from local node (all nodes have same data)
# FEDERATED: Aggregates from all nodes
curl -X GET "http://localhost:9001/configs?category=prod" \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: MyKey123"
```

## ⚡ Performance

### Cluster Performance Benchmarks

**REPLICA Mode (3 nodes with 4 workers each):**
- **Write Operations**: ~80-150 req/s (includes broadcast overhead)
- **Read Operations**: 900-1800+ req/s (3x100-600 distributed load)
- **Latency**: Low (all data local to each node)
- **Consistency**: Eventual consistency with 30s sync interval

**FEDERATED Mode (3 nodes with 4 workers each):**
- **Write Operations**: 300-600+ req/s (no broadcast, 3x100-200 per node)
- **Read Operations**: 150-450 req/s (may require cross-node queries)
- **Latency**: Variable (depends on data location)
- **Consistency**: Always consistent (single source per key)

### Single Node Performance

- **Single Worker**: 10-20 requests/second
- **4 Workers**: 100-200+ requests/second
- **8 Workers**: 200-400+ requests/second

### Optimization Tips

**Worker Configuration:**
```bash
# Recommended: 2-4x CPU cores per node
export WORKERS=8  # For 4-core CPU
```

**Cluster Sizing:**

REPLICA Mode:
- ✅ 2-5 nodes: Optimal
- ⚠️ 6-10 nodes: Manageable but high broadcast overhead
- ❌ 10+ nodes: Not recommended (use FEDERATED)

FEDERATED Mode:
- ✅ 5-50 nodes: Optimal
- ⚠️ 50+ nodes: Consider sharding

## 🎯 Use Cases

### With Clustering

- **High Availability Systems**: REPLICA mode for mission-critical configurations
- **Geographic Distribution**: FEDERATED mode for multi-region deployments
- **Microservices at Scale**: Centralized config with horizontal scaling
- **Disaster Recovery**: Automatic failover with REPLICA mode
- **Load Balancing**: Distribute read load across cluster nodes
- **Multi-Datacenter**: FEDERATED mode for data sovereignty and compliance
- **Development/Staging/Production**: Separate clusters per environment

### General

- **Credential Vaulting**: Secure storage for API keys, passwords, database credentials
- **Environment Management**: Separate dev/staging/production configurations
- **Secret Management**: On-premise alternative to cloud secret managers (AWS Secrets, HashiCorp Vault)
- **Multi-Tenant Applications**: Per-tenant encrypted configurations
- **CI/CD Pipelines**: Secure configuration injection during deployment
- **Config Distribution**: Centralized config server for distributed applications

## 🧪 Testing

### Single Node Testing

```bash
cd server
export CLUSTER_ENABLED=false
export API_KEY_REQUIRED=false
python api.py

# In another terminal
python test_example.py
```

### Cluster Testing (REPLICA)

```bash
# Start cluster
docker-compose -f docker-compose-replica.yml up -d

# Wait for startup
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

# Verify salt synchronization
docker exec opensecureconf-node1 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node2 sha256sum /app/data/encryption.salt
docker exec opensecureconf-node3 sha256sum /app/data/encryption.salt
# All hashes must be identical!

# Check cluster status
curl http://localhost:9001/cluster/status \
  -H "X-API-Key: cluster-secret-key-123"
```

### Cluster Testing (FEDERATED)

```bash
# Start cluster
docker-compose -f docker-compose-federated.yml up -d

# Write to different nodes
curl -X POST http://localhost:9001/configs \
  -H "X-API-Key: cluster-secret-key-123" \
  -H "X-User-Key: test123" \
  -d '{"key":"eu-config","value":{"region":"eu"}}'

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

### Docker Compose (Recommended)

See `server/docker-compose-replica.yml` or `server/docker-compose-federated.yml` for complete examples.

```yaml
version: '3.8'

services:
  node1:
    image: lordraw/open-secureconfiguration:latest
    ports:
      - "9001:9000"
    environment:
      - CLUSTER_ENABLED=true
      - CLUSTER_MODE=replica
      - CLUSTER_NODE_ID=node1:9000
      - CLUSTER_NODES=node2:9000,node3:9000
      - API_KEY_REQUIRED=true
      - API_KEY=${API_KEY}
    volumes:
      - ./data/node1:/app/data
    networks:
      - cluster_network

  # node2, node3 similar configuration...

networks:
  cluster_network:
    driver: bridge
```

### Kubernetes Deployment

```yaml
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
        image: lordraw/open-secureconfiguration:latest
        ports:
        - containerPort: 9000
        env:
        - name: CLUSTER_ENABLED
          value: "true"
        - name: CLUSTER_MODE
          value: "replica"
        - name: CLUSTER_NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: CLUSTER_NODES
          value: "opensecureconf-0:9000,opensecureconf-1:9000,opensecureconf-2:9000"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: opensecureconf-secret
              key: API_KEY
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

## 📚 Documentation

### Server Documentation
- **[Server README](server/README.md)**: Complete server documentation
- **[Cluster Guide](server/CLUSTER_GUIDE.md)**: Detailed clustering guide with examples
- **[Cluster Manager API](server/CLUSTER_MANAGER_DOCS.md)**: Technical API documentation
- **[Cluster Examples](server/cluster_examples.py)**: Executable code examples

### Client Documentation
- **[Client README](client/README.md)**: Client library documentation
- **[Publishing Guide](client/PUBLISHING_GUIDE.md)**: PyPI publishing instructions
- **[Package Structure](client/STRUCTURE.md)**: Package structure documentation

### Interactive Documentation
- **API Docs**: `http://localhost:9000/docs` (when server is running)
- **ReDoc**: `http://localhost:9000/redoc` (alternative documentation)

## 🔗 Links

- **GitHub Repository**: [https://github.com/lordraw77/OpenSecureConf](https://github.com/lordraw77/OpenSecureConf)
- **PyPI Package**: [https://pypi.org/project/opensecureconf-client/](https://pypi.org/project/opensecureconf-client/)
- **Docker Hub**: [https://hub.docker.com/r/lordraw/open-secureconfiguration](https://hub.docker.com/r/lordraw/open-secureconfiguration)
- **Issue Tracker**: [https://github.com/lordraw77/OpenSecureConf/issues](https://github.com/lordraw77/OpenSecureConf/issues)

## 📄 Requirements

### Server
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
cryptography==42.0.0
pydantic==2.5.0
sqlalchemy==2.0.25
python-dotenv==1.0.0
httpx==0.27.0
```

### Client
```txt
requests>=2.28.0
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) - Modern, fast web framework for APIs
- [Cryptography](https://cryptography.io/) - Cryptographic recipes and primitives
- [SQLAlchemy](https://www.sqlalchemy.org/) - SQL toolkit and ORM
- [httpx](https://www.python-httpx.org/) - Next generation HTTP client
- [Requests](https://requests.readthedocs.io/) - HTTP library for Python

## 💡 Why OpenSecureConf?

✅ **Self-Hosted**: Full control over your data and infrastructure  
✅ **Open Source**: Transparent, auditable code under MIT license  
✅ **Production Ready**: Battle-tested encryption and performance  
✅ **High Availability**: Clustering with automatic failover  
✅ **Easy Integration**: Simple Python client, REST API for any language  
✅ **No Vendor Lock-in**: Standard technologies (SQLite, REST, Python)  
✅ **Cost Effective**: Free alternative to commercial secret management services  
✅ **Scalable**: Horizontal scaling with REPLICA or FEDERATED clustering  

---

**Made with ❤️ for secure distributed configuration management**

*For questions, issues, or feature requests, please open an issue on GitHub.*
