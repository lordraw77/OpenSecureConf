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

Includes Prometheus metrics for monitoring:
- HTTP request metrics (count, duration, status codes)
- Configuration operations (create, read, update, delete, list)
- Cluster health and synchronization
- Encryption operations tracking
"""

import os
from typing import Optional
import asyncio
import time
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from config_manager import ConfigurationManager
from cluster_manager import ClusterManager, ClusterMode
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import CollectorRegistry

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

# Metriche Prometheus
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
    version="2.1.0",
    lifespan=lifespan
)


# Middleware per tracking delle richieste HTTP
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Middleware per raccogliere metriche HTTP"""
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time

    # Registra metriche (skip /metrics endpoint per evitare loop)
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


class ConfigUpdate(BaseModel):
    """Model for updating an existing configuration entry"""
    value: dict = Field(...)
    category: Optional[str] = Field(None, max_length=100)


class ConfigResponse(BaseModel):
    """Model for configuration response"""
    id: int
    key: str
    category: Optional[str]
    value: dict


class ClusterStatusResponse(BaseModel):
    """Model for cluster status response"""
    enabled: bool
    mode: Optional[str]
    node_id: Optional[str]
    total_nodes: Optional[int]
    healthy_nodes: Optional[int]


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
    except Exception: # nosec B110
        pass


# API Endpoints
@app.get("/")
async def root(api_key_validated: None = Depends(validate_api_key)):
    """Root endpoint providing API information"""
    return {
        "service": "OpenSecureConf API",
        "version": "2.1.0",
        "features": ["encryption", "multithreading", "async", "api-key-auth", "clustering", "prometheus-metrics"],
        "api_key_required": OSC_API_KEY_REQUIRED,
        "cluster_enabled": OSC_CLUSTER_ENABLED,
        "cluster_mode": OSC_CLUSTER_MODE if OSC_CLUSTER_ENABLED else None,
        "endpoints": {
            "create": "POST /configs",
            "read": "GET /configs/{key}",
            "update": "PUT /configs/{key}",
            "delete": "DELETE /configs/{key}",
            "list": "GET /configs",
            "cluster_status": "GET /cluster/status",
            "cluster_health": "GET /cluster/health",
            "metrics": "GET /metrics",
        },
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    # Aggiorna metriche dinamiche del cluster
    if OSC_CLUSTER_ENABLED and cluster_manager:
        status = cluster_manager.get_cluster_status()
        cluster_nodes_healthy.set(status['healthy_nodes'])
        cluster_nodes_total.set(status['total_nodes'])

    return Response(
        content=generate_latest(metrics_registry),
        media_type=CONTENT_TYPE_LATEST
    )


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


@app.get("/cluster/health")
async def cluster_health():
    """Health check endpoint for cluster nodes (no auth required for internal use)"""
    return {"status": "healthy", "node_id": OSC_CLUSTER_NODE_ID}


@app.get("/cluster/configs")
async def cluster_list_configs(
    category: Optional[str] = None,
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """Internal endpoint for cluster synchronization - lists all configs"""
    try:
        result = await asyncio.to_thread(manager.list_all, category=category)
        return result
    except Exception as e:
        api_errors_total.labels(endpoint="/cluster/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.post("/configs", response_model=ConfigResponse, status_code=201)
async def create_configuration(
    config: ConfigCreate,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """Create a new encrypted configuration entry"""
    try:
        # Create locally
        result = await asyncio.to_thread(
            manager.create, key=config.key, value=config.value, category=config.category
        )

        # Metriche
        config_operations_total.labels(operation='create', status='success').inc()
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
        api_errors_total.labels(endpoint="/configs", error_type="validation_error").inc()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='create', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/configs/{key}", response_model=ConfigResponse)
async def read_configuration(
    key: str,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """Read and decrypt a configuration entry by key"""
    try:
        # Try local first
        try:
            result = await asyncio.to_thread(manager.read, key=key)

            # Metriche
            config_operations_total.labels(operation='read', status='success').inc()
            encryption_operations_total.labels(operation='decrypt').inc()

            return result
        except ValueError:
            # If not found locally and FEDERATED mode, query other nodes
            if OSC_CLUSTER_ENABLED and cluster_manager and cluster_manager.cluster_mode == ClusterMode.FEDERATED:
                result = await cluster_manager.federated_read(key, x_user_key)
                if result:
                    config_operations_total.labels(operation='read', status='success').inc()
                    encryption_operations_total.labels(operation='decrypt').inc()
                    return result

            # Not found anywhere
            raise ValueError("Configuration with key '" + key + "' not found")  # pylint: disable=raise-missing-from
    except ValueError as e:
        config_operations_total.labels(operation='read', status='not_found').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='read', status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.put("/configs/{key}", response_model=ConfigResponse)
async def update_configuration(
    key: str,
    config: ConfigUpdate,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """Update an existing configuration entry"""
    try:
        result = await asyncio.to_thread(
            manager.update, key=key, value=config.value, category=config.category
        )

        # Metriche
        config_operations_total.labels(operation='update', status='success').inc()
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
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='update', status='error').inc()
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

        # Metriche
        config_operations_total.labels(operation='delete', status='success').inc()

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
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        config_operations_total.labels(operation='delete', status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/configs", response_model=list[ConfigResponse])
async def list_configurations(
    category: Optional[str] = None,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """List all configurations with optional category filter"""
    try:
        # Get local configurations
        result = await asyncio.to_thread(manager.list_all, category=category)

        # Metriche
        config_operations_total.labels(operation='list', status='success').inc()

        # If FEDERATED mode, also get from other nodes
        if OSC_CLUSTER_ENABLED and cluster_manager and cluster_manager.cluster_mode == ClusterMode.FEDERATED:
            remote_configs = await cluster_manager.federated_list(category, x_user_key)
            # Merge results (avoid duplicates)
            local_keys = {c["key"] for c in result}
            for remote_config in remote_configs:
                if remote_config["key"] not in local_keys:
                    result.append(remote_config)

        return result
    except Exception as e:
        config_operations_total.labels(operation='list', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


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
