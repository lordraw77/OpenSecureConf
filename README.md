# OpenSecureConf 🔐

**Encrypted Configuration Manager with REST API & Multithreading**

A Python-based secure configuration management system with hybrid encryption, thread-safe operations, and RESTful API distribution. Features async endpoints for maximum concurrency and support for multiple workers.

[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Features

- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 with 480k iterations + Fernet cipher (AES-128-CBC + HMAC-SHA256)
- 💾 **Thread-Safe Storage**: SQLite with connection pooling and concurrent access support
- 🌐 **Async REST API**: Non-blocking endpoints with asyncio.to_thread() for parallel requests
- ⚡ **Multithreading**: Multiple worker processes for high-performance concurrent operations
- 🔑 **Enhanced Security**: 64-byte (512-bit) salt for maximum collision resistance
- ✅ **Production Ready**: Input validation, header authentication, connection pooling
- 📊 **High Performance**: 100-200+ requests/second with 4 workers

## 📋 Requirements

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
cryptography==42.0.0
pydantic==2.5.0
sqlalchemy==2.0.25
python-dotenv==1.0.0
```

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/OpenSecureConf.git
cd OpenSecureConf

# Install dependencies
pip install -r requirements.txt
```

## 🏃 Quick Start

### Single Worker (Development)
```bash
python api.py
```

### Multiple Workers (Production)
```bash
# Method 1: Direct uvicorn command
uvicorn api:app --host 0.0.0.0 --port 9000 --workers 4

# Method 2: Using gunicorn with uvicorn workers
gunicorn api:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:9000
```

Server runs on `http://localhost:9000`  
Interactive docs at `http://localhost:9000/docs`

## 📖 API Usage

All requests require the `x-user-key` header for encryption/decryption.

### CREATE Configuration

```bash
curl -X POST "http://localhost:9000/configs" \
  -H "x-user-key: YourSecretKey123" \
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

### READ Configuration

```bash
curl -X GET "http://localhost:9000/configs/database_prod" \
  -H "x-user-key: YourSecretKey123"
```

### UPDATE Configuration

```bash
curl -X PUT "http://localhost:9000/configs/database_prod" \
  -H "x-user-key: YourSecretKey123" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {"host": "new-server.com", "port": 5433},
    "category": "database"
  }'
```

### DELETE Configuration

```bash
curl -X DELETE "http://localhost:9000/configs/database_prod" \
  -H "x-user-key: YourSecretKey123"
```

### LIST All Configurations

```bash
# List all
curl -X GET "http://localhost:9000/configs" \
  -H "x-user-key: YourSecretKey123"

# Filter by category
curl -X GET "http://localhost:9000/configs?category=database" \
  -H "x-user-key: YourSecretKey123"
```

## 🔒 Security

### Hybrid Key Derivation
- **Random Component**: 64-byte (512-bit) salt generated with `secrets.token_bytes()` (stored in `encryption.salt`)
- **User Component**: User-defined key provided via `x-user-key` header (minimum 8 characters)

### Encryption Details
- **Algorithm**: PBKDF2-HMAC-SHA256 with 480,000 iterations (OWASP recommended)
- **Cipher**: Fernet (AES-128 in CBC mode with HMAC-SHA256 authentication)
- **Storage**: All values encrypted at rest in SQLite database
- **Thread Safety**: Connection pooling with check_same_thread=False

### Best Practices
✅ Use strong user keys (minimum 12 characters, mixed case, numbers, symbols)  
✅ Keep `encryption.salt` file secure and backed up  
✅ Use HTTPS in production environments  
✅ Rotate user keys periodically  
✅ Configure workers based on CPU cores (2-4x recommended)  
❌ Never commit `encryption.salt` or database files to version control

## ⚡ Performance

### Multithreading Configuration

```python
# In api.py - adjust workers based on your CPU
uvicorn.run(
    "api:app",
    host="0.0.0.0",
    port=9000,
    workers=4,  # 2-4x CPU cores recommended
    reload=False
)
```

### Expected Performance
- **Single Worker**: 10-20 requests/second
- **4 Workers**: 100-200+ requests/second
- **8 Workers**: 200-400+ requests/second

### Connection Pool Settings
```python
# Thread-safe SQLite configuration
pool_size=10          # Base connections
max_overflow=20       # Extra connections
timeout=30            # Lock wait timeout
```

## 📁 Project Structure

```
OpenSecureConf/
├── config_manager.py    # Core encryption & database logic (thread-safe)
├── api.py              # FastAPI REST endpoints (async)
├── test_example.py     # Usage examples and test suite
├── requirements.txt    # Python dependencies
├── configurations.db   # SQLite database (generated)
└── encryption.salt     # Encryption salt (generated)
```

## 🎯 Use Cases

- **Microservices Configuration**: Centralized encrypted config distribution
- **Credential Vaulting**: Secure storage for API keys, passwords, tokens
- **Environment Settings**: Manage dev/staging/prod configurations
- **Secret Management**: On-premise alternative to cloud secret managers
- **High-Traffic APIs**: Concurrent access with multiple workers

## 🧪 Testing

```bash
# Start the server
python api.py

# In another terminal, run tests
python test_example.py
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with [FastAPI](https://fastapi.tiangolo.com/), [Cryptography](https://cryptography.io/), and [SQLAlchemy](https://www.sqlalchemy.org/)

---

**Made with ❤️ for secure configuration management**
