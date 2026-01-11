# OpenSecureConf 🔐

**Secure Configuration Management System with Python Client & REST API**

A complete Python-based solution for encrypted configuration management featuring a FastAPI server with hybrid encryption and a PyPI-published client library. Store, retrieve, and distribute encrypted settings securely with multithreading support and async operations.

[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![PyPI](https://img.shields.io/pypi/v/opensecureconf-client)](https://pypi.org/project/opensecureconf-client/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🎯 Overview

OpenSecureConf provides a complete ecosystem for secure configuration management:

- **🖥️ Server**: FastAPI-based REST API with hybrid encryption (PBKDF2 + Fernet)
- **📦 Client**: Python library published on PyPI for easy integration
- **🔒 Security**: Military-grade encryption with 64-byte salt and 480k iterations
- **⚡ Performance**: Async operations with multithreading support (100-200+ req/s)
- **💾 Storage**: Thread-safe SQLite with connection pooling

## 🚀 Quick Start

### Install the Client

```bash
pip install opensecureconf-client
```

### Use in Your Python Code

```python
from opensecureconf_client import OpenSecureConfClient

# Connect to your OpenSecureConf server
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="my-secure-key-min-8-chars"
)

# Store encrypted configuration
config = client.create(
    key="database",
    value={"host": "localhost", "port": 5432, "password": "secret"},
    category="production"
)

# Retrieve and decrypt
db_config = client.read("database")
print(db_config["value"])  # {'host': 'localhost', 'port': 5432, 'password': 'secret'}
```

## 📁 Repository Structure

```
OpenSecureConf/
├── server/                  # FastAPI REST API server
│   ├── api.py              # REST endpoints (async)
│   ├── config_manager.py   # Encryption & database logic
│   ├── requirements.txt
│   └── README.md
│
├── client/                  # Python client library
│   ├── opensecureconf_client.py
│   ├── pyproject.toml      # PyPI package configuration
│   ├── example_usage.py
│   ├── README.md
│   └── dist/               # Built packages for PyPI
│
└── README.md               # This file
```

## 🔧 Server Setup

### Installation

```bash
cd server
pip install -r requirements.txt
```

### Run Server

```bash
# Development (single worker)
python api.py

# Production (4 workers for high concurrency)
uvicorn api:app --host 0.0.0.0 --port 9000 --workers 4
```

Server will be available at:
- API: `http://localhost:9000`
- Interactive docs: `http://localhost:9000/docs`

### Server Features

- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 (480k iterations) + Fernet cipher
- 🌐 **Async REST API**: Non-blocking endpoints with `asyncio.to_thread()`
- ⚡ **Multithreading**: Multiple worker processes for concurrent operations
- 💾 **Thread-Safe Storage**: SQLite with connection pooling
- 🔑 **Enhanced Security**: 64-byte (512-bit) random salt
- ✅ **Production Ready**: Input validation, header authentication, error handling

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
- 🛡️ **Type-Safe**: Full type hints and error handling
- 🔄 **Context Manager**: Automatic resource cleanup
- 📦 **Lightweight**: Only depends on `requests`
- 🔌 **PyPI Published**: Easy installation and version management

### Usage Examples

#### Basic Operations

```python
from opensecureconf_client import OpenSecureConfClient

# Initialize client
client = OpenSecureConfClient(
    base_url="http://localhost:9000",
    user_key="your-encryption-key"
)

# CREATE
config = client.create("api_key", {"token": "abc123"}, category="secrets")

# READ
config = client.read("api_key")

# UPDATE
client.update("api_key", {"token": "xyz789"})

# DELETE
client.delete("api_key")

# LIST
all_configs = client.list_all(category="secrets")

# Close connection
client.close()
```

#### Using Context Manager

```python
with OpenSecureConfClient(base_url="http://localhost:9000", user_key="my-key") as client:
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
    print("Invalid user key")
except ConfigurationExistsError:
    print("Configuration already exists")
except ConfigurationNotFoundError:
    print("Configuration not found")
```

## 🔒 Security Architecture

### Encryption Process

1. **Random Salt Generation**: 64-byte (512-bit) salt via `secrets.token_bytes()`
2. **Key Derivation**: PBKDF2-HMAC-SHA256 with 480,000 iterations (OWASP recommended)
3. **Encryption**: Fernet cipher (AES-128-CBC + HMAC-SHA256)
4. **Storage**: Encrypted values stored in SQLite with thread-safe access

### Authentication

All API requests require the `x-user-key` header:

```bash
curl -X GET "http://localhost:9000/configs/mykey"   -H "x-user-key: YourSecretKey123"
```

### Best Practices

✅ **Use strong user keys**: Minimum 12 characters, mixed case, numbers, symbols  
✅ **Secure salt file**: Keep `server/encryption.salt` backed up and secure  
✅ **Use HTTPS**: Always use TLS in production  
✅ **Rotate keys**: Change user keys periodically  
✅ **Worker configuration**: Set workers to 2-4x CPU cores  
❌ **Never commit**: Don't commit `encryption.salt` or database files to Git

## 🌐 API Endpoints

All endpoints require `x-user-key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service information |
| POST | `/configs` | Create configuration |
| GET | `/configs/{key}` | Read configuration |
| PUT | `/configs/{key}` | Update configuration |
| DELETE | `/configs/{key}` | Delete configuration |
| GET | `/configs?category=X` | List configurations |

### Example API Calls

```bash
# Create
curl -X POST "http://localhost:9000/configs"   -H "x-user-key: MyKey123"   -H "Content-Type: application/json"   -d '{"key": "db", "value": {"host": "localhost"}, "category": "prod"}'

# Read
curl -X GET "http://localhost:9000/configs/db"   -H "x-user-key: MyKey123"

# Update
curl -X PUT "http://localhost:9000/configs/db"   -H "x-user-key: MyKey123"   -H "Content-Type: application/json"   -d '{"value": {"host": "prod.server.com"}}'

# Delete
curl -X DELETE "http://localhost:9000/configs/db"   -H "x-user-key: MyKey123"

# List
curl -X GET "http://localhost:9000/configs?category=prod"   -H "x-user-key: MyKey123"
```

## ⚡ Performance

### Benchmarks

- **Single Worker**: 10-20 requests/second
- **4 Workers**: 100-200+ requests/second
- **8 Workers**: 200-400+ requests/second

### Optimization Tips

```python
# Server configuration (api.py)
uvicorn.run(
    "api:app",
    workers=4,  # Adjust based on CPU cores (2-4x recommended)
    host="0.0.0.0",
    port=9000
)
```

## 🎯 Use Cases

- **Microservices Configuration**: Centralized config distribution across services
- **Credential Vaulting**: Secure storage for API keys, passwords, database credentials
- **Environment Management**: Separate dev/staging/production configurations
- **Secret Management**: On-premise alternative to cloud secret managers (AWS Secrets, Vault)
- **Multi-Tenant Applications**: Per-tenant encrypted configurations
- **CI/CD Pipelines**: Secure configuration injection during deployment

## 🧪 Development

### Server Development

```bash
cd server
pip install -r requirements.txt
python test_example.py  # Run tests
python api.py           # Start development server
```

### Client Development

```bash
cd client
pip install -e ".[dev]"  # Install with dev dependencies
pytest                    # Run tests
black opensecureconf_client.py  # Format code
flake8 opensecureconf_client.py # Lint code
```

### Publishing Client to PyPI

```bash
cd client
python -m build
python -m twine upload dist/*
```

See `client/PUBLISHING_GUIDE.md` for detailed instructions.

## 📚 Documentation

- **Server Documentation**: [server/README.md](server/README.md)
- **Client Documentation**: [client/README.md](client/README.md)
- **Publishing Guide**: [client/PUBLISHING_GUIDE.md](client/PUBLISHING_GUIDE.md)
- **Package Structure**: [client/STRUCTURE.md](client/STRUCTURE.md)
- **API Interactive Docs**: `http://localhost:9000/docs` (when server is running)

## 🔗 Links

- **GitHub Repository**: [https://github.com/lordraw77/OpenSecureConf](https://github.com/lordraw77/OpenSecureConf)
- **PyPI Package**: [https://pypi.org/project/opensecureconf-client/](https://pypi.org/project/opensecureconf-client/)
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
- [Requests](https://requests.readthedocs.io/) - HTTP library for Python

## 💡 Why OpenSecureConf?

✅ **Self-Hosted**: Full control over your data and infrastructure  
✅ **Open Source**: Transparent, auditable code under MIT license  
✅ **Production Ready**: Battle-tested encryption and performance  
✅ **Easy Integration**: Simple Python client, REST API for any language  
✅ **No Vendor Lock-in**: Standard technologies (SQLite, REST, Python)  
✅ **Cost Effective**: Free alternative to commercial secret management services  

---

**Made with ❤️ for secure configuration management**

*For questions, issues, or feature requests, please open an issue on GitHub.*
