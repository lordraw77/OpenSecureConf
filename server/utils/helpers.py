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
Helper Utilities for OpenSecureConf API

This module provides utility functions used throughout the application.
These are small, reusable functions that don't fit into other specific modules.
"""

import asyncio
from config_manager import ConfigurationManager
from core.metrics import config_entries_total


async def update_config_count_metric(manager: ConfigurationManager) -> None:
    """
    Update the Prometheus gauge metric for total configuration entries.
    
    This function queries the database for the current number of configuration
    entries and updates the corresponding Prometheus gauge. It's called after
    operations that change the total count (create, delete, import).
    
    The function runs the database query in a thread pool to avoid blocking
    the async event loop, since ConfigurationManager uses synchronous SQLite.
    
    Args:
        manager: ConfigurationManager instance with database connection
    
    Returns:
        None: Updates metric as side effect
    
    Error Handling:
        Silently catches and ignores exceptions to prevent metric collection
        from breaking API functionality. In production, consider logging errors.
    
    Example:
        manager = ConfigurationManager(db_path="configs.db", user_key="key")
        await update_config_count_metric(manager)
        # Prometheus metric now reflects current database count
    """
    try:
        # Query database for all configurations (runs in thread pool)
        all_configs = await asyncio.to_thread(manager.list_all)

        # Update Prometheus gauge with current count
        config_entries_total.set(len(all_configs))
    except Exception: # nosec B110
        # Silently ignore errors to prevent metric collection from breaking API
        # In production, consider logging this error
        pass
