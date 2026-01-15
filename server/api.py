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
OpenSecureConf - REST API Module with Clustering Support and Prometheus Metrics

FastAPI-based REST API for encrypted configuration management.
Supports two clustering modes:
1. REPLICA: Active-active replication with automatic synchronization
2. FEDERATED: Distributed storage with cross-node queries

Enhanced with:
- Timestamp tracking (created_at, updated_at)
- Environment field for configuration segregation
- Short/Full response modes for read operations
- Statistics endpoints for monitoring
- Backup/Import endpoints with encryption
- Cluster distribution analytics

Includes Prometheus metrics for monitoring:
- HTTP request metrics (count, duration, status codes)
- Configuration operations (create, read, update, delete, list)
- Cluster health and synchronization
- Encryption operations tracking
"""

import os
from typing import Optional, Literal
import asyncio
import time
import json
import base64
import secrets


from contextlib import asynccontextmanager
from datetime import datetime
import httpx
from pydantic import BaseModel, Field
from config_manager import ConfigurationManager
from cluster_manager import ClusterManager, ClusterMode
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response, Query
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import CollectorRegistry
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# Load environment variables
OSC_HOST_PORT = int(os.getenv("OSC_HOST_PORT", "9000"))
OSC_WORKERS = int(os.getenv("OSC_WORKERS", "4"))
OSC_DATABASE_PATH = os.getenv("OSC_DATABASE_PATH", "configurations.db")
OSC_SALT_FILE_PATH = os.getenv("OSC_SALT_FILE_PATH", "encryption.salt")
OSC_MIN_USER_KEY_LENGTH = int(os.getenv("OSC_MIN_USER_KEY_LENGTH", "8"))
OSC_API_KEY_REQUIRED = os.getenv("OSC_API_KEY_REQUIRED", "false").lower() == "true"
OSC_API_KEY = os.getenv("OSC_API_KEY", "your-super-secret-api-key-here")
OSC_HOST = os.getenv("OSC_HOST", "127.0.0.1")

# Cluster configuration
OSC_CLUSTER_ENABLED = os.getenv("OSC_CLUSTER_ENABLED", "false").lower() == "true"
OSC_CLUSTER_MODE = os.getenv("OSC_CLUSTER_MODE", "replica")  # replica or federated
OSC_CLUSTER_NODE_ID = os.getenv("OSC_CLUSTER_NODE_ID", f"node-{OSC_HOST_PORT}")
OSC_CLUSTER_NODES = os.getenv("OSC_CLUSTER_NODES", "").split(",")  # host:port,host:port
OSC_CLUSTER_SYNC_INTERVAL = int(os.getenv("OSC_CLUSTER_SYNC_INTERVAL", "30"))

# Global cluster manager instance
cluster_manager: Optional[ClusterManager] = None

# Prometheus metrics registry
metrics_registry = CollectorRegistry()

# Prometheus metrics
http_requests_total = Counter(
    'osc_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code'],
    registry=metrics_registry
)

http_request_duration_seconds = Histogram(
    'osc_http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint'],
    registry=metrics_registry
)

config_operations_total = Counter(
    'osc_config_operations_total',
    'Total configuration operations',
    ['operation', 'status'],
    registry=metrics_registry
)

config_entries_total = Gauge(
    'osc_config_entries_total',
    'Total number of configuration entries',
    registry=metrics_registry
)

cluster_nodes_healthy = Gauge(
    'osc_cluster_nodes_healthy',
    'Number of healthy cluster nodes',
    registry=metrics_registry
)

cluster_nodes_total = Gauge(
    'osc_cluster_nodes_total',
    'Total number of cluster nodes',
    registry=metrics_registry
)

cluster_sync_duration_seconds = Histogram(
    'osc_cluster_sync_duration_seconds',
    'Cluster synchronization duration in seconds',
    registry=metrics_registry
)

encryption_operations_total = Counter(
    'osc_encryption_operations_total',
    'Total encryption/decryption operations',
    ['operation'],
    registry=metrics_registry
)

api_errors_total = Counter(
    'osc_api_errors_total',
    'Total API errors',
    ['endpoint', 'error_type'],
    registry=metrics_registry
)

# New metrics for read/write operations tracking
config_read_operations = Counter(
    'osc_config_read_operations_total',
    'Total configuration read operations',
    ['status'],
    registry=metrics_registry
)

config_write_operations = Counter(
    'osc_config_write_operations_total',
    'Total configuration write operations (create/update/delete)',
    ['operation', 'status'],
    registry=metrics_registry
)


@asynccontextmanager
async def lifespan(app: FastAPI):  # pylint: disable=redefined-outer-name
    """Application lifespan manager with salt synchronization"""
    global cluster_manager  # pylint: disable=global-statement

    # Startup
    if OSC_CLUSTER_ENABLED:
        cluster_manager = ClusterManager(
            node_id=OSC_CLUSTER_NODE_ID,
            cluster_mode=OSC_CLUSTER_MODE,
            cluster_nodes=OSC_CLUSTER_NODES,
            api_key=OSC_API_KEY if OSC_API_KEY_REQUIRED else None,
            sync_interval=OSC_CLUSTER_SYNC_INTERVAL
        )

        await cluster_manager.start()
        print(f"✅ Cluster started in {OSC_CLUSTER_MODE.upper()} mode")
        print(f"   Node ID: {OSC_CLUSTER_NODE_ID}")
        print(f"   Cluster nodes: {len(cluster_manager.nodes)}")

        # Update cluster metrics
        cluster_nodes_total.set(len(cluster_manager.nodes))

        # 🔐 Salt synchronization
        print("\n🔐 Synchronizing encryption salt...")
        salt_synced = await cluster_manager.sync_encryption_salt(OSC_SALT_FILE_PATH)
        if salt_synced:
            print("   ✅ Salt synchronized across cluster")
        else:
            print("   ⚠️ Salt synchronization incomplete - check cluster connectivity")

    yield

    # Shutdown
    if cluster_manager:
        await cluster_manager.stop()
        print("🛑 Cluster stopped")


# Initialize FastAPI application
app = FastAPI(
    title="OpenSecureConf API",
    description="REST API for encrypted configuration management with clustering support and Prometheus metrics",
    version="2.2.0",
    lifespan=lifespan
)


# Middleware for tracking HTTP requests
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Middleware to collect HTTP metrics"""
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    # Register metrics (skip /metrics endpoint to avoid loop)
    if request.url.path != "/metrics":
        http_requests_total.labels(
            method=request.method,
            endpoint=request.url.path,
            status_code=response.status_code
        ).inc()

        http_request_duration_seconds.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)

    return response


# Pydantic models
class ConfigCreate(BaseModel):
    """Model for creating a new configuration entry"""
    key: str = Field(..., min_length=1, max_length=255)
    value: dict = Field(...)
    category: Optional[str] = Field(None, max_length=100)
    environment: Optional[str] = Field(None, max_length=100)


class ConfigUpdate(BaseModel):
    """Model for updating an existing configuration entry"""
    value: dict = Field(...)
    category: Optional[str] = Field(None, max_length=100)
    environment: Optional[str] = Field(None, max_length=100)


class ConfigResponse(BaseModel):
    """Model for configuration response (short mode)"""
    id: int
    key: str
    category: Optional[str]
    environment: Optional[str]
    value: dict


class ConfigResponseFull(BaseModel):
    """Model for configuration response (full mode with timestamps)"""
    id: int
    key: str
    category: Optional[str]
    environment: Optional[str]
    value: dict
    created_at: str
    updated_at: str


class ClusterStatusResponse(BaseModel):
    """Model for cluster status response"""
    enabled: bool
    mode: Optional[str]
    node_id: Optional[str]
    total_nodes: Optional[int]
    healthy_nodes: Optional[int]


class StatisticsResponse(BaseModel):
    """Model for statistics response"""
    total_keys: int
    total_categories: int
    total_environments: int
    keys_by_category: dict
    keys_by_environment: dict


class OperationsStatsResponse(BaseModel):
    """Model for operations statistics response"""
    read_operations: dict
    write_operations: dict
    encryption_operations: dict
    total_http_requests: dict


class ClusterDistributionResponse(BaseModel):
    """Model for cluster distribution response"""
    cluster_mode: str
    is_replica: bool
    all_nodes_synced: bool
    nodes_distribution: list


class BackupResponse(BaseModel):
    """Model for backup response"""
    backup_data: str  # Encrypted and base64-encoded
    total_keys: int
    backup_timestamp: str
    backup_id: str


# Dependencies
def validate_api_key(x_api_key: str = Header(None, alias="X-API-Key")):
    """Validates API key if OSC_API_KEY_REQUIRED is enabled"""
    if OSC_API_KEY_REQUIRED:
        if not x_api_key:
            raise HTTPException(
                status_code=403,
                detail="API key required but missing. Provide X-API-Key header.",
            )
        if x_api_key != OSC_API_KEY:
            raise HTTPException(status_code=403, detail="Invalid API key")


def get_config_manager(
    x_user_key: str = Header(..., description="User encryption key"),
    api_key_validated: None = Depends(validate_api_key),
):
    """Returns ConfigurationManager instance with validated user key"""
    if not x_user_key or len(x_user_key) < OSC_MIN_USER_KEY_LENGTH:
        raise HTTPException(
            status_code=401,
            detail=f"x-user-key header missing or too short (minimum {OSC_MIN_USER_KEY_LENGTH} characters)",
        )

    return ConfigurationManager(
        db_path=OSC_DATABASE_PATH, user_key=x_user_key, salt_file=OSC_SALT_FILE_PATH
    )


# Helper function to update config count metric
async def update_config_count_metric(manager: ConfigurationManager):
    """Update the total config entries gauge"""
    try:
        all_configs = await asyncio.to_thread(manager.list_all)
        config_entries_total.set(len(all_configs))
    except Exception:  # nosec B110
        pass


# Helper function for backup encryption
def create_backup_cipher(backup_password: str, salt: bytes) -> Fernet:
    """
    Create a Fernet cipher for backup encryption/decryption.
    
    Args:
        backup_password (str): Password for backup encryption
        salt (bytes): Salt for key derivation

    Returns:
        Fernet: Initialized cipher for backup operations
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(backup_password.encode()))
    return Fernet(key)


# API Endpoints
@app.get("/")
async def root(api_key_validated: None = Depends(validate_api_key)):
    """Root endpoint providing API information"""
    return {
        "service": "OpenSecureConf API",
        "version": "2.2.0",
        "features": [
            "encryption",
            "multithreading",
            "async",
            "api-key-auth",
            "clustering",
            "prometheus-metrics",
            "timestamps",
            "environments",
            "backup-import",
            "statistics"
        ],
        "api_key_required": OSC_API_KEY_REQUIRED,
        "cluster_enabled": OSC_CLUSTER_ENABLED,
        "cluster_mode": OSC_CLUSTER_MODE if OSC_CLUSTER_ENABLED else None,
        "endpoints": {
            "create": "POST /configs",
            "read": "GET /configs/{key}",
            "update": "PUT /configs/{key}",
            "delete": "DELETE /configs/{key}",
            "list": "GET /configs",
            "statistics": "GET /stats",
            "operations_stats": "GET /stats/operations",
            "cluster_status": "GET /cluster/status",
            "cluster_distribution": "GET /cluster/distribution",
            "cluster_health": "GET /cluster/health",
            "backup": "POST /backup",
            "import": "POST /import",
            "metrics": "GET /metrics",
        },
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    # Update dynamic cluster metrics
    if OSC_CLUSTER_ENABLED and cluster_manager:
        status = cluster_manager.get_cluster_status()
        cluster_nodes_healthy.set(status['healthy_nodes'])
        cluster_nodes_total.set(status['total_nodes'])

    return Response(
        content=generate_latest(metrics_registry),
        media_type=CONTENT_TYPE_LATEST
    )


@app.get("/stats", response_model=StatisticsResponse)
async def get_statistics(
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Get statistics about configurations.
    
    Returns:
        - Total number of keys
        - Number of categories
        - Number of environments
        - Distribution of keys by category
        - Distribution of keys by environment
    """
    try:
        stats = await asyncio.to_thread(manager.get_statistics)
        return stats
    except Exception as e:
        api_errors_total.labels(endpoint="/stats", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/stats/operations", response_model=OperationsStatsResponse)
async def get_operations_statistics(
    api_key_validated: None = Depends(validate_api_key)
):
    """
    Get operations statistics in readable JSON format.
    
    Returns statistics about:
    - Read operations (success/failure)
    - Write operations (create/update/delete with status)
    - Encryption operations
    - HTTP requests by endpoint and status
    
    This is a user-friendly alternative to the Prometheus /metrics endpoint.
    """
    try:
        # Collect metrics from Prometheus registry
        metrics_families = metrics_registry.collect()

        stats = {
            "read_operations": {},
            "write_operations": {},
            "encryption_operations": {},
            "total_http_requests": {}
        }

        for family in metrics_families:
            # Read operations
            if family.name == "osc_config_read_operations_total":
                for sample in family.samples:
                    status = sample.labels.get('status', 'unknown')
                    stats["read_operations"][status] = int(sample.value)

            # Write operations
            elif family.name == "osc_config_write_operations_total":
                for sample in family.samples:
                    operation = sample.labels.get('operation', 'unknown')
                    status = sample.labels.get('status', 'unknown')
                    key = f"{operation}_{status}"
                    stats["write_operations"][key] = int(sample.value)

            # Encryption operations
            elif family.name == "osc_encryption_operations_total":
                for sample in family.samples:
                    operation = sample.labels.get('operation', 'unknown')
                    stats["encryption_operations"][operation] = int(sample.value)

            # HTTP requests
            elif family.name == "osc_http_requests_total":
                for sample in family.samples:
                    method = sample.labels.get('method', 'unknown')
                    endpoint = sample.labels.get('endpoint', 'unknown')
                    status_code = sample.labels.get('status_code', 'unknown')
                    key = f"{method}_{endpoint}_{status_code}"
                    stats["total_http_requests"][key] = int(sample.value)

        return stats

    except Exception as e:
        api_errors_total.labels(endpoint="/stats/operations", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/cluster/status", response_model=ClusterStatusResponse)
async def get_cluster_status(api_key_validated: None = Depends(validate_api_key)):
    """Get cluster status and node information"""
    if not OSC_CLUSTER_ENABLED or not cluster_manager:
        return {
            "enabled": False,
            "mode": None,
            "node_id": None,
            "total_nodes": None,
            "healthy_nodes": None
        }

    status = cluster_manager.get_cluster_status()
    return {
        "enabled": True,
        "mode": status["cluster_mode"],
        "node_id": status["node_id"],
        "total_nodes": status["total_nodes"],
        "healthy_nodes": status["healthy_nodes"]
    }


@app.get("/cluster/distribution", response_model=ClusterDistributionResponse)
async def get_cluster_distribution(
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Get cluster distribution information.
    
    For REPLICA mode:
    - Indicates if all nodes are synchronized
    - Shows number of keys on each node
    
    For FEDERATED mode:
    - Shows distribution of keys across nodes
    """
    if not OSC_CLUSTER_ENABLED or not cluster_manager:
        raise HTTPException(
            status_code=400,
            detail="Clustering is not enabled"
        )
        
    try:
        is_replica = cluster_manager.cluster_mode == ClusterMode.REPLICA

        # Get local keys count
        local_configs = await asyncio.to_thread(manager.list_all)
        local_count = len(local_configs)

        nodes_distribution = []
        all_synced = True

        # Get distribution from all nodes
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Add local node
            nodes_distribution.append({
                "node_id": OSC_CLUSTER_NODE_ID,
                "is_local": True,
                "is_healthy": True,
                "keys_count": local_count
            })

            # Query other nodes
            for node_id, node in cluster_manager.nodes.items():
                try:
                    headers = {"X-User-Key": "cluster-sync-key"}
                    if cluster_manager.api_key:
                        headers["X-API-Key"] = cluster_manager.api_key

                    response = await client.get(
                        f"{node.base_url}/cluster/configs",
                        headers=headers
                    )

                    if response.status_code == 200:
                        remote_configs = response.json()
                        remote_count = len(remote_configs)

                        nodes_distribution.append({
                            "node_id": node_id,
                            "is_local": False,
                            "is_healthy": node.is_healthy,
                            "keys_count": remote_count
                        })

                        # Check if synced (for REPLICA mode)
                        if is_replica and remote_count != local_count:
                            all_synced = False
                    else:
                        nodes_distribution.append({
                            "node_id": node_id,
                            "is_local": False,
                            "is_healthy": False,
                            "keys_count": 0
                        })
                        all_synced = False

                except Exception:
                    nodes_distribution.append({
                        "node_id": node_id,
                        "is_local": False,
                        "is_healthy": False,
                        "keys_count": 0
                    })
                    all_synced = False

        return {
            "cluster_mode": cluster_manager.cluster_mode.value,
            "is_replica": is_replica,
            "all_nodes_synced": all_synced if is_replica else None,
            "nodes_distribution": nodes_distribution
        }

    except HTTPException:
        raise
    except Exception as e:
        api_errors_total.labels(endpoint="/cluster/distribution", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/cluster/health")
async def cluster_health():
    """Health check endpoint for cluster nodes (no auth required for internal use)"""
    return {"status": "healthy", "node_id": OSC_CLUSTER_NODE_ID}


@app.get("/cluster/configs")
async def cluster_list_configs(
    category: Optional[str] = None,
    environment: Optional[str] = None,
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """Internal endpoint for cluster synchronization - lists all configs"""
    try:
        result = await asyncio.to_thread(
            manager.list_all,
            category=category,
            environment=environment,
            include_timestamps=True
        )
        return result
    except Exception as e:
        api_errors_total.labels(endpoint="/cluster/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.post("/configs", response_model=ConfigResponseFull, status_code=201)
async def create_configuration(
    config: ConfigCreate,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Create a new encrypted configuration entry.
    
    Sets created_at and updated_at timestamps automatically.
    Returns full response including timestamps.
    """
    try:
        # Create locally
        result = await asyncio.to_thread(
            manager.create,
            key=config.key,
            value=config.value,
            category=config.category,
            environment=config.environment
        )

        # Metrics
        config_operations_total.labels(operation='create', status='success').inc()
        config_write_operations.labels(operation='create', status='success').inc()
        encryption_operations_total.labels(operation='encrypt').inc()

        # Update total count
        await update_config_count_metric(manager)

        # Broadcast to cluster (REPLICA mode only)
        if OSC_CLUSTER_ENABLED and cluster_manager and cluster_manager.cluster_mode == ClusterMode.REPLICA:
            asyncio.create_task(
                cluster_manager.broadcast_create(
                    config.key, config.value, config.category, x_user_key
                )
            )

        return result

    except ValueError as e:
        config_operations_total.labels(operation='create', status='error').inc()
        config_write_operations.labels(operation='create', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="validation_error").inc()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='create', status='error').inc()
        config_write_operations.labels(operation='create', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/configs/{key}")
async def read_configuration(
    key: str,
    mode: Literal["short", "full"] = Query("short", description="Response mode: short (without timestamps) or full (with timestamps)"),
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Read and decrypt a configuration entry by key.
    
    Args:
        key: Configuration key to retrieve
        mode: Response mode
            - "short": Returns id, key, category, environment, value (default)
            - "full": Includes created_at and updated_at timestamps
    
    Returns:
        Configuration data in requested format
    """
    try:
        # Try local first
        include_timestamps = mode == "full"

        try:
            result = await asyncio.to_thread(
                manager.read,
                key=key,
                include_timestamps=include_timestamps
            )

            # Metrics
            config_operations_total.labels(operation='read', status='success').inc()
            config_read_operations.labels(status='success').inc()
            encryption_operations_total.labels(operation='decrypt').inc()

            return result

        except ValueError:
            # If not found locally and FEDERATED mode, query other nodes
            if OSC_CLUSTER_ENABLED and cluster_manager and cluster_manager.cluster_mode == ClusterMode.FEDERATED:
                result = await cluster_manager.federated_read(key, x_user_key)
                if result:
                    config_operations_total.labels(operation='read', status='success').inc()
                    config_read_operations.labels(status='success').inc()
                    encryption_operations_total.labels(operation='decrypt').inc()

                    # Remove timestamps if short mode
                    if mode == "short" and "created_at" in result:
                        result.pop("created_at", None)
                        result.pop("updated_at", None)

                    return result

            # Not found anywhere
            raise ValueError("Configuration with key '" + key + "' not found")  # pylint: disable=raise-missing-from

    except ValueError as e:
        config_operations_total.labels(operation='read', status='not_found').inc()
        config_read_operations.labels(status='not_found').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='read', status='error').inc()
        config_read_operations.labels(status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.put("/configs/{key}", response_model=ConfigResponseFull)
async def update_configuration(
    key: str,
    config: ConfigUpdate,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Update an existing configuration entry.
    
    Updates the updated_at timestamp automatically.
    Returns full response including timestamps.
    """
    try:
        result = await asyncio.to_thread(
            manager.update,
            key=key,
            value=config.value,
            category=config.category,
            environment=config.environment
        )

        # Metrics
        config_operations_total.labels(operation='update', status='success').inc()
        config_write_operations.labels(operation='update', status='success').inc()
        encryption_operations_total.labels(operation='encrypt').inc()

        # Broadcast to cluster (REPLICA mode only)
        if OSC_CLUSTER_ENABLED and cluster_manager and cluster_manager.cluster_mode == ClusterMode.REPLICA:
            asyncio.create_task(
                cluster_manager.broadcast_update(
                    key, config.value, config.category, x_user_key
                )
            )

        return result

    except ValueError as e:
        config_operations_total.labels(operation='update', status='not_found').inc()
        config_write_operations.labels(operation='update', status='not_found').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='update', status='error').inc()
        config_write_operations.labels(operation='update', status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.delete("/configs/{key}")
async def delete_configuration(
    key: str,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """Delete a configuration entry permanently"""
    try:
        await asyncio.to_thread(manager.delete, key=key)

        # Metrics
        config_operations_total.labels(operation='delete', status='success').inc()
        config_write_operations.labels(operation='delete', status='success').inc()

        # Update total count
        await update_config_count_metric(manager)

        # Broadcast to cluster (REPLICA mode only)
        if OSC_CLUSTER_ENABLED and cluster_manager and cluster_manager.cluster_mode == ClusterMode.REPLICA:
            asyncio.create_task(
                cluster_manager.broadcast_delete(key, x_user_key)
            )

        return {"message": f"Configuration '{key}' deleted successfully"}

    except ValueError as e:
        config_operations_total.labels(operation='delete', status='not_found').inc()
        config_write_operations.labels(operation='delete', status='not_found').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='delete', status='error').inc()
        config_write_operations.labels(operation='delete', status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/configs")
async def list_configurations(
    category: Optional[str] = None,
    environment: Optional[str] = None,
    mode: Literal["short", "full"] = Query("short", description="Response mode: short (without timestamps) or full (with timestamps)"),
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    List all configurations with optional filters.
    
    Args:
        category: Optional category filter
        environment: Optional environment filter
        mode: Response mode
            - "short": Returns configurations without timestamps (default)
            - "full": Includes created_at and updated_at timestamps
    
    Returns:
        List of configurations in requested format
    """
    try:
        include_timestamps = mode == "full"

        # Get local configurations
        result = await asyncio.to_thread(
            manager.list_all,
            category=category,
            environment=environment,
            include_timestamps=include_timestamps
        )

        # Metrics
        config_operations_total.labels(operation='list', status='success').inc()

        # If FEDERATED mode, also get from other nodes
        if OSC_CLUSTER_ENABLED and cluster_manager and cluster_manager.cluster_mode == ClusterMode.FEDERATED:
            remote_configs = await cluster_manager.federated_list(category, x_user_key)

            # Merge results (avoid duplicates)
            local_keys = {c["key"] for c in result}
            for remote_config in remote_configs:
                if remote_config["key"] not in local_keys:
                    # Remove timestamps if short mode
                    if mode == "short":
                        remote_config.pop("created_at", None)
                        remote_config.pop("updated_at", None)
                    result.append(remote_config)

        return result

    except Exception as e:
        config_operations_total.labels(operation='list', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.post("/backup", response_model=BackupResponse)
async def create_backup(
    backup_password: str = Header(..., alias="X-Backup-Password", description="Password for encrypting the backup"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    environment: Optional[str] = Query(None, description="Optional environment filter"),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Create an encrypted backup of all configurations.
    
    The backup includes all configuration data (keys, values, categories, environments, timestamps)
    encrypted with a user-provided password. The backup is portable and can be imported
    on any OpenSecureConf instance.
    
    Args:
        backup_password: Password for encrypting the backup (via X-Backup-Password header)
        category: Optional category filter
        environment: Optional environment filter
    
    Returns:
        Encrypted backup data (base64-encoded), total keys count, timestamp, and backup ID
    """
    try:
        # Get all configurations with timestamps
        configs = await asyncio.to_thread(
            manager.list_all,
            category=category,
            environment=environment,
            include_timestamps=True
        )

        # Create backup data structure
        backup_timestamp = datetime.utcnow().isoformat() + "Z"
        backup_id = f"backup-{int(time.time())}"

        backup_data = {
            "version": "2.2.0",
            "backup_id": backup_id,
            "backup_timestamp": backup_timestamp,
            "total_keys": len(configs),
            "configurations": configs
        }

        # Encrypt backup data
        # Generate salt for backup encryption
        backup_salt = secrets.token_bytes(32)
        cipher = create_backup_cipher(backup_password, backup_salt)

        # Convert to JSON and encrypt
        json_data = json.dumps(backup_data)
        encrypted_data = cipher.encrypt(json_data.encode())

        # Prepend salt to encrypted data (first 32 bytes)
        backup_blob = backup_salt + encrypted_data

        # Base64 encode for transport
        backup_encoded = base64.b64encode(backup_blob).decode()

        return {
            "backup_data": backup_encoded,
            "total_keys": len(configs),
            "backup_timestamp": backup_timestamp,
            "backup_id": backup_id
        }

    except Exception as e:
        api_errors_total.labels(endpoint="/backup", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}") from e


@app.post("/import")
async def import_backup(
    backup_data: str = Query(..., description="Encrypted backup data (base64-encoded)"),
    backup_password: str = Header(..., alias="X-Backup-Password", description="Password for decrypting the backup"),
    overwrite: bool = Query(False, description="If True, overwrites existing keys; if False, skips existing keys"),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Import configurations from an encrypted backup.
    
    Restores configurations from a backup created with the /backup endpoint.
    Requires the same password used to create the backup.
    
    Args:
        backup_data: Base64-encoded encrypted backup data
        backup_password: Password for decrypting the backup (via X-Backup-Password header)
        overwrite: If True, overwrites existing keys; if False, skips them
    
    Returns:
        Import statistics including imported, skipped, and failed keys
    """
    try:
        # Decode base64
        backup_blob = base64.b64decode(backup_data)

        # Extract salt (first 32 bytes) and encrypted data
        if len(backup_blob) < 32:
            raise ValueError("Invalid backup data: too short")

        backup_salt = backup_blob[:32]
        encrypted_data = backup_blob[32:]

        # Decrypt backup data
        cipher = create_backup_cipher(backup_password, backup_salt)

        try:
            decrypted_data = cipher.decrypt(encrypted_data)
        except Exception as decrypt_error:
            raise ValueError("Decryption failed: invalid password or corrupted backup") from decrypt_error

        # Parse JSON
        backup_obj = json.loads(decrypted_data.decode())

        # Validate backup structure
        if not isinstance(backup_obj, dict) or "configurations" not in backup_obj:
            raise ValueError("Invalid backup format")

        configurations = backup_obj["configurations"]

        # Import configurations
        imported = 0
        skipped = 0
        failed = []

        for config in configurations:
            try:
                key = config["key"]
                value = config["value"]
                category = config.get("category")
                environment = config.get("environment")

                # Check if key exists
                try:
                    await asyncio.to_thread(manager.read, key=key)
                    # Key exists
                    if overwrite:
                        await asyncio.to_thread(
                            manager.update,
                            key=key,
                            value=value,
                            category=category,
                            environment=environment
                        )
                        imported += 1
                    else:
                        skipped += 1
                except ValueError:
                    # Key doesn't exist, create it
                    await asyncio.to_thread(
                        manager.create,
                        key=key,
                        value=value,
                        category=category,
                        environment=environment
                    )
                    imported += 1

            except Exception as import_error:
                failed.append({
                    "key": config.get("key", "unknown"),
                    "error": str(import_error)
                })

        # Update total count
        await update_config_count_metric(manager)

        return {
            "message": "Import completed",
            "backup_id": backup_obj.get("backup_id", "unknown"),
            "backup_timestamp": backup_obj.get("backup_timestamp", "unknown"),
            "total_in_backup": len(configurations),
            "imported": imported,
            "skipped": skipped,
            "failed": len(failed),
            "failed_keys": failed
        }

    except ValueError as e:
        api_errors_total.labels(endpoint="/import", error_type="validation_error").inc()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        api_errors_total.labels(endpoint="/import", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}") from e


@app.get("/cluster/salt")
async def get_cluster_salt(api_key_validated: None = Depends(validate_api_key)):
    """
    Get the encryption salt file (for cluster synchronization).
    Returns the raw salt bytes to be used by other nodes.
    """
    if not os.path.exists(OSC_SALT_FILE_PATH):
        raise HTTPException(
            status_code=404,
            detail="Salt file not found on this node"
        )

    try:
        with open(OSC_SALT_FILE_PATH, 'rb') as f:
            salt_data = f.read()

        return Response(
            content=salt_data,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": "attachment; filename=encryption.salt"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read salt file: {str(e)}"
        ) from e


@app.post("/cluster/salt")
async def receive_cluster_salt(
    request: Request,
    api_key_validated: None = Depends(validate_api_key)
):
    """
    Receive and save encryption salt from another cluster node.
    This endpoint is called during cluster bootstrap to synchronize
    the encryption salt across all nodes.
    """
    # Check if we already have a salt file
    if os.path.exists(OSC_SALT_FILE_PATH):
        # Verify it matches the received one
        existing_salt = open(OSC_SALT_FILE_PATH, 'rb').read()
        received_salt = await request.body()

        if existing_salt == received_salt:
            return {"message": "Salt already present and matches", "status": "ok"}
        else:
            raise HTTPException(
                status_code=409,
                detail="Salt file already exists and differs from received salt"
            )

    try:
        # Save received salt
        salt_data = await request.body()

        # Validate salt size (should be 64 bytes)
        if len(salt_data) != 64:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid salt size: {len(salt_data)} bytes (expected 64)"
            )

        # Create directory if needed
        os.makedirs(os.path.dirname(OSC_SALT_FILE_PATH), exist_ok=True)

        with open(OSC_SALT_FILE_PATH, 'wb') as f:
            f.write(salt_data)

        return {
            "message": "Salt received and saved successfully",
            "status": "created",
            "size_bytes": len(salt_data)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save salt file: {str(e)}"
        ) from e


# Application entry point
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api:app",
        host=OSC_HOST,
        port=OSC_HOST_PORT,
        workers=OSC_WORKERS,
        reload=False,
        log_level="info",
    )
