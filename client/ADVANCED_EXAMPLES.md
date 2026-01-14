# Advanced Usage Examples

This document contains advanced usage patterns and real-world examples for the OpenSecureConf Python Client.

## Table of Contents

- [Production Deployment Patterns](#production-deployment-patterns)
- [Microservices Configuration](#microservices-configuration)
- [High Availability Patterns](#high-availability-patterns)
- [Performance Optimization](#performance-optimization)
- [Integration Examples](#integration-examples)
- [Security Best Practices](#security-best-practices)

## Production Deployment Patterns

### Environment-Based Configuration

```python
import os
from opensecureconf_client_enhanced import OpenSecureConfClient

def get_client():
    """Factory function to create client based on environment."""
    env = os.getenv("ENVIRONMENT", "development")

    if env == "production":
        return OpenSecureConfClient(
            base_url=os.getenv("OSC_URL"),
            user_key=os.getenv("OSC_USER_KEY"),
            api_key=os.getenv("OSC_API_KEY"),
            timeout=60,
            verify_ssl=True,
            enable_retry=True,
            max_retries=5,
            backoff_factor=2.0,
            pool_connections=50,
            pool_maxsize=100,
            log_level="INFO"
        )
    elif env == "staging":
        return OpenSecureConfClient(
            base_url=os.getenv("OSC_URL", "http://staging-osc.internal:9000"),
            user_key=os.getenv("OSC_USER_KEY"),
            api_key=os.getenv("OSC_API_KEY"),
            timeout=30,
            verify_ssl=True,
            enable_retry=True,
            max_retries=3,
            log_level="DEBUG"
        )
    else:  # development
        return OpenSecureConfClient(
            base_url="http://localhost:9000",
            user_key="dev-key-12345678",
            api_key="dev-api-key",
            timeout=10,
            verify_ssl=False,
            enable_retry=False,
            log_level="DEBUG"
        )

# Usage
client = get_client()
```

### Configuration Singleton Pattern

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
from threading import Lock
import os

class ConfigurationManager:
    """Thread-safe singleton for managing OpenSecureConf client."""

    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize the client."""
        self.client = OpenSecureConfClient(
            base_url=os.getenv("OSC_URL"),
            user_key=os.getenv("OSC_USER_KEY"),
            api_key=os.getenv("OSC_API_KEY"),
            enable_retry=True,
            log_level="INFO"
        )
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes

    def get_config(self, key: str, use_cache: bool = True):
        """Get configuration with optional caching."""
        if use_cache and key in self._cache:
            return self._cache[key]

        config = self.client.read(key)
        if use_cache:
            self._cache[key] = config
        return config

    def invalidate_cache(self, key: str = None):
        """Invalidate cache for specific key or all keys."""
        if key:
            self._cache.pop(key, None)
        else:
            self._cache.clear()

# Usage
config_manager = ConfigurationManager()
db_config = config_manager.get_config("database")
```

## Microservices Configuration

### Service Discovery Pattern

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
from typing import Dict, List

class ServiceRegistry:
    """Manage microservice configurations."""

    def __init__(self, client: OpenSecureConfClient):
        self.client = client
        self.service_category = "microservices"

    def register_service(self, name: str, config: Dict):
        """Register a new microservice."""
        return self.client.create(
            key=f"service.{name}",
            value={
                "name": name,
                "url": config["url"],
                "port": config.get("port", 8080),
                "health_endpoint": config.get("health_endpoint", "/health"),
                "timeout": config.get("timeout", 30),
                "retries": config.get("retries", 3)
            },
            category=self.service_category
        )

    def discover_service(self, name: str) -> Dict:
        """Discover service configuration."""
        return self.client.read(f"service.{name}")

    def list_services(self) -> List[Dict]:
        """List all registered services."""
        return self.client.list_all(category=self.service_category)

    def update_service(self, name: str, config: Dict):
        """Update service configuration."""
        current = self.discover_service(name)
        updated_config = {**current['value'], **config}
        return self.client.update(f"service.{name}", updated_config)

    def deregister_service(self, name: str):
        """Remove service from registry."""
        return self.client.delete(f"service.{name}")

# Usage
with OpenSecureConfClient(base_url="...", user_key="...") as client:
    registry = ServiceRegistry(client)

    # Register services
    registry.register_service("api-gateway", {
        "url": "http://api-gateway.internal",
        "port": 8080
    })

    registry.register_service("auth-service", {
        "url": "http://auth.internal",
        "port": 8081
    })

    # Discover service
    api_config = registry.discover_service("api-gateway")
    print(f"API Gateway URL: {api_config['value']['url']}")

    # List all services
    services = registry.list_services()
    print(f"Total services: {len(services)}")
```

### Feature Flags System

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
from typing import Any, Dict
from datetime import datetime

class FeatureFlags:
    """Manage feature flags across environments."""

    def __init__(self, client: OpenSecureConfClient, environment: str):
        self.client = client
        self.environment = environment
        self.category = f"features.{environment}"

    def create_flag(self, name: str, enabled: bool, metadata: Dict = None):
        """Create a new feature flag."""
        return self.client.create(
            key=f"feature.{name}",
            value={
                "enabled": enabled,
                "environment": self.environment,
                "created_at": datetime.utcnow().isoformat(),
                "metadata": metadata or {}
            },
            category=self.category
        )

    def is_enabled(self, name: str, default: bool = False) -> bool:
        """Check if feature is enabled."""
        try:
            flag = self.client.read(f"feature.{name}")
            return flag['value']['enabled']
        except:
            return default

    def enable_flag(self, name: str):
        """Enable a feature flag."""
        flag = self.client.read(f"feature.{name}")
        flag['value']['enabled'] = True
        return self.client.update(f"feature.{name}", flag['value'])

    def disable_flag(self, name: str):
        """Disable a feature flag."""
        flag = self.client.read(f"feature.{name}")
        flag['value']['enabled'] = False
        return self.client.update(f"feature.{name}", flag['value'])

    def list_flags(self) -> Dict[str, bool]:
        """List all feature flags."""
        flags = self.client.list_all(category=self.category)
        return {
            flag['key'].replace('feature.', ''): flag['value']['enabled']
            for flag in flags
        }

# Usage
with OpenSecureConfClient(base_url="...", user_key="...") as client:
    features = FeatureFlags(client, environment="production")

    # Create flags
    features.create_flag("new_ui", enabled=False, metadata={
        "description": "New user interface",
        "owner": "frontend-team"
    })

    features.create_flag("beta_features", enabled=True, metadata={
        "description": "Beta features access",
        "rollout_percentage": 10
    })

    # Check flags
    if features.is_enabled("new_ui"):
        # Show new UI
        pass

    # List all flags
    all_flags = features.list_flags()
    print("Active flags:", [k for k, v in all_flags.items() if v])
```

## High Availability Patterns

### Circuit Breaker Pattern

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
from datetime import datetime, timedelta
import time

class CircuitBreaker:
    """Circuit breaker for OpenSecureConf client."""

    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

    def __init__(self, client: OpenSecureConfClient, 
                 failure_threshold: int = 5,
                 timeout: int = 60):
        self.client = client
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = self.CLOSED

    def call(self, method: str, *args, **kwargs):
        """Execute method with circuit breaker protection."""
        if self.state == self.OPEN:
            if self._should_attempt_reset():
                self.state = self.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN")

        try:
            result = getattr(self.client, method)(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e

    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt to reset."""
        return (self.last_failure_time and 
                datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout))

    def _on_success(self):
        """Handle successful request."""
        self.failures = 0
        self.state = self.CLOSED

    def _on_failure(self):
        """Handle failed request."""
        self.failures += 1
        self.last_failure_time = datetime.now()

        if self.failures >= self.failure_threshold:
            self.state = self.OPEN

# Usage
client = OpenSecureConfClient(base_url="...", user_key="...")
breaker = CircuitBreaker(client, failure_threshold=3, timeout=30)

try:
    config = breaker.call("read", "database")
except Exception as e:
    print(f"Circuit breaker: {e}")
```

### Failover Strategy

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
from typing import List

class FailoverClient:
    """Client with automatic failover to backup nodes."""

    def __init__(self, nodes: List[str], user_key: str, api_key: str = None):
        self.nodes = nodes
        self.user_key = user_key
        self.api_key = api_key
        self.current_node = 0
        self.clients = self._create_clients()

    def _create_clients(self) -> List[OpenSecureConfClient]:
        """Create client for each node."""
        return [
            OpenSecureConfClient(
                base_url=node,
                user_key=self.user_key,
                api_key=self.api_key,
                enable_retry=True,
                timeout=10
            )
            for node in self.nodes
        ]

    def _execute_with_failover(self, method: str, *args, **kwargs):
        """Execute method with automatic failover."""
        attempts = len(self.clients)
        last_exception = None

        for i in range(attempts):
            client = self.clients[(self.current_node + i) % len(self.clients)]
            try:
                result = getattr(client, method)(*args, **kwargs)
                self.current_node = (self.current_node + i) % len(self.clients)
                return result
            except Exception as e:
                last_exception = e
                continue

        raise Exception(f"All nodes failed: {last_exception}")

    def create(self, *args, **kwargs):
        return self._execute_with_failover("create", *args, **kwargs)

    def read(self, *args, **kwargs):
        return self._execute_with_failover("read", *args, **kwargs)

    def update(self, *args, **kwargs):
        return self._execute_with_failover("update", *args, **kwargs)

    def delete(self, *args, **kwargs):
        return self._execute_with_failover("delete", *args, **kwargs)

# Usage
failover_client = FailoverClient(
    nodes=[
        "http://node1.example.com:9000",
        "http://node2.example.com:9000",
        "http://node3.example.com:9000"
    ],
    user_key="my-key",
    api_key="api-key"
)

# Automatically fails over to healthy nodes
config = failover_client.read("database")
```

## Performance Optimization

### Batch Processing with Progress

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
from typing import List, Dict
from tqdm import tqdm  # pip install tqdm

def bulk_migrate_configs(
    client: OpenSecureConfClient,
    configs: List[Dict],
    batch_size: int = 100
):
    """Migrate large number of configurations with progress bar."""
    total = len(configs)

    with tqdm(total=total, desc="Migrating configs") as pbar:
        for i in range(0, total, batch_size):
            batch = configs[i:i + batch_size]
            try:
                client.bulk_create(batch, ignore_errors=True)
                pbar.update(len(batch))
            except Exception as e:
                print(f"Batch {i//batch_size} failed: {e}")

# Usage
configs = [
    {"key": f"config_{i}", "value": {"index": i}, "category": "bulk"}
    for i in range(1000)
]

with OpenSecureConfClient(base_url="...", user_key="...") as client:
    bulk_migrate_configs(client, configs, batch_size=50)
```

### Concurrent Operations

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List

def parallel_read_configs(
    client: OpenSecureConfClient,
    keys: List[str],
    max_workers: int = 10
) -> Dict[str, Dict]:
    """Read multiple configurations in parallel."""
    results = {}

    def read_config(key: str):
        try:
            return key, client.read(key)
        except Exception as e:
            return key, {"error": str(e)}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(read_config, key): key for key in keys}

        for future in as_completed(futures):
            key, result = future.result()
            results[key] = result

    return results

# Usage
keys = [f"service_{i}" for i in range(100)]

with OpenSecureConfClient(
    base_url="...",
    user_key="...",
    pool_connections=20,
    pool_maxsize=50
) as client:
    configs = parallel_read_configs(client, keys, max_workers=20)
    print(f"Retrieved {len(configs)} configurations")
```

## Integration Examples

### Flask Integration

```python
from flask import Flask, g
from opensecureconf_client_enhanced import OpenSecureConfClient
import os

app = Flask(__name__)

def get_config_client():
    """Get or create OpenSecureConf client for current request."""
    if 'osc_client' not in g:
        g.osc_client = OpenSecureConfClient(
            base_url=os.getenv("OSC_URL"),
            user_key=os.getenv("OSC_USER_KEY"),
            api_key=os.getenv("OSC_API_KEY"),
            enable_retry=True
        )
    return g.osc_client

@app.teardown_appcontext
def close_config_client(error):
    """Close client at end of request."""
    client = g.pop('osc_client', None)
    if client is not None:
        client.close()

@app.route('/api/config/<key>')
def get_config(key):
    """Get configuration from OpenSecureConf."""
    client = get_config_client()
    try:
        config = client.read(key)
        return config['value']
    except Exception as e:
        return {"error": str(e)}, 404

if __name__ == '__main__':
    app.run()
```

### Django Integration

```python
# settings.py
from opensecureconf_client_enhanced import OpenSecureConfClient
import os

# Initialize client
OSC_CLIENT = OpenSecureConfClient(
    base_url=os.getenv("OSC_URL"),
    user_key=os.getenv("OSC_USER_KEY"),
    api_key=os.getenv("OSC_API_KEY"),
    enable_retry=True,
    log_level="INFO"
)

# Load database config from OpenSecureConf
db_config = OSC_CLIENT.read("database")

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_config['value']['name'],
        'USER': db_config['value']['user'],
        'PASSWORD': db_config['value']['password'],
        'HOST': db_config['value']['host'],
        'PORT': db_config['value']['port'],
    }
}

# Load cache config
cache_config = OSC_CLIENT.read("cache")

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f"redis://{cache_config['value']['host']}:{cache_config['value']['port']}",
    }
}
```

### FastAPI Integration

```python
from fastapi import FastAPI, Depends, HTTPException
from opensecureconf_client_enhanced import OpenSecureConfClient
from typing import Dict
import os

app = FastAPI()

# Global client
osc_client = OpenSecureConfClient(
    base_url=os.getenv("OSC_URL"),
    user_key=os.getenv("OSC_USER_KEY"),
    api_key=os.getenv("OSC_API_KEY"),
    enable_retry=True
)

def get_client() -> OpenSecureConfClient:
    """Dependency to inject OpenSecureConf client."""
    return osc_client

@app.get("/config/{key}")
async def get_config(
    key: str,
    client: OpenSecureConfClient = Depends(get_client)
) -> Dict:
    """Get configuration from OpenSecureConf."""
    try:
        config = client.read(key)
        return config['value']
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    """Close client on shutdown."""
    osc_client.close()
```

## Security Best Practices

### Credentials from AWS Secrets Manager

```python
import boto3
from opensecureconf_client_enhanced import OpenSecureConfClient
import json

def get_credentials_from_aws():
    """Get credentials from AWS Secrets Manager."""
    client = boto3.client('secretsmanager', region_name='us-east-1')
    secret = client.get_secret_value(SecretId='opensecureconf/credentials')
    return json.loads(secret['SecretString'])

# Initialize client with AWS credentials
creds = get_credentials_from_aws()
osc_client = OpenSecureConfClient(
    base_url=creds['url'],
    user_key=creds['user_key'],
    api_key=creds['api_key'],
    enable_retry=True
)
```

### Credentials from HashiCorp Vault

```python
import hvac
from opensecureconf_client_enhanced import OpenSecureConfClient

def get_credentials_from_vault():
    """Get credentials from HashiCorp Vault."""
    client = hvac.Client(url='https://vault.example.com')
    client.auth.approle.login(
        role_id='your-role-id',
        secret_id='your-secret-id'
    )

    secret = client.secrets.kv.v2.read_secret_version(
        path='opensecureconf/credentials'
    )
    return secret['data']['data']

# Initialize client with Vault credentials
creds = get_credentials_from_vault()
osc_client = OpenSecureConfClient(
    base_url=creds['url'],
    user_key=creds['user_key'],
    api_key=creds['api_key'],
    enable_retry=True
)
```

### Audit Logging Wrapper

```python
from opensecureconf_client_enhanced import OpenSecureConfClient
import logging
from functools import wraps
from datetime import datetime

class AuditedClient:
    """Wrapper that logs all operations for auditing."""

    def __init__(self, client: OpenSecureConfClient, audit_logger: logging.Logger):
        self.client = client
        self.audit_logger = audit_logger

    def _audit_log(self, operation: str, key: str, success: bool, error: str = None):
        """Log operation for audit trail."""
        self.audit_logger.info({
            "timestamp": datetime.utcnow().isoformat(),
            "operation": operation,
            "key": key,
            "success": success,
            "error": error
        })

    def create(self, key: str, value: dict, category: str = None):
        """Create with audit logging."""
        try:
            result = self.client.create(key, value, category)
            self._audit_log("CREATE", key, True)
            return result
        except Exception as e:
            self._audit_log("CREATE", key, False, str(e))
            raise

    def read(self, key: str):
        """Read with audit logging."""
        try:
            result = self.client.read(key)
            self._audit_log("READ", key, True)
            return result
        except Exception as e:
            self._audit_log("READ", key, False, str(e))
            raise

    def update(self, key: str, value: dict, category: str = None):
        """Update with audit logging."""
        try:
            result = self.client.update(key, value, category)
            self._audit_log("UPDATE", key, True)
            return result
        except Exception as e:
            self._audit_log("UPDATE", key, False, str(e))
            raise

    def delete(self, key: str):
        """Delete with audit logging."""
        try:
            result = self.client.delete(key)
            self._audit_log("DELETE", key, True)
            return result
        except Exception as e:
            self._audit_log("DELETE", key, False, str(e))
            raise

# Usage
audit_logger = logging.getLogger('opensecureconf.audit')
audit_logger.setLevel(logging.INFO)
handler = logging.FileHandler('/var/log/osc-audit.log')
audit_logger.addHandler(handler)

client = OpenSecureConfClient(base_url="...", user_key="...")
audited_client = AuditedClient(client, audit_logger)

# All operations are now audited
audited_client.create("secret", {"password": "..."})
```

---

These advanced examples demonstrate production-ready patterns for using the OpenSecureConf Python Client in real-world scenarios. Adapt them to your specific needs!
