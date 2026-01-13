"""
OpenSecureConf - Test Example Script

Example script demonstrating CRUD operations on the OpenSecureConf API.
Tests all endpoints with sample data.
"""
import json
import requests


# Configuration
BASE_URL = "http://localhost:9000"
USER_KEY = "YourSecretKey123"  # User-defined encryption key
HEADERS = {"x-user-key": USER_KEY, "Content-Type": "application/json"}


def test_api():
    """
    Test all API endpoints with sample configurations.
    """
    print("=== OpenSecureConf API Test Suite ===\n")

    # 1. CREATE
    print("1. CREATE - Creating new configuration")
    data = {
        "key": "database_config",
        "value": {
            "host": "localhost",
            "port": 5432,
            "username": "admin",
            "password": "super_secret_password",
        },
        "category": "database",
    }
    response = requests.post(
        f"{BASE_URL}/configs", json=data, headers=HEADERS, timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 2. READ
    print("2. READ - Reading configuration")
    response = requests.get(
        f"{BASE_URL}/configs/database_config", headers=HEADERS, timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 3. CREATE another config
    print("3. CREATE - Creating API configuration")
    data = {
        "key": "api_config",
        "value": {"api_key": "xyz789", "timeout": 30, "retries": 3},
        "category": "api",
    }
    response = requests.post(
        f"{BASE_URL}/configs", json=data, headers=HEADERS, timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 4. UPDATE
    print("4. UPDATE - Updating database configuration")
    data = {
        "value": {
            "host": "prod-server.com",
            "port": 5432,
            "username": "admin",
            "password": "new_ultra_secret_password",
        },
        "category": "database",
    }
    response = requests.put(
        f"{BASE_URL}/configs/database_config", json=data, headers=HEADERS, timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 5. LIST ALL
    print("5. LIST - Listing all configurations")
    response = requests.get(f"{BASE_URL}/configs", headers=HEADERS, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 6. LIST BY CATEGORY
    print("6. LIST - Filtering by category 'database'")
    response = requests.get(
        f"{BASE_URL}/configs?category=database", headers=HEADERS, timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 7. DELETE
    print("7. DELETE - Deleting API configuration")
    response = requests.delete(
        f"{BASE_URL}/configs/api_config", headers=HEADERS, timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 8. VERIFY DELETE
    print("8. LIST - Verifying deletion")
    response = requests.get(f"{BASE_URL}/configs", headers=HEADERS, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    # 9. CLEANUP
    print("9. DELETE - Cleaning up remaining configurations")
    response = requests.delete(
        f"{BASE_URL}/configs/database_config", headers=HEADERS, timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

    print("=== Test Suite Complete ===")


if __name__ == "__main__":
    try:
        test_api()
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to API server.")
        print("Make sure the server is running: python api.py")
    except (requests.exceptions.Timeout, requests.exceptions.RequestException) as e:
        print(f"Error: {e}")
