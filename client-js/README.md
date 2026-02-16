# OpenSecureConf TypeScript/JavaScript Client

[![npm version](https://badge.fury.io/js/opensecureconf-client.svg)](https://www.npmjs.com/package/opensecureconf-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A comprehensive TypeScript/JavaScript client library for OpenSecureConf - Encrypted configuration management with cluster support, HTTPS/SSL, and **real-time Server-Sent Events (SSE) notifications**.

## 🚀 Features

- ✅ **Full TypeScript Support** - Complete type definitions
- 📡 **Real-Time SSE Events** - Server-Sent Events for instant configuration change notifications
- 🎯 **Granular Event Filtering** - Subscribe to events by key, environment, category, or combinations
- 🔄 **Auto-Reconnection** - Automatic SSE reconnection with exponential backoff
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
- 🎯 **Multi-Environment Support** - Same key in different environments (production, staging, development)

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

### With SSE Support (Node.js)

For Node.js environments, install the optional `eventsource` package for SSE support:
```bash
npm install opensecureconf-client eventsource
```

**Note**: SSE works natively in browsers without additional dependencies.

## 🎯 Quick Start

### Basic HTTP Usage
```typescript
import OpenSecureConfClient from 'opensecureconf-client';

const client = new OpenSecureConfClient({
  baseUrl: 'http://localhost:9000',
  userKey: 'my-secret-key-12345',
  apiKey: 'optional-api-key', // Optional
});

// Create configuration (environment is REQUIRED)
const config = await client.create(
  'database',
  {
    host: 'localhost',
    port: 5432,
    username: 'admin',
  },
  'production', // Environment (REQUIRED)
  'config'      // Category (optional)
);

// Read configuration (environment is REQUIRED)
const retrieved = await client.read('database', 'production');
console.log(retrieved.value); // { host: 'localhost', port: 5432, ... }
console.log(retrieved.environment); // 'production'

// Update configuration (environment is REQUIRED)
await client.update(
  'database',
  'production',
  {
    host: 'db.example.com',
    port: 5432,
  },
  'config' // Category (optional)
);

// Delete configuration (environment is REQUIRED)
await client.delete('database', 'production');
```

### Real-Time Configuration Updates with SSE
```typescript
import OpenSecureConfClient from 'opensecureconf-client';

const client = new OpenSecureConfClient({
  baseUrl: 'http://localhost:9000',
  userKey: 'my-secret-key-12345',
  apiKey: 'optional-api-key',
});

// Create SSE client with event handler
const sse = client.createSSEClient({
  environment: 'production',
  category: 'database',
  onEvent: (event) => {
    console.log(`📡 ${event.event_type}: ${event.key}@${event.environment}`);
    
    if (event.event_type === 'updated') {
      // Reload configuration in your application
      client.read(event.key!, event.environment!).then(config => {
        console.log('New value:', config.value);
        reloadAppConfig(config);
      });
    }
  },
  onError: (error) => {
    console.error('SSE error:', error);
  },
  onConnected: (subscriptionId) => {
    console.log('Connected with subscription:', subscriptionId);
  },
  autoReconnect: true,
});

// Connect and listen for events
sse.connect();

// Monitor statistics
setInterval(() => {
  const stats = sse.getStatistics();
  console.log(`📊 Events: ${stats.eventsReceived}, Uptime: ${stats.uptimeSeconds}s`);
}, 60000);

// Later: disconnect
// sse.disconnect();
```

### Same Key in Different Environments
```typescript
// Create same key in production
await client.create(
  'database',
  { host: 'db.prod.com', port: 5432 },
  'production',
  'config'
);

// Create same key in staging (different value)
await client.create(
  'database',
  { host: 'db.staging.com', port: 5432 },
  'staging',
  'config'
);

// Create same key in development
await client.create(
  'database',
  { host: 'localhost', port: 5432 },
  'development',
  'config'
);

// Read from specific environment
const prodDb = await client.read('database', 'production');
const stagingDb = await client.read('database', 'staging');

console.log(prodDb.value.host);     // 'db.prod.com'
console.log(stagingDb.value.host);  // 'db.staging.com'

// Update only staging environment
await client.update('database', 'staging', {
  host: 'db-new.staging.com',
  port: 5433
});

// Delete only development environment
await client.delete('database', 'development');
// production and staging remain untouched
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
const config = await client.create(
  'api_keys',
  {
    stripe: 'sk_live_xxx',
    aws: 'AKIA_xxx',
  },
  'production',  // Environment (REQUIRED)
  'secrets'      // Category (optional)
);
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

## 📡 Real-Time SSE Events

Subscribe to real-time configuration change notifications using Server-Sent Events (SSE).

### Basic SSE Usage
```typescript
// Create SSE client with all event types
const sse = client.createSSEClient({
  environment: 'production',
  onEvent: (event) => {
    switch (event.event_type) {
      case 'connected':
        console.log('🔗 Connected:', event.subscription_id);
        break;
      case 'created':
        console.log('✨ Created:', event.key, '@', event.environment);
        break;
      case 'updated':
        console.log('🔄 Updated:', event.key, '@', event.environment);
        break;
      case 'deleted':
        console.log('🗑️  Deleted:', event.key, '@', event.environment);
        break;
      case 'sync':
        console.log('🔄 Sync:', event.key, 'from', event.node_id);
        break;
    }
  }
});

sse.connect();
```

### SSE Event Filtering
```typescript
// Subscribe to all events
const sseAll = client.createSSEClient({
  onEvent: (event) => console.log(event)
});

// Subscribe to production events only
const sseProd = client.createSSEClient({
  environment: 'production',
  onEvent: (event) => console.log(event)
});

// Subscribe to specific key in staging
const sseKey = client.createSSEClient({
  key: 'database',
  environment: 'staging',
  onEvent: (event) => console.log(event)
});

// Subscribe to all database configurations
const sseCategory = client.createSSEClient({
  category: 'database',
  onEvent: (event) => console.log(event)
});

// Subscribe with multiple filters
const sseMulti = client.createSSEClient({
  key: 'api_token',
  environment: 'production',
  category: 'auth',
  onEvent: (event) => console.log(event)
});
```

### SSE Auto-Reconnection
```typescript
const sse = client.createSSEClient({
  environment: 'production',
  onEvent: (event) => console.log(event),
  
  // Reconnection settings
  autoReconnect: true,
  maxReconnectAttempts: 10,    // -1 for infinite
  reconnectDelay: 5000,         // Initial delay (ms)
  reconnectBackoff: 2.0,        // Exponential backoff multiplier
  maxReconnectDelay: 60000,     // Max delay (ms)
});

sse.connect();
```

### SSE Statistics and Monitoring
```typescript
const sse = client.createSSEClient({
  environment: 'production',
  onEvent: (event) => console.log(event)
});

sse.connect();

// Get statistics
setInterval(() => {
  const stats = sse.getStatistics();
  
  console.log('📊 SSE Statistics:');
  console.log(`  Events received: ${stats.eventsReceived}`);
  console.log(`  By type:`, stats.eventsByType);
  console.log(`  Keep-alives: ${stats.keepalivesReceived}`);
  console.log(`  Reconnections: ${stats.reconnections}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Uptime: ${stats.uptimeSeconds}s`);
  
  if (stats.connectedAt) {
    console.log(`  Connected at: ${stats.connectedAt.toISOString()}`);
  }
  
  if (stats.lastEventAt) {
    console.log(`  Last event: ${stats.lastEventAt.toISOString()}`);
  }
}, 60000);

// Check connection status
if (sse.getConnectionStatus()) {
  console.log('✅ SSE connected');
} else {
  console.log('❌ SSE disconnected');
}

// Get subscription ID
const subId = sse.getSubscriptionId();
console.log('Subscription ID:', subId);
```

### Advanced SSE: Auto-Reload Configuration
```typescript
class ConfigurationManager {
  private client: OpenSecureConfClient;
  private configs: Map<string, any> = new Map();
  private sse?: any;

  constructor(client: OpenSecureConfClient, environment: string) {
    this.client = client;
    this.initializeSSE(environment);
  }

  private initializeSSE(environment: string) {
    // Create SSE client for auto-reload
    this.sse = this.client.createSSEClient({
      environment,
      onEvent: async (event) => {
        if (event.event_type === 'updated' && event.key) {
          // Reload updated configuration
          const config = await this.client.read(event.key, event.environment!);
          this.configs.set(event.key, config.value);
          console.log(`✅ Reloaded: ${event.key}`);
        } else if (event.event_type === 'created' && event.key) {
          // Add new configuration
          const config = await this.client.read(event.key, event.environment!);
          this.configs.set(event.key, config.value);
          console.log(`✅ Added: ${event.key}`);
        } else if (event.event_type === 'deleted' && event.key) {
          // Remove deleted configuration
          this.configs.delete(event.key);
          console.log(`✅ Removed: ${event.key}`);
        }
      },
      onError: (error) => {
        console.error('SSE error:', error);
      },
      autoReconnect: true,
    });

    this.sse.connect();
  }

  async loadAll(environment: string) {
    // Load all configurations initially
    const configs = await this.client.list({ environment });
    configs.forEach(config => {
      this.configs.set(config.key, config.value);
    });
    console.log(`Loaded ${configs.length} configurations`);
  }

  get(key: string): any {
    return this.configs.get(key);
  }

  disconnect() {
    if (this.sse) {
      this.sse.disconnect();
    }
  }
}

// Usage
const client = new OpenSecureConfClient({
  baseUrl: 'http://localhost:9000',
  userKey: 'my-key',
});

const manager = new ConfigurationManager(client, 'production');
await manager.loadAll('production');

// Configurations are automatically reloaded on changes
const dbConfig = manager.get('database');
console.log(dbConfig);
```

### Browser SSE Example
```html
<!DOCTYPE html>
<html>
<head>
    <title>OpenSecureConf SSE Demo</title>
    <style>
        .event { padding: 10px; margin: 5px; border-radius: 5px; }
        .created { background-color: #d4edda; }
        .updated { background-color: #fff3cd; }
        .deleted { background-color: #f8d7da; }
    </style>
</head>
<body>
    <h1>Real-Time Configuration Updates</h1>
    <div id="stats"></div>
    <div id="events"></div>

    <script type="module">
        import OpenSecureConfClient from './dist/index.js';

        const client = new OpenSecureConfClient({
            baseUrl: 'http://localhost:9000',
            userKey: 'my-secret-key-12345',
        });

        // Create SSE client
        const sse = client.createSSEClient({
            environment: 'production',
            onEvent: (event) => {
                // Add event to UI
                const eventDiv = document.createElement('div');
                eventDiv.className = `event ${event.event_type}`;
                eventDiv.innerHTML = `
                    <strong>${event.event_type.toUpperCase()}</strong>: 
                    ${event.key}@${event.environment}
                    <br><small>${new Date(event.timestamp).toLocaleString()}</small>
                `;
                document.getElementById('events').prepend(eventDiv);

                // Keep only last 10 events
                const events = document.getElementById('events');
                while (events.children.length > 10) {
                    events.removeChild(events.lastChild);
                }
            },
            onConnected: (subscriptionId) => {
                console.log('Connected:', subscriptionId);
            }
        });

        sse.connect();

        // Update statistics
        setInterval(() => {
            const stats = sse.getStatistics();
            document.getElementById('stats').innerHTML = `
                <strong>Statistics:</strong>
                Events: ${stats.eventsReceived} |
                Uptime: ${stats.uptimeSeconds}s |
                Keep-alives: ${stats.keepalivesReceived}
            `;
        }, 1000);
    </script>
</body>
</html>
```

### Node.js SSE Example
```typescript
import OpenSecureConfClient from 'opensecureconf-client';

const client = new OpenSecureConfClient({
  baseUrl: 'http://localhost:9000',
  userKey: 'my-secret-key-12345',
  apiKey: 'api-key-123',
});

// Create SSE client
const sse = client.createSSEClient({
  environment: 'production',
  category: 'database',
  onEvent: async (event) => {
    console.log(`\n📡 ${event.event_type.toUpperCase()}`);
    console.log(`   Key: ${event.key}@${event.environment}`);
    console.log(`   Category: ${event.category}`);
    console.log(`   Time: ${event.timestamp}`);

    if (event.node_id) {
      console.log(`   Node: ${event.node_id}`);
    }

    // Reload configuration on update
    if (event.event_type === 'updated' && event.key) {
      try {
        const config = await client.read(event.key, event.environment!);
        console.log(`   New value:`, config.value);
      } catch (error) {
        console.error(`   Failed to reload:`, error);
      }
    }
  },
  onError: (error) => {
    console.error('❌ SSE error:', error.message);
  },
  onConnected: (subscriptionId) => {
    console.log(`\n✅ Connected to SSE stream`);
    console.log(`   Subscription ID: ${subscriptionId}`);
  },
  autoReconnect: true,
  maxReconnectAttempts: 10,
});

// Connect
sse.connect();
console.log('🔌 Connecting to SSE stream...');

// Monitor statistics
setInterval(() => {
  const stats = sse.getStatistics();
  console.log(`\n📊 Statistics:`);
  console.log(`   Events: ${stats.eventsReceived}`);
  console.log(`   By type:`, stats.eventsByType);
  console.log(`   Uptime: ${stats.uptimeSeconds}s`);
  console.log(`   Reconnections: ${stats.reconnections}`);
}, 60000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  sse.disconnect();
  process.exit(0);
});
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
  './backups/full-backup-2026-02-15.json'
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
  './backups/full-backup-2026-02-15.json',
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

### Configuration Methods
```typescript
// Create with environment (REQUIRED) and optional category
await client.create(
  key: string,
  value: ConfigValue,
  environment: string,    // REQUIRED
  category?: string
): Promise<ConfigEntry>

// Read with environment (REQUIRED)
await client.read(
  key: string, 
  environment: string     // REQUIRED
): Promise<ConfigEntry>

// Update with environment (REQUIRED) and optional category
await client.update(
  key: string,
  environment: string,    // REQUIRED (cannot be changed)
  value: ConfigValue,
  category?: string
): Promise<ConfigEntry>

// Delete with environment (REQUIRED)
await client.delete(
  key: string, 
  environment: string     // REQUIRED
): Promise<{ message: string }>

// List with filters
await client.list(
  options?: { category?: string; environment?: string }
): Promise<ConfigEntry[]>

// Check existence with environment (REQUIRED)
await client.exists(
  key: string, 
  environment: string     // REQUIRED
): Promise<boolean>

// Count with filters
await client.count(
  options?: { category?: string; environment?: string }
): Promise<number>

// List all categories
await client.listCategories(): Promise<string[]>

// List all environments
await client.listEnvironments(): Promise<string[]>
```

### SSE Methods (New!)
```typescript
// Create SSE client
client.createSSEClient(
  options?: SSEOptions
): SSEClient

interface SSEOptions {
  key?: string;                    // Filter by key
  environment?: string;            // Filter by environment
  category?: string;               // Filter by category
  onEvent?: (event: SSEEventData) => void | Promise<void>;
  onError?: (error: Error) => void;
  onConnected?: (subscriptionId: string) => void;
  autoReconnect?: boolean;         // Default: true
  maxReconnectAttempts?: number;   // Default: -1 (infinite)
  reconnectDelay?: number;         // Default: 5000ms
  reconnectBackoff?: number;       // Default: 2.0
  maxReconnectDelay?: number;      // Default: 60000ms
}

// SSEClient instance methods
sse.connect(): void
sse.disconnect(): void
sse.getConnectionStatus(): boolean
sse.getSubscriptionId(): string | undefined
sse.getStatistics(): SSEStatistics
sse.resetStatistics(): void

// Get SSE server statistics
await client.getSSEStats(): Promise<any>

// Get active SSE subscriptions
await client.getSSESubscriptions(): Promise<any[]>

// Check SSE service health
await client.getSSEHealth(): Promise<{
  status: string;
  active_subscriptions: number;
  total_events_sent: number;
}>
```

### SSE Event Data
```typescript
interface SSEEventData {
  event_type: 'connected' | 'created' | 'updated' | 'deleted' | 'sync';
  key?: string;
  environment?: string;
  category?: string;
  timestamp?: string;
  node_id?: string;
  data?: Record<string, any>;
  subscription_id?: string;
  filters?: {
    key?: string;
    environment?: string;
    category?: string;
  };
}
```

### SSE Statistics
```typescript
interface SSEStatistics {
  eventsReceived: number;
  eventsByType: Record<SSEEventType, number>;
  keepalivesReceived: number;
  reconnections: number;
  connectedAt?: Date;
  lastEventAt?: Date;
  errors: number;
  uptimeSeconds: number;
}
```

### Backup & Import Methods
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

### Batch Operations
```typescript
// Bulk create (environment REQUIRED for each config)
await client.bulkCreate(
  configs: Array<{
    key: string;
    value: ConfigValue;
    environment: string;    // REQUIRED
    category?: string;
  }>,
  ignoreErrors?: boolean
): Promise<ConfigEntry[]>

// Bulk read (environment REQUIRED for each item)
await client.bulkRead(
  items: Array<{ key: string; environment: string }>,
  ignoreErrors?: boolean
): Promise<ConfigEntry[]>

// Bulk delete (environment REQUIRED for each item)
await client.bulkDelete(
  items: Array<{ key: string; environment: string }>,
  ignoreErrors?: boolean
): Promise<{ 
  deleted: Array<{ key: string; environment: string }>; 
  failed: Array<{ key: string; environment: string; error: any }> 
}>
```

### Cluster & Health
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

## 📚 Usage Examples

### Complete Workflow with SSE and Backup
```typescript
import OpenSecureConfClient, { OpenSecureConfError } from 'opensecureconf-client';

async function completeWorkflow() {
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

    // 2. Setup SSE for real-time updates
    const sse = client.createSSEClient({
      environment: 'production',
      onEvent: (event) => {
        console.log(`📡 ${event.event_type}: ${event.key}@${event.environment}`);
      },
      onConnected: (subId) => {
        console.log(`🔗 SSE Connected: ${subId}`);
      },
    });
    sse.connect();

    // 3. Create configurations with environments
    await client.create(
      'database',
      { host: 'postgres.local', port: 5432 },
      'production',
      'config'
    );

    // 4. Batch create with environments
    await client.bulkCreate([
      {
        key: 'redis',
        value: { host: 'redis.local', port: 6379 },
        environment: 'production',
        category: 'cache',
      },
      {
        key: 'cache_ttl',
        value: 3600,
        environment: 'production',
        category: 'settings',
      },
    ], true);

    // 5. List all production configs
    const prodConfigs = await client.list({ environment: 'production' });
    console.log(`Production configs: ${prodConfigs.length}`);

    // 6. Create backup before updates
    const backup = await client.createBackup('backup-password-123', {
      environment: 'production'
    });
    console.log(`Backed up ${backup.total_configs} configurations`);

    // 7. Update configuration (will trigger SSE event)
    await client.update(
      'database',
      'production',
      { host: 'postgres.local', port: 5432, ssl: true }
    );

    // 8. Wait for SSE event
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 9. Get SSE statistics
    const sseStats = sse.getStatistics();
    console.log('SSE Stats:', sseStats);

    // 10. Save backup to file (Node.js)
    await client.backupToFile(
      'backup-password-123',
      './backups/prod-backup.json',
      { environment: 'production' }
    );

    // 11. Cleanup
    sse.disconnect();
    
    await client.bulkDelete([
      { key: 'database', environment: 'production' },
      { key: 'redis', environment: 'production' },
      { key: 'cache_ttl', environment: 'production' },
    ], true);

  } catch (error) {
    if (error instanceof OpenSecureConfError) {
      console.error(`Error ${error.statusCode}: ${error.message}`);
    }
  }
}
```

### Multi-Environment Configuration Management
```typescript
// Create same key with different values across environments
const environments = ['development', 'staging', 'production'];
const configs = {
  development: {
    api_url: 'http://localhost:3000',
    db_host: 'localhost',
    debug: true,
  },
  staging: {
    api_url: 'https://api.staging.example.com',
    db_host: 'db.staging.internal',
    debug: true,
  },
  production: {
    api_url: 'https://api.example.com',
    db_host: 'db.prod.internal',
    debug: false,
  },
};

// Create configurations for each environment
for (const env of environments) {
  await client.create('api_url', configs[env].api_url, env, 'config');
  await client.create('db_host', configs[env].db_host, env, 'config');
  await client.create('debug', configs[env].debug, env, 'settings');
}

// Setup SSE to monitor each environment separately
const sseProd = client.createSSEClient({
  environment: 'production',
  onEvent: (e) => console.log(`[PROD] ${e.event_type}: ${e.key}`)
});

const sseStaging = client.createSSEClient({
  environment: 'staging',
  onEvent: (e) => console.log(`[STAGING] ${e.event_type}: ${e.key}`)
});

sseProd.connect();
sseStaging.connect();

// Read configuration from specific environment
const prodApiUrl = await client.read('api_url', 'production');
console.log(prodApiUrl.value); // 'https://api.example.com'

// Update only staging environment (triggers staging SSE event only)
await client.update('api_url', 'staging', 'https://api-v2.staging.example.com');

// Cleanup
sseProd.disconnect();
sseStaging.disconnect();
```

### Disaster Recovery Workflow with SSE Monitoring
```typescript
// Setup SSE monitoring for backup operations
const sseMonitor = client.createSSEClient({
  onEvent: (event) => {
    console.log(`📊 Change detected: ${event.event_type} - ${event.key}`);
    // Log to audit system
  }
});
sseMonitor.connect();

// Daily backup routine
async function dailyBackup() {
  const timestamp = new Date().toISOString().split('T')[0];
  
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

### Error Handling with SSE
```typescript
try {
  const config = await client.read('nonexistent', 'production');
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

// SSE error handling
const sse = client.createSSEClient({
  environment: 'production',
  onEvent: (event) => console.log(event),
  onError: (error) => {
    console.error('SSE error:', error);
    // Implement custom error handling
    if (error.message.includes('EventSource')) {
      console.error('EventSource not available. Install: npm install eventsource');
    }
  },
  autoReconnect: true,
  maxReconnectAttempts: 5,
});
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
  SSEClient,
  SSEOptions,
  SSEEventData,
  SSEEventType,
  SSEStatistics,
  SSEError,
} from 'opensecureconf-client';

// All types are fully typed
const options: OpenSecureConfOptions = {
  baseUrl: 'https://localhost:9443',
  userKey: 'my-key',
  rejectUnauthorized: false,
};

const client = new OpenSecureConfClient(options);

// Return types are inferred
const config: ConfigEntry = await client.read('key', 'production');
const status: ClusterStatus = await client.getClusterStatus();
const backup: BackupResponse = await client.createBackup('password123');

// SSE types
const sseOptions: SSEOptions = {
  environment: 'production',
  onEvent: (event: SSEEventData) => console.log(event),
};

const sse: SSEClient = client.createSSEClient(sseOptions);
const stats: SSEStatistics = sse.getStatistics();
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
- Use separate configurations for each environment
- Monitor SSE connections for anomalies
- Implement proper error handling for SSE events
- Disconnect SSE clients when no longer needed

### ❌ Don'ts

- **Never** use `rejectUnauthorized: false` in production
- **Never** hardcode credentials in source code
- **Never** commit secrets to version control
- **Never** use short encryption keys (<8 chars)
- **Never** expose API endpoints without authentication
- **Never** store backups in plaintext
- **Never** use weak backup passwords
- **Never** share backup passwords insecurely
- **Never** mix production and development configurations
- **Never** leave SSE connections open indefinitely without monitoring
- **Never** ignore SSE error events

### Environment Variables
```typescript
const client = new OpenSecureConfClient({
  baseUrl: process.env.OSC_BASE_URL!,
  userKey: process.env.OSC_USER_KEY!,
  apiKey: process.env.OSC_API_KEY,
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});

// SSE with environment-specific filters
const sse = client.createSSEClient({
  environment: process.env.APP_ENV!,
  onEvent: (event) => console.log(event),
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
// SSE via eventsource package (install: npm install eventsource)
```

### Browser
```typescript
// Uses native fetch API
// SSL validation by browser
// rejectUnauthorized ignored (browser controls SSL)
// Works with CORS-enabled servers
// No file-based operations (use createBackup/importBackup with manual file handling)
// SSE via native EventSource API (built-in)
```

## 📊 Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 0 | Network Error | Connection failed |
| 400 | Bad Request | Invalid parameters or missing environment |
| 401 | Authentication | Invalid user key |
| 403 | Forbidden | Invalid API key |
| 404 | Not Found | Configuration not found in specified environment |
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
- **SSE Guide**: [SSE Documentation](https://github.com/lordraw77/OpenSecureConf/blob/main/docs/SSE_GUIDE.md)

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📝 Changelog

### v3.1.0 (Latest - SSE Support)
- 🎉 **NEW**: Real-time Server-Sent Events (SSE) support
- ✨ **NEW**: `createSSEClient()` method for event subscriptions
- 🎯 **NEW**: Granular event filtering (key, environment, category)
- 🔄 **NEW**: Automatic SSE reconnection with exponential backoff
- 📊 **NEW**: Comprehensive SSE statistics and monitoring
- 💓 **NEW**: Keep-alive management for stable connections
- 🌐 **NEW**: Universal SSE support (Browser native, Node.js with eventsource)
- 📡 **NEW**: Event types: connected, created, updated, deleted, sync
- 🔌 **NEW**: Connection status tracking and subscription IDs
- 🛠️ **NEW**: SSE error handling and callbacks
- 📚 Enhanced documentation with SSE examples for browser and Node.js
- 🎨 Added TypeScript types for SSE (SSEClient, SSEEventData, SSEStatistics)

### v3.0.0 (Breaking Changes)
- 🚨 **BREAKING**: Environment is now **REQUIRED** for all configuration operations
- 🚨 **BREAKING**: `create()` signature changed - environment is now third parameter after value
- 🚨 **BREAKING**: `read()` requires environment parameter
- 🚨 **BREAKING**: `update()` requires environment parameter (environment cannot be changed)
- 🚨 **BREAKING**: `delete()` requires environment parameter
- 🚨 **BREAKING**: `exists()` requires environment parameter
- 🚨 **BREAKING**: `bulkRead()` now accepts `Array<{key, environment}>` instead of `string[]`
- 🚨 **BREAKING**: `bulkDelete()` now accepts `Array<{key, environment}>` instead of `string[]`
- 🚨 **BREAKING**: `bulkCreate()` requires environment field in each config object
- ✨ **NEW**: Support for same key in different environments
- ✨ **NEW**: Configurations are uniquely identified by (key + environment) pair
- 📚 Enhanced documentation with multi-environment examples
- 🔧 Migration guide for v2.x users

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

## 🔄 Migration Guide from v2.x to v3.0

### Before (v2.x)
```typescript
// Create with optional environment
await client.create('database', { host: 'localhost' }, {
  environment: 'production'
});

// Read without environment
const config = await client.read('database');

// Update without environment
await client.update('database', { host: 'newhost' });

// Delete without environment
await client.delete('database');

// Bulk operations
await client.bulkRead(['key1', 'key2']);
await client.bulkDelete(['key1', 'key2']);
```

### After (v3.0+)
```typescript
// Create with REQUIRED environment
await client.create(
  'database',
  { host: 'localhost' },
  'production',  // REQUIRED
  'config'       // optional category
);

// Read with REQUIRED environment
const config = await client.read('database', 'production');

// Update with REQUIRED environment
await client.update('database', 'production', { host: 'newhost' });

// Delete with REQUIRED environment
await client.delete('database', 'production');

// Bulk operations with environment
await client.bulkRead([
  { key: 'key1', environment: 'production' },
  { key: 'key2', environment: 'production' },
]);

await client.bulkDelete([
  { key: 'key1', environment: 'production' },
  { key: 'key2', environment: 'staging' },
]);

// NEW in v3.1: SSE support
const sse = client.createSSEClient({
  environment: 'production',
  onEvent: (event) => console.log(event)
});
sse.connect();
```

---

**OpenSecureConf TypeScript Client** - Secure configuration management with real-time notifications.

**Version**: 3.1.0  
**Author**: Apioli <alessandro.pioli+apioli-npm@gmail.com>  
**Repository**: [GitHub](https://github.com/lordraw77/OpenSecureConf/tree/main/client-js)  
**Support**: [GitHub Issues](https://github.com/lordraw77/OpenSecureConf/issues)