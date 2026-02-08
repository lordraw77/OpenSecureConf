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
Configuration Management Routes

This module defines all REST API endpoints for CRUD operations on configuration entries.
Each endpoint handles encryption/decryption, validation, error handling, and metrics.

Endpoints:
- POST /configs: Create new configuration
- GET /configs/{key}: Read specific configuration  
- PUT /configs/{key}: Update existing configuration
- DELETE /configs/{key}: Delete configuration
- GET /configs: List all configurations with filters
"""

import asyncio
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Header, Query, Depends
from config_manager import ConfigurationManager
from core.models import ConfigCreate, ConfigUpdate, ConfigResponse, ConfigResponseFull
from core.dependencies import get_config_manager
from core.metrics import (
    config_operations_total,
    config_read_operations,
    config_write_operations,
    encryption_operations_total,
    api_errors_total
)
from core.config import OSC_CLUSTER_ENABLED
from utils.helpers import update_config_count_metric
from cluster_manager import ClusterMode
import traceback
import logging

# Configure the logger
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Import cluster manager (will be None if clustering disabled)
# This import happens at module load, cluster_manager set in main.py
cluster_manager = None  # Will be set by main.py

# Create router for configuration endpoints
router = APIRouter(prefix="/configs", tags=["Configurations"])


@router.post("", response_model=ConfigResponseFull, status_code=201)
async def create_configuration(
    config: ConfigCreate,
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Create a new encrypted configuration entry.

    Creates a new configuration with automatic timestamp generation.
    In REPLICA cluster mode, broadcasts create to all nodes.

    Args:
        config: Configuration data (key, value, category, environment)
        x_user_key: User encryption key from header
        manager: ConfigurationManager instance (injected)

    Returns:
        ConfigResponseFull: Created configuration with timestamps

    Raises:
        HTTPException(400): If key already exists or validation fails
        HTTPException(500): If internal error occurs
    """
    try:
        # Create configuration locally
        result = await asyncio.to_thread(
            manager.create,
            key=config.key,
            value=config.value,
            category=config.category,
            environment=config.environment
        )

        logger.debug(
            f"POST /configs - SUCCESS - Key created: '{config.key}' | "
            f"Category: {config.category} | Environment: {config.environment}"
        )

        # Update metrics
        config_operations_total.labels(operation='create', status='success').inc()
        config_write_operations.labels(operation='create', status='success').inc()
        encryption_operations_total.labels(operation='encrypt').inc()

        # Update total count gauge
        await update_config_count_metric(manager)

        # Broadcast to cluster (REPLICA mode only)
        if OSC_CLUSTER_ENABLED and cluster_manager:
            if cluster_manager.cluster_mode == ClusterMode.REPLICA:
                asyncio.create_task(
                    cluster_manager.broadcast_create(
                        config.key, config.value, config.category, config.environment, x_user_key
                    )
                )

        return result

    except ValueError as e:
        logger.debug(
            f"POST /configs - VALIDATION ERROR - Key: '{config.key}' | "
            f"Error: {str(e)}"
        )
        traceback.print_exc()
        config_operations_total.labels(operation='create', status='error').inc()
        config_write_operations.labels(operation='create', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="validation_error").inc()
        raise HTTPException(status_code=400, detail=str(e)) from e

    except Exception as e:
        logger.debug(
            f"POST /configs - INTERNAL ERROR - Key: '{config.key}' | "
            f"Error: {str(e)}",
            exc_info=True  # Include full traceback
        )
        traceback.print_exc()
        config_operations_total.labels(operation='create', status='error').inc()
        config_write_operations.labels(operation='create', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@router.get("/{key}")
async def read_configuration(
    key: str,
    environment: str = Query(..., description="Environment identifier (REQUIRED)"),
    mode: Literal["short", "full"] = Query("short"),
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Read and decrypt a configuration entry by key.

    Reads configuration from local database.

    Args:
        key: Configuration key
        environment: Environment identifier (REQUIRED)
        mode: Response format (short=no timestamps, full=with timestamps)
        x_user_key: User encryption key
        manager: ConfigurationManager instance

    Returns:
        Configuration data in requested format

    Raises:
        HTTPException(404): If key not found
        HTTPException(500): If internal error occurs
    """
    try:
        include_timestamps = mode == "full"

        # Read from local database
        result = await asyncio.to_thread(
            manager.read,
            key=key,
            environment=environment,
            include_timestamps=include_timestamps
        )

        # Metrics
        config_operations_total.labels(operation='read', status='success').inc()
        config_read_operations.labels(status='success').inc()
        encryption_operations_total.labels(operation='decrypt').inc()

        return result

    except ValueError as e:
        traceback.print_exc()
        config_operations_total.labels(operation='read', status='not_found').inc()
        config_read_operations.labels(status='not_found').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e

    except Exception as e:
        traceback.print_exc()
        config_operations_total.labels(operation='read', status='error').inc()
        config_read_operations.labels(status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@router.put("/{key}", response_model=ConfigResponseFull)
async def update_configuration(
    key: str,
    config: ConfigUpdate,
    environment: str = Query(..., description="Environment identifier (REQUIRED)"),
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Update an existing configuration entry.

    Updates value and metadata, refreshes updated_at timestamp.
    In REPLICA mode, broadcasts update to all nodes.

    Args:
        key: Configuration key to update
        config: New configuration data
        environment: Environment identifier (REQUIRED)
        x_user_key: User encryption key
        manager: ConfigurationManager instance

    Returns:
        ConfigResponseFull: Updated configuration with new timestamp

    Raises:
        HTTPException(404): If key not found
        HTTPException(500): If internal error occurs
    """
    try:
        result = await asyncio.to_thread(
            manager.update,
            key=key,
            environment=environment,
            value=config.value,
            category=config.category
        )

        # Metrics
        config_operations_total.labels(operation='update', status='success').inc()
        config_write_operations.labels(operation='update', status='success').inc()
        encryption_operations_total.labels(operation='encrypt').inc()

        # Broadcast to cluster (REPLICA mode only)
        if OSC_CLUSTER_ENABLED and cluster_manager:
            if cluster_manager.cluster_mode == ClusterMode.REPLICA:
                asyncio.create_task(
                    cluster_manager.broadcast_update(
                        key, config.value, config.category, config.environment, x_user_key
                    )
                )

        return result

    except ValueError as e:
        traceback.print_exc()
        config_operations_total.labels(operation='update', status='not_found').inc()
        config_write_operations.labels(operation='update', status='not_found').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e

    except Exception as e:
        traceback.print_exc()
        config_operations_total.labels(operation='update', status='error').inc()
        config_write_operations.labels(operation='update', status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@router.delete("/{key}")
async def delete_configuration(
    key: str,
    environment: str = Query(..., description="Environment identifier (REQUIRED)"),
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Delete a configuration entry permanently.

    Removes configuration from database.
    In REPLICA mode, broadcasts delete to all nodes.

    Args:
        key: Configuration key to delete
        environment: Environment identifier (REQUIRED)
        x_user_key: User encryption key
        manager: ConfigurationManager instance

    Returns:
        Success message

    Raises:
        HTTPException(404): If key not found
        HTTPException(500): If internal error occurs
    """
    try:
        await asyncio.to_thread(
            manager.delete,
            key=key,
            environment=environment
        )

        # Metrics
        config_operations_total.labels(operation='delete', status='success').inc()
        config_write_operations.labels(operation='delete', status='success').inc()

        # Update total count gauge
        await update_config_count_metric(manager)

        # Broadcast to cluster (REPLICA mode only)
        if OSC_CLUSTER_ENABLED and cluster_manager:
            if cluster_manager.cluster_mode == ClusterMode.REPLICA:
                asyncio.create_task(
                    cluster_manager.broadcast_delete(key, x_user_key)
                )

        return {"message": f"Configuration '{key}' deleted successfully"}

    except ValueError as e:
        traceback.print_exc()
        config_operations_total.labels(operation='delete', status='not_found').inc()
        config_write_operations.labels(operation='delete', status='not_found').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="not_found").inc()
        raise HTTPException(status_code=404, detail=str(e)) from e

    except Exception as e:
        traceback.print_exc()
        config_operations_total.labels(operation='delete', status='error').inc()
        config_write_operations.labels(operation='delete', status='error').inc()
        api_errors_total.labels(endpoint="/configs/{key}", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@router.get("")
async def list_configurations(
    category: Optional[str] = None,
    environment: Optional[str] = None,
    mode: Literal["short", "full"] = Query("short"),
    x_user_key: str = Header(...),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    List all configurations with optional filters.

    Returns local configurations from the database.

    Args:
        category: Optional category filter
        environment: Optional environment filter
        mode: Response format (short/full)
        x_user_key: User encryption key
        manager: ConfigurationManager instance

    Returns:
        List of configurations

    Raises:
        HTTPException(500): If internal error occurs
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

        return result

    except Exception as e:
        traceback.print_exc()
        config_operations_total.labels(operation='list', status='error').inc()
        api_errors_total.labels(endpoint="/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e
