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
Statistics Routes Module for OpenSecureConf API

FIXED VERSION: Uses the default Prometheus REGISTRY for thread-safe metric access.

This module defines REST API endpoints for retrieving statistics and metrics about
the configuration management system. It provides two main endpoints:

1. /stats - Configuration database statistics (keys, categories, environments)
2. /stats/operations - Operations metrics from Prometheus (read/write/http operations)

The operations statistics endpoint converts Prometheus metrics from the internal
format to a human-readable JSON structure, making it easier for clients to consume
metric data without parsing the Prometheus text format.

Thread Safety Fix:
    Previous versions used a custom CollectorRegistry which had thread-safety issues
    causing metrics to appear and disappear intermittently. This version uses the
    default REGISTRY which is properly thread-safe according to Prometheus specs.

Architecture:
    - Uses FastAPI dependency injection for authentication and database access
    - Integrates with Prometheus default REGISTRY for operations data
    - Uses generate_latest() for atomic metric snapshots
    - Provides async operations for non-blocking I/O
    - Returns Pydantic models for automatic validation and documentation

Usage:
    from routes import stats_routes
    app.include_router(stats_routes.router)
"""

import asyncio
from datetime import datetime
import traceback

from fastapi import APIRouter, HTTPException, Depends
from prometheus_client import generate_latest

from config_manager import ConfigurationManager
from core.models import StatisticsResponse
from core.dependencies import get_config_manager, validate_api_key
from core.metrics import api_errors_total,registry

from core.sse_manager import sse_manager, SSEEvent


# =============================================================================
# ROUTER INITIALIZATION
# =============================================================================

# Create FastAPI router with /stats prefix
# All endpoints in this module will be under /stats/*
# Tagged as "Statistics" for API documentation organization
router = APIRouter(prefix="/stats", tags=["Statistics"])


# =============================================================================
# CONFIGURATION STATISTICS ENDPOINT
# =============================================================================

@router.get("", response_model=StatisticsResponse)
async def get_statistics(
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Get comprehensive statistics about stored configurations.

    This endpoint queries the database and returns aggregated statistics about
    all configuration entries. It provides insights into:
    - Total number of configuration keys
    - Number of distinct categories in use
    - Number of distinct environments in use
    - Distribution of keys across categories
    - Distribution of keys across environments

    The statistics are useful for:
    - Monitoring dashboard displays
    - Capacity planning and growth analysis
    - Understanding configuration organization
    - Identifying unused categories/environments
    - Detecting configuration sprawl

    Authentication:
        Requires both API key (if enabled) and user encryption key
        via the get_config_manager dependency chain

    Args:
        manager: ConfigurationManager instance injected via dependency
                 Provides access to database and statistics methods

    Returns:
        StatisticsResponse: Pydantic model containing:
            - total_keys: int - Total number of configuration entries
            - total_categories: int - Number of distinct categories
            - total_environments: int - Number of distinct environments
            - keys_by_category: dict - Category name -> count mapping
            - keys_by_environment: dict - Environment name -> count mapping

    Raises:
        HTTPException(401): If authentication fails (missing/invalid keys)
        HTTPException(500): If database error or internal error occurs

    Example Response:
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

    Performance:
        - Queries entire database (can be slow for large datasets)
        - Consider caching results for high-traffic scenarios
        - Execution time typically < 100ms for < 10,000 entries

    Example Usage:
        curl -X GET \\
             -H "X-API-Key: your-api-key" \\
             -H "X-User-Key: your-user-key" \\
             http://localhost:9000/stats
    """
    try:
        # Execute statistics query in thread pool to avoid blocking async loop
        # ConfigurationManager uses synchronous SQLite which would block
        stats = await asyncio.to_thread(manager.get_statistics)

        # Return statistics (automatically serialized via Pydantic model)
        return stats

    except Exception as e:
        # Log error metric for monitoring
        api_errors_total.labels(
            endpoint="/stats",
            error_type="internal_error"
        ).inc()

        # Return HTTP 500 with error details
        raise HTTPException(
            status_code=500,
            detail=f"Internal error retrieving statistics: {str(e)}"
        ) from e


# =============================================================================
# OPERATIONS STATISTICS ENDPOINT
# =============================================================================

@router.get("/operations")
async def get_operations_statistics(
    api_key_validated: None = Depends(validate_api_key)
):
    """
    Get operations statistics in human-readable JSON format.

    This endpoint converts Prometheus metrics from the default REGISTRY to a
    clean, structured JSON response. It provides an alternative to the raw
    Prometheus /metrics endpoint, which returns data in Prometheus text format.

    THREAD-SAFETY FIX:
        This version uses the default REGISTRY and generate_latest() which
        provides an atomic snapshot of all metrics. Previous versions had
        issues with metrics appearing/disappearing due to non-thread-safe
        iteration over custom CollectorRegistry internals.

    Metrics Categories:
    1. Read Operations: Configuration read attempts and their outcomes
       - success: Successful read operations
       - not_found: Read attempts for non-existent keys
       - error: Failed read operations due to errors

    2. Write Operations: Configuration modification operations
       - create_success: Successful configuration creations
       - create_error: Failed creation attempts
       - update_success: Successful configuration updates
       - update_not_found: Update attempts for non-existent keys
       - update_error: Failed update operations
       - delete_success: Successful configuration deletions
       - delete_not_found: Delete attempts for non-existent keys
       - delete_error: Failed delete operations

    3. Encryption Operations: Cryptographic operations count
       - encrypt: Number of encryption operations (creates/updates)
       - decrypt: Number of decryption operations (reads)

    4. HTTP Requests: All HTTP requests received by the API
       - Format: {METHOD}_{ENDPOINT}_{STATUS_CODE}
       - Example: GET_/configs_200, POST_/configs_201

    Prometheus Integration:
        Uses generate_latest(REGISTRY) which is the official thread-safe method
        to get a consistent snapshot of all metrics at a single point in time.
        This prevents race conditions where metrics could change during iteration.

    Authentication:
        Requires API key authentication (if OSC_API_KEY_REQUIRED=true)
        Does not require user encryption key (no database access)

    Args:
        api_key_validated: Result of API key validation dependency
                           Always None if validation succeeds

    Returns:
        dict: Structured operations statistics with four main sections:
            - read_operations: {status: count}
            - write_operations: {operation_status: count}
            - encryption_operations: {operation: count}
            - total_http_requests: {method_endpoint_status: count}

    Raises:
        HTTPException(403): If API key authentication fails
        HTTPException(500): If error occurs during metrics collection

    Example Response:
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
                "delete_success": 20
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
                "GET_/configs/{key}_404": 25
            }
        }

    Implementation Details:
        1. Calls generate_latest(REGISTRY) to get atomic metric snapshot
        2. Parses Prometheus text format line by line
        3. Extracts metric names, labels, and values
        4. Filters out internal metrics (_created, _sum, _count, _bucket)
        5. Skips zero-value metrics to reduce response size
        6. Formats keys according to metric type and labels
        7. Converts values to integers for cleaner JSON

    Prometheus Text Format Example:
        osc_http_requests_total{method="GET",endpoint="/configs",status_code="200"} 150.0

        Parsed as:
        - metric_name: osc_http_requests_total
        - labels: {method: "GET", endpoint: "/configs", status_code: "200"}
        - value: 150.0

        Stored as:
        total_http_requests["GET_/configs_200"] = 150

    Performance:
        - Very fast (< 10ms typical)
        - No database queries
        - Only reads in-memory Prometheus registry
        - Scales with number of unique label combinations
        - generate_latest() is optimized for speed

    Monitoring Integration:
        Use this endpoint for:
        - Custom dashboards and monitoring UIs
        - Alerting systems that consume JSON
        - Mobile apps and web frontends
        - Integration with non-Prometheus systems

        For Prometheus/Grafana, use /metrics endpoint instead
        (native Prometheus format is more efficient for scraping)

    Example Usage:
        curl -X GET \\
             -H "X-API-Key: your-api-key" \\
             http://localhost:9000/stats/operations
    """
    try:
        # Initialize statistics dictionary with empty sections
        # Will be populated as we parse metrics
        stats = {
            "read_operations": {},      # Read operation counts by status
            "write_operations": {},     # Write operation counts by operation_status
            "encryption_operations": {},  # Encryption/decryption counts
            "total_http_requests": {}   # HTTP request counts by method_endpoint_status
        }

        # Generate Prometheus metrics in text format
        # This is the OFFICIAL and THREAD-SAFE way to get metrics
        # generate_latest() provides an atomic snapshot - all metrics at one point in time
        # This prevents the race condition where metrics appeared/disappeared
        metrics_text = generate_latest(registry).decode('utf-8')

        # Parse the Prometheus text format line by line
        # Format: metric_name{label="value",label2="value2"} numeric_value timestamp
        # Example: osc_http_requests_total{method="GET",endpoint="/configs",status_code="200"} 150.0
        for line in metrics_text.split('\n'):
            # Skip comment lines (starting with #)
            # Skip empty lines
            if line.startswith('#') or not line.strip():
                continue

            try:
                # Only process lines with labels (contain { and })
                # Lines without labels are simple metrics like: metric_name value
                if '{' not in line or '}' not in line:
                    continue

                # Extract metric name (everything before first {)
                # Example: "osc_http_requests_total{method="GET"}" -> "osc_http_requests_total"
                metric_name = line.split('{')[0]

                # Extract labels part (between { and })
                # Example: 'method="GET",endpoint="/configs",status_code="200"'
                labels_part = line.split('{')[1].split('}')[0]

                # Extract value (after })
                # Example: "} 150.0" -> "150.0"
                value_part = line.split('}')[1].strip()

                # Convert value to float
                # Prometheus always uses float values
                value = float(value_part)

                # Skip zero-value metrics
                # Zero values provide no useful information and clutter response
                if value <= 0:
                    continue

                # Parse labels into dictionary
                # Input: 'method="GET",endpoint="/configs",status_code="200"'
                # Output: {'method': 'GET', 'endpoint': '/configs', 'status_code': '200'}
                labels = {}
                for label_pair in labels_part.split(','):
                    if '=' in label_pair:
                        key, val = label_pair.split('=', 1)
                        # Remove quotes from value
                        labels[key.strip()] = val.strip().strip('"')

                # Process read operations metrics
                # Metric: osc_config_read_operations_total
                # Labels: status (success/not_found/error)
                if metric_name == 'osc_config_read_operations_total':
                    status = labels.get('status', 'unknown')
                    stats["read_operations"][status] = int(value)

                # Process write operations metrics
                # Metric: osc_config_write_operations_total
                # Labels: operation (create/update/delete), status (success/error/not_found)
                elif metric_name == 'osc_config_write_operations_total':
                    operation = labels.get('operation', 'unknown')
                    status = labels.get('status', 'unknown')
                    # Combine operation and status: "create_success", "update_error", etc.
                    key = f"{operation}_{status}"
                    stats["write_operations"][key] = int(value)

                # Process encryption operations metrics
                # Metric: osc_encryption_operations_total
                # Labels: operation (encrypt/decrypt)
                elif metric_name == 'osc_encryption_operations_total':
                    operation = labels.get('operation', 'unknown')
                    stats["encryption_operations"][operation] = int(value)

                # Process HTTP requests metrics
                # Metric: osc_http_requests_total
                # Labels: method (GET/POST/PUT/DELETE), endpoint (/configs, etc.), status_code (200/404/etc.)
                elif metric_name == 'osc_http_requests_total':
                    method = labels.get('method', 'unknown')
                    endpoint = labels.get('endpoint', 'unknown')
                    status_code = labels.get('status_code', 'unknown')
                    # Combine all three: "GET_/configs_200"
                    key = f"{method}_{endpoint}_{status_code}"
                    stats["total_http_requests"][key] = int(value)

            except Exception: # nosec B112
                # Skip malformed lines
                # This makes parsing resilient to unexpected metric formats
                # Don't log individual parse errors (too verbose)
                continue

        # Return structured statistics
        # Empty sections remain empty dicts if no metrics exist
        return stats

    except Exception as e:
        # Log full error for debugging
        # Helps diagnose metric collection issues in production
        traceback.print_exc()

        # Log error metric
        api_errors_total.labels(
            endpoint="/stats/operations",
            error_type="internal_error"
        ).inc()

        # Return HTTP 500 with error details
        raise HTTPException(
            status_code=500,
            detail=f"Internal error retrieving operations statistics: {str(e)}"
        ) from e

