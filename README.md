# OpenSecureConf 🔐

**Encrypted Configuration Manager with REST API**

A Python-based secure configuration management system that combines hybrid encryption with RESTful API distribution. Store and retrieve encrypted settings using a dual-key approach (random salt + user-defined key) with local SQLite database persistence and full CRUD operations exposed via REST API.

[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Features

- 🔐 **Hybrid Encryption**: PBKDF2-HMAC-SHA256 with 480k iterations (OWASP 2023+) + Fernet cipher (AES-128-CBC + HMAC-SHA256)
- 💾 **Local Storage**: Encrypted configuration persistence with SQLite database
- 🌐 **REST API**: Complete CRUD operations via FastAPI with automatic encryption/decryption
- 🔑 **Dual-Key Security**: Combines random 32-byte salt with user-defined key
- ✅ **Production Ready**: Input validation with Pydantic, header-based authentication, interactive API docs
- 📦 **Zero Dependencies Overhead**: Lightweight with minimal required packages

## 📋 Requirements

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
cryptography==42.0.0
pydantic==2.5.0
sqlalchemy==2.0.25
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

```bash
# Start the server
python api.py
```

Server runs on `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

## 📖 API Usage

All requests require the `x-user-key` header for encryption/decryption.

### CREATE Configuration

```bash
curl -X POST "http://localhost:8000/configs" \
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
curl -X GET "http://localhost:8000/configs/database_prod" \
  -H "x-user-key: YourSecretKey123"
```

### UPDATE Configuration

```bash
curl -X PUT "http://localhost:8000/configs/database_prod" \
  -H "x-user-key: YourSecretKey123" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {"host": "new-server.com", "port": 5433},
    "category": "database"
  }'
```

### DELETE Configuration

```bash
curl -X DELETE "http://localhost:8000/configs/database_prod" \
  -H "x-user-key: YourSecretKey123"
```

### LIST All Configurations

```bash
# List all
curl -X GET "http://localhost:8000/configs" \
  -H "x-user-key: YourSecretKey123"

# Filter by category
curl -X GET "http://localhost:8000/configs?category=database" \
  -H "x-user-key: YourSecretKey123"
```

## 🔒 Security

### Hybrid Key Derivation
- **Random Component**: 64-byte salt generated with `secrets.token_bytes()` (stored in `encryption.salt`)
- **User Component**: User-defined key provided via `x-user-key` header (minimum 8 characters)

### Encryption Details
- **Algorithm**: PBKDF2-HMAC-SHA256 with 480,000 iterations (OWASP recommended)
- **Cipher**: Fernet (AES-128 in CBC mode with HMAC-SHA256 authentication)
- **Storage**: All values encrypted at rest in SQLite database

### Best Practices
✅ Use strong user keys (minimum 12 characters, mixed case, numbers, symbols)  
✅ Keep `encryption.salt` file secure and backed up  
✅ Use HTTPS in production environments  
✅ Rotate user keys periodically  
❌ Never commit `encryption.salt` or database files to version control

## 📁 Project Structure

```
OpenSecureConf/
├── config_manager.py    # Core encryption & database logic
├── api.py              # FastAPI REST endpoints
├── test_example.py     # Usage examples
├── requirements.txt    # Python dependencies
├── configurations.db   # SQLite database (generated)
└── encryption.salt     # Encryption salt (generated)
```

## 🎯 Use Cases

- **Microservices Configuration**: Centralized encrypted config distribution
- **Credential Vaulting**: Secure storage for API keys, passwords, tokens
- **Environment Settings**: Manage dev/staging/prod configurations
- **Secret Management**: Alternative to cloud-based secret managers for local/on-premise deployments

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
```
 