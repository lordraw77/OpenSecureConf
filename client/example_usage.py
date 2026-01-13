"""
Example usage of the OpenSecureConf Python Client.

This script demonstrates how to use the client library to interact
with an OpenSecureConf API server.
"""

from opensecureconf_client import (
    OpenSecureConfClient,
    AuthenticationError,
    ConfigurationNotFoundError,
    ConfigurationExistsError,
)


def main():
    """Main example function demonstrating client usage."""

    # Initialize the client
    client = OpenSecureConfClient(
        base_url="http://localhost:9000", user_key="my-secure-encryption-key"
    )

    try:
        # Get service information
        print("=== Service Information ===")
        info = client.get_service_info()
        print(f"Service: {info['service']}")
        print(f"Version: {info['version']}")
        print(f"Features: {', '.join(info['features'])}")
        print()

        # Create configurations
        print("=== Creating Configurations ===")

        # Database configuration
        db_config = client.create(
            key="database",
            value={
                "host": "localhost",
                "port": 5432,
                "database": "myapp",
                "username": "admin",
            },
            category="production",
        )
        print(f"Created: {db_config['key']} (ID: {db_config['id']})")

        # API configuration
        api_config = client.create(
            key="api",
            value={"base_url": "https://api.example.com", "timeout": 30, "retries": 3},
            category="production",
        )
        print(f"Created: {api_config['key']} (ID: {api_config['id']})")

        # Feature flags
        features = client.create(
            key="features",
            value={"new_ui": True, "beta_features": False, "debug_mode": False},
            category="settings",
        )
        print(f"Created: {features['key']} (ID: {features['id']})")
        print()

        # Read a configuration
        print("=== Reading Configuration ===")
        db = client.read("database")
        print(f"Key: {db['key']}")
        print(f"Value: {db['value']}")
        print(f"Category: {db['category']}")
        print()

        # Update a configuration
        print("=== Updating Configuration ===")
        updated = client.update(
            key="database",
            value={
                "host": "db.example.com",
                "port": 5432,
                "database": "myapp",
                "username": "admin",
                "ssl": True,  # Added new field
            },
        )
        print(f"Updated '{updated['key']}' with new value: {updated['value']}")
        print()

        # List all configurations
        print("=== Listing All Configurations ===")
        all_configs = client.list_all()
        print(f"Total configurations: {len(all_configs)}")
        for config in all_configs:
            print(f"  - {config['key']} [{config.get('category', 'no category')}]")
        print()

        # List by category
        print("=== Listing Production Configurations ===")
        prod_configs = client.list_all(category="production")
        for config in prod_configs:
            print(f"  - {config['key']}: {config['value']}")
        print()

        # Delete a configuration
        print("=== Deleting Configuration ===")
        result = client.delete("features")
        print(result["message"])
        print()

        # Demonstrate error handling
        print("=== Error Handling Examples ===")

        # Try to read non-existent config
        try:
            client.read("nonexistent")
        except ConfigurationNotFoundError:
            print("✓ ConfigurationNotFoundError caught for non-existent key")

        # Try to create duplicate
        try:
            client.create("database", {"duplicate": "test"})
        except ConfigurationExistsError:
            print("✓ ConfigurationExistsError caught for duplicate key")

    except AuthenticationError as e:
        print(f"Authentication failed: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Always close the client
        client.close()
        print("✓ Client closed")


def context_manager_example():
    """Example using context manager for automatic resource cleanup."""

    print("=== Context Manager Example ===")

    with OpenSecureConfClient(
        base_url="http://localhost:9000", user_key="my-secure-encryption-key"
    ) as client:

        # Create a temporary configuration
        temp = client.create(
            key="temp_config", value={"expires": "2026-01-12", "data": "temporary"}
        )
        print(f"Created temporary config: {temp['key']}")

        # Read it back
        retrieved = client.read("temp_config")
        print(f"Retrieved: {retrieved['value']}")

        # Clean up
        client.delete("temp_config")
        print("Deleted temporary config")

    print("✓ Client automatically closed via context manager")


if __name__ == "__main__":
    # Run the main example
    main()

    # Run context manager example
    context_manager_example()
