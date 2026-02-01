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
Main Routes - Root and Metrics Endpoints

This module defines the root API endpoint and Prometheus metrics endpoint.
"""

from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from core.config import OSC_CLUSTER_ENABLED, APP_VERSION, APP_TITLE, APP_DESCRIPTION
from core.metrics import cluster_nodes_healthy, cluster_nodes_total,registry
# Global cluster manager reference (set by main.py)
cluster_manager = None

# Create router without prefix (root level endpoints)
router = APIRouter(tags=["Main"])
@router.get("/")
async def root():
    """
    Root endpoint - API information and health check.

    Provides basic API metadata including version, title, description, and status.
    If clustering is enabled, also returns cluster status information.

    No authentication required - this is a public health check endpoint.

    Returns:
        dict: API metadata and optional cluster status
            - name: API title
            - version: Current API version
            - description: API description
            - status: Operational status (always "operational" if API is responding)
            - cluster: (optional) Cluster status if clustering is enabled

    Example Response:
        {
            "name": "OpenSecureConf API",
            "version": "2.2.0",
            "description": "REST API for encrypted configuration management",
            "status": "operational",
            "cluster": {
                "enabled": true,
                "mode": "replica",
                "node_id": "node-9000",
                "healthy_nodes": 3,
                "total_nodes": 3
            }
        }

    Usage:
        curl http://localhost:9000/
    """
    # Build base response
    response = {
        "name": APP_TITLE,
        "version": APP_VERSION,
        "description": APP_DESCRIPTION,
        "status": "operational",
        "service": "OpenSecureConf API"
    }

    # Add cluster information if clustering is enabled
    if OSC_CLUSTER_ENABLED and cluster_manager:
        cluster_status = cluster_manager.get_cluster_status()
        response["cluster"] = {
            "enabled": True,
            "mode": cluster_status["cluster_mode"],
            "node_id": cluster_status["node_id"],
            "healthy_nodes": cluster_status["healthy_nodes"],
            "total_nodes": cluster_status["total_nodes"]
        }
    else:
        # Optionally indicate clustering is disabled
        # Comment out if you don't want to expose this information
        response["cluster"] = {"enabled": False}

    return response




@router.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint.

    Exposes all application metrics in Prometheus text format for scraping.
    This endpoint is designed to be scraped by a Prometheus server at regular
    intervals (typically every 15-30 seconds).

    Uses the default REGISTRY from prometheus_client which is thread-safe and
    provides consistent metric snapshots. This fixes the issue where custom
    registries had race conditions causing metrics to disappear.

    Authentication:
        No authentication required - metrics endpoint is typically public
        for Prometheus scraper access. In production, consider using:
        - Network-level restrictions (firewall rules)
        - Prometheus authentication features
        - Reverse proxy authentication

    Metrics Included:
        - osc_http_requests_total: HTTP request counts by method/endpoint/status
        - osc_http_request_duration_seconds: Request latency histograms
        - osc_config_operations_total: Configuration operation counts
        - osc_config_read_operations_total: Read operation counts
        - osc_config_write_operations_total: Write operation counts
        - osc_config_entries_total: Current number of configurations
        - osc_cluster_nodes_healthy: Number of healthy cluster nodes
        - osc_cluster_nodes_total: Total number of cluster nodes
        - osc_cluster_sync_duration_seconds: Cluster sync latency
        - osc_encryption_operations_total: Encryption/decryption counts
        - osc_api_errors_total: API error counts by endpoint/type

    Returns:
        Response: Prometheus text format metrics with proper content-type
                 Content-Type: text/plain; version=0.0.4; charset=utf-8

    Prometheus Text Format Example:
        # HELP osc_http_requests_total Total number of HTTP requests
        # TYPE osc_http_requests_total counter
        osc_http_requests_total{method="GET",endpoint="/configs",status_code="200"} 150.0
        osc_http_requests_total{method="POST",endpoint="/configs",status_code="201"} 25.0

    Usage:
        # Manual check
        curl http://localhost:9000/metrics

        # Prometheus scrape configuration (prometheus.yml)
        scrape_configs:
          - job_name: 'opensecureconf'
            static_configs:
              - targets: ['localhost:9000']
            metrics_path: '/metrics'
            scrape_interval: 15s

    Performance:
        - Very fast (< 5ms typical)
        - No database queries
        - Only reads in-memory metrics
        - generate_latest() is optimized for frequent scraping

    Integration:
        After configuring Prometheus to scrape this endpoint:
        1. Verify in Prometheus UI: Status -> Targets
        2. Query metrics: osc_http_requests_total
        3. Create Grafana dashboards using these metrics
        4. Set up alerts based on error rates or latency
    """
    # Update cluster metrics if clustering is enabled
    # These are gauges that reflect current cluster state
    if OSC_CLUSTER_ENABLED and cluster_manager:
        # Get current cluster status
        status = cluster_manager.get_cluster_status()

        # Update cluster health gauges
        cluster_nodes_healthy.set(status['healthy_nodes'])
        cluster_nodes_total.set(status['total_nodes'])
    else:
        # Set cluster metrics to 0 when clustering is disabled
        cluster_nodes_healthy.set(0)
        cluster_nodes_total.set(0)

    # Generate metrics in Prometheus text format
    # Uses default REGISTRY which is thread-safe
    # Returns a consistent snapshot of all metrics at this point in time
    return Response(
        content=generate_latest(registry),
        media_type=CONTENT_TYPE_LATEST
    )


# =============================================================================
# HEALTH CHECK ENDPOINTS (OPTIONAL)
# =============================================================================

@router.get("/health")
async def health():
    """
    Simple health check endpoint.

    Returns a minimal response indicating the API is alive.
    Useful for load balancers, orchestration systems, and monitoring.

    This is even lighter than the root endpoint (no cluster checks).

    Returns:
        dict: Simple health status

    Example:
        curl http://localhost:9000/health
        {"status": "healthy"}
    """
    return {"status": "healthy"}


@router.get("/ready")
async def readiness():
    """
    Readiness check endpoint.

    Indicates whether the API is ready to accept traffic.
    Useful for Kubernetes readiness probes.

    In a more complex setup, this would check:
    - Database connectivity
    - Cluster connectivity (if enabled)
    - Essential dependencies

    Returns:
        dict: Readiness status

    Example:
        curl http://localhost:9000/ready
        {"ready": true}
    """
    # For now, if the API is running, it's ready
    return {"ready": True}


# =============================================================================
# USAGE NOTES
# =============================================================================

"""
Monitoring Best Practices:

1. Prometheus Scraping:
   - Scrape /metrics every 15-30 seconds
   - Set reasonable timeout (5-10 seconds)
   - Monitor scrape success rate
   - Alert on scrape failures

2. Grafana Dashboards:
   - Request rate: rate(osc_http_requests_total[5m])
   - Error rate: rate(osc_api_errors_total[5m])
   - Latency p95: histogram_quantile(0.95, osc_http_request_duration_seconds)
   - Active configs: osc_config_entries_total
   - Cluster health: osc_cluster_nodes_healthy / osc_cluster_nodes_total

3. Alerting:
   - High error rate: rate(osc_api_errors_total[5m]) > 1
   - High latency: histogram_quantile(0.95, osc_http_request_duration_seconds) > 1
   - Cluster degraded: osc_cluster_nodes_healthy < osc_cluster_nodes_total
   - API down: up{job="opensecureconf"} == 0

4. Load Balancer Health Checks:
   - Use /health endpoint (lightweight)
   - Check every 5-10 seconds
   - Mark unhealthy after 2-3 consecutive failures
   - Re-check after 30 seconds

5. Kubernetes Probes:
   - Liveness probe: /health
   - Readiness probe: /ready
   - Startup probe: /health (with longer timeout)

Example Prometheus Alert:
    - alert: HighErrorRate
      expr: rate(osc_api_errors_total[5m]) > 1
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value }} errors/sec"
"""
