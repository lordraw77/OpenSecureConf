
# OpenSecureConf TypeScript/JavaScript Client

[![npm version](https://badge.fury.io/js/opensecureconf-client.svg)](https://www.npmjs.com/package/opensecureconf-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A comprehensive TypeScript/JavaScript client library for OpenSecureConf - Encrypted configuration management with cluster support and HTTPS/SSL.

## 🚀 Features

- ✅ **Full TypeScript Support** - Complete type definitions
- 🔒 **HTTPS/SSL Support** - Production-ready with TLS
- 🔐 **Self-Signed Certificates** - Option for development environments
- 💾 **Backup & Restore** - Encrypted backup and import operations
- 📦 **Batch Operations** - Bulk create, read, delete
- 🌐 **Cluster Support** - Status and health check methods
- ⚡ **Async/Await** - Modern promise-based API
- 🛡️ **Type-Safe** - Full TypeScript definitions
- 🌍 **Universal** - Works in Node.js and browsers
- 🔄 **Auto-Retry** - Built-in timeout and error handling
- 📊 **Metrics** - Prometheus metrics support
- 🎯 **Environment & Category Filtering** - Organize configurations by environment and category

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

// Create configuration with environment and category
const config = await client.create('database', {
  host: 'localhost',
  port: 5432,
  username: 'admin',
}, {
  category: 'config',
  environment: 'production'
});

// Read configuration
const retrieved = await client.read('database');
console.log(retrieved.value); // { host: 'localhost', port: 5432, ... }
console.log(retrieved.environment); // 'production'

// Update configuration
await client.update('database', {
  host: 'db.example.com',
  port: 5432,
}, {
  environment: 'production'
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
}, {
  category: 'secrets',
  environment: 'production'
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

## 💾 Backup & Restore

### Create Backup

```typescript
// Backup all configurations
const backup = await client.createBackup('my-backup-password-123');
console.log(`Backup ID: ${backup.backup_id}`);
console.log(`Total configs: ${backup.total_configs}`);
console.log(`Timestamp: ${backup.backup_timestamp}`);

// Backup specific environment
const prodBackup = await client.createBackup('password123', {
  environment: 'production'
});

// Backup specific category
const dbBackup = await client.createBackup('password123', {
  category: 'database'
});

// Backup specific category and environment
const backup = await client.createBackup('password123', {
  category: 'database',
  environment: 'production'
});
```

### Import Backup

```typescript
// Import without overwriting existing configs
const result = await client.importBackup(
  backup.backup_data,
  'my-backup-password-123',
  false // don't overwrite
);
console.log(`Imported: ${result.imported_count}`);
console.log(`Skipped: ${result.skipped_count}`);

// Import with overwrite
const resultOverwrite = await client.importBackup(
  backup.backup_data,
  'my-backup-password-123',
  true // overwrite existing
);
console.log(`Imported: ${resultOverwrite.imported_count}`);
```

### Backup to File (Node.js only)

```typescript
// Save backup to file
await client.backupToFile(
  'my-backup-password-123',
  './backups/full-backup-2026-02-05.json'
);

// Backup production environment to file
await client.backupToFile(
  'password123',
  './backups/prod-backup.json',
  { environment: 'production' }
);

// Import from file
const importResult = await client.importFromFile(
  'my-backup-password-123',
  './backups/full-backup-2026-02-05.json',
  false // don't overwrite
);
console.log(`Restored ${importResult.imported_count} configurations`);
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
// Create with environment and category
await client.create(
  key: string,
  value: ConfigValue,
  options?: { category?: string; environment?: string }
): Promise<ConfigEntry>

// Read
await client.read(key: string): Promise<ConfigEntry>

// Update with environment and category
await client.update(
  key: string,
  value: ConfigValue,
  options?: { category?: string; environment?: string }
): Promise<ConfigEntry>

// Delete
await client.delete(key: string): Promise<{ message: string }>

// List with filters
await client.list(
  options?: { category?: string; environment?: string }
): Promise<ConfigEntry[]>

// Check existence
await client.exists(key: string): Promise<boolean>

// Count with filters
await client.count(
  options?: { category?: string; environment?: string }
): Promise<number>

// List all categories
await client.listCategories(): Promise<string[]>

// List all environments
await client.listEnvironments(): Promise<string[]>
```

#### Backup & Import Operations

```typescript
// Create encrypted backup
await client.createBackup(
  backupPassword: string,
  options?: { category?: string; environment?: string }
): Promise<BackupResponse>

// Import encrypted backup
await client.importBackup(
  backupData: string,
  backupPassword: string,
  overwrite?: boolean
): Promise<ImportResponse>

// Backup to file (Node.js only)
await client.backupToFile(
  backupPassword: string,
  filePath: string,
  options?: { category?: string; environment?: string }
): Promise<BackupResponse>

// Import from file (Node.js only)
await client.importFromFile(
  backupPassword: string,
  filePath: string,
  overwrite?: boolean
): Promise<ImportResponse>
```

#### Batch Operations

```typescript
// Bulk create
await client.bulkCreate(
  configs: Array<{
    key: string;
    value: ConfigValue;
    category?: string;
    environment?: string;
  }>,
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

### Complete Workflow with Backup

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
    }, {
      category: 'config',
      environment: 'production'
    });

    // 3. Batch create
    await client.bulkCreate([
      {
        key: 'redis',
        value: { host: 'redis.local', port: 6379 },
        category: 'cache',
        environment: 'production'
      },
      {
        key: 'cache_ttl',
        value: 3600,
        category: 'settings',
        environment: 'production'
      },
    ], true);

    // 4. List all production configs
    const prodConfigs = await client.list({ environment: 'production' });
    console.log(`Production configs: ${prodConfigs.length}`);

    // 5. Create backup before updates
    const backup = await client.createBackup('backup-password-123', {
      environment: 'production'
    });
    console.log(`Backed up ${backup.total_configs} configurations`);

    // 6. Update configuration
    await client.update('database', {
      host: 'postgres.local',
      port: 5432,
      ssl: true,
    }, {
      environment: 'production'
    });

    // 7. Save backup to file (Node.js)
    await client.backupToFile(
      'backup-password-123',
      './backups/prod-backup.json',
      { environment: 'production' }
    );

    // 8. Restore from backup if needed
    // const restored = await client.importFromFile(
    //   'backup-password-123',
    //   './backups/prod-backup.json',
    //   true
    // );

    // 9. Cleanup
    await client.bulkDelete(['database', 'redis', 'cache_ttl'], true);

  } catch (error) {
    if (error instanceof OpenSecureConfError) {
      console.error(`Error ${error.statusCode}: ${error.message}`);
    }
  }
}
```

### Environment & Category Management

```typescript
// Create configs with different environments
await client.create('api_url', 'https://api.dev.example.com', {
  category: 'config',
  environment: 'development'
});

await client.create('api_url', 'https://api.staging.example.com', {
  category: 'config',
  environment: 'staging'
});

await client.create('api_url', 'https://api.example.com', {
  category: 'config',
  environment: 'production'
});

// List all environments
const environments = await client.listEnvironments();
console.log(environments); // ['development', 'production', 'staging']

// List all categories
const categories = await client.listCategories();
console.log(categories); // ['cache', 'config', 'settings']

// List configs by environment
const prodConfigs = await client.list({ environment: 'production' });

// List configs by category
const cacheConfigs = await client.list({ category: 'cache' });

// List configs by both
const prodCacheConfigs = await client.list({
  category: 'cache',
  environment: 'production'
});

// Count configs by filters
const prodCount = await client.count({ environment: 'production' });
console.log(`Production configs: ${prodCount}`);
```

### Disaster Recovery Workflow

```typescript
// Daily backup routine
async function dailyBackup() {
  const timestamp = new Date().toISOString().split('T');
  
  // Backup production
  await client.backupToFile(
    process.env.BACKUP_PASSWORD!,
    `./backups/prod-${timestamp}.json`,
    { environment: 'production' }
  );
  
  // Backup staging
  await client.backupToFile(
    process.env.BACKUP_PASSWORD!,
    `./backups/staging-${timestamp}.json`,
    { environment: 'staging' }
  );
  
  console.log(`Backups created for ${timestamp}`);
}

// Restore from backup
async function restoreFromBackup(backupFile: string, overwrite = false) {
  const result = await client.importFromFile(
    process.env.BACKUP_PASSWORD!,
    backupFile,
    overwrite
  );
  
  console.log(`Restored ${result.imported_count} configurations`);
  
  if (result.skipped_count) {
    console.log(`Skipped ${result.skipped_count} existing configurations`);
  }
  
  if (result.errors && result.errors.length > 0) {
    console.error('Import errors:');
    result.errors.forEach(err => {
      console.error(`  - ${err.key}: ${err.error}`);
    });
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
        console.error('Authentication failed - check user key');
        break;
      case 404:
        console.error('Configuration not found');
        break;
      case 408:
        console.error('Request timeout');
        break;
      case 422:
        console.error('Validation error:', error.detail);
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
  console.log(`Cluster mode: ${status.mode}`);
  console.log(`Node ID: ${status.node_id}`);
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

### Type-Safe Value Types

```typescript
// Object value
await client.create('database', {
  host: 'localhost',
  port: 5432
});

// String value
await client.create('api_token', 'secret-token-123');

// Number value
await client.create('max_retries', 3);

// Boolean value
await client.create('debug_enabled', false);

// Array value
await client.create('allowed_ips', ['192.168.1.1', '10.0.0.1']);

// Read preserves types
const dbConfig = await client.read('database');
console.log(dbConfig.value.port); // number: 5432

const token = await client.read('api_token');
console.log(token.value); // string: 'secret-token-123'
```

## 🔍 TypeScript Support

Full TypeScript definitions included:

```typescript
import OpenSecureConfClient, {
  OpenSecureConfOptions,
  ConfigEntry,
  ConfigValue,
  ClusterStatus,
  BackupResponse,
  ImportResponse,
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
const backup: BackupResponse = await client.createBackup('password123');
const importResult: ImportResponse = await client.importBackup(
  backup.backup_data,
  'password123'
);
```

## 🔐 Security Best Practices

### ✅ Do's

- Use HTTPS in production (`https://`)
- Use valid SSL certificates (Let's Encrypt, trusted CA)
- Set strong user keys (16+ characters)
- Use strong backup passwords (16+ characters)
- Enable API key authentication
- Use environment variables for secrets
- Set appropriate timeouts
- Store backups securely and encrypted
- Rotate backup passwords regularly
- Test backup/restore procedures periodically

### ❌ Don'ts

- **Never** use `rejectUnauthorized: false` in production
- **Never** hardcode credentials in source code
- **Never** commit secrets to version control
- **Never** use short encryption keys (<8 chars)
- **Never** expose API endpoints without authentication
- **Never** store backups in plaintext
- **Never** use weak backup passwords
- **Never** share backup passwords insecurely

### Environment Variables

```typescript
const client = new OpenSecureConfClient({
  baseUrl: process.env.OSC_BASE_URL!,
  userKey: process.env.OSC_USER_KEY!,
  apiKey: process.env.OSC_API_KEY,
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});

// Backup with environment variable password
const backup = await client.createBackup(
  process.env.OSC_BACKUP_PASSWORD!
);
```

## 🌍 Browser vs Node.js

### Node.js

```typescript
// Automatic HTTPS agent setup
// Supports rejectUnauthorized option
// Full control over SSL/TLS
// File-based backup operations (backupToFile, importFromFile)
```

### Browser

```typescript
// Uses native fetch API
// SSL validation by browser
// rejectUnauthorized ignored (browser controls SSL)
// Works with CORS-enabled servers
// No file-based operations (use createBackup/importBackup with manual file handling)
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
| 422 | Validation Error | Invalid backup data or password |
| 429 | Rate Limit | Too many requests |
| 500+ | Server Error | Internal server error |

## 🔗 Links

- **GitHub**: [OpenSecureConf](https://github.com/lordraw77/OpenSecureConf)
- **NPM**: [opensecureconf-client](https://www.npmjs.com/package/opensecureconf-client)
- **Docker Hub**: [lordraw/open-secureconfiguration](https://hub.docker.com/r/lordraw/open-secureconfiguration)
- **PyPI Client**: [opensecureconf-client](https://pypi.org/project/opensecureconf-client/)
- **Documentation**: [GitHub README](https://github.com/lordraw77/OpenSecureConf/blob/main/README.md)

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📝 Changelog

### v2.3.3
- ✨ Added encrypted backup operations (`createBackup`, `importBackup`)
- ✨ Added file-based backup for Node.js (`backupToFile`, `importFromFile`)
- ✨ Added environment and category filtering to all operations
- ✨ Added `listCategories()` and `listEnvironments()` methods
- ✨ Support for multiple value types (object, string, number, boolean, array)
- 📚 Enhanced documentation with backup/restore examples
- 🔒 Improved security practices for backup passwords

### v2.0.0
- ✨ Added environment and category support
- ✨ Enhanced filtering capabilities
- 🔄 Breaking: Updated create/update signatures to support options object

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

**Version**: 2.3.3  
**Author**: Apioli <alessandro.pioli+apioli-npm@gmail.com>  
**Repository**: [GitHub](https://github.com/lordraw77/OpenSecureConf/tree/main/client-js)  
**Support**: [GitHub Issues](https://github.com/lordraw77/OpenSecureConf/issues)
