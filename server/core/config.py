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
# pylint: disable=redefined-outer-name
# pylint: disable=global-statement
# pylint: disable=import-error
# pylint: disable=pointless-string-statement
# pylint: disable=invalid-name
# pylint: disable=ungrouped-imports


"""
Configuration Module for OpenSecureConf API

This module centralizes all environment variable loading and configuration management
for the OpenSecureConf REST API server. It reads configuration from environment variables
with sensible defaults, making the application highly configurable without code changes.

The configuration is organized into logical sections:
- Server Configuration: Host, port, workers, database paths
- Security Configuration: API keys, encryption settings
- Cluster Configuration: Distributed system settings
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
    OSC_CLUSTER_MODE: Cluster mode type - replica or federated (default: replica)
    OSC_CLUSTER_NODE_ID: Unique identifier for this cluster node (default: node-{port})
    OSC_CLUSTER_NODES: Comma-separated list of cluster nodes (default: empty)
    OSC_CLUSTER_SYNC_INTERVAL: Cluster synchronization interval in seconds (default: 30)
    prometheus_multiproc_dir: Directory for Prometheus multiprocess metrics (default: ./prometheus_multiproc)

Usage:
    from core.config import OSC_HOST, OSC_HOST_PORT, OSC_API_KEY_REQUIRED

    if OSC_API_KEY_REQUIRED:
        # Perform API key validation
        pass
"""

import os


# =============================================================================
# SERVER CONFIGURATION
# =============================================================================

# Server host address - IP address where the server will listen for connections
# Use 0.0.0.0 to listen on all network interfaces (useful for Docker containers)
# Use 127.0.0.1 for localhost-only access (more secure for single-machine deployments)
OSC_HOST = os.getenv("OSC_HOST", "127.0.0.1")

# Server port number - TCP port for HTTP connections
# Default: 9000 (non-privileged port, doesn't require root access)
# Common alternatives: 8000, 8080, 3000
OSC_HOST_PORT = int(os.getenv("OSC_HOST_PORT", "9000"))

# Number of Uvicorn worker processes
# Multiple workers enable parallel request handling and improve throughput
# Recommended: Number of CPU cores or 2 * CPU cores
# More workers = more memory usage but better concurrency
OSC_WORKERS = int(os.getenv("OSC_WORKERS", "4"))


# =============================================================================
# HTTPS/SSL CONFIGURATION
# =============================================================================

# Enable/disable HTTPS
# When enabled, server will use SSL/TLS encryption
# Requires valid SSL certificate and key files
OSC_HTTPS_ENABLED = os.getenv("OSC_HTTPS_ENABLED", "false").lower() == "true"

# Path to SSL certificate file
# For production: Use certificate from Let's Encrypt or trusted CA
# For development: Use self-signed certificate
# Example: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
OSC_SSL_CERTFILE = os.getenv("OSC_SSL_CERTFILE", "./cert.pem")

# Path to SSL private key file
# CRITICAL: Keep this file secure with restricted permissions (chmod 600)
# Example: /etc/letsencrypt/live/yourdomain.com/privkey.pem
OSC_SSL_KEYFILE = os.getenv("OSC_SSL_KEYFILE", "./key.pem")

# Optional: Password for encrypted private key
OSC_SSL_KEYFILE_PASSWORD = os.getenv("OSC_SSL_KEYFILE_PASSWORD", None)

# Optional: Path to CA certificate bundle for client certificate verification
OSC_SSL_CA_CERTS = os.getenv("OSC_SSL_CA_CERTS", None)



# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

# SQLite database file path
# This file stores all encrypted configuration entries
# Can be a relative path (relative to working directory) or absolute path
# For production, consider using an absolute path or mounted volume
OSC_DATABASE_PATH = os.getenv("OSC_DATABASE_PATH", "configurations.db")


# =============================================================================
# ENCRYPTION CONFIGURATION
# =============================================================================

# Encryption salt file path
# The salt is used for key derivation in the encryption process
# CRITICAL: This file must be kept secure and backed up
# In cluster mode, all nodes must share the same salt file
# The salt is a 64-byte random value generated on first startup
OSC_SALT_FILE_PATH = os.getenv("OSC_SALT_FILE_PATH", "encryption.salt")

# Minimum user key length for encryption
# Enforces minimum security requirements for user-provided encryption keys
# Lower values = weaker security but more convenience
# Recommended minimum: 8-16 characters
# For high security: 32+ characters
OSC_MIN_USER_KEY_LENGTH = int(os.getenv("OSC_MIN_USER_KEY_LENGTH", "8"))


# =============================================================================
# AUTHENTICATION CONFIGURATION
# =============================================================================

# Enable/disable API key authentication
# When enabled, all requests must include valid X-API-Key header
# Recommended: true for production, false for development/testing
# Converted from string to boolean (supports "true", "True", "TRUE", "1")
OSC_API_KEY_REQUIRED = os.getenv("OSC_API_KEY_REQUIRED", "false").lower() == "true"

# API key for authentication
# Used when OSC_API_KEY_REQUIRED is true
# SECURITY WARNING: Change this default value in production!
# Should be a long, random string (32+ characters recommended)
# Can be generated with: python -c "import secrets; print(secrets.token_urlsafe(32))"
OSC_API_KEY = os.getenv("OSC_API_KEY", "your-super-secret-api-key-here")


# =============================================================================
# CLUSTER CONFIGURATION
# =============================================================================

# Enable/disable cluster mode
# When enabled, multiple OpenSecureConf nodes can work together
# Supports two modes: REPLICA (active-active replication) and FEDERATED (distributed)
# Recommended: false for single-node deployments, true for high availability
OSC_CLUSTER_ENABLED = os.getenv("OSC_CLUSTER_ENABLED", "false").lower() == "true"

# Cluster operating mode
# REPLICA: All nodes maintain complete copies of all data (active-active replication)
#          - Automatic synchronization on create/update/delete
#          - Read requests served from local node (fast)
#          - Write requests broadcast to all nodes
#          - Best for: High availability, read-heavy workloads
# FEDERATED: Data distributed across nodes (sharded/partitioned)
#            - Each key stored on one node
#            - Read requests may query multiple nodes
#            - Write requests go to owning node only
#            - Best for: Large datasets, horizontal scaling
OSC_CLUSTER_MODE = os.getenv("OSC_CLUSTER_MODE", "replica")

# Unique identifier for this cluster node
# Must be unique across all nodes in the cluster
# Used for cluster coordination and debugging
# Format recommendation: node-{hostname} or node-{datacenter}-{number}
# Default: node-{port} (e.g., node-9000, node-9001)
OSC_CLUSTER_NODE_ID = os.getenv("OSC_CLUSTER_NODE_ID", f"node-{OSC_HOST_PORT}")

# List of other cluster nodes
# Comma-separated list of node addresses in format: host:port,host:port
# Example: "192.168.1.10:9000,192.168.1.11:9000,192.168.1.12:9000"
# Should NOT include the current node's address
# Used for cluster discovery and communication
OSC_CLUSTER_NODES = os.getenv("OSC_CLUSTER_NODES", "").split(",") if os.getenv("OSC_CLUSTER_NODES") else []

# Cluster synchronization interval (seconds)
# How often to check cluster health and synchronize state
# Lower values = faster convergence but more network overhead
# Higher values = less network traffic but slower failure detection
# Recommended range: 10-60 seconds
OSC_CLUSTER_SYNC_INTERVAL = int(os.getenv("OSC_CLUSTER_SYNC_INTERVAL", "30"))

prometheus_multiproc_dir = os.getenv("prometheus_multiproc_dir", "prometheus_multiproc")
# =============================================================================
# APPLICATION METADATA
# =============================================================================

# Application version - updated with each release
# Used in API responses and health checks
# Follows semantic versioning: MAJOR.MINOR.PATCH
APP_VERSION = "2.3.2"

# Application title - displayed in API documentation
APP_TITLE = "OpenSecureConf API"

# Application description - displayed in API documentation
APP_DESCRIPTION = """
REST API for encrypted configuration management with clustering support and Prometheus metrics.

Features:
- AES-256 encryption for all configuration values
- Multi-threaded and asynchronous request handling
- API key authentication
- Cluster support (REPLICA and FEDERATED modes)
- Prometheus metrics for monitoring
- Timestamp tracking for all entries
- Environment-based configuration segregation
- Backup and restore with encryption
- Comprehensive statistics and health checks
"""
