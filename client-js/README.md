# OpenSecureConf JavaScript/TypeScript Client

JavaScript/TypeScript client library for [OpenSecureConf](https://github.com/yourusername/OpenSecureConf) - A secure, encrypted configuration management system with REST API.

[![npm version](https://badge.fury.io/js/opensecureconf-client.svg)](https://www.npmjs.com/package/opensecureconf-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔐 **Encrypted Configuration Management** - Create, read, update, and delete encrypted configurations
- 🌐 **REST API Client** - Full-featured client for OpenSecureConf REST API
- 📦 **TypeScript Support** - Written in TypeScript with full type definitions
- 🔄 **Cluster Support** - Works with both REPLICA and FEDERATED cluster modes
- ⚡ **Async/Await** - Modern promise-based API
- 🛡️ **Error Handling** - Comprehensive error handling with custom error types
- ⏱️ **Timeout Control** - Configurable request timeouts
- 🧪 **Well Tested** - Comprehensive test suite with Jest

## Installation

```bash
npm install opensecureconf-client
```

## Quick Start

### JavaScript (CommonJS)

```javascript
const { OpenSecureConfClient } = require('opensecureconf-client');

const client = new OpenSecureConfClient({
  baseUrl: 'http://localhost:9000',
  userKey: 'my-secure-encryption-key',
  apiKey: 'your-api-key', // Optional
});

// Create a configuration
await client.create('my-config', { setting: 'value' }, 'category');

// Read a configuration
const config = await client.read('my-config');
console.log(config.value); // { setting: 'value' }
```

### TypeScript (ES Modules)

```typescript
import OpenSecureConfClient from 'opensecureconf-client';

const client = new OpenSecureConfClient({
  baseUrl: 'http://localhost:9000',
  userKey: 'my-secure-encryption-key',
});

const config = await client.read('my-config');
```

## API Reference

### Methods

- `create(key, value, category?)` - Create new configuration
- `read(key)` - Read configuration by key
- `update(key, value, category?)` - Update configuration
- `delete(key)` - Delete configuration
- `list(category?)` - List all configurations
- `getClusterStatus()` - Get cluster status
- `healthCheck()` - Perform health check
- `getMetrics()` - Get Prometheus metrics
- `getInfo()` - Get API information

## Error Handling

```typescript
import { OpenSecureConfError } from 'opensecureconf-client';

try {
  await client.read('non-existent-key');
} catch (error) {
  if (error instanceof OpenSecureConfError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
  }
}
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Lint code
```

## License

MIT © OpenSecureConf Contributors
"
tests/client.test.ts,"import { OpenSecureConfClient, OpenSecureConfError } from '../src/index';

describe('OpenSecureConfClient', () => {
  let client: OpenSecureConfClient;

  beforeEach(() => {
    client = new OpenSecureConfClient({
      baseUrl: 'http://localhost:9000',
      userKey: 'test-user-key-12345',
      apiKey: 'your-super-secret-api-key-here',
    });
  });

  describe('constructor', () => {
    it('should create client with valid options', () => {
      expect(client).toBeInstanceOf(OpenSecureConfClient);
    });

    it('should throw error if userKey is too short', () => {
      expect(() => {
        new OpenSecureConfClient({
          baseUrl: 'http://localhost:9000',
          userKey: 'short',
        });
      }).toThrow('userKey must be at least 8 characters long');
    });
  });

  describe('CRUD operations', () => {
    const testKey = 'test-config-key';
    const testValue = { setting: 'value', number: 42 };

    it('should create a configuration', async () => {
      const result = await client.create(testKey, testValue, 'test-category');
      expect(result).toHaveProperty('key', testKey);
      expect(result).toHaveProperty('value');
    });

    it('should read a configuration', async () => {
      const result = await client.read(testKey);
      expect(result).toHaveProperty('key', testKey);
    });

    it('should list configurations', async () => {
      const result = await client.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delete a configuration', async () => {
      const result = await client.delete(testKey);
      expect(result).toHaveProperty('message');
    });
  });
});
"
examples/basic-usage.js,"/**
 * Basic usage example for OpenSecureConf JavaScript Client
 */

const { OpenSecureConfClient } = require('opensecureconf-client');

async function main() {
  // Initialize the client
  const client = new OpenSecureConfClient({
    baseUrl: 'http://localhost:9000',
    userKey: 'my-secure-encryption-key',
    apiKey: 'your-super-secret-api-key-here', // Optional
  });

  try {
    // Create a new configuration
    const created = await client.create(
      'database-config',
      {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        ssl: true,
      },
      'database'
    );
    console.log('Created:', created);

    // Read a configuration
    const config = await client.read('database-config');
    console.log('Read:', config);

    // List all configurations
    const all = await client.list();
    console.log('All configs:', all.length);

    // Delete a configuration
    await client.delete('database-config');
    console.log('Deleted successfully');

  } catch (error) {
    if (error.name === 'OpenSecureConfError') {
      console.error('API Error:', error.statusCode, error.message);
    } else {
      console.error('Error:', error);
    }
  }
}

main();
"
examples/advanced-usage.ts,"/**
 * Advanced usage example with TypeScript
 */

import OpenSecureConfClient, {
  ConfigEntry,
  OpenSecureConfError,
} from 'opensecureconf-client';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  ssl: boolean;
}

class ConfigManager {
  private client: OpenSecureConfClient;

  constructor(baseUrl: string, userKey: string, apiKey?: string) {
    this.client = new OpenSecureConfClient({
      baseUrl,
      userKey,
      apiKey,
    });
  }

  async getDatabaseConfig(key: string): Promise<DatabaseConfig> {
    const config = await this.client.read(key);
    return config.value as DatabaseConfig;
  }

  async setDatabaseConfig(key: string, config: DatabaseConfig): Promise<void> {
    await this.client.create(key, config as Record<string, any>, 'database');
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof OpenSecureConfError) {
          if (error.statusCode >= 400 && error.statusCode < 500) {
            throw error;
          }
        }

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError;
  }
}

async function main() {
  const manager = new ConfigManager(
    'http://localhost:9000',
    'my-secure-encryption-key',
    'your-super-secret-api-key-here'
  );

  try {
    await manager.setDatabaseConfig('prod-db', {
      host: 'db.example.com',
      port: 5432,
      database: 'production',
      ssl: true,
    });

    const dbConfig = await manager.getDatabaseConfig('prod-db');
    console.log('Database config:', dbConfig);

  } catch (error) {
    if (error instanceof OpenSecureConfError) {
      console.error(`API Error [${error.statusCode}]:`, error.detail);
    } else {
      console.error('Error:', error);
    }
  }
}

main();