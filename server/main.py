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
OpenSecureConf API - Main Application Entry Point

This is the main FastAPI application file that ties everything together.
It initializes the FastAPI app, registers all routers, configures middleware,
and manages application lifecycle (startup/shutdown).
"""

import os
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request
from core.metrics import cleanup_multiprocess_metrics

from cluster_manager import ClusterManager, ClusterMode

from core.config import (
    APP_TITLE, APP_DESCRIPTION, APP_VERSION,
    OSC_HOST, OSC_HOST_PORT, OSC_WORKERS,
    OSC_API_KEY, OSC_API_KEY_REQUIRED,
    OSC_CLUSTER_ENABLED, OSC_CLUSTER_MODE, OSC_CLUSTER_NODE_ID,
    OSC_CLUSTER_NODES, OSC_CLUSTER_SYNC_INTERVAL, OSC_SALT_FILE_PATH,prometheus_multiproc_dir
)
from core.metrics import (
    http_requests_total, http_request_duration_seconds,
    cluster_nodes_total
)

# Import all routers
from routes import main_routes, config_routes, cluster_routes, stats_routes, backup_routes

os.environ['prometheus_multiproc_dir'] = prometheus_multiproc_dir
cleanup_multiprocess_metrics()


# Global cluster manager instance
cluster_manager: Optional[ClusterManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.

    Handles startup and shutdown events for the FastAPI application.
    Initializes cluster manager on startup and cleanly shuts it down on exit.
    """
    global cluster_manager

    # ========== STARTUP ==========
    print(f"\n{'='*60}")
    print(f"🚀 OpenSecureConf API v{APP_VERSION} Starting...")
    print(f"{'='*60}\n")

    if OSC_CLUSTER_ENABLED:
        print("🔗 Initializing cluster mode...")
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

        # Synchronize encryption salt across cluster
        print("\n🔐 Synchronizing encryption salt...")
        salt_synced = await cluster_manager.sync_encryption_salt(OSC_SALT_FILE_PATH)

        if salt_synced:
            print("   ✅ Salt synchronized across cluster")
        else:
            print("   ⚠️  Salt synchronization incomplete - check cluster connectivity")

        # Make cluster_manager available to routes
        main_routes.cluster_manager = cluster_manager
        config_routes.cluster_manager = cluster_manager
        cluster_routes.cluster_manager = cluster_manager

    print(f"\n{'='*60}")
    print("✅ OpenSecureConf API Ready")
    print(f"   Host: {OSC_HOST}:{OSC_HOST_PORT}")
    print(f"   API Key Required: {OSC_API_KEY_REQUIRED}")
    print(f"   Cluster Enabled: {OSC_CLUSTER_ENABLED}")
    print(f"{'='*60}\n")

    yield

    # ========== SHUTDOWN ==========
    print(f"\n{'='*60}")
    print("🛑 Shutting down OpenSecureConf API...")
    print(f"{'='*60}\n")

    if cluster_manager:
        await cluster_manager.stop()
        print("✅ Cluster stopped")

    print("\n👋 Goodbye!\n")


# Initialize FastAPI application
app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan
)


# ========== MIDDLEWARE ==========


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """
    Middleware to track HTTP requests in Prometheus metrics.

    Increments counters and records duration for every HTTP request.
    """
    # Record start time
    start_time = time.time()

    # Get endpoint path (use route pattern for consistency)
    endpoint = request.url.path
    method = request.method

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Get status code
    status_code = str(response.status_code)

    # Increment request counter
    http_requests_total.labels(
        method=method,
        endpoint=endpoint,
        status_code=status_code
    ).inc()

    # Record request duration
    http_request_duration_seconds.labels(
        method=method,
        endpoint=endpoint
    ).observe(duration)

    return response



# ========== REGISTER ROUTERS ==========

app.include_router(main_routes.router)
app.include_router(config_routes.router)
app.include_router(cluster_routes.router)
app.include_router(stats_routes.router)
app.include_router(backup_routes.router)


# ========== APPLICATION ENTRY POINT ==========

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=OSC_HOST,
        port=OSC_HOST_PORT,
        workers=OSC_WORKERS,
        reload=False,
        log_level="info",
    )
