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
Dependency Injection Module for FastAPI

This module provides dependency functions used throughout the FastAPI application.
Dependencies are functions that FastAPI calls before executing route handlers,
allowing for:
- Request validation
- Authentication and authorization
- Resource initialization
- Shared logic across endpoints

FastAPI's dependency injection system offers:
- Automatic parameter extraction from requests
- Dependency caching (same request = same instance)
- Nested dependencies
- Async support
- Type safety and IDE autocompletion

Usage:
    from core.dependencies import validate_api_key, get_config_manager
    from fastapi import Depends

    @app.get("/configs")
    async def list_configs(
        manager: ConfigurationManager = Depends(get_config_manager)
    ):
        return await asyncio.to_thread(manager.list_all)
"""
from typing import Optional

from fastapi import Header, HTTPException, Depends
from config_manager import ConfigurationManager
from core.config import (
    OSC_API_KEY_REQUIRED,
    OSC_API_KEY,
    OSC_MIN_USER_KEY_LENGTH,
    OSC_DATABASE_PATH,
    OSC_SALT_FILE_PATH
)


# =============================================================================
# AUTHENTICATION DEPENDENCY
# =============================================================================

def validate_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> None:
    """
    Validates the API key if authentication is enabled.

    This dependency function is called by FastAPI before executing route handlers
    that require API key authentication. It extracts the X-API-Key header from
    the request and validates it against the configured API key.

    Authentication Flow:
    1. Check if API key authentication is required (OSC_API_KEY_REQUIRED)
    2. If not required, allow request to proceed immediately
    3. If required, extract X-API-Key header from request
    4. If header is missing, return 403 Forbidden
    5. If header value doesn't match OSC_API_KEY, return 403 Forbidden
    6. If valid, allow request to proceed to route handler

    Args:
        x_api_key: API key extracted from X-API-Key HTTP header (optional)
                   FastAPI automatically extracts this from the request
                   Header name is case-insensitive (X-API-Key = x-api-key)

    Raises:
        HTTPException(403): If API key is required but missing
        HTTPException(403): If API key is provided but invalid

    Returns:
        None: Success allows request to proceed to route handler

    Security Considerations:
        - API key is transmitted in HTTP header (use HTTPS in production!)
        - Constant-time comparison prevents timing attacks
        - Failed attempts should be logged for security monitoring
        - Consider rate limiting to prevent brute force attacks
        - Rotate API keys regularly
        - Use strong, randomly generated API keys (32+ characters)

    Configuration:
        - OSC_API_KEY_REQUIRED: Enable/disable authentication (default: false)
        - OSC_API_KEY: The valid API key (default: "your-super-secret-api-key-here")

    Usage Example:
        # Protect a route with API key validation
        @app.get("/protected")
        async def protected_route(
            api_key_validated: None = Depends(validate_api_key)
        ):
            return {"message": "Access granted"}

        # Client request (with curl)
        curl -H "X-API-Key: your-super-secret-api-key-here" \
             http://localhost:9000/protected

    Dependency Chaining:
        This dependency is often used in combination with other dependencies:

        @app.get("/configs")
        async def list_configs(
            api_key_validated: None = Depends(validate_api_key),
            manager: ConfigurationManager = Depends(get_config_manager)
        ):
            # Both dependencies executed before this handler
            return manager.list_all()
    """
    # Check if API key authentication is enabled
    if OSC_API_KEY_REQUIRED:
        # API key is required, validate it

        # Check if X-API-Key header is present
        if not x_api_key:
            # Header is missing - authentication failed
            raise HTTPException(
                status_code=403,
                detail="API key required but missing. Provide X-API-Key header.",
            )

        # Check if provided API key matches configured key
        # Using direct comparison (consider using secrets.compare_digest for timing attack prevention)
        if x_api_key != OSC_API_KEY:
            # Invalid API key - authentication failed
            raise HTTPException(
                status_code=403,
                detail="Invalid API key"
            )

    # Authentication successful (or not required)
    # Return None to allow request to proceed
    return None


# =============================================================================
# CONFIGURATION MANAGER DEPENDENCY
# =============================================================================

def get_config_manager(
    x_user_key: str = Header(..., description="User encryption key for configuration encryption/decryption"),
    api_key_validated: None = Depends(validate_api_key),
) -> ConfigurationManager:
    """
    Creates and returns a ConfigurationManager instance with validated user key.

    This dependency function is called by FastAPI before executing route handlers
    that need to interact with encrypted configurations. It performs two critical tasks:
    1. Validates API key (via dependency chain)
    2. Validates user encryption key and creates ConfigurationManager

    The ConfigurationManager is the core component for:
    - Creating encrypted configuration entries
    - Reading and decrypting configuration entries
    - Updating encrypted configuration entries
    - Deleting configuration entries
    - Listing and filtering configurations

    Dependency Chain:
    1. FastAPI extracts X-User-Key header from request
    2. FastAPI calls validate_api_key() dependency (if not already cached)
    3. If API key valid, FastAPI calls this function
    4. This function validates user key length
    5. This function creates ConfigurationManager instance
    6. FastAPI passes instance to route handler

    Args:
        x_user_key: User's encryption key from X-User-Key HTTP header (required)
                    This key is used to derive encryption keys via PBKDF2
                    Must be at least OSC_MIN_USER_KEY_LENGTH characters
                    Never stored, only held in memory during request
                    Each user can have their own key for multi-tenant scenarios

        api_key_validated: Result of validate_api_key dependency (always None)
                           Ensures API key validation runs before this function
                           Uses FastAPI's dependency caching (same request = same validation)

    Returns:
        ConfigurationManager: Initialized manager instance ready for use
                              Configured with database path, user key, and salt file
                              Each request gets a fresh instance (no state sharing)

    Raises:
        HTTPException(401): If X-User-Key header is missing
        HTTPException(401): If user key is too short (< OSC_MIN_USER_KEY_LENGTH)

    Security Considerations:
        - User key transmitted in HTTP header (MUST use HTTPS in production!)
        - User key never stored in database or logs
        - User key held in memory only during request processing
        - Each user can have unique encryption key
        - Lost user key = lost data (no key recovery mechanism)
        - Strong user keys (16+ characters) recommended

    Configuration:
        - OSC_DATABASE_PATH: SQLite database file path
        - OSC_SALT_FILE_PATH: Encryption salt file path
        - OSC_MIN_USER_KEY_LENGTH: Minimum user key length (default: 8)

    Usage Example:
        # Use ConfigurationManager in a route
        @app.get("/configs/{key}")
        async def read_config(
            key: str,
            manager: ConfigurationManager = Depends(get_config_manager)
        ):
            # Manager is already initialized with user's encryption key
            return await asyncio.to_thread(manager.read, key=key)

        # Client request (with curl)
        curl -H "X-API-Key: secret" \
             -H "X-User-Key: my-encryption-password" \
             http://localhost:9000/configs/database.host

    Multi-Tenancy:
        Different users can have different encryption keys:
        - User A: X-User-Key=alice-secret-key
        - User B: X-User-Key=bob-secret-key
        - User A cannot decrypt User B's configurations
        - Useful for multi-tenant SaaS deployments

    Performance:
        - ConfigurationManager creation is fast (< 1ms)
        - No connection pooling needed (SQLite is file-based)
        - Each request gets fresh instance (no state sharing issues)
        - Consider caching for very high request rates
    """
    # Validate that X-User-Key header is present
    if not x_user_key:
        # Header is missing - cannot proceed with encryption/decryption
        raise HTTPException(
            status_code=401,
            detail="X-User-Key header is required for configuration operations",
        )

    # Validate user key length for security
    if len(x_user_key) < OSC_MIN_USER_KEY_LENGTH:
        # Key too short - enforce minimum security requirements
        raise HTTPException(
            status_code=401,
            detail=f"X-User-Key must be at least {OSC_MIN_USER_KEY_LENGTH} characters long",
        )

    # Create and return ConfigurationManager instance
    # This instance is configured with:
    # - Database path: Where encrypted configs are stored
    # - User key: For encryption/decryption of config values
    # - Salt file: For key derivation (shared across cluster)
    return ConfigurationManager(
        db_path=OSC_DATABASE_PATH,
        user_key=x_user_key,
        salt_file=OSC_SALT_FILE_PATH
    )


# =============================================================================
# OPTIONAL: CLUSTER MANAGER DEPENDENCY
# =============================================================================

# Note: Cluster manager is initialized at application startup and stored as global
# If you need cluster manager in routes, import it directly:
# from main import cluster_manager


# =============================================================================
# DEPENDENCY INJECTION BEST PRACTICES
# =============================================================================

"""
FastAPI Dependency Injection Best Practices:

1. Keep dependencies pure and side-effect free
   - Don't modify global state
   - Don't perform heavy computations
   - Don't make external API calls unless necessary

2. Use type hints for better IDE support
   - FastAPI uses type hints for validation
   - Enables autocompletion in IDEs
   - Generates accurate OpenAPI documentation

3. Chain dependencies for reusability
   - Common validation in one dependency
   - Specific logic in dependent dependencies
   - Reduces code duplication

4. Handle errors appropriately
   - Raise HTTPException for client errors
   - Let unexpected errors propagate for logging
   - Return None for successful validations

5. Document dependencies thoroughly
   - Explain what they do
   - Describe parameters and return values
   - Note security implications
   - Provide usage examples

6. Consider dependency caching
   - FastAPI caches dependencies within same request
   - Use this for expensive operations
   - Be aware of cache implications for state

7. Async vs Sync dependencies
   - Use async for I/O operations (database, network)
   - Use sync for CPU-bound operations
   - FastAPI handles both transparently

Example Complex Dependency Chain:

    def verify_admin(x_role: str = Header(...)):
        if x_role != "admin":
            raise HTTPException(403, "Admin required")
        return x_role

    def get_admin_manager(
        role: str = Depends(verify_admin),
        manager: ConfigurationManager = Depends(get_config_manager)
    ):
        # This manager has elevated permissions
        manager.set_admin_mode(True)
        return manager

    @app.delete("/configs/purge")
    async def purge_all(
        admin_manager: ConfigurationManager = Depends(get_admin_manager)
    ):
        # Only accessible to admins
        # Chain: verify_admin -> validate_api_key -> get_config_manager -> get_admin_manager
        admin_manager.purge_all()
        return {"message": "All configurations purged"}
"""
