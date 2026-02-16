# server/routes/sse_routes.py

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
from datetime import datetime
from typing import Optional
import asyncio
import json
import logging

from fastapi import APIRouter, Query, Request, Depends
from config_manager import ConfigurationManager
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse


from core.sse_manager import sse_manager, SSEEvent
from core.dependencies import get_config_manager, validate_api_key

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sse", tags=["sse"])


@router.get("/subscribe")
async def subscribe_to_events(
    request: Request,
    key: Optional[str] = Query(None, description="Filter by specific configuration key"),
    environment: Optional[str] = Query(None, description="Filter by environment (e.g., production, staging)"),
    category: Optional[str] = Query(None, description="Filter by category (e.g., database, api)"),
    api_key: Optional[str] = Depends(validate_api_key)
):
    """
    Subscribe to Server-Sent Events for real-time configuration changes.
    
    Establishes a persistent HTTP connection that streams configuration change
    events in real-time. Supports fine-grained filtering by key, environment,
    and category, or combinations thereof.
    
    Query Parameters:
        - key: Subscribe to changes for a specific configuration key
        - environment: Subscribe to changes in a specific environment
        - category: Subscribe to changes in a specific category
        - Multiple filters can be combined for precise subscriptions
    
    Event Types:
        - connected: Initial confirmation with subscription details
        - created: New configuration created
        - updated: Existing configuration updated
        - deleted: Configuration deleted
        - sync: Cluster synchronization event
    
    Event Format:
```
        event: created
        data: {
            "key": "database_url",
            "environment": "production",
            "category": "database",
            "timestamp": "2026-02-15T10:30:00Z",
            "node_id": "node1:9000",
            "data": {...}
        }
```
    
    Examples:
        - Subscribe to all events:
          GET /sse/subscribe
        
        - Subscribe to production database changes:
          GET /sse/subscribe?key=database&environment=production
        
        - Subscribe to all staging events:
          GET /sse/subscribe?environment=staging
        
        - Subscribe to all API configurations:
          GET /sse/subscribe?category=api
    
    Connection Management:
        - Keep-alive messages sent every 30 seconds
        - Automatic cleanup on disconnection
        - Queue overflow protection (max 100 buffered events)
    
    Returns:
        EventSourceResponse: SSE stream with configuration change events
    """
    subscription_id, queue = await sse_manager.subscribe(
        key=key,
        environment=environment,
        category=category
    )
    
    async def event_generator():
        try:
            # Send initial connection confirmation
            yield {
                "event": "connected",
                "data": json.dumps({
                    "subscription_id": subscription_id,
                    "filters": {
                        "key": key,
                        "environment": environment,
                        "category": category
                    },
                    "server_time": datetime.now().isoformat()
                })
            }
            
            # Stream events from queue
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    await sse_manager.record_disconnection()
                    logger.info(f"Client disconnected: {subscription_id}")
                    break
                
                try:
                    # Wait for event with timeout for keep-alive
                    event: SSEEvent = await asyncio.wait_for(
                        queue.get(),
                        timeout=30.0
                    )
                    
                    yield {
                        "event": event.event_type,
                        "data": json.dumps({
                            "key": event.key,
                            "environment": event.environment,
                            "category": event.category,
                            "timestamp": event.timestamp.isoformat(),
                            "node_id": event.node_id,
                            "data": event.data
                        })
                    }
                    
                except asyncio.TimeoutError:
                    # Send keep-alive (SSE comment format)
                    await sse_manager.send_keepalive(subscription_id)
                    yield {"comment": f"keep-alive {datetime.now().isoformat()}"}
                    
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled: {subscription_id}")
        except Exception as e:
            logger.error(f"SSE stream error for {subscription_id}: {e}")
        finally:
            await sse_manager.unsubscribe(subscription_id)
    
    return EventSourceResponse(event_generator())


@router.get("/stats")
async def get_sse_statistics(
    api_key: Optional[str] = Depends(validate_api_key)
) -> JSONResponse:
    """
    Get comprehensive SSE statistics.
    
    Returns detailed metrics about active subscriptions, events sent,
    connection health, and performance. Useful for monitoring dashboards,
    debugging, and capacity planning.
    
    Response Structure:
```json
        {
            "subscriptions": {
                "total_created": 150,
                "active": 12,
                "closed": 138,
                "wildcard": 3,
                "by_key": {"database": 5, "api_token": 2},
                "by_environment": {"production": 8, "staging": 4},
                "by_category": {"database": 5, "api": 7},
                "last_created_at": "2026-02-15T10:30:00Z"
            },
            "events": {
                "total_sent": 1523,
                "by_type": {
                    "created": 234,
                    "updated": 982,
                    "deleted": 156,
                    "sync": 151
                },
                "dropped_queue_full": 3,
                "last_sent_at": "2026-02-15T10:35:22Z"
            },
            "connection_health": {
                "keepalive_sent": 3421,
                "disconnections_detected": 138
            },
            "performance": {
                "average_subscription_duration_seconds": 245.67,
                "max_queue_size_reached": 100
            }
        }
```
    
    Returns:
        Dictionary with comprehensive SSE statistics
    """
    stats = await sse_manager.get_stats()
    return JSONResponse(content=stats)


@router.get("/subscriptions")
async def get_active_subscriptions(
    api_key: Optional[str] = Depends(validate_api_key)
) -> JSONResponse:
    """
    Get detailed information about all active SSE subscriptions.
    
    Returns a list of active subscriptions with their filters, creation time,
    duration, and queue status. Useful for debugging connection issues and
    monitoring subscription patterns.
    
    Response Structure:
```json
        [
            {
                "subscription_id": "123e4567-e89b-12d3-a456-426614174000",
                "filters": {
                    "key": "database",
                    "environment": "production",
                    "category": null
                },
                "created_at": "2026-02-15T10:30:00Z",
                "duration_seconds": 125.45,
                "queue_size": 0,
                "queue_max_size": 100
            },
            ...
        ]
```
    
    Returns:
        List of active subscription details
    """
    details = await sse_manager.get_subscription_details()
    return JSONResponse(content=details)


@router.get("/health")
async def sse_health_check() -> JSONResponse:
    """
    Health check endpoint for SSE service.
    
    Provides a quick status check of the SSE manager without requiring
    authentication. Useful for load balancer health checks and monitoring.
    
    Returns:
```json
        {
            "status": "healthy",
            "active_subscriptions": 12,
            "total_events_sent": 1523
        }
```
    """
    stats = await sse_manager.get_stats()
    return JSONResponse(content={
        "status": "healthy",
        "active_subscriptions": stats["subscriptions"]["active"],
        "total_events_sent": stats["events"]["total_sent"]
    })