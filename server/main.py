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
import json

from fastapi import FastAPI, Request,status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from core.metrics import cleanup_multiprocess_metrics
from core.metrics import api_errors_total

from fastapi.middleware.cors import CORSMiddleware

from cluster_manager import ClusterManager, ClusterMode

from core.config import (
    APP_TITLE, APP_DESCRIPTION, APP_VERSION,
    OSC_HOST, OSC_HOST_PORT, OSC_WORKERS,
    OSC_API_KEY, OSC_API_KEY_REQUIRED,
    OSC_CLUSTER_ENABLED, OSC_CLUSTER_MODE, OSC_CLUSTER_NODE_ID,
    OSC_CLUSTER_NODES, OSC_CLUSTER_SYNC_INTERVAL, OSC_SALT_FILE_PATH,prometheus_multiproc_dir,OSC_HTTPS_ENABLED,
    OSC_SSL_CERTFILE,
    OSC_SSL_KEYFILE,
    OSC_SSL_KEYFILE_PASSWORD,
    OSC_SSL_CA_CERTS
)
from core.metrics import (
    http_requests_total, http_request_duration_seconds,
    cluster_nodes_total
)
import logging

logger = logging.getLogger(__name__)

# Import all routers
from routes import main_routes, config_routes, cluster_routes, stats_routes, backup_routes, sse_routes

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

# Configura origini permesse
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Aggiungi CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Leggi da variabile d'ambiente
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-User-Key",
        "X-API-Key",
        "Accept",
        "Origin",
        "X-Requested-With"
    ],
    expose_headers=["Content-Length", "Content-Type"],
    max_age=3600,  # Cache preflight per 1 ora
)


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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handler personalizzato per errori di validazione 422.
    Logga i dettagli dell'errore prima di restituire la risposta.
    """
    # Estrai informazioni dalla richiesta
    url_path = request.url.path
    method = request.method
    
    # Estrai i dettagli degli errori di validazione
    errors = exc.errors()
    
    # Prova a ottenere la key dal body (se presente)
    try:
        body = await request.body()
        body_json = body.decode('utf-8') if body else '{}'
        # Cerca di estrarre la key se esiste nel JSON
        try:
            body_dict = json.loads(body_json)
            key = body_dict.get('key', 'N/A')
        except:
            key = 'N/A'
    except:
        key = 'N/A'
        body_json = 'N/A'
    
    # Formatta gli errori per il log
    error_details = []
    for error in errors:
        field = ' -> '.join(str(loc) for loc in error['loc'])
        message = error['msg']
        error_type = error['type']
        error_details.append(f"{field}: {message} ({error_type})")
    
    error_summary = ' | '.join(error_details)
    
    # Log dettagliato dell'errore 422
    logger.error(
        f"{method} {url_path} - VALIDATION ERROR (422) - "
        f"Key: '{key}' | Errors: {error_summary}"
    )
    
    # Incrementa metric per errori di validazione
    api_errors_total.labels(endpoint=url_path, error_type="validation_error").inc()
    
    # Restituisci la risposta standard di FastAPI
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": errors}
    )

# ========== REGISTER ROUTERS ==========

app.include_router(main_routes.router)
app.include_router(config_routes.router)
app.include_router(cluster_routes.router)
app.include_router(stats_routes.router)
app.include_router(backup_routes.router)
app.include_router(sse_routes.router)

# ========== APPLICATION ENTRY POINT ==========

if __name__ == "__main__":
    # base configuration for uvicorn
    import uvicorn
    config = {
        "app": "main:app",
        "host": OSC_HOST,
        "port": OSC_HOST_PORT,
        "workers": OSC_WORKERS,
    }

    # add https configuration if enabled
    if OSC_HTTPS_ENABLED:
        config.update({
            "ssl_keyfile": OSC_SSL_KEYFILE,
            "ssl_certfile": OSC_SSL_CERTFILE,
        })

        # add optional ssl parameters
        if OSC_SSL_KEYFILE_PASSWORD:
            config["ssl_keyfile_password"] = OSC_SSL_KEYFILE_PASSWORD
        if OSC_SSL_CA_CERTS:
            config["ssl_ca_certs"] = OSC_SSL_CA_CERTS

        print(f"[Server] Starting with HTTPS enabled on port {OSC_HOST_PORT}")
    else:
        print(f"[Server] Starting with HTTP on port {OSC_HOST_PORT}")

    uvicorn.run(**config)
