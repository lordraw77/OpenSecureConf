# OpenSecureConf TypeScript/JavaScript Client

[![npm version](https://badge.fury.io/js/opensecureconf-client.svg)](https://www.npmjs.com/package/opensecureconf-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A comprehensive TypeScript/JavaScript client library for OpenSecureConf - Encrypted configuration management with cluster support and HTTPS/SSL.

## 🚀 Features

- ✅ **Full TypeScript Support** - Complete type definitions
- 🔒 **HTTPS/SSL Support** - Production-ready with TLS
- 🔐 **Self-Signed Certificates** - Option for development environments
- 📦 **Batch Operations** - Bulk create, read, delete
- 🌐 **Cluster Support** - Status and health check methods
- ⚡ **Async/Await** - Modern promise-based API
- 🛡️ **Type-Safe** - Full TypeScript definitions
- 🌍 **Universal** - Works in Node.js and browsers
- 🔄 **Auto-Retry** - Built-in timeout and error handling
- 📊 **Metrics** - Prometheus metrics support

## 📦 Installation

### NPM
```bash
npm install opensecureconf-client
```

### Yarn
```bash
yarn add opensecureconf-client
```

### PNPM
```bash
pnpm add opensecureconf-client
```

## 🎯 Quick Start

### Basic HTTP Usage

```typescript
import OpenSecureConfClient from 'opensecureconf-client';

const client = new OpenSecureConfClient({
  baseUrl: 'http://localhost:9000',
  userKey: 'my-secret-key-12345',
  apiKey: 'optional-api-key', // Optional
});

// Create configuration
const config = await client.create('database', {
  host: 'localhost',
  port: 5432,
  username: 'admin',
});

// Read configuration
const retrieved = await client.read('database');
console.log(retrieved.value); // { host: 'localhost', port: 5432, ... }

// Update configuration
await client.update('database', {
  host: 'db.example.com',
  port: 5432,
});

// Delete configuration
await client.delete('database');
```

### HTTPS with Valid Certificate (Production)

```typescript
const client = new OpenSecureConfClient({
  baseUrl: 'https://config.example.com',
  userKey: 'my-secret-key-12345',
  apiKey: 'production-api-key',
  timeout: 60000, // 60 seconds
});

// All operations work the same
const config = await client.create('api_keys', {
  stripe: 'sk_live_xxx',
  aws: 'AKIA_xxx',
});
```

### HTTPS with Self-Signed Certificate (Development)

```typescript
const client = new OpenSecureConfClient({
  baseUrl: 'https://localhost:9443',
  userKey: 'my-secret-key-12345',
  rejectUnauthorized: false, // ⚠️ Accept self-signed certs (dev only!)
});

// Works with self-signed certificates
const info = await client.getInfo();
console.log(info.service); // OpenSecureConf API
```

## 📖 API Reference

### Constructor Options

```typescript
interface OpenSecureConfOptions {
  baseUrl: string;              // API server URL (http:// or https://)
  userKey: string;              // Encryption key (min 8 chars)
  apiKey?: string;              // Optional API key for authentication
  timeout?: number;             // Request timeout in ms (default: 30000)
  rejectUnauthorized?: boolean; // Reject invalid SSL certs (default: true)
}
```

### Methods

#### Configuration Operations

```typescript
// Create
await client.create(
  key: string,
  value: Record<string, any>,
  category?: string
): Promise<ConfigEntry>

// Read
await client.read(key: string): Promise<ConfigEntry>

// Update
await client.update(
  key: string,
  value: Record<string, any>,
  category?: string
): Promise<ConfigEntry>

// Delete
await client.delete(key: string): Promise<{ message: string }>

// List
await client.list(category?: string): Promise<ConfigEntry[]>

// Check existence
await client.exists(key: string): Promise<boolean>

// Count
await client.count(category?: string): Promise<number>
```

#### Batch Operations

```typescript
// Bulk create
await client.bulkCreate(
  configs: Array<{ key: string; value: Record<string, any>; category?: string }>,
  ignoreErrors?: boolean
): Promise<ConfigEntry[]>

// Bulk read
await client.bulkRead(
  keys: string[],
  ignoreErrors?: boolean
): Promise<ConfigEntry[]>

// Bulk delete
await client.bulkDelete(
  keys: string[],
  ignoreErrors?: boolean
): Promise<{ deleted: string[]; failed: Array<{ key: string; error: any }> }>
```

#### Cluster & Health

```typescript
// Get service info
await client.getInfo(): Promise<Record<string, any>>

// Cluster status
await client.getClusterStatus(): Promise<ClusterStatus>

// Health check
await client.healthCheck(): Promise<{ status: string; node_id: string }>

// Get metrics
await client.getMetrics(): Promise<string>
```

## 🔒 HTTPS/SSL Configuration

### Production (Valid Certificates)

For production environments with valid SSL certificates from Let's Encrypt or a trusted CA:

```typescript
const client = new OpenSecureConfClient({
  baseUrl: 'https://config.example.com',
  userKey: 'my-secret-key-12345',
  apiKey: 'production-api-key',
  // rejectUnauthorized: true (default)
});
```

### Development (Self-Signed Certificates)

For development with self-signed certificates:

```typescript
const client = new OpenSecureConfClient({
  baseUrl: 'https://localhost:9443',
  userKey: 'my-secret-key-12345',
  rejectUnauthorized: false, // ⚠️ Only for development!
});
```

**⚠️ Security Warning**: Never use `rejectUnauthorized: false` in production! This disables SSL certificate validation and makes your connection vulnerable to man-in-the-middle attacks.

### Node.js HTTPS Agent

When running in Node.js, the client automatically creates an HTTPS agent with the appropriate SSL settings:

```typescript
// In Node.js, HTTPS agent is automatically configured
const client = new OpenSecureConfClient({
  baseUrl: 'https://localhost:9443',
  userKey: 'my-secret-key-12345',
  rejectUnauthorized: false,
});

// Agent is used for all HTTPS requests automatically
await client.getInfo();
```

### Browser Usage

In browser environments, the native `fetch` API handles HTTPS automatically. Certificate validation follows browser security policies:

```typescript
// Works in browsers with valid certificates
const client = new OpenSecureConfClient({
  baseUrl: 'https://config.example.com',
  userKey: 'my-secret-key-12345',
});
```

## 📚 Usage Examples

### Complete Workflow

```typescript
import OpenSecureConfClient, { OpenSecureConfError } from 'opensecureconf-client';

async function workflow() {
  const client = new OpenSecureConfClient({
    baseUrl: 'https://localhost:9443',
    userKey: 'my-secure-encryption-key',
    apiKey: 'workflow-api-key',
    rejectUnauthorized: false,
  });

  try {
    // 1. Health check
    const health = await client.healthCheck();
    console.log(`Status: ${health.status}`);

    // 2. Create configurations
    await client.create('database', {
      host: 'postgres.local',
      port: 5432,
    });

    // 3. Batch create
    await client.bulkCreate([
      { key: 'redis', value: { host: 'redis.local', port: 6379 } },
      { key: 'cache', value: { ttl: 3600, maxSize: 1000 } },
    ], true);

    // 4. List all
    const configs = await client.list();
    console.log(`Total: ${configs.length} configurations`);

    // 5. Update
    await client.update('database', {
      host: 'postgres.local',
      port: 5432,
      ssl: true,
    });

    // 6. Cleanup
    await client.bulkDelete(['database', 'redis', 'cache'], true);

  } catch (error) {
    if (error instanceof OpenSecureConfError) {
      console.error(`Error ${error.statusCode}: ${error.message}`);
    }
  }
}
```

### Error Handling

```typescript
try {
  const config = await client.read('nonexistent');
} catch (error) {
  if (error instanceof OpenSecureConfError) {
    switch (error.statusCode) {
      case 401:
        console.error('Authentication failed');
        break;
      case 404:
        console.error('Configuration not found');
        break;
      case 408:
        console.error('Request timeout');
        break;
      default:
        console.error(`API error: ${error.message}`);
    }
  }
}
```

### Cluster Operations

```typescript
// Check cluster status
const status = await client.getClusterStatus();
if (status.enabled) {
  console.log(`Mode: ${status.mode}`);
  console.log(`Nodes: ${status.healthy_nodes}/${status.total_nodes}`);
}

// Get Prometheus metrics
const metrics = await client.getMetrics();
console.log(metrics);
```

## 🛠️ Advanced Usage

### Custom Timeout

```typescript
const client = new OpenSecureConfClient({
  baseUrl: 'https://config.example.com',
  userKey: 'my-secret-key-12345',
  timeout: 5000, // 5 seconds
});
```

### Category Filtering

```typescript
// Create with category
await client.create('db', { host: 'localhost' }, 'production');
await client.create('cache', { ttl: 3600 }, 'production');

// List by category
const prodConfigs = await client.list('production');
console.log(prodConfigs); // Only production configs

// Count by category
const count = await client.count('production');
console.log(`Production configs: ${count}`);
```

### Batch Operations with Error Handling

```typescript
const result = await client.bulkDelete(
  ['config1', 'config2', 'config3'],
  true // ignoreErrors
);

console.log(`Deleted: ${result.deleted.length}`);
console.log(`Failed: ${result.failed.length}`);

for (const failure of result.failed) {
  console.error(`Failed to delete ${failure.key}: ${failure.error}`);
}
```

## 🔍 TypeScript Support

Full TypeScript definitions included:

```typescript
import OpenSecureConfClient, {
  OpenSecureConfOptions,
  ConfigEntry,
  ClusterStatus,
  OpenSecureConfError,
} from 'opensecureconf-client';

// All types are fully typed
const options: OpenSecureConfOptions = {
  baseUrl: 'https://localhost:9443',
  userKey: 'my-key',
  rejectUnauthorized: false,
};

const client = new OpenSecureConfClient(options);

// Return types are inferred
const config: ConfigEntry = await client.read('key');
const status: ClusterStatus = await client.getClusterStatus();
```

## 🔐 Security Best Practices

### ✅ Do's

- Use HTTPS in production (`https://`)
- Use valid SSL certificates (Let's Encrypt, trusted CA)
- Set strong user keys (16+ characters)
- Enable API key authentication
- Use environment variables for secrets
- Set appropriate timeouts

### ❌ Don'ts

- **Never** use `rejectUnauthorized: false` in production
- **Never** hardcode credentials in source code
- **Never** commit secrets to version control
- **Never** use short encryption keys (<8 chars)
- **Never** expose API endpoints without authentication

### Environment Variables

```typescript
const client = new OpenSecureConfClient({
  baseUrl: process.env.OSC_BASE_URL!,
  userKey: process.env.OSC_USER_KEY!,
  apiKey: process.env.OSC_API_KEY,
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});
```

## 🌍 Browser vs Node.js

### Node.js

```typescript
// Automatic HTTPS agent setup
// Supports rejectUnauthorized option
// Full control over SSL/TLS
```

### Browser

```typescript
// Uses native fetch API
// SSL validation by browser
// rejectUnauthorized ignored (browser controls SSL)
// Works with CORS-enabled servers
```

## 📊 Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 0 | Network Error | Connection failed |
| 400 | Bad Request | Invalid parameters |
| 401 | Authentication | Invalid user key |
| 403 | Forbidden | Invalid API key |
| 404 | Not Found | Configuration not found |
| 408 | Timeout | Request timeout |
| 429 | Rate Limit | Too many requests |
| 500+ | Server Error | Internal server error |

## 🔗 Links

- **GitHub**: [OpenSecureConf](https://github.com/lordraw77/OpenSecureConf)
- **Docker Hub**: [lordraw/open-secureconfiguration](https://hub.docker.com/r/lordraw/open-secureconfiguration)
- **PyPI Client**: [opensecureconf-client](https://pypi.org/project/opensecureconf-client/)
- **Documentation**: [GitHub README](https://github.com/lordraw77/OpenSecureConf/blob/main/README.md)

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📝 Changelog

### v1.1.0
- ✨ Added HTTPS/SSL support
- ✨ Added `rejectUnauthorized` option
- ✨ Auto HTTPS agent for Node.js
- ✨ Batch operations (bulkCreate, bulkRead, bulkDelete)
- ✨ Utility methods (exists, count)
- 🐛 Enhanced SSL error messages
- 📚 Improved documentation

### v1.0.0
- 🎉 Initial release
- ✅ Basic CRUD operations
- ✅ Cluster support
- ✅ TypeScript definitions

---

**OpenSecureConf TypeScript Client** - Secure configuration management made simple.

**Version**: 2.3.0  
**Author**: lordraw77  
**Support**: [GitHub Issues](https://github.com/lordraw77/OpenSecureConf/issues)
