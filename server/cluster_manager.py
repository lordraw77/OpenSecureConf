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
OpenSecureConf - Cluster Manager Module with Metrics Support

This module provides cluster management for distributed, encrypted configuration
storage. It supports two clustering modes:

1. REPLICA:
   - All nodes store and synchronize all configuration keys (active-active replication).
   - Write operations are broadcast to all healthy nodes.
   - Background synchronization ensures eventual consistency.

2. FEDERATED:
   - Each node stores only the configuration keys it receives locally.
   - Read/list operations can query other nodes when data is not found locally.
   - Results from multiple nodes are merged to present a unified view.

Features:
- Node discovery and in-memory registry of cluster members.
- Periodic health checking of nodes with configurable intervals.
- Automatic, best-effort synchronization in REPLICA mode.
- Distributed read and list operations in FEDERATED mode.
- Optional API key authentication for inter-node communication.
- Asynchronous implementation using asyncio and httpx.
- Metrics tracking for synchronization and cluster operations.
"""

import asyncio
import os
import time
from typing import List, Dict, Optional, Set
from enum import Enum
from dataclasses import dataclass
from datetime import datetime
import secrets
import httpx
from async_logger import get_logger
from prometheus_client import Histogram

logger = get_logger(__name__)


class ClusterMode(str, Enum):
    """Cluster operation modes.

    Attributes:
        REPLICA: All nodes synchronize and store all configuration keys
                (active-active replication).
        FEDERATED: Each node stores only its own keys, and queries can be
                  distributed across the cluster to locate missing keys.
    """
    REPLICA = "replica"  # All nodes sync all keys
    FEDERATED = "federated"  # Distributed storage with cross-node queries


@dataclass
class NodeInfo:
    """Metadata about a cluster node.

    Attributes:
        node_id: Unique node identifier, usually in the form "host:port".
        host: Hostname or IP address of the node.
        port: TCP port of the node's HTTP API.
        last_seen: Timestamp of the last successful health check.
        is_healthy: True if the node is considered healthy, False otherwise.
    """
    node_id: str
    host: str
    port: int
    last_seen: datetime
    is_healthy: bool = True

    def to_dict(self):
        """Return a JSON-serializable representation of this node."""
        return {
            "node_id": self.node_id,
            "host": self.host,
            "port": self.port,
            "last_seen": self.last_seen.isoformat(),
            "is_healthy": self.is_healthy
        }

    @property
    def base_url(self) -> str:
        """Return the base HTTP URL for this node."""
        return f"http://{self.host}:{self.port}"


class ClusterManager:
    """
    Manages cluster operations for distributed configuration management.

    This component coordinates multiple OpenSecureConf nodes that expose the
    same REST API, providing two cluster modes:

    - REPLICA:
      All nodes maintain a full copy of all configuration entries. Write
      operations (create, update, delete) are broadcast to every healthy node,
      and a background synchronization loop periodically pulls data from peers.

    - FEDERATED:
      Each node stores only the configuration entries it receives locally.
      When a configuration is not found on the current node, read and list
      operations can query the other nodes and merge their responses.

    The manager uses asynchronous HTTP requests, periodic health checks,
    and optional API-key–based authentication for inter-node calls.
    Includes metrics tracking for Prometheus monitoring.
    """

    def __init__(
        self,
        node_id: str,
        cluster_mode: ClusterMode,
        cluster_nodes: List[str],
        api_key: Optional[str] = None,
        sync_interval: int = 30,
        health_check_interval: int = 10,
        metrics_registry=None
    ):
        """
        Initialize the cluster manager.

        Args:
            node_id:
                Unique identifier for this node (for example "host:port").
            cluster_mode:
                Cluster operating mode (ClusterMode.REPLICA or
                ClusterMode.FEDERATED).
            cluster_nodes:
                List of other cluster node addresses, in the form "host:port".
                The current node_id is automatically excluded from this list.
            api_key:
                Optional API key used in the "X-API-Key" header for secure
                communication between nodes. If None, no API key header is sent.
            sync_interval:
                Interval in seconds between synchronization runs in REPLICA
                mode. Ignored in FEDERATED mode.
            health_check_interval:
                Interval in seconds between health checks for all known nodes.
            metrics_registry:
                Optional Prometheus registry for metrics collection.
        """
        self.node_id = node_id
        self.cluster_mode = ClusterMode(cluster_mode)
        self.api_key = api_key
        self.sync_interval = sync_interval
        self.health_check_interval = health_check_interval

        # Metrics (optional)
        self.metrics_registry = metrics_registry
        self.cluster_sync_duration_histogram = None
        if metrics_registry:
            try:
                self.cluster_sync_duration_histogram = Histogram(
                    'osc_cluster_sync_duration_seconds',
                    'Cluster synchronization duration in seconds',
                    registry=metrics_registry
                )
            except ImportError:
                pass

        # Parse cluster nodes
        self.nodes: Dict[str, NodeInfo] = {}
        for node_addr in cluster_nodes:
            if node_addr:
                host, port = node_addr.split(":")
                node_id_remote = f"{host}:{port}"
                if node_id_remote != self.node_id:
                    self.nodes[node_id_remote] = NodeInfo(
                        node_id=node_id_remote,
                        host=host,
                        port=int(port),
                        last_seen=datetime.now(),
                        is_healthy=True
                    )

        # Synchronization state
        self.sync_in_progress = False
        self.last_sync_time = None

        # Background tasks
        self._background_tasks: Set[asyncio.Task] = set()

    async def start(self):
        """Start background cluster management tasks.

        This method:
        - Starts a periodic health check loop for all known nodes.
        - If the cluster mode is REPLICA, also starts a periodic synchronization
          loop that pulls configurations from healthy peers.

        It should typically be called once during application startup.
        """
        # Health check task
        task1 = asyncio.create_task(self._health_check_loop())
        self._background_tasks.add(task1)
        task1.add_done_callback(self._background_tasks.discard)

        # Sync task (only for REPLICA mode)
        if self.cluster_mode == ClusterMode.REPLICA:
            task2 = asyncio.create_task(self._sync_loop())
            self._background_tasks.add(task2)
            task2.add_done_callback(self._background_tasks.discard)

    async def stop(self):
        """Stop all background cluster tasks.

        Cancels and awaits all running background asyncio tasks created by
        the cluster manager (health checks and, in REPLICA mode, sync loop).
        This should be called during application shutdown to ensure a clean
        termination of background tasks.
        """
        for task in self._background_tasks:
            task.cancel()
        await asyncio.gather(*self._background_tasks, return_exceptions=True)

    async def _health_check_loop(self):
        """Run the periodic health check loop.

        Repeatedly sleeps for ``health_check_interval`` seconds and then calls
        :meth:`_check_nodes_health`. The loop stops when the task is cancelled.
        """
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._check_nodes_health()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.info("health_check_error", error=str(e))

    async def _sync_loop(self):
        """Run the periodic synchronization loop (REPLICA mode only).

        Repeatedly sleeps for ``sync_interval`` seconds and, if the cluster
        mode is REPLICA, calls :meth:`_sync_configurations`. The loop stops
        when the task is cancelled.
        """
        while True:
            try:
                await asyncio.sleep(self.sync_interval)
                if self.cluster_mode == ClusterMode.REPLICA:
                    await self._sync_configurations()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.info("sync_loop_error", error=str(e))

    async def _check_nodes_health(self):
        """Check the health status of all known nodes.

        For each node, sends a GET request to ``/cluster/health`` and updates
        its ``is_healthy`` and ``last_seen`` fields based on the response.
        Nodes that fail to respond or return a non-200 status code are marked
        as unhealthy.
        """
        async with httpx.AsyncClient(timeout=5.0) as client:
            for node_id, node in self.nodes.items():
                try:
                    headers = {}
                    if self.api_key:
                        headers["X-API-Key"] = self.api_key

                    response = await client.get(
                        f"{node.base_url}/cluster/health",
                        headers=headers
                    )

                    if response.status_code == 200:
                        node.is_healthy = True
                        node.last_seen = datetime.now()
                    else:
                        node.is_healthy = False
                except Exception:
                    node.is_healthy = False

    async def _sync_configurations(self):
        """Synchronize configurations from all healthy nodes (REPLICA mode).

        This method:
        - Prevents concurrent sync executions using the ``sync_in_progress`` flag.
        - Iterates over all healthy nodes and calls their ``/cluster/configs``
          endpoint to retrieve the full list of configurations.
        - For each response, delegates merging to :meth:`_merge_configurations`.
        - Updates ``last_sync_time`` when the sync cycle completes.
        - Tracks sync duration for Prometheus metrics.

        Any errors during communication with a node are logged and do not
        stop the synchronization process with other nodes.
        """
        if self.sync_in_progress:
            return

        self.sync_in_progress = True
        start_time = time.time()

        try:
            healthy_nodes = [n for n in self.nodes.values() if n.is_healthy]
            if not healthy_nodes:
                return

            # Get configurations from each healthy node
            async with httpx.AsyncClient(timeout=30.0) as client:
                for node in healthy_nodes:
                    try:
                        headers = {"X-User-Key": "cluster-sync-key"}
                        if self.api_key:
                            headers["X-API-Key"] = self.api_key

                        response = await client.get(
                            f"{node.base_url}/cluster/configs",
                            headers=headers
                        )

                        if response.status_code == 200:
                            remote_configs = response.json()
                            await self._merge_configurations(remote_configs, node)
                    except Exception as e:
                        logger.info("sync_node_failed", node_id=node.node_id, error=str(e))

            self.last_sync_time = datetime.now()

            # Track sync duration metric
            duration = time.time() - start_time
            if self.cluster_sync_duration_histogram:
                self.cluster_sync_duration_histogram.observe(duration)

            logger.info("sync_completed",
                       duration_seconds=round(duration, 3),
                       nodes_synced=len(healthy_nodes))

        finally:
            self.sync_in_progress = False

    async def _merge_configurations(self, remote_configs: List[Dict], source_node: NodeInfo):
        """
        Merge remote configurations into the local storage.

        This method is intended to be overridden or implemented by the API
        layer (for example, in ``api.py``) where the actual
        ConfigurationManager instance is available.

        Args:
            remote_configs:
                List of configuration objects returned by another node.
            source_node:
                The node from which these configurations were retrieved.

        Note:
            The default implementation is a stub and does nothing. The caller
            is expected to provide concrete merging logic (upserts, conflict
            resolution, etc.).
        """
        # This is called by the sync process - implementation in api.py


    async def broadcast_create(self, key: str, value: dict, category: str, user_key: str):
        """
        Broadcast a configuration creation to all healthy nodes (REPLICA mode).

        Args:
            key:
                Configuration key to create.
            value:
                Configuration value (JSON-serializable dict).
            category:
                Optional category associated with the configuration.
            user_key:
                User encryption key to send in the ``X-User-Key`` header.

        Behavior:
            - If the cluster mode is not REPLICA, the method returns immediately.
            - For each healthy node, performs a POST request to ``/configs``
              with the provided payload and headers.
            - Errors for individual nodes are logged and do not raise
              exceptions (best-effort propagation).
        """
        if self.cluster_mode != ClusterMode.REPLICA:
            return

        healthy_nodes = [n for n in self.nodes.values() if n.is_healthy]

        async with httpx.AsyncClient(timeout=10.0) as client:
            for node in healthy_nodes:
                try:
                    headers = {"X-User-Key": user_key}
                    if self.api_key:
                        headers["X-API-Key"] = self.api_key

                    await client.post(
                        f"{node.base_url}/configs",
                        headers=headers,
                        json={"key": key, "value": value, "category": category}
                    )
                except Exception as e:
                    logger.info("broadcast_create_failed", node_id=node.node_id, error=str(e))

    async def broadcast_update(self, key: str, value: dict, category: str, user_key: str):
        """
        Broadcast a configuration update to all healthy nodes (REPLICA mode).

        Args:
            key:
                Configuration key to update.
            value:
                New configuration value.
            category:
                Optional new category. If None on the receiving node, the
                existing category may be preserved depending on API logic.
            user_key:
                User encryption key to send in the ``X-User-Key`` header.

        Behavior:
            - If the cluster mode is not REPLICA, the method returns immediately.
            - For each healthy node, performs a PUT request to
              ``/configs/{key}`` with the updated payload.
            - Errors for individual nodes are logged and ignored.
        """
        if self.cluster_mode != ClusterMode.REPLICA:
            return

        healthy_nodes = [n for n in self.nodes.values() if n.is_healthy]

        async with httpx.AsyncClient(timeout=10.0) as client:
            for node in healthy_nodes:
                try:
                    headers = {"X-User-Key": user_key}
                    if self.api_key:
                        headers["X-API-Key"] = self.api_key

                    await client.put(
                        f"{node.base_url}/configs/{key}",
                        headers=headers,
                        json={"value": value, "category": category}
                    )
                except Exception as e:
                    logger.info("broadcast_update_failed", node_id=node.node_id, error=str(e))

    async def broadcast_delete(self, key: str, user_key: str):
        """
        Broadcast a configuration deletion to all healthy nodes (REPLICA mode).

        Args:
            key:
                Configuration key to delete.
            user_key:
                User encryption key to send in the ``X-User-Key`` header.

        Behavior:
            - If the cluster mode is not REPLICA, the method returns immediately.
            - For each healthy node, performs a DELETE request to
              ``/configs/{key}``.
            - Errors for individual nodes are logged and ignored.
        """
        if self.cluster_mode != ClusterMode.REPLICA:
            return

        healthy_nodes = [n for n in self.nodes.values() if n.is_healthy]

        async with httpx.AsyncClient(timeout=10.0) as client:
            for node in healthy_nodes:
                try:
                    headers = {"X-User-Key": user_key}
                    if self.api_key:
                        headers["X-API-Key"] = self.api_key

                    await client.delete(
                        f"{node.base_url}/configs/{key}",
                        headers=headers
                    )
                except Exception as e:
                    logger.info("broadcast_delete_failed", node_id=node.node_id, error=str(e))

    async def federated_read(self, key: str, user_key: str) -> Optional[Dict]:
        """
        Query all healthy nodes for a configuration key (FEDERATED mode).

        Args:
            key:
                Configuration key to look up.
            user_key:
                User encryption key to send in the ``X-User-Key`` header.

        Returns:
            The configuration object (as a dict) if any node returns HTTP 200,
            or None if the key is not found on any healthy node or all
            requests fail.

        Behavior:
            - If the cluster mode is not FEDERATED, immediately returns None.
            - Iterates over healthy nodes and performs a GET request to
              ``/configs/{key}`` on each.
            - Returns the first successful response (fail-fast).
            - Logs communication errors and continues with the next node.
        """
        if self.cluster_mode != ClusterMode.FEDERATED:
            return None

        healthy_nodes = [n for n in self.nodes.values() if n.is_healthy]
        failed_nodes = []

        async with httpx.AsyncClient(timeout=5.0) as client:
            for node in healthy_nodes:
                try:
                    headers = {"X-User-Key": user_key}
                    if self.api_key:
                        headers["X-API-Key"] = self.api_key

                    response = await client.get(
                        f"{node.base_url}/configs/{key}",
                        headers=headers
                    )

                    if response.status_code == 200:
                        return response.json()
                except Exception as exc:
                    failed_nodes.append((node.base_url, str(exc)))

        # Log solo se tutti i nodi falliscono
        if failed_nodes:
            logger.info("federated_read_all_failed", key=key, failed_nodes=len(failed_nodes))

        return None

    async def federated_list(self, category: Optional[str], user_key: str) -> List[Dict]:
        """
        Aggregate a list of configurations from all healthy nodes (FEDERATED mode).

        Args:
            category:
                Optional category filter to apply on remote nodes, or None to
                list all configurations.
            user_key:
                User encryption key to send in the ``X-User-Key`` header.

        Returns:
            A combined list of configuration objects, with duplicate keys
            removed. If the cluster mode is not FEDERATED, returns an empty list.

        Behavior:
            - If the cluster mode is not FEDERATED, returns [].
            - For each healthy node, calls ``GET /configs`` (optionally with
              a ``?category=...`` query parameter).
            - Merges results, skipping duplicate keys that were already seen
              from previous nodes.
            - Logs communication errors and continues with remaining nodes.
        """
        if self.cluster_mode != ClusterMode.FEDERATED:
            return []

        all_configs = []
        seen_keys = set()
        healthy_nodes = [n for n in self.nodes.values() if n.is_healthy]

        async with httpx.AsyncClient(timeout=10.0) as client:
            for node in healthy_nodes:
                try:
                    headers = {"X-User-Key": user_key}
                    if self.api_key:
                        headers["X-API-Key"] = self.api_key

                    url = f"{node.base_url}/configs"
                    if category:
                        url += f"?category={category}"

                    response = await client.get(url, headers=headers)

                    if response.status_code == 200:
                        configs = response.json()
                        for config in configs:
                            # Avoid duplicates (same key from multiple nodes)
                            if config["key"] not in seen_keys:
                                all_configs.append(config)
                                seen_keys.add(config["key"])
                except Exception as e:
                    logger.info("federated_list_node_failed", node_id=node.node_id, error=str(e))

        return all_configs

    async def sync_encryption_salt(self, local_salt_path: str) -> bool:
        """
        Synchronize encryption salt across cluster nodes with bootstrap logic.

        Logic:
        1. If this node has salt -> distribute to others
        2. If no one has salt -> first node (alphabetically) generates it
        3. If others have salt -> download from them

        Args:
            local_salt_path: Path to the local salt file

        Returns:
            True if salt is synchronized, False otherwise
        """
        # Check if we have a salt file
        has_local_salt = os.path.exists(local_salt_path)

        if has_local_salt:
            # We have salt - distribute to nodes that need it
            logger.info("salt_distribution_started", node_id=self.node_id)
            with open(local_salt_path, 'rb') as f:
                salt_data = f.read()

            async with httpx.AsyncClient(timeout=10.0) as client:
                for node in self.nodes.values():
                    try:
                        headers = {}
                        if self.api_key:
                            headers["X-API-Key"] = self.api_key

                        response = await client.post(
                            f"{node.base_url}/cluster/salt",
                            headers=headers,
                            content=salt_data
                        )

                        if response.status_code in [200, 409]:  # 409 = already exists
                            logger.info("salt_sent_success", target_node=node.node_id)
                        else:
                            logger.info("salt_sent_failed", target_node=node.node_id, status=response.status_code)
                    except Exception as e:
                        logger.info("salt_send_error", target_node=node.node_id, error=str(e))

            return True
        else:
            # We don't have salt - try to get from cluster
            logger.info("salt_request_started", node_id=self.node_id)

            # First, try to get from existing nodes
            async with httpx.AsyncClient(timeout=10.0) as client:
                for node in self.nodes.values():
                    try:
                        headers = {}
                        if self.api_key:
                            headers["X-API-Key"] = self.api_key

                        response = await client.get(
                            f"{node.base_url}/cluster/salt",
                            headers=headers
                        )

                        if response.status_code == 200:
                            # Save received salt
                            salt_data = response.content
                            # Create directory if needed
                            os.makedirs(os.path.dirname(local_salt_path), exist_ok=True)
                            with open(local_salt_path, 'wb') as f:
                                f.write(salt_data)
                            logger.info("salt_received_success", source_node=node.node_id)
                            return True
                    except Exception:  # nosec B112
                        continue

            # No node has salt - bootstrap logic
            logger.info("salt_bootstrap_needed", node_id=self.node_id)

            # Determine if THIS node should generate the salt
            # Use alphabetical order of node IDs to ensure deterministic behavior
            all_node_ids = [self.node_id] + [n.node_id for n in self.nodes.values()]
            all_node_ids.sort()
            bootstrap_node = all_node_ids[0]  # First node alphabetically

            if self.node_id == bootstrap_node:
                logger.info("salt_generation_started", bootstrap_node=self.node_id)
                # Generate salt
                salt_data = secrets.token_bytes(64)
                # Create directory if needed
                os.makedirs(os.path.dirname(local_salt_path), exist_ok=True)
                # Save locally
                with open(local_salt_path, 'wb') as f:
                    f.write(salt_data)
                logger.info("salt_generated", size_bytes=len(salt_data))

                # Wait a moment for other nodes to be ready
                await asyncio.sleep(2)

                # Distribute to other nodes
                logger.info("salt_distribution_started", node_id=self.node_id)
                async with httpx.AsyncClient(timeout=10.0) as client:
                    for node in self.nodes.values():
                        try:
                            headers = {}
                            if self.api_key:
                                headers["X-API-Key"] = self.api_key

                            response = await client.post(
                                f"{node.base_url}/cluster/salt",
                                headers=headers,
                                content=salt_data
                            )

                            if response.status_code in [200, 409]:
                                logger.info("salt_sent_success", target_node=node.node_id)
                            else:
                                logger.info("salt_sent_failed", target_node=node.node_id, status=response.status_code)
                        except Exception as e:
                            logger.info("salt_send_error", target_node=node.node_id, error=str(e))

                return True
            else:
                logger.info("salt_waiting_bootstrap", bootstrap_node=bootstrap_node, current_node=self.node_id)
                # Wait and retry getting salt from bootstrap node
                for attempt in range(5):  # 5 attempts
                    await asyncio.sleep(2)  # Wait 2 seconds between attempts
                    try:
                        headers = {}
                        if self.api_key:
                            headers["X-API-Key"] = self.api_key

                        async with httpx.AsyncClient(timeout=10.0) as client:
                            # Try bootstrap node first
                            for node_id in all_node_ids:
                                if node_id == self.node_id:
                                    continue

                                # Find node info
                                node_info = self.nodes.get(node_id)
                                if not node_info:
                                    continue

                                response = await client.get(
                                    f"{node_info.base_url}/cluster/salt",
                                    headers=headers
                                )

                                if response.status_code == 200:
                                    salt_data = response.content
                                    os.makedirs(os.path.dirname(local_salt_path), exist_ok=True)
                                    with open(local_salt_path, 'wb') as f:
                                        f.write(salt_data)
                                    logger.info("salt_received_success", source_node=node_id, attempt=attempt + 1)
                                    return True
                    except Exception as e:
                        logger.info("salt_receive_attempt_failed", attempt=attempt + 1, error=str(e))

                logger.info("salt_receive_all_failed", attempts=5)
                return False

    def get_cluster_status(self) -> Dict:
        """
        Return a snapshot of the current cluster status.

        Returns:
            A dictionary with the following fields:
            - ``node_id`` (str): ID of the local node.
            - ``cluster_mode`` (str): Current mode, either "replica" or "federated".
            - ``total_nodes`` (int): Total number of known peer nodes.
            - ``healthy_nodes`` (int): Number of nodes currently marked as healthy.
            - ``last_sync`` (str | None): ISO 8601 timestamp of the last
              successful synchronization run (REPLICA mode), or None if no sync
              has been performed yet.
            - ``nodes`` (list[dict]): List of serialized node metadata, one
              entry per known node (see :meth:`NodeInfo.to_dict`).
        """
        return {
            "node_id": self.node_id,
            "cluster_mode": self.cluster_mode.value,
            "total_nodes": len(self.nodes),
            "healthy_nodes": sum(1 for n in self.nodes.values() if n.is_healthy),
            "last_sync": self.last_sync_time.isoformat() if self.last_sync_time else None,
            "nodes": [node.to_dict() for node in self.nodes.values()]
        }
