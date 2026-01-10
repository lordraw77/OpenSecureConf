"""
OpenSecureConf - Configuration Manager Module

This module provides encrypted configuration management with hybrid key encryption,
combining a random salt with user-defined keys for secure storage in SQLite.
Fully thread-safe for concurrent access in multi-worker environments.

Classes:
    ConfigurationModel: SQLAlchemy ORM model for database schema
    EncryptionManager: Handles hybrid encryption/decryption operations
    ConfigurationManager: Main interface for CRUD operations on encrypted configs
"""

import os
import secrets
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, Column, String, Text, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json

Base = declarative_base()


class ConfigurationModel(Base):
    """
    SQLAlchemy ORM model for storing encrypted configurations.

    Attributes:
        id (int): Primary key, auto-incremented
        key (str): Unique configuration key (indexed for performance)
        encrypted_value (str): Fernet-encrypted JSON value
        category (str): Optional category for grouping configurations
    """
    __tablename__ = 'configurations'

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    encrypted_value = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)


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

    def __init__(self, user_key: str, salt_file: str = 'encryption.salt'):
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
            with open(self.salt_file, 'rb') as f:
                return f.read()
        else:
            # Generate random 64-byte (512-bit) salt component
            salt = secrets.token_bytes(64)
            with open(self.salt_file, 'wb') as f:
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

    def __init__(self, db_path: str = 'configurations.db', user_key: str = None):
        """
        Initialize thread-safe configuration manager with database and encryption.

        Args:
            db_path (str): Path to SQLite database file (default: 'configurations.db')
            user_key (str): User-defined encryption key (required, min 8 chars recommended)

        Raises:
            ValueError: If user_key is not provided
        """
        if not user_key:
            raise ValueError("user_key is required for encryption")

        self.encryption_manager = EncryptionManager(user_key)

        # SQLite thread-safe configuration with connection pooling
        self.engine = create_engine(
            f'sqlite:///{db_path}',
            echo=False,
            connect_args={
                'check_same_thread': False,  # Allow multi-thread access
                'timeout': 30  # Wait up to 30 seconds for lock release
            },
            pool_pre_ping=True,  # Verify connections before using
            pool_size=10,  # Connection pool size
            max_overflow=20  # Extra connections when pool is full
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def create(self, key: str, value: dict, category: str = None) -> dict:
        """
        Create a new encrypted configuration entry.
        Thread-safe operation with automatic session management.

        Args:
            key (str): Unique configuration key
            value (dict): Configuration data to encrypt and store
            category (str, optional): Category for grouping configurations

        Returns:
            dict: Created configuration with keys: id, key, category, value

        Raises:
            ValueError: If configuration with the same key already exists
        """
        session = self.Session()
        try:
            # Check if key already exists
            existing = session.query(ConfigurationModel).filter_by(key=key).first()
            if existing:
                raise ValueError(f"Configuration with key '{key}' already exists")

            # Encrypt the value
            encrypted_value = self.encryption_manager.encrypt(json.dumps(value))

            config = ConfigurationModel(
                key=key,
                encrypted_value=encrypted_value,
                category=category
            )
            session.add(config)
            session.commit()

            return {
                'id': config.id,
                'key': config.key,
                'category': config.category,
                'value': value
            }
        finally:
            session.close()

    def read(self, key: str) -> dict:
        """
        Read and decrypt a configuration entry by key.
        Thread-safe operation with automatic session management.

        Args:
            key (str): Configuration key to retrieve

        Returns:
            dict: Configuration with keys: id, key, category, value (decrypted)

        Raises:
            ValueError: If configuration key not found
        """
        session = self.Session()
        try:
            config = session.query(ConfigurationModel).filter_by(key=key).first()
            if not config:
                raise ValueError(f"Configuration with key '{key}' not found")

            # Decrypt the value
            decrypted_value = self.encryption_manager.decrypt(config.encrypted_value)

            return {
                'id': config.id,
                'key': config.key,
                'category': config.category,
                'value': json.loads(decrypted_value)
            }
        finally:
            session.close()

    def update(self, key: str, value: dict, category: str = None) -> dict:
        """
        Update an existing configuration with new encrypted value.
        Thread-safe operation with automatic session management.

        Args:
            key (str): Configuration key to update
            value (dict): New configuration data to encrypt and store
            category (str, optional): New category (if None, keeps existing)

        Returns:
            dict: Updated configuration with keys: id, key, category, value

        Raises:
            ValueError: If configuration key not found
        """
        session = self.Session()
        try:
            config = session.query(ConfigurationModel).filter_by(key=key).first()
            if not config:
                raise ValueError(f"Configuration with key '{key}' not found")

            # Encrypt the new value
            config.encrypted_value = self.encryption_manager.encrypt(json.dumps(value))
            if category is not None:
                config.category = category

            session.commit()

            return {
                'id': config.id,
                'key': config.key,
                'category': config.category,
                'value': value
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
        session = self.Session()
        try:
            config = session.query(ConfigurationModel).filter_by(key=key).first()
            if not config:
                raise ValueError(f"Configuration with key '{key}' not found")

            session.delete(config)
            session.commit()
            return True
        finally:
            session.close()

    def list_all(self, category: str = None) -> list:
        """
        List all configurations with optional category filter.
        All values are automatically decrypted.
        Thread-safe operation with automatic session management.

        Args:
            category (str, optional): Filter by category (if None, returns all)

        Returns:
            list[dict]: List of configurations, each with keys: id, key, category, value
        """
        session = self.Session()
        try:
            query = session.query(ConfigurationModel)
            if category:
                query = query.filter_by(category=category)

            configs = query.all()
            result = []
            for config in configs:
                decrypted_value = self.encryption_manager.decrypt(config.encrypted_value)
                result.append({
                    'id': config.id,
                    'key': config.key,
                    'category': config.category,
                    'value': json.loads(decrypted_value)
                })
            return result
        finally:
            session.close()