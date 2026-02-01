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
Pydantic Data Models for OpenSecureConf API

This module defines all Pydantic models used for request validation, response serialization,
and API documentation. Pydantic provides automatic validation, serialization, and generates
OpenAPI schemas for FastAPI.

Model Categories:
1. Configuration Models: Create, update, and response models for config entries
2. Cluster Models: Status and distribution information for cluster operations
3. Statistics Models: Analytics and metrics data structures
4. Backup Models: Backup and restore operation data structures

All models include:
- Field validation rules (min/max length, types, optional fields)
- JSON schema generation for API documentation
- Automatic serialization/deserialization
- Type hints for IDE autocompletion

Usage:
    from core.models import ConfigCreate, ConfigResponse

    # Request validation
    config = ConfigCreate(key="api_key", value={"token": "secret"})

    # Response serialization
    response = ConfigResponse(**db_record)
"""

from typing import Optional, Literal, Union
from pydantic import BaseModel, Field


# =============================================================================
# CONFIGURATION MODELS
# =============================================================================

class ConfigCreate(BaseModel):
    """
    Request model for creating a new configuration entry.

    This model validates incoming POST requests to /configs endpoint.
    All configuration values are stored encrypted in the database.

    Attributes:
        key: Unique identifier for the configuration (1-255 characters)
             Used for retrieval and updates. Cannot contain null bytes.
             Example: "database.password", "api.key", "feature.enabled"

        value: Configuration data as JSON dictionary
               Can contain any valid JSON structure (objects, arrays, primitives)
               Will be encrypted before storage using AES-256
               Example: {"host": "localhost", "port": 5432}

        category: Optional grouping label for configurations (max 100 chars)
                  Used for filtering and organization
                  Example: "database", "api", "feature_flags"
                  Default: None (uncategorized)

        environment: Optional environment identifier (max 100 chars)
                     Used for environment-specific configurations
                     Example: "production", "staging", "development"
                     Default: None (environment-agnostic)

    Validation Rules:
        - key: Required, 1-255 characters
        - value: Required, must be valid JSON dictionary
        - category: Optional, max 100 characters
        - environment: Optional, max 100 characters

    Example:
        {
            "key": "database.postgres.main",
            "value": {
                "host": "db.example.com",
                "port": 5432,
                "database": "myapp",
                "ssl": true
            },
            "category": "database",
            "environment": "production"
        }
    """
    key: str = Field(
        ...,  # Required field
        min_length=1,
        max_length=255,
        description="Unique configuration key identifier"
    )

    value: Union[dict, str, int, bool, list] = Field(
        ...,
        description="Configuration value (dict, string, int, bool, or list - will be encrypted)"
    )

    category: Optional[str] = Field(
        None,  # Optional field
        max_length=100,
        description="Optional category for grouping configurations"
    )

    environment: Optional[str] = Field(
        None,  # Optional field
        max_length=100,
        description="Optional environment identifier (e.g., production, staging)"
    )


class ConfigUpdate(BaseModel):
    """
    Request model for updating an existing configuration entry.

    This model validates incoming PUT requests to /configs/{key} endpoint.
    Only the value, category, and environment can be updated - the key is immutable.

    Attributes:
        value: New configuration data as JSON dictionary
               Replaces the existing encrypted value completely (not merged)
               Example: {"host": "newdb.example.com", "port": 5432}

        category: New category label or None to remove category
                  Updates the category metadata
                  Example: "database_v2"

        environment: New environment identifier or None to remove environment
                     Updates the environment metadata
                     Example: "production_eu"

    Validation Rules:
        - value: Required, must be valid JSON dictionary
        - category: Optional, max 100 characters
        - environment: Optional, max 100 characters

    Note:
        - The key cannot be changed (it's the primary identifier)
        - To change a key, delete the old entry and create a new one
        - The update operation replaces the entire value (not a merge)
        - Timestamps (updated_at) are automatically updated

    Example:
        {
            "value": {
                "host": "db2.example.com",
                "port": 5433,
                "database": "myapp_v2",
                "ssl": true,
                "pool_size": 20
            },
            "category": "database",
            "environment": "production"
        }
    """
    value: Union[dict, str, int, bool, list] = Field(
        ...,
        description="New configuration value (dict, string, int, bool, or list - will be encrypted)"
    )

    category: Optional[str] = Field(
        None,  # Optional field
        max_length=100,
        description="Optional category for grouping configurations"
    )

    environment: Optional[str] = Field(
        None,  # Optional field
        max_length=100,
        description="Optional environment identifier"
    )


class ConfigResponse(BaseModel):
    """
    Response model for configuration entry (short format).

    This model is used when responding to GET requests with mode=short (default).
    It includes all essential configuration data but excludes timestamps for
    compact responses and reduced bandwidth usage.

    Attributes:
        id: Database auto-increment primary key
            Unique identifier assigned by the database
            Example: 42

        key: Configuration key identifier
             Same as the key provided during creation
             Example: "database.postgres.main"

        category: Category label for grouping (if set)
                  None if no category was assigned
                  Example: "database"

        environment: Environment identifier (if set)
                     None if no environment was assigned
                     Example: "production"

        value: Decrypted configuration value as JSON dictionary
               Automatically decrypted using the user's encryption key
               Example: {"host": "db.example.com", "port": 5432}

    Use Cases:
        - List operations (GET /configs) - compact listing
        - Quick lookups where timestamps aren't needed
        - API responses where bandwidth is a concern
        - Client applications that don't track changes

    Example:
        {
            "id": 42,
            "key": "database.postgres.main",
            "category": "database",
            "environment": "production",
            "value": {
                "host": "db.example.com",
                "port": 5432,
                "database": "myapp"
            }
        }
    """
    id: int = Field(description="Database record ID")
    key: str = Field(description="Configuration key")
    category: Optional[str] = Field(description="Category label")
    environment: Optional[str] = Field(description="Environment identifier")
    value: Union[dict, str, int, bool, list] = Field(
        description="Decrypted configuration value"
    )

class ConfigResponseFull(BaseModel):
    """
    Response model for configuration entry (full format with timestamps).

    This model is used when responding to GET requests with mode=full.
    It includes all configuration data plus creation and modification timestamps.
    Useful for auditing, change tracking, and synchronization scenarios.

    Attributes:
        id: Database auto-increment primary key
            Example: 42

        key: Configuration key identifier
             Example: "database.postgres.main"

        category: Category label for grouping (if set)
                  Example: "database"

        environment: Environment identifier (if set)
                     Example: "production"

        value: Decrypted configuration value as JSON dictionary
               Example: {"host": "db.example.com", "port": 5432}

        created_at: ISO 8601 timestamp when entry was first created
                    Format: YYYY-MM-DDTHH:MM:SS.ffffffZ (UTC timezone)
                    Never changes after creation
                    Example: "2026-01-15T10:30:45.123456Z"

        updated_at: ISO 8601 timestamp of last modification
                    Format: YYYY-MM-DDTHH:MM:SS.ffffffZ (UTC timezone)
                    Updated on every PUT operation
                    Initially equals created_at
                    Example: "2026-01-15T14:22:10.987654Z"

    Use Cases:
        - Audit trails and compliance logging
        - Change tracking and history
        - Cluster synchronization (detect stale data)
        - Backup and restore operations
        - Debugging and troubleshooting

    Example:
        {
            "id": 42,
            "key": "database.postgres.main",
            "category": "database",
            "environment": "production",
            "value": {
                "host": "db.example.com",
                "port": 5432
            },
            "created_at": "2026-01-15T10:30:45.123456Z",
            "updated_at": "2026-01-15T14:22:10.987654Z"
        }
    """
    id: int = Field(description="Database record ID")
    key: str = Field(description="Configuration key")
    category: Optional[str] = Field(description="Category label")
    environment: Optional[str] = Field(description="Environment identifier")
    value: Union[dict, str, int, bool, list] = Field(
        description="Decrypted configuration value"
    )
    created_at: str = Field(description="Creation timestamp (ISO 8601 UTC)")
    updated_at: str = Field(description="Last update timestamp (ISO 8601 UTC)")


# =============================================================================
# CLUSTER MODELS
# =============================================================================

class ClusterStatusResponse(BaseModel):
    """
    Response model for cluster status information.

    Provides high-level overview of cluster health and configuration.
    Used by monitoring systems and administrators to verify cluster state.

    Attributes:
        enabled: Whether cluster mode is active
                 False for standalone deployments
                 True when OSC_CLUSTER_ENABLED=true

        mode: Cluster operating mode (if enabled)
              "replica" - Active-active replication mode
              "federated" - Distributed storage mode
              None if clustering is disabled

        node_id: Unique identifier of this cluster node (if enabled)
                 Example: "node-9000", "node-us-east-1"
                 None if clustering is disabled

        total_nodes: Total number of nodes in cluster configuration (if enabled)
                     Includes both healthy and unhealthy nodes
                     Excludes the current node
                     None if clustering is disabled

        healthy_nodes: Number of reachable/responsive nodes (if enabled)
                       Nodes that passed recent health checks
                       Used to determine cluster availability
                       None if clustering is disabled

    Health Determination:
        - A node is "healthy" if it responds to /cluster/health within timeout
        - Health checks performed every OSC_CLUSTER_SYNC_INTERVAL seconds
        - Unhealthy nodes are retried on next health check cycle

    Example (Cluster Enabled):
        {
            "enabled": true,
            "mode": "replica",
            "node_id": "node-us-east-1",
            "total_nodes": 3,
            "healthy_nodes": 2
        }

    Example (Cluster Disabled):
        {
            "enabled": false,
            "mode": null,
            "node_id": null,
            "total_nodes": null,
            "healthy_nodes": null
        }
    """
    enabled: bool = Field(description="Whether clustering is enabled")
    mode: Optional[str] = Field(description="Cluster mode (replica or federated)")
    node_id: Optional[str] = Field(description="Unique node identifier")
    total_nodes: Optional[int] = Field(description="Total number of cluster nodes")
    healthy_nodes: Optional[int] = Field(description="Number of healthy nodes")


class ClusterDistributionResponse(BaseModel):
    """
    Response model for cluster data distribution analysis.

    Provides detailed information about how configuration data is distributed
    across cluster nodes. Critical for debugging synchronization issues and
    verifying cluster consistency.

    Attributes:
        cluster_mode: Current cluster operating mode
                      "replica" or "federated"

        is_replica: Boolean flag indicating replica mode
                    True for REPLICA mode (all nodes should have same data)
                    False for FEDERATED mode (data is sharded)

        all_nodes_synced: Synchronization status (REPLICA mode only)
                          True if all nodes have identical key counts
                          False if any node has different key count
                          None for FEDERATED mode (not applicable)

                          Note: This is a simplified check - it only compares counts,
                          not actual key names or values. For deep verification,
                          compare actual configuration keys across nodes.

        nodes_distribution: List of per-node statistics
                            Each entry is a dictionary containing:
                            - node_id: Node identifier
                            - is_local: True for current node, False for remote
                            - is_healthy: True if node is reachable
                            - keys_count: Number of configuration entries on node

    Use Cases:
        - Verify REPLICA mode synchronization
        - Analyze FEDERATED mode data distribution
        - Detect split-brain scenarios
        - Capacity planning and load balancing
        - Debugging cluster issues

    Example (REPLICA mode, fully synced):
        {
            "cluster_mode": "replica",
            "is_replica": true,
            "all_nodes_synced": true,
            "nodes_distribution": [
                {
                    "node_id": "node-9000",
                    "is_local": true,
                    "is_healthy": true,
                    "keys_count": 150
                },
                {
                    "node_id": "node-9001",
                    "is_local": false,
                    "is_healthy": true,
                    "keys_count": 150
                },
                {
                    "node_id": "node-9002",
                    "is_local": false,
                    "is_healthy": true,
                    "keys_count": 150
                }
            ]
        }

    Example (REPLICA mode, out of sync):
        {
            "cluster_mode": "replica",
            "is_replica": true,
            "all_nodes_synced": false,
            "nodes_distribution": [
                {
                    "node_id": "node-9000",
                    "is_local": true,
                    "is_healthy": true,
                    "keys_count": 150
                },
                {
                    "node_id": "node-9001",
                    "is_local": false,
                    "is_healthy": true,
                    "keys_count": 148
                }
            ]
        }

    Example (FEDERATED mode):
        {
            "cluster_mode": "federated",
            "is_replica": false,
            "all_nodes_synced": null,
            "nodes_distribution": [
                {
                    "node_id": "node-9000",
                    "is_local": true,
                    "is_healthy": true,
                    "keys_count": 50
                },
                {
                    "node_id": "node-9001",
                    "is_local": false,
                    "is_healthy": true,
                    "keys_count": 55
                },
                {
                    "node_id": "node-9002",
                    "is_local": false,
                    "is_healthy": true,
                    "keys_count": 45
                }
            ]
        }
    """
    cluster_mode: str = Field(description="Cluster operating mode")
    is_replica: bool = Field(description="True if replica mode")
    all_nodes_synced: Optional[bool] = Field(
        description="True if all nodes have same key count (replica mode only)"
    )
    nodes_distribution: list = Field(
        description="List of node statistics (node_id, is_local, is_healthy, keys_count)"
    )


# =============================================================================
# STATISTICS MODELS
# =============================================================================

class StatisticsResponse(BaseModel):
    """
    Response model for configuration database statistics.

    Provides aggregated analytics about stored configurations.
    Useful for monitoring, capacity planning, and understanding
    configuration organization.

    Attributes:
        total_keys: Total number of configuration entries in database
                    Count of all records regardless of category/environment
                    Example: 150

        total_categories: Number of distinct categories in use
                          Count of unique non-null category values
                          Example: 8

        total_environments: Number of distinct environments in use
                            Count of unique non-null environment values
                            Example: 4

        keys_by_category: Distribution of keys across categories
                          Dictionary mapping category name to count
                          Includes special key "null" for uncategorized entries
                          Example: {
                              "database": 25,
                              "api": 40,
                              "feature_flags": 30,
                              "null": 10
                          }

        keys_by_environment: Distribution of keys across environments
                             Dictionary mapping environment name to count
                             Includes special key "null" for environment-agnostic entries
                             Example: {
                                 "production": 50,
                                 "staging": 45,
                                 "development": 40,
                                 "null": 15
                             }

    Use Cases:
        - Dashboard displays and monitoring
        - Capacity planning
        - Configuration organization analysis
        - Detecting configuration sprawl
        - Compliance reporting

    Example:
        {
            "total_keys": 150,
            "total_categories": 5,
            "total_environments": 3,
            "keys_by_category": {
                "database": 25,
                "api": 40,
                "feature_flags": 30,
                "cache": 20,
                "monitoring": 25,
                "null": 10
            },
            "keys_by_environment": {
                "production": 50,
                "staging": 45,
                "development": 40,
                "null": 15
            }
        }
    """
    total_keys: int = Field(description="Total number of configuration entries")
    total_categories: int = Field(description="Number of distinct categories")
    total_environments: int = Field(description="Number of distinct environments")
    keys_by_category: dict = Field(description="Distribution of keys by category")
    keys_by_environment: dict = Field(description="Distribution of keys by environment")


class OperationsStatsResponse(BaseModel):
    """
    Response model for operations statistics (Prometheus metrics in JSON format).

    Provides human-readable access to Prometheus metrics data.
    This is a user-friendly alternative to the raw Prometheus /metrics endpoint.
    All metrics are cumulative counters that increase over the application lifetime.

    Attributes:
        read_operations: Dictionary of read operation counts by status
                         Keys: "success", "not_found", "error"
                         Values: Integer counts
                         Example: {"success": 1000, "not_found": 25, "error": 5}

        write_operations: Dictionary of write operation counts by type and status
                          Keys: "{operation}_{status}" format
                          Operations: "create", "update", "delete"
                          Status: "success", "error", "not_found"
                          Example: {
                              "create_success": 150,
                              "create_error": 2,
                              "update_success": 80,
                              "update_not_found": 5,
                              "delete_success": 20
                          }

        encryption_operations: Dictionary of encryption/decryption counts
                               Keys: "encrypt", "decrypt"
                               Values: Integer counts
                               Example: {"encrypt": 230, "decrypt": 1025}

        total_http_requests: Dictionary of HTTP request counts by method, endpoint, and status
                             Keys: "{method}_{endpoint}_{status_code}" format
                             Example: {
                                 "GET_/configs_200": 500,
                                 "POST_/configs_201": 150,
                                 "GET_/configs/{key}_404": 25
                             }

    Notes:
        - All counters are cumulative (never decrease except on restart)
        - Metrics are collected via Prometheus middleware
        - For time-series analysis, use the raw /metrics endpoint with Prometheus/Grafana
        - This endpoint is for quick inspection and debugging

    Use Cases:
        - API usage analytics
        - Error rate monitoring
        - Performance debugging
        - Capacity planning
        - Quick health checks

    Example:
        {
            "read_operations": {
                "success": 1000,
                "not_found": 25,
                "error": 5
            },
            "write_operations": {
                "create_success": 150,
                "create_error": 2,
                "update_success": 80,
                "update_not_found": 5,
                "update_error": 1,
                "delete_success": 20,
                "delete_not_found": 3
            },
            "encryption_operations": {
                "encrypt": 230,
                "decrypt": 1025
            },
            "total_http_requests": {
                "GET_/_200": 10,
                "GET_/configs_200": 500,
                "POST_/configs_201": 150,
                "GET_/configs/{key}_200": 475,
                "GET_/configs/{key}_404": 25,
                "PUT_/configs/{key}_200": 80,
                "DELETE_/configs/{key}_200": 20
            }
        }
    """
    read_operations: dict = Field(description="Read operation counts by status")
    write_operations: dict = Field(description="Write operation counts by type and status")
    encryption_operations: dict = Field(description="Encryption/decryption operation counts")
    total_http_requests: dict = Field(description="HTTP request counts by method and endpoint")


# =============================================================================
# BACKUP MODELS
# =============================================================================

class BackupResponse(BaseModel):
    """
    Response model for backup operation.

    Contains encrypted backup data and metadata.
    The backup is fully portable and can be imported on any OpenSecureConf instance.

    Attributes:
        backup_data: Base64-encoded encrypted backup blob
                     Contains all configuration data encrypted with backup password
                     Format: base64(salt[32 bytes] + encrypted_data)
                     Can be stored in file, database, or transmitted over network
                     Example: "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmc="

        total_keys: Number of configuration entries included in backup
                    Used for verification during import
                    Example: 150

        backup_timestamp: ISO 8601 UTC timestamp when backup was created
                          Format: YYYY-MM-DDTHH:MM:SS.ffffffZ
                          Example: "2026-01-15T10:30:45.123456Z"

        backup_id: Unique identifier for this backup
                   Format: "backup-{unix_timestamp}"
                   Example: "backup-1705318245"
                   Used for tracking and auditing

    Security:
        - Backup data is encrypted with PBKDF2-derived key (480,000 iterations)
        - Salt is randomly generated for each backup (32 bytes)
        - Uses Fernet encryption (AES-128 CBC + HMAC)
        - Password is never stored, only known to user

    Use Cases:
        - Regular backup scheduling
        - Disaster recovery
        - Migration between environments
        - Configuration versioning
        - Audit trail preservation

    Example:
        {
            "backup_data": "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSBiYXNlNjQgZW5jb2RlZCBzdHJpbmc=...",
            "total_keys": 150,
            "backup_timestamp": "2026-01-15T10:30:45.123456Z",
            "backup_id": "backup-1705318245"
        }
    """
    backup_data: str = Field(description="Base64-encoded encrypted backup data")
    total_keys: int = Field(description="Number of keys in backup")
    backup_timestamp: str = Field(description="Backup creation timestamp (ISO 8601 UTC)")
    backup_id: str = Field(description="Unique backup identifier")
