"""
OpenSecureConf - REST API Module

FastAPI-based REST API for encrypted configuration management.
Supports asynchronous operations and concurrent requests via multiple workers.

All endpoints require x-user-key header for encryption/decryption authentication.
"""

from typing import Optional
import asyncio


from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from config_manager import ConfigurationManager

# Initialize FastAPI application with metadata
app = FastAPI(
    title="OpenSecureConf API",
    description="REST API for encrypted configuration management with multithreading support",
    version="1.0.0",
)

# Pydantic models for request/response validation


class ConfigCreate(BaseModel):
    """Model for creating a new configuration entry"""

    key: str = Field(
        ..., min_length=1, max_length=255, description="Unique configuration key"
    )
    value: dict = Field(..., description="Configuration data (will be encrypted)")
    category: Optional[str] = Field(
        None, max_length=100, description="Optional category for grouping"
    )


class ConfigUpdate(BaseModel):
    """Model for updating an existing configuration entry"""

    value: dict = Field(..., description="New configuration data (will be encrypted)")
    category: Optional[str] = Field(
        None, max_length=100, description="Optional new category"
    )


class ConfigResponse(BaseModel):
    """Model for configuration response"""

    id: int
    key: str
    category: Optional[str]
    value: dict


# Dependency injection for authentication and ConfigurationManager initialization


def get_config_manager(
    x_user_key: str = Header(..., description="User encryption key")
):
    """
    Validates user key and returns ConfigurationManager instance.

    Args:
        x_user_key: User-defined encryption key from HTTP header

    Returns:
        ConfigurationManager: Initialized manager with user's encryption key

    Raises:
        HTTPException: If key is missing or too short (min 8 characters)
    """
    if not x_user_key or len(x_user_key) < 8:
        raise HTTPException(
            status_code=401,
            detail="x-user-key header missing or too short (minimum 8 characters)",
        )
    return ConfigurationManager(user_key=x_user_key)


# API Endpoints


@app.get("/")
async def root():
    """
    Root endpoint providing API information and available endpoints.

    Returns:
        dict: Service metadata and endpoint listing
    """
    return {
        "service": "OpenSecureConf API",
        "version": "1.0.0",
        "features": ["encryption", "multithreading", "async"],
        "endpoints": {
            "create": "POST /configs",
            "read": "GET /configs/{key}",
            "update": "PUT /configs/{key}",
            "delete": "DELETE /configs/{key}",
            "list": "GET /configs",
        },
    }


@app.post("/configs", response_model=ConfigResponse, status_code=201)
async def create_configuration(
    config: ConfigCreate, manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Create a new encrypted configuration entry asynchronously.
    Supports parallel requests without blocking.

    Args:
        config: Configuration data to create
        manager: Injected ConfigurationManager instance

    Returns:
        ConfigResponse: Created configuration with decrypted value

    Raises:
        HTTPException 400: If key already exists
        HTTPException 500: For internal server errors
    """
    try:
        # Run blocking operation in thread pool for non-blocking execution
        result = await asyncio.to_thread(
            manager.create, key=config.key, value=config.value, category=config.category
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/configs/{key}", response_model=ConfigResponse)
async def read_configuration(
    key: str, manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Read and decrypt a configuration entry by key asynchronously.

    Args:
        key: Configuration key to retrieve
        manager: Injected ConfigurationManager instance

    Returns:
        ConfigResponse: Configuration with decrypted value

    Raises:
        HTTPException 404: If key not found
        HTTPException 500: For internal server errors
    """
    try:
        result = await asyncio.to_thread(manager.read, key=key)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.put("/configs/{key}", response_model=ConfigResponse)
async def update_configuration(
    key: str,
    config: ConfigUpdate,
    manager: ConfigurationManager = Depends(get_config_manager),
):
    """
    Update an existing configuration entry with new encrypted value asynchronously.

    Args:
        key: Configuration key to update
        config: New configuration data
        manager: Injected ConfigurationManager instance

    Returns:
        ConfigResponse: Updated configuration with decrypted value

    Raises:
        HTTPException 404: If key not found
        HTTPException 500: For internal server errors
    """
    try:
        result = await asyncio.to_thread(
            manager.update, key=key, value=config.value, category=config.category
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.delete("/configs/{key}")
async def delete_configuration(
    key: str, manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Delete a configuration entry permanently asynchronously.

    Args:
        key: Configuration key to delete
        manager: Injected ConfigurationManager instance

    Returns:
        dict: Success message

    Raises:
        HTTPException 404: If key not found
        HTTPException 500: For internal server errors
    """
    try:
        await asyncio.to_thread(manager.delete, key=key)
        return {"message": f"Configuration '{key}' deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


@app.get("/configs", response_model=list[ConfigResponse])
async def list_configurations(
    category: Optional[str] = None,
    manager: ConfigurationManager = Depends(get_config_manager),
):
    """
    List all configurations with optional category filter asynchronously.
    All values are automatically decrypted.

    Args:
        category: Optional filter by category
        manager: Injected ConfigurationManager instance

    Returns:
        list[ConfigResponse]: List of configurations with decrypted values

    Raises:
        HTTPException 500: For internal server errors
    """
    try:
        result = await asyncio.to_thread(manager.list_all, category=category)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}") from e


# Application entry point with multithreading support

if __name__ == "__main__":
    import uvicorn

    # Run server with multiple workers for parallel request handling
    # Adjust workers count based on CPU cores (recommended: 2-4 x CPU cores)
    uvicorn.run(
        "api:app",
        host="127.0.0.1",
        port=9000,
        workers=4,  # Number of worker processes
        reload=False,  # Set to True only in development
        log_level="info",
    )
