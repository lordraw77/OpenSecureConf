"""
OpenSecureConf - Configuration Manager Module

This module provides encrypted configuration management with hybrid key encryption,
combining a random salt with user-defined keys for secure storage in SQLite.
Fully thread-safe for concurrent access in multi-worker environments.

Enhanced with timestamps tracking (created_at, updated_at) and environment field.

Classes:
    ConfigurationModel: SQLAlchemy ORM model for database schema
    EncryptionManager: Handles hybrid encryption/decryption operations
    ConfigurationManager: Main interface for CRUD operations on encrypted configs
"""

import os
import secrets
import base64
import json
from datetime import datetime
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, Column, String, Text, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


class ConfigurationModel(Base):  # pylint: disable=too-few-public-methods
    """
    SQLAlchemy ORM model for storing encrypted configurations.

    Attributes:
        id (int): Primary key, auto-incremented
        key (str): Unique configuration key (indexed for performance)
        encrypted_value (str): Fernet-encrypted JSON value
        category (str): Optional category for grouping configurations
        environment (str): Environment identifier (e.g., dev, staging, production)
        created_at (datetime): Timestamp when the configuration was created
        updated_at (datetime): Timestamp when the configuration was last updated
    """

    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    encrypted_value = Column(Text, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    environment = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EncryptionManager:
    """
    Manages hybrid encryption using PBKDF2-HMAC-SHA256 and Fernet cipher.

    Combines a random 64-byte salt (stored in file) with a user-defined key
    to derive encryption keys using 480,000 iterations (OWASP 2023+ standard).

    Attributes:
        salt_file (str): Path to salt storage file
        user_key (bytes): User-defined encryption key component
        salt (bytes): Random 64-byte salt component
        cipher (Fernet): Initialized Fernet cipher instance
    """

    def __init__(self, user_key: str, salt_file: str = "encryption.salt"):
        """
        Initialize encryption manager with user key.

        Args:
            user_key (str): User-defined encryption key
            salt_file (str): Path to salt file (default: 'encryption.salt')
        """
        self.salt_file = salt_file
        self.user_key = user_key.encode()
        self.salt = self._load_or_create_salt()
        self.cipher = self._create_cipher()

    def _load_or_create_salt(self) -> bytes:
        """
        Load existing salt from file or create new random salt.

        Creates a cryptographically secure 64-byte (512-bit) salt using
        secrets.token_bytes() on first run. This exceeds NIST recommendations
        of 128 bits and provides maximum collision resistance.

        Returns:
            bytes: 64-byte salt for key derivation
        """
        if os.path.exists(self.salt_file):
            with open(self.salt_file, "rb") as f:
                return f.read()
        else:
            # Generate random 64-byte (512-bit) salt component
            salt = secrets.token_bytes(64)
            with open(self.salt_file, "wb") as f:
                f.write(salt)
            return salt

    def _create_cipher(self) -> Fernet:
        """
        Create Fernet cipher using PBKDF2-HMAC-SHA256 key derivation.

        Uses 480,000 iterations as recommended by OWASP for 2023+.
        Derives a 32-byte key from the combination of user_key and salt.

        Returns:
            Fernet: Initialized cipher for encryption/decryption operations
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt,
            iterations=480000,  # OWASP recommended for 2023+
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.user_key))
        return Fernet(key)

    def encrypt(self, data: str) -> str:
        """
        Encrypt plaintext data using Fernet (AES-128-CBC + HMAC-SHA256).

        Args:
            data (str): Plaintext string to encrypt

        Returns:
            str: Base64-encoded encrypted data
        """
        return self.cipher.encrypt(data.encode()).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt Fernet-encrypted data back to plaintext.

        Args:
            encrypted_data (str): Base64-encoded encrypted string

        Returns:
            str: Decrypted plaintext string

        Raises:
            cryptography.fernet.InvalidToken: If decryption fails (wrong key/corrupted data)
        """
        return self.cipher.decrypt(encrypted_data.encode()).decode()


class ConfigurationManager:
    """
    Thread-safe configuration manager with CRUD operations and connection pooling.

    Provides high-level methods for creating, reading, updating, and deleting
    encrypted configuration entries in a local SQLite database. All values are
    automatically encrypted before storage and decrypted on retrieval.

    Thread-safe design allows concurrent access from multiple workers/threads.

    Attributes:
        encryption_manager (EncryptionManager): Handles encryption operations
        engine (Engine): SQLAlchemy database engine with connection pool
        Session (sessionmaker): SQLAlchemy session factory
    """

    def __init__(
        self,
        db_path: str = "configurations.db",
        user_key: str = None,
        salt_file: str = "encryption.salt",
    ):
        """
        Initialize thread-safe configuration manager with database and encryption.

        Args:
            db_path (str): Path to SQLite database file (default: 'configurations.db')
            user_key (str): User-defined encryption key (required, min 8 chars recommended)
            salt_file (str): Path to salt file (default: 'encryption.salt')

        Raises:
            ValueError: If user_key is not provided
        """
        if not user_key:
            raise ValueError("user_key is required for encryption")

        self.encryption_manager = EncryptionManager(user_key, salt_file)

        # SQLite thread-safe configuration with connection pooling
        self.engine = create_engine(
            f"sqlite:///{db_path}",
            echo=False,
            connect_args={
                "check_same_thread": False,  # Allow multi-thread access
                "timeout": 30,  # Wait up to 30 seconds for lock release
            },
            pool_pre_ping=True,  # Verify connections before using
            pool_size=10,  # Connection pool size
            max_overflow=20,  # Extra connections when pool is full
        )

        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)

    def create(self, key: str, value: dict, category: str = None, environment: str = None) -> dict:
        """
        Create a new encrypted configuration entry.

        Thread-safe operation with automatic session management.
        Sets created_at and updated_at to current UTC timestamp.

        Args:
            key (str): Unique configuration key
            value (dict): Configuration data to encrypt and store
            category (str, optional): Category for grouping configurations
            environment (str, optional): Environment identifier (dev, staging, production)

        Returns:
            dict: Created configuration with keys: id, key, category, environment, value,
                  created_at, updated_at

        Raises:
            ValueError: If configuration with the same key already exists
        """
        session = self.session_factory()
        try:
            # Check if key already exists
            existing = session.query(ConfigurationModel).filter_by(key=key).first()
            if existing:
                raise ValueError(f"Configuration with key '{key}' already exists")

            # Encrypt the value
            encrypted_value = self.encryption_manager.encrypt(json.dumps(value))

            # Create configuration with timestamps
            now = datetime.utcnow()
            config = ConfigurationModel(
                key=key,
                encrypted_value=encrypted_value,
                category=category,
                environment=environment,
                created_at=now,
                updated_at=now
            )

            session.add(config)
            session.commit()

            return {
                "id": config.id,
                "key": config.key,
                "category": config.category,
                "environment": config.environment,
                "value": value,
                "created_at": config.created_at.isoformat() + "Z",
                "updated_at": config.updated_at.isoformat() + "Z"
            }

        finally:
            session.close()

    def read(self, key: str, include_timestamps: bool = False) -> dict:
        """
        Read and decrypt a configuration entry by key.

        Thread-safe operation with automatic session management.

        Args:
            key (str): Configuration key to retrieve
            include_timestamps (bool): If True, include created_at and updated_at in response

        Returns:
            dict: Configuration with keys: id, key, category, environment, value (decrypted)
                  If include_timestamps=True, also includes: created_at, updated_at

        Raises:
            ValueError: If configuration key not found
        """
        session = self.session_factory()
        try:
            config = session.query(ConfigurationModel).filter_by(key=key).first()
            if not config:
                raise ValueError(f"Configuration with key '{key}' not found")

            # Decrypt the value
            decrypted_value = self.encryption_manager.decrypt(config.encrypted_value)

            result = {
                "id": config.id,
                "key": config.key,
                "category": config.category,
                "environment": config.environment,
                "value": json.loads(decrypted_value),
            }

            # Include timestamps if requested (full mode)
            if include_timestamps:
                result["created_at"] = config.created_at.isoformat() + "Z"
                result["updated_at"] = config.updated_at.isoformat() + "Z"

            return result

        finally:
            session.close()

    def update(self, key: str, value: dict, category: str = None, environment: str = None) -> dict:
        """
        Update an existing configuration with new encrypted value.

        Thread-safe operation with automatic session management.
        Updates the updated_at timestamp to current UTC time.

        Args:
            key (str): Configuration key to update
            value (dict): New configuration data to encrypt and store
            category (str, optional): New category (if None, keeps existing)
            environment (str, optional): New environment (if None, keeps existing)

        Returns:
            dict: Updated configuration with keys: id, key, category, environment, value,
                  created_at, updated_at

        Raises:
            ValueError: If configuration key not found
        """
        session = self.session_factory()
        try:
            config = session.query(ConfigurationModel).filter_by(key=key).first()
            if not config:
                raise ValueError(f"Configuration with key '{key}' not found")

            # Encrypt the new value
            config.encrypted_value = self.encryption_manager.encrypt(json.dumps(value))

            # Update fields
            if category is not None:
                config.category = category
            if environment is not None:
                config.environment = environment

            # Update timestamp
            config.updated_at = datetime.utcnow()

            session.commit()

            return {
                "id": config.id,
                "key": config.key,
                "category": config.category,
                "environment": config.environment,
                "value": value,
                "created_at": config.created_at.isoformat() + "Z",
                "updated_at": config.updated_at.isoformat() + "Z"
            }

        finally:
            session.close()

    def delete(self, key: str) -> bool:
        """
        Delete a configuration entry permanently.

        Thread-safe operation with automatic session management.

        Args:
            key (str): Configuration key to delete

        Returns:
            bool: True if deletion successful

        Raises:
            ValueError: If configuration key not found
        """
        session = self.session_factory()
        try:
            config = session.query(ConfigurationModel).filter_by(key=key).first()
            if not config:
                raise ValueError(f"Configuration with key '{key}' not found")

            session.delete(config)
            session.commit()
            return True

        finally:
            session.close()

    def list_all(self, category: str = None, environment: str = None,
                 include_timestamps: bool = False) -> list:
        """
        List all configurations with optional filters.

        All values are automatically decrypted.
        Thread-safe operation with automatic session management.

        Args:
            category (str, optional): Filter by category (if None, returns all)
            environment (str, optional): Filter by environment (if None, returns all)
            include_timestamps (bool): If True, include created_at and updated_at in response

        Returns:
            list[dict]: List of configurations, each with keys: id, key, category, 
                        environment, value. If include_timestamps=True, also includes:
                        created_at, updated_at
        """
        session = self.session_factory()
        try:
            query = session.query(ConfigurationModel)

            if category:
                query = query.filter_by(category=category)

            if environment:
                query = query.filter_by(environment=environment)

            configs = query.all()

            result = []
            for config in configs:
                decrypted_value = self.encryption_manager.decrypt(config.encrypted_value)

                config_dict = {
                    "id": config.id,
                    "key": config.key,
                    "category": config.category,
                    "environment": config.environment,
                    "value": json.loads(decrypted_value),
                }

                # Include timestamps if requested (full mode)
                if include_timestamps:
                    config_dict["created_at"] = config.created_at.isoformat() + "Z"
                    config_dict["updated_at"] = config.updated_at.isoformat() + "Z"

                result.append(config_dict)

            return result

        finally:
            session.close()

    def get_statistics(self) -> dict:
        """
        Get statistics about stored configurations.

        Returns:
            dict: Statistics containing:
                - total_keys: Total number of configuration keys
                - total_categories: Number of distinct categories
                - total_environments: Number of distinct environments
                - keys_by_category: Dictionary mapping categories to key counts
                - keys_by_environment: Dictionary mapping environments to key counts
        """
        session = self.session_factory()
        try:
            # Total keys
            total_keys = session.query(ConfigurationModel).count()

            # Get all configurations to calculate statistics
            all_configs = session.query(
                ConfigurationModel.category,
                ConfigurationModel.environment
            ).all()

            # Count by category
            categories = {}
            environments = {}

            for config in all_configs:
                cat = config.category or "uncategorized"
                env = config.environment or "unspecified"

                categories[cat] = categories.get(cat, 0) + 1
                environments[env] = environments.get(env, 0) + 1

            return {
                "total_keys": total_keys,
                "total_categories": len(categories),
                "total_environments": len(environments),
                "keys_by_category": categories,
                "keys_by_environment": environments
            }

        finally:
            session.close()
