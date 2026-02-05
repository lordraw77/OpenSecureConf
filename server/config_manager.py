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
from sqlalchemy import create_engine, Column, String, Text, Integer, DateTime, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


class ConfigurationModel(Base):  # pylint: disable=too-few-public-methods
    """
    SQLAlchemy ORM model for storing encrypted configurations.
    
    Attributes:
        id (int): Primary key, auto-incremented
        key (str): Configuration key (NOT unique alone, unique with environment)
        encrypted_value (str): Fernet-encrypted JSON value
        category (str): Optional category for grouping configurations
        environment (str): Environment identifier (REQUIRED - e.g., dev, staging, production)
        created_at (datetime): Timestamp when the configuration was created
        updated_at (datetime): Timestamp when the configuration was last updated
    """
    __tablename__ = "configurations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), nullable=False, index=True)  # Rimosso unique=True
    encrypted_value = Column(Text, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    environment = Column(String(100), nullable=False, index=True)  # Ora obbligatorio
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Vincolo di unicità composito su (key, environment)
    __table_args__ = (
        UniqueConstraint('key', 'environment', name='uix_key_environment'),
    )



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
        
        Args:
            key (str): Configuration key
            value (dict): Configuration data to encrypt and store
            category (str, optional): Category for grouping configurations
            environment (str): Environment identifier (REQUIRED)
        
        Raises:
            ValueError: If environment is not provided or if (key, environment) combination already exists
        """
        if not environment:
            raise ValueError("environment is required")
        
        session = self.session_factory()
        try:
            # Check if (key, environment) combination already exists
            existing = session.query(ConfigurationModel).filter_by(
                key=key, environment=environment
            ).first()
            if existing:
                raise ValueError(
                    f"Configuration with key '{key}' already exists in environment '{environment}'"
                )
            
            encrypted_value = self.encryption_manager.encrypt(json.dumps(value))
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

    def read(self, key: str, environment: str, include_timestamps: bool = False) -> dict:
        """
        Read and decrypt a configuration entry by key and environment.
        
        Args:
            key (str): Configuration key to retrieve
            environment (str): Environment identifier (REQUIRED)
            include_timestamps (bool): If True, include created_at and updated_at
        
        Raises:
            ValueError: If environment is not provided or configuration not found
        """
        if not environment:
            raise ValueError("environment is required")
        
        session = self.session_factory()
        try:
            config = session.query(ConfigurationModel).filter_by(
                key=key, environment=environment
            ).first()
            
            if not config:
                raise ValueError(
                    f"Configuration with key '{key}' not found in environment '{environment}'"
                )
            
            decrypted_value = self.encryption_manager.decrypt(config.encrypted_value)
            result = {
                "id": config.id,
                "key": config.key,
                "category": config.category,
                "environment": config.environment,
                "value": json.loads(decrypted_value),
            }
            
            if include_timestamps:
                result["created_at"] = config.created_at.isoformat() + "Z"
                result["updated_at"] = config.updated_at.isoformat() + "Z"
            
            return result
        finally:
            session.close()

    def update(self, key: str, environment: str, value: dict, category: str = None) -> dict:
        """
        Update an existing configuration with new encrypted value.
        
        Args:
            key (str): Configuration key to update
            environment (str): Environment identifier (REQUIRED)
            value (dict): New configuration data
            category (str, optional): New category (if None, keeps existing)
        
        Raises:
            ValueError: If environment is not provided or configuration not found
        """
        if not environment:
            raise ValueError("environment is required")
        
        session = self.session_factory()
        try:
            config = session.query(ConfigurationModel).filter_by(
                key=key, environment=environment
            ).first()
            
            if not config:
                raise ValueError(
                    f"Configuration with key '{key}' not found in environment '{environment}'"
                )
            
            config.encrypted_value = self.encryption_manager.encrypt(json.dumps(value))
            
            if category is not None:
                config.category = category
            
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

    def delete(self, key: str, environment: str) -> bool:
        """
        Delete a configuration entry permanently.
        
        Args:
            key (str): Configuration key to delete
            environment (str): Environment identifier (REQUIRED)
        
        Raises:
            ValueError: If environment is not provided or configuration not found
        """
        if not environment:
            raise ValueError("environment is required")
        
        session = self.session_factory()
        try:
            config = session.query(ConfigurationModel).filter_by(
                key=key, environment=environment
            ).first()
            
            if not config:
                raise ValueError(
                    f"Configuration with key '{key}' not found in environment '{environment}'"
                )
            
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
