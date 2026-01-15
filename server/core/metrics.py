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
Prometheus Metrics Configuration for OpenSecureConf API

MULTIPROCESS SUPPORT VERSION

This module defines all Prometheus metrics used throughout the application.
Supports both single-process and multi-process (multi-worker) modes.

In single-process mode, uses the default REGISTRY from prometheus_client.
In multi-process mode, uses a shared directory for metric aggregation across workers.

Multiprocess Mode:
    When running with multiple Uvicorn workers, Prometheus metrics must be
    aggregated across all worker processes. This is done by:
    1. Setting prometheus_multiproc_dir environment variable
    2. Using MultiProcessCollector to aggregate metrics from all workers
    3. Each worker writes its metrics to files in the shared directory

    Without multiprocess mode, each worker has isolated metrics, causing
    random/inconsistent results depending on which worker handles the request.

Metrics Categories:
1. HTTP Request Metrics - Track all incoming HTTP requests
2. Configuration Operation Metrics - Track CRUD operations on configurations
3. Cluster Metrics - Track cluster health and synchronization
4. Encryption Metrics - Track encryption/decryption operations
5. Error Metrics - Track API errors by endpoint and type

Reference:
    - https://prometheus.io/docs/instrumenting/writing_clientlibs/
    - https://github.com/prometheus/client_python#multiprocess-mode-eg-gunicorn
"""

import os
import shutil
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, REGISTRY
from prometheus_client import multiprocess, generate_latest


# =============================================================================
# REGISTRY CONFIGURATION - MULTIPROCESS SUPPORT
# =============================================================================

# Check if running in multiprocess mode (multiple Uvicorn workers)
# When prometheus_multiproc_dir is set, we're in multiprocess mode
MULTIPROCESS_MODE = 'prometheus_multiproc_dir' in os.environ

if MULTIPROCESS_MODE:
    # Multiprocess mode - create custom registry with MultiProcessCollector
    # This aggregates metrics from all worker processes

    # Get the multiprocess directory from environment
    multiproc_dir = os.environ['prometheus_multiproc_dir']

    # Create directory if it doesn't exist
    os.makedirs(multiproc_dir, exist_ok=True)

    # Create custom registry for multiprocess aggregation
    # This registry will collect metrics from all worker processes
    registry = CollectorRegistry()

    # Add MultiProcessCollector to aggregate metrics from shared directory
    # Each worker writes metrics to files, this collector reads and combines them
    multiprocess.MultiProcessCollector(registry)

    print(f"[Metrics] Multiprocess mode enabled. Directory: {multiproc_dir}")
else:
    # Single process mode - use default REGISTRY
    # This is the standard mode when running with workers=1
    registry = REGISTRY
    print("[Metrics] Single process mode enabled (using default REGISTRY)")


def cleanup_multiprocess_metrics():
    """
    Clean up multiprocess metric files.

    Should be called before starting the application to remove stale
    metric files from previous runs. Otherwise, old metrics will be
    included in the aggregation.

    Only has effect in multiprocess mode.
    """
    if MULTIPROCESS_MODE:
        multiproc_dir = os.environ.get('prometheus_multiproc_dir')
        if multiproc_dir and os.path.exists(multiproc_dir):
            # Remove all .db files (Prometheus metric storage)
            for file in os.listdir(multiproc_dir):
                if file.endswith('.db'):
                    try:
                        os.remove(os.path.join(multiproc_dir, file))
                    except Exception: # nosec B110
                        pass
            print(f"[Metrics] Cleaned up multiprocess directory: {multiproc_dir}")


# =============================================================================
# HTTP REQUEST METRICS
# =============================================================================

http_requests_total = Counter(
    name='osc_http_requests_total',
    documentation='Total number of HTTP requests received by the API server',
    labelnames=['method', 'endpoint', 'status_code'],
    registry=registry  # Use our registry (multiprocess or default)
)
"""
Counter for all HTTP requests received by the FastAPI application.

Labels:
    - method: HTTP method (GET, POST, PUT, DELETE, etc.)
    - endpoint: API endpoint path (e.g., /configs, /stats/operations)
    - status_code: HTTP response status code (200, 404, 500, etc.)

Multiprocess: Aggregated across all workers
"""

http_request_duration_seconds = Histogram(
    name='osc_http_request_duration_seconds',
    documentation='HTTP request processing duration in seconds',
    labelnames=['method', 'endpoint'],
    registry=registry
)
"""
Histogram for HTTP request processing time in seconds.

Labels:
    - method: HTTP method (GET, POST, PUT, DELETE, etc.)
    - endpoint: API endpoint path

Multiprocess: Aggregated across all workers
"""

# =============================================================================
# CONFIGURATION OPERATION METRICS
# =============================================================================

config_operations_total = Counter(
    name='osc_config_operations_total',
    documentation='Total number of configuration operations (create/update/delete)',
    labelnames=['operation', 'status'],
    registry=registry
)

config_read_operations = Counter(
    name='osc_config_read_operations_total',
    documentation='Total number of configuration read operations (GET requests)',
    labelnames=['status'],
    registry=registry
)

config_write_operations = Counter(
    name='osc_config_write_operations_total',
    documentation='Total number of configuration write operations (create/update/delete)',
    labelnames=['operation', 'status'],
    registry=registry
)

# Gauge configuration - different for multiprocess vs single process
if MULTIPROCESS_MODE:
    config_entries_total = Gauge(
        name='osc_config_entries_total',
        documentation='Current total number of configuration entries stored in database',
        registry=registry,
        multiprocess_mode='livesum'
    )
else:
    config_entries_total = Gauge(
        name='osc_config_entries_total',
        documentation='Current total number of configuration entries stored in database',
        registry=registry
    )

"""
Gauge for total configurations in database.

Multiprocess mode: Uses 'livesum' - sums values from all workers.
This is appropriate because we want the total count across all workers.
"""


# =============================================================================
# CLUSTER METRICS
# =============================================================================
if MULTIPROCESS_MODE:
    cluster_nodes_healthy = Gauge(
        name='osc_cluster_nodes_healthy',
        documentation='Number of healthy (reachable) cluster nodes',
        registry=registry,
        multiprocess_mode='livesum'
    )

    cluster_nodes_total = Gauge(
        name='osc_cluster_nodes_total',
        documentation='Total number of nodes configured in cluster',
        registry=registry,
        multiprocess_mode='livesum'
    )
else:
    cluster_nodes_healthy = Gauge(
        name='osc_cluster_nodes_healthy',
        documentation='Number of healthy (reachable) cluster nodes',
        registry=registry
    )

    cluster_nodes_total = Gauge(
        name='osc_cluster_nodes_total',
        documentation='Total number of nodes configured in cluster',
        registry=registry
    )

cluster_sync_duration_seconds = Histogram(
    name='osc_cluster_sync_duration_seconds',
    documentation='Duration of cluster synchronization operations in seconds',
    registry=registry
)

"""Histogram for cluster sync duration. Multiprocess: Aggregated."""


# =============================================================================
# ENCRYPTION METRICS
# =============================================================================

encryption_operations_total = Counter(
    name='osc_encryption_operations_total',
    documentation='Total number of encryption and decryption operations performed',
    labelnames=['operation'],
    registry=registry
)
"""Counter for encryption operations. Multiprocess: Aggregated."""


# =============================================================================
# ERROR METRICS
# =============================================================================

api_errors_total = Counter(
    name='osc_api_errors_total',
    documentation='Total number of API errors by endpoint and error type',
    labelnames=['endpoint', 'error_type'],
    registry=registry
)
"""Counter for API errors. Multiprocess: Aggregated."""


# =============================================================================
# USAGE NOTES
# =============================================================================

"""
MULTIPROCESS CONFIGURATION:

To enable multiprocess mode with multiple Uvicorn workers:

1. Set environment variable before starting the application:
   export prometheus_multiproc_dir=/tmp/prometheus_multiproc
   
2. Clean up old metrics on startup (add to main.py):
   from core.metrics import cleanup_multiprocess_metrics
   cleanup_multiprocess_metrics()
   
3. Start with multiple workers:
   uvicorn main:app --workers 4

4. Metrics will be automatically aggregated across all workers

Without multiprocess mode (workers=1):
- Simply start the application normally
- No special configuration needed
- Uses default Prometheus REGISTRY


METRIC AGGREGATION IN MULTIPROCESS MODE:

Counters: Summed across all workers
Histograms: Aggregated (buckets summed)
Gauges: Depends on multiprocess_mode parameter
  - 'livesum': Sum values from all workers (used for counts)
  - 'liveall': Keep separate values per worker
  - 'min'/'max': Take min/max across workers
  - 'mostrecent': Use most recent value


IMPORTANT FOR PRODUCTION:

1. Always clean up multiprocess directory on startup
2. Monitor disk space (metric files accumulate)
3. Use tmpfs for multiprocess directory (RAM disk) for better performance:
   mkdir -p /dev/shm/prometheus_multiproc
   export prometheus_multiproc_dir=/dev/shm/prometheus_multiproc

4. In Docker/Kubernetes, mount a volume for the multiprocess directory
"""
