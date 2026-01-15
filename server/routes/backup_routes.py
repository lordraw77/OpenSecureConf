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
Backup and Restore Routes

This module defines endpoints for creating encrypted backups and importing them.
"""

import asyncio
import json
import base64
import secrets
import time
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Query, Depends

from config_manager import ConfigurationManager
from core.models import BackupResponse
from core.dependencies import get_config_manager
from core.metrics import api_errors_total
from utils.backup import create_backup_cipher
from utils.helpers import update_config_count_metric


# Create router
router = APIRouter(tags=["Backup"])


@router.post("/backup", response_model=BackupResponse)
async def create_backup(
    backup_password: str = Header(..., alias="X-Backup-Password"),
    category: Optional[str] = Query(None),
    environment: Optional[str] = Query(None),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Create an encrypted backup of all configurations.

    The backup includes all configuration data encrypted with a user-provided password.
    """
    try:
        # Get all configurations with timestamps
        configs = await asyncio.to_thread(
            manager.list_all,
            category=category,
            environment=environment,
            include_timestamps=True
        )

        # Create backup data structure
        backup_timestamp = datetime.utcnow().isoformat() + "Z"
        backup_id = f"backup-{int(time.time())}"

        backup_data = {
            "version": "2.2.0",
            "backup_id": backup_id,
            "backup_timestamp": backup_timestamp,
            "total_keys": len(configs),
            "configurations": configs
        }

        # Encrypt backup data
        backup_salt = secrets.token_bytes(32)
        cipher = create_backup_cipher(backup_password, backup_salt)

        json_data = json.dumps(backup_data)
        encrypted_data = cipher.encrypt(json_data.encode())

        # Prepend salt to encrypted data
        backup_blob = backup_salt + encrypted_data
        backup_encoded = base64.b64encode(backup_blob).decode()

        return {
            "backup_data": backup_encoded,
            "total_keys": len(configs),
            "backup_timestamp": backup_timestamp,
            "backup_id": backup_id
        }

    except Exception as e:
        api_errors_total.labels(endpoint="/backup", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}") from e


@router.post("/import")
async def import_backup(
    backup_data: str = Query(...),
    backup_password: str = Header(..., alias="X-Backup-Password"),
    overwrite: bool = Query(False),
    manager: ConfigurationManager = Depends(get_config_manager)
):
    """
    Import configurations from an encrypted backup.

    Restores configurations from a backup created with the /backup endpoint.
    """
    try:
        # Decode and decrypt backup
        backup_blob = base64.b64decode(backup_data)

        if len(backup_blob) < 32:
            raise ValueError("Invalid backup data: too short")

        backup_salt = backup_blob[:32]
        encrypted_data = backup_blob[32:]

        cipher = create_backup_cipher(backup_password, backup_salt)

        try:
            decrypted_data = cipher.decrypt(encrypted_data)
        except Exception as decrypt_error:
            raise ValueError("Decryption failed: invalid password or corrupted backup") from decrypt_error

        backup_obj = json.loads(decrypted_data.decode())

        if not isinstance(backup_obj, dict) or "configurations" not in backup_obj:
            raise ValueError("Invalid backup format")

        configurations = backup_obj["configurations"]

        # Import configurations
        imported = 0
        skipped = 0
        failed = []

        for config in configurations:
            try:
                key = config["key"]
                value = config["value"]
                category = config.get("category")
                environment = config.get("environment")

                # Check if key exists
                try:
                    await asyncio.to_thread(manager.read, key=key)
                    # Key exists
                    if overwrite:
                        await asyncio.to_thread(
                            manager.update,
                            key=key,
                            value=value,
                            category=category,
                            environment=environment
                        )
                        imported += 1
                    else:
                        skipped += 1
                except ValueError:
                    # Key doesn't exist, create it
                    await asyncio.to_thread(
                        manager.create,
                        key=key,
                        value=value,
                        category=category,
                        environment=environment
                    )
                    imported += 1

            except Exception as import_error:
                failed.append({
                    "key": config.get("key", "unknown"),
                    "error": str(import_error)
                })

        # Update metrics
        await update_config_count_metric(manager)

        return {
            "message": "Import completed",
            "backup_id": backup_obj.get("backup_id", "unknown"),
            "backup_timestamp": backup_obj.get("backup_timestamp", "unknown"),
            "total_in_backup": len(configurations),
            "imported": imported,
            "skipped": skipped,
            "failed": len(failed),
            "failed_keys": failed
        }

    except ValueError as e:
        api_errors_total.labels(endpoint="/import", error_type="validation_error").inc()
        raise HTTPException(status_code=400, detail=str(e)) from e

    except Exception as e:
        api_errors_total.labels(endpoint="/import", error_type="internal_error").inc()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}") from e
