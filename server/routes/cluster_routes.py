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
Cluster Management Routes

This module defines all REST API endpoints for cluster operations.
"""

import os
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header, Request, Response
import httpx

from cluster_manager import ClusterMode
from config_manager import ConfigurationManager
from core.models import ClusterStatusResponse, ClusterDistributionResponse
from core.dependencies import validate_api_key, get_config_manager
from core.config import OSC_CLUSTER_ENABLED, OSC_CLUSTER_NODE_ID, OSC_SALT_FILE_PATH
from core.metrics import api_errors_total

# Global cluster manager reference (set by main.py)
cluster_manager = None

# Create router
router = APIRouter(prefix="/cluster", tags=["Cluster"])


@router.get("/status", response_model=ClusterStatusResponse)
async def get_cluster_status(
    api_key_validated: None = Depends(validate_api_key)
):
    """
    Get cluster status and node information.

    Returns cluster configuration and health metrics.
    """
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


@router.get("/distribution", response_model=ClusterDistributionResponse)
async def get_cluster_distribution(
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Get cluster data distribution analysis.

    Shows how configuration data is distributed across cluster nodes.
    Critical for debugging synchronization issues in REPLICA mode.
    """
    if not OSC_CLUSTER_ENABLED or not cluster_manager:
        raise HTTPException(status_code=400, detail="Clustering is not enabled")

    try:
        is_replica = (cluster_manager.cluster_mode == ClusterMode.REPLICA)

        # Get local configuration count
        local_configs = await asyncio.to_thread(manager.list_all)
        local_count = len(local_configs)

        nodes_distribution = []
        all_synced = True

        async with httpx.AsyncClient(timeout=10.0) as client:
            # Add local node info
            nodes_distribution.append({
                "node_id": OSC_CLUSTER_NODE_ID,
                "is_local": True,
                "is_healthy": True,
                "keys_count": local_count
            })

            # Query each remote node
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

                        # Check synchronization only in REPLICA mode
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


@router.get("/health")
async def cluster_health():
    """
    Health check endpoint for cluster nodes.

    Lightweight endpoint with no authentication for quick health checks.
    """
    return {
        "status": "healthy",
        "node_id": OSC_CLUSTER_NODE_ID
    }


@router.get("/configs")
async def cluster_list_configs(
    category: Optional[str] = None,
    environment: Optional[str] = None,
    api_key_validated: None = Depends(validate_api_key)
):
    """
    Internal endpoint for cluster synchronization.

    Returns all configurations for sync operations.
    """
    try:
        from core.config import OSC_DATABASE_PATH
        import sqlite3

        # Direct database query for efficiency (no encryption overhead)
        conn = sqlite3.connect(OSC_DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Fast query - only keys and metadata (not encrypted values)
        query = "SELECT key, category, environment, created_at, updated_at FROM configurations"
        params = []
        conditions = []

        if category:
            conditions.append("category = ?")
            params.append(category)

        if environment:
            conditions.append("environment = ?")
            params.append(environment)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        # Convert to list of dicts
        result = []
        for row in rows:
            result.append({
                "key": row["key"],
                "category": row["category"],
                "environment": row["environment"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })

        return result

    except Exception as e:
        api_errors_total.labels(endpoint="/cluster/configs", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@router.get("/salt")
async def get_cluster_salt(
    api_key_validated: None = Depends(validate_api_key)
):
    """
    Get encryption salt file for cluster synchronization.

    CRITICAL: This endpoint exposes the encryption salt! 
    Use secure network communication.
    """
    if not os.path.exists(OSC_SALT_FILE_PATH):
        raise HTTPException(status_code=404, detail="Salt file not found")

    try:
        with open(OSC_SALT_FILE_PATH, 'rb') as f:
            salt_data = f.read()

        return Response(
            content=salt_data,
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=encryption.salt"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read salt: {str(e)}") from e


@router.post("/salt")
async def receive_cluster_salt(
    request: Request,
    api_key_validated: None = Depends(validate_api_key)
):
    """
    Receive and save encryption salt from another cluster node.

    CRITICAL: This can overwrite encryption settings!
    """
    # Check if salt already exists
    if os.path.exists(OSC_SALT_FILE_PATH):
        with open(OSC_SALT_FILE_PATH, 'rb') as f:
            existing_salt = f.read()

        received_salt = await request.body()

        if existing_salt == received_salt:
            return {
                "message": "Salt already present and matches",
                "status": "ok"
            }
        else:
            raise HTTPException(
                status_code=409,
                detail="Salt file already exists and differs from received salt"
            )

    try:
        salt_data = await request.body()

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
        raise HTTPException(status_code=500, detail=f"Failed to save salt: {str(e)}") from e
