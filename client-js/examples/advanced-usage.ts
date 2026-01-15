//=== examples/advanced-usage.ts ===

/**
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
