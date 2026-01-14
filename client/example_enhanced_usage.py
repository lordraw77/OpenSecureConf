"""
Example usage of the Enhanced OpenSecureConf Python Client.

This script demonstrates the new features added to the client library.
"""

from opensecureconf_client import (
    OpenSecureConfClient,
    AuthenticationError,
    ConfigurationNotFoundError,
    ClusterError,
)


def basic_example():
    """Esempio base con retry e logging."""
    print("\n" + "="*60)
    print("ESEMPIO 1: Client con Retry e Logging")
    print("="*60)

    # Client con retry automatico e logging
    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-secure-encryption-key",
        api_key="cluster-secret-key-123",
        enable_retry=True,
        max_retries=3,
        backoff_factor=1.0,
        log_level="INFO"  # DEBUG, INFO, WARNING, ERROR
    )

    # Health check
    if client.ping():
        print("✓ Server is healthy and reachable")
    else:
        print("✗ Server is not reachable")

    # Get service info
    info = client.get_service_info()
    print(f"Service: {info['service']} v{info['version']}")

    client.close()


def cluster_example():
    """Esempio: operazioni cluster."""
    print("\n" + "="*60)
    print("ESEMPIO 2: Cluster Awareness")
    print("="*60)

    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-secure-encryption-key",
        api_key="cluster-secret-key-123"
    )

    try:
        # Controlla lo stato del cluster
        cluster_status = client.get_cluster_status()

        if cluster_status['enabled']:
            print(f"Cluster Mode: {cluster_status['mode']}")
            print(f"Node ID: {cluster_status['node_id']}")
            print(f"Healthy Nodes: {cluster_status['healthy_nodes']}/{cluster_status['total_nodes']}")
        else:
            print("Clustering is disabled")

        # Health check del nodo
        health = client.get_cluster_health()
        print(f"Node Status: {health['status']}")

    except ClusterError as e:
        print(f"Cluster error: {e}")
    finally:
        client.close()


def batch_operations_example():
    """Esempio: operazioni batch."""
    print("\n" + "="*60)
    print("ESEMPIO 3: Batch Operations")
    print("="*60)

    with OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-secure-encryption-key",
        api_key="cluster-secret-key-123"
    ) as client:

        # Bulk create - crea più configurazioni in una volta
        configs_to_create = [
            {
                "key": "service1",
                "value": {"url": "http://service1.local", "timeout": 30},
                "category": "microservices"
            },
            {
                "key": "service2",
                "value": {"url": "http://service2.local", "timeout": 60},
                "category": "microservices"
            },
            {
                "key": "service3",
                "value": {"url": "http://service3.local", "timeout": 45},
                "category": "microservices"
            }
        ]

        print("Creating multiple configurations...")
        results = client.bulk_create(configs_to_create, ignore_errors=True)
        print(f"✓ Created {len(results)} configurations")

        # Bulk read - leggi più configurazioni
        print("\nReading multiple configurations...")
        keys_to_read = ["service1", "service2", "service3"]
        configs = client.bulk_read(keys_to_read, ignore_errors=True)

        for config in configs:
            print(f"  - {config['key']}: {config['value']['url']}")

        # Count configurations
        total = client.count()
        microservices_count = client.count(category="microservices")
        print(f"\nTotal configurations: {total}")
        print(f"Microservices configurations: {microservices_count}")

        # List categories
        categories = client.list_categories()
        print(f"Categories: {', '.join(categories)}")

        # Bulk delete
        print("\nDeleting test configurations...")
        delete_result = client.bulk_delete(
            ["service1", "service2", "service3"], 
            ignore_errors=True
        )
        print(f"✓ Deleted: {len(delete_result['deleted'])}")
        if delete_result['failed']:
            print(f"✗ Failed: {len(delete_result['failed'])}")


def utility_methods_example():
    """Esempio: metodi utility."""
    print("\n" + "="*60)
    print("ESEMPIO 4: Utility Methods")
    print("="*60)

    with OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-secure-encryption-key",
        api_key="cluster-secret-key-123"
    ) as client:

        # Crea una configurazione di test
        client.create(
            "cache_config",
            {"host": "redis.local", "port": 6379, "db": 0}
        )

        # Check if exists
        if client.exists("cache_config"):
            print("✓ Configuration 'cache_config' exists")

        # Get or default - utile per configurazioni opzionali
        fallback_config = client.get_or_default(
            "nonexistent_config",
            {"default": "value", "enabled": False}
        )
        print(f"\nFallback config: {fallback_config['value']}")

        # Get existing with get_or_default
        cache_config = client.get_or_default(
            "cache_config",
            {"host": "localhost", "port": 6379}
        )
        print(f"Cache config: {cache_config['value']}")

        # Cleanup
        client.delete("cache_config")


def error_handling_example():
    """Esempio: gestione errori migliorata."""
    print("\n" + "="*60)
    print("ESEMPIO 5: Enhanced Error Handling")
    print("="*60)

    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-secure-encryption-key",
        api_key="cluster-secret-key-123",
        log_level="DEBUG"
    )

    try:
        # Tentativo di lettura configurazione inesistente
        config = client.read("nonexistent_key")
    except ConfigurationNotFoundError as e:
        print(f"✓ ConfigurationNotFoundError caught: {e}")

    try:
        # Creazione con chiave vuota
        client.create("", {"invalid": "data"})
    except ValueError as e:
        print(f"✓ ValueError caught: {e}")

    try:
        # Creazione con valore non-dict
        client.create("test", "not a dict")  # type: ignore
    except ValueError as e:
        print(f"✓ ValueError caught: {e}")

    client.close()


def advanced_configuration_example():
    """Esempio: configurazione avanzata del client."""
    print("\n" + "="*60)
    print("ESEMPIO 6: Advanced Client Configuration")
    print("="*60)

    # Client con configurazione personalizzata per produzione
    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="my-secure-encryption-key",
        api_key="cluster-secret-key-123",
        timeout=60,  # Timeout più lungo
        verify_ssl=True,  # Verifica SSL in produzione
        enable_retry=True,
        max_retries=5,  # Più retry
        backoff_factor=2.0,  # Backoff più aggressivo
        pool_connections=20,  # Più connessioni
        pool_maxsize=50,  # Pool più grande
        log_level="INFO"
    )

    print(f"Client configurato: {client}")
    print(f"Base URL: {client.base_url}")
    print(f"Timeout: {client.timeout}s")
    print(f"SSL Verification: {client.verify_ssl}")

    # Test di connessione
    if client.ping():
        print("✓ Connection pool e retry funzionano correttamente")

    client.close()


def main():
    """Main function per eseguire tutti gli esempi."""
    print("\n" + "="*60)
    print("OpenSecureConf Enhanced Client - Examples")
    print("="*60)

    try:
        basic_example()
        cluster_example()
        batch_operations_example()
        utility_methods_example()
        error_handling_example()
        advanced_configuration_example()

        print("\n" + "="*60)
        print("✅ Tutti gli esempi completati con successo!")
        print("="*60)

    except AuthenticationError as e:
        print(f"\n❌ Authentication Error: {e}")
        print("Verifica che il server sia in esecuzione e le credenziali siano corrette.")
    except ConnectionError as e:
        print(f"\n❌ Connection Error: {e}")
        print("Verifica che il server sia in esecuzione su http://localhost:9000")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")


if __name__ == "__main__":
    main()
