"""
Unit tests for OpenSecureConf Python Client.

Run with: pytest test_opensecureconf_client.py
"""

import pytest
from unittest.mock import Mock, patch
from opensecureconf_client import (
    OpenSecureConfClient,
    OpenSecureConfError,
    AuthenticationError,
    ConfigurationNotFoundError,
    ConfigurationExistsError
)


@pytest.fixture
def client():
    """Create a client instance for testing."""
    return OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="test-key-12345"
    )


def test_client_initialization():
    """Test client initialization."""
    client = OpenSecureConfClient(
        base_url="http://localhost:9000",
        user_key="test-key-12345"
    )
    assert client.base_url == "http://localhost:9000"
    assert client.user_key == "test-key-12345"
    assert client.timeout == 30


def test_client_initialization_short_key():
    """Test that short keys raise ValueError."""
    with pytest.raises(ValueError, match="at least 8 characters"):
        OpenSecureConfClient(
            base_url="http://localhost:9000",
            user_key="short"
        )


@patch('requests.Session.request')
def test_get_service_info(mock_request, client):
    """Test getting service information."""
    mock_request.return_value = Mock(
        status_code=200,
        json=lambda: {
            "service": "OpenSecureConf API",
            "version": "1.0.0",
            "features": ["encryption", "multithreading"]
        }
    )

    info = client.get_service_info()
    assert info["service"] == "OpenSecureConf API"
    assert info["version"] == "1.0.0"
    mock_request.assert_called_once()


@patch('requests.Session.request')
def test_create_configuration(mock_request, client):
    """Test creating a configuration."""
    mock_request.return_value = Mock(
        status_code=201,
        json=lambda: {
            "id": 1,
            "key": "test",
            "value": {"data": "value"},
            "category": "test"
        }
    )

    result = client.create("test", {"data": "value"}, category="test")
    assert result["key"] == "test"
    assert result["value"]["data"] == "value"


@patch('requests.Session.request')
def test_read_configuration(mock_request, client):
    """Test reading a configuration."""
    mock_request.return_value = Mock(
        status_code=200,
        json=lambda: {
            "id": 1,
            "key": "test",
            "value": {"data": "value"},
            "category": None
        }
    )

    result = client.read("test")
    assert result["key"] == "test"


@patch('requests.Session.request')
def test_update_configuration(mock_request, client):
    """Test updating a configuration."""
    mock_request.return_value = Mock(
        status_code=200,
        json=lambda: {
            "id": 1,
            "key": "test",
            "value": {"data": "updated"},
            "category": None
        }
    )

    result = client.update("test", {"data": "updated"})
    assert result["value"]["data"] == "updated"


@patch('requests.Session.request')
def test_delete_configuration(mock_request, client):
    """Test deleting a configuration."""
    mock_request.return_value = Mock(
        status_code=200,
        json=lambda: {"message": "Configuration 'test' deleted successfully"}
    )

    result = client.delete("test")
    assert "deleted successfully" in result["message"]


@patch('requests.Session.request')
def test_list_all_configurations(mock_request, client):
    """Test listing all configurations."""
    mock_request.return_value = Mock(
        status_code=200,
        json=lambda: [
            {"id": 1, "key": "test1", "value": {}, "category": "cat1"},
            {"id": 2, "key": "test2", "value": {}, "category": "cat1"}
        ]
    )

    result = client.list_all()
    assert len(result) == 2


@patch('requests.Session.request')
def test_authentication_error(mock_request, client):
    """Test authentication error handling."""
    mock_request.return_value = Mock(
        status_code=401,
        json=lambda: {"detail": "Invalid key"}
    )

    with pytest.raises(AuthenticationError):
        client.read("test")


@patch('requests.Session.request')
def test_configuration_not_found_error(mock_request, client):
    """Test configuration not found error."""
    mock_request.return_value = Mock(
        status_code=404,
        json=lambda: {"detail": "Not found"}
    )

    with pytest.raises(ConfigurationNotFoundError):
        client.read("nonexistent")


@patch('requests.Session.request')
def test_configuration_exists_error(mock_request, client):
    """Test configuration exists error."""
    mock_request.return_value = Mock(
        status_code=400,
        json=lambda: {"detail": "Configuration already exists"}
    )

    with pytest.raises(ConfigurationExistsError):
        client.create("duplicate", {})


def test_context_manager(client):
    """Test context manager functionality."""
    with patch.object(client, 'close') as mock_close:
        with client:
            pass
        mock_close.assert_called_once()
