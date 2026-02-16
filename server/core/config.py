# pylint: disable=broad-except
# pylint: disable=unused-argument
# pylint: disable=line-too-long
# pylint: disable=unused-variable
# pylint: disable=unused-import
# pylint: disable=consider-using-with
# pylint: disable=no-else-return
# pylint: disable=too-many-instance-attributes
# pylint: disable=too-many-arguments
# pylint: disable=too-many-positional-arguments

"""
Configuration Module for OpenSecureConf API

This module centralizes all environment variable loading and configuration management
for the OpenSecureConf REST API server. It reads configuration from environment variables
with sensible defaults, making the application highly configurable without code changes.

The configuration is organized into logical sections:
- Server Configuration: Host, port, workers, database paths
- Security Configuration: API keys, encryption settings
- Cluster Configuration: Distributed system settings (REPLICA mode)
- Monitoring Configuration: Prometheus metrics settings

All configuration values are loaded once at application startup and exposed as module-level
constants for easy import throughout the application.

Environment Variables:
    OSC_HOST: Server bind address (default: 127.0.0.1)
    OSC_HOST_PORT: Server port number (default: 9000)
    OSC_WORKERS: Number of Uvicorn worker processes (default: 4)
    OSC_DATABASE_PATH: SQLite database file path (default: configurations.db)
    OSC_SALT_FILE_PATH: Encryption salt file path (default: encryption.salt)
    OSC_MIN_USER_KEY_LENGTH: Minimum user key length for encryption (default: 8)
    OSC_API_KEY_REQUIRED: Enable API key authentication (default: false)
    OSC_API_KEY: API key for authentication (default: your-super-secret-api-key-here)
    OSC_CLUSTER_ENABLED: Enable cluster mode (default: false)
    OSC_CLUSTER_MODE: Cluster mode type - replica only (default: replica)
    OSC_CLUSTER_NODE_ID: Unique identifier for this cluster node (default: node-{port})
    OSC_CLUSTER_NODES: Comma-separated list of cluster nodes (default: empty)
    OSC_CLUSTER_SYNC_INTERVAL: Cluster synchronization interval in seconds (default: 30)
    prometheus_multiproc_dir: Directory for Prometheus multiprocess metrics (default: .prometheus_multiproc)

Usage:
    from core.config import OSC_HOST, OSC_HOST_PORT, OSC_API_KEY_REQUIRED

    if OSC_API_KEY_REQUIRED:
        # Perform API key validation
        pass
"""

import os

# === SERVER CONFIGURATION ===
OSC_HOST = os.getenv("OSC_HOST", "127.0.0.1")  # Use 127.0.0.1 for localhost-only access (more secure for single-machine deployments)
OSC_HOST_PORT = int(os.getenv("OSC_HOST_PORT", "9000"))  # Common alternatives: 8000, 8080, 3000
OSC_WORKERS = int(os.getenv("OSC_WORKERS", "4"))  # More workers = more memory usage but better concurrency

# === HTTPS CONFIGURATION ===
OSC_HTTPS_ENABLED = os.getenv("OSC_HTTPS_ENABLED", "false").lower() == "true"  # Requires valid SSL certificate and key files
OSC_SSL_CERTFILE = os.getenv("OSC_SSL_CERTFILE", "./cert.pem")  # Example: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
OSC_SSL_KEYFILE = os.getenv("OSC_SSL_KEYFILE", "./key.pem")  # Example: /etc/letsencrypt/live/yourdomain.com/privkey.pem
OSC_SSL_KEYFILE_PASSWORD = os.getenv("OSC_SSL_KEYFILE_PASSWORD", None)  # Optional: Password for encrypted private key
OSC_SSL_CA_CERTS = os.getenv("OSC_SSL_CA_CERTS", None)  # Optional: Path to CA certificate bundle for client certificate verification

# === DATABASE CONFIGURATION ===
OSC_DATABASE_PATH = os.getenv("OSC_DATABASE_PATH", "configurations.db")  # For production, consider using an absolute path or mounted volume
OSC_SALT_FILE_PATH = os.getenv("OSC_SALT_FILE_PATH", "encryption.salt")  # The salt is a 64-byte random value generated on first startup
OSC_MIN_USER_KEY_LENGTH = int(os.getenv("OSC_MIN_USER_KEY_LENGTH", "8"))  # For high security: 32+ characters

# === SECURITY CONFIGURATION ===
OSC_API_KEY_REQUIRED = os.getenv("OSC_API_KEY_REQUIRED", "false").lower() == "true"  # Converted from string to boolean (supports "true", "True", "TRUE", "1")
OSC_API_KEY = os.getenv("OSC_API_KEY", "your-super-secret-api-key-here")  # Can be generated with: python -c "import secrets; print(secrets.token_urlsafe(32))"

# === CLUSTER CONFIGURATION (REPLICA MODE ONLY) ===
OSC_CLUSTER_ENABLED = os.getenv("OSC_CLUSTER_ENABLED", "false").lower() == "true"  # Recommended: false for single-node deployments, true for high availability
OSC_CLUSTER_MODE = os.getenv("OSC_CLUSTER_MODE", "replica")  # Only "replica" mode is supported
OSC_CLUSTER_NODE_ID = os.getenv("OSC_CLUSTER_NODE_ID", f"node-{OSC_HOST_PORT}")  # Default: node-{port} (e.g., node-9000, node-9001)
OSC_CLUSTER_NODES = os.getenv("OSC_CLUSTER_NODES", "").split(",") if os.getenv("OSC_CLUSTER_NODES") else []  # Used for cluster discovery and communication
OSC_CLUSTER_SYNC_INTERVAL = int(os.getenv("OSC_CLUSTER_SYNC_INTERVAL", "30"))  # Recommended range: 10-60 seconds

# === PROMETHEUS CONFIGURATION ===
prometheus_multiproc_dir = os.getenv("prometheus_multiproc_dir", ".prometheus_multiproc")

# === APPLICATION METADATA ===
APP_VERSION = "3.1.0"  # Follows semantic versioning: MAJOR.MINOR.PATCH
APP_TITLE = "OpenSecureConf API"  # Application title - displayed in API documentation
APP_DESCRIPTION = """
REST API for encrypted configuration management with clustering support and Prometheus metrics.

Features:
- AES-256 encryption for all configuration values
- Multi-threaded and asynchronous request handling
- API key authentication
- Cluster support (REPLICA mode)
- Prometheus metrics for monitoring
- Timestamp tracking for all entries
- Environment-based configuration segregation
- Backup and restore with encryption
- Comprehensive statistics and health checks
"""  # Application description - displayed in API documentation