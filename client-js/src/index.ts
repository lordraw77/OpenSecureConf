/**
 * OpenSecureConf JavaScript/TypeScript Client
 * 
 * A comprehensive REST API client for OpenSecureConf - Encrypted configuration
 * management system with cluster support and HTTPS/SSL.
 * 
 * @version 2.3.3
 * @license MIT
 */

/**
 * Supported configuration value types
 */
export type ConfigValue = 
  | Record<string, any>  // Object/Dict
  | string               // String
  | number               // Number/Int
  | boolean              // Boolean
  | any[];               // Array/List

/**
 * Configuration entry interface
 */
export interface ConfigEntry {
  id?: number;
  key: string;
  value: ConfigValue;
  category?: string;
  environment?: string;
}

/**
 * Cluster status information
 */
export interface ClusterStatus {
  enabled: boolean;
  mode?: string;
  node_id?: string;
  total_nodes?: number;
  healthy_nodes?: number;
}

/**
 * Client configuration options
 */
export interface OpenSecureConfOptions {
  baseUrl: string;
  userKey: string;
  apiKey?: string;
  timeout?: number;
  rejectUnauthorized?: boolean; // For self-signed certificates (Node.js only)
}
/**
 * Backup response interface
 */
export interface BackupResponse {
  backup_data: string;
  backup_timestamp: string;
  backup_id: string;
  total_configs: number;
}

/**
 * Import response interface
 */
export interface ImportResponse {
  message: string;
  imported_count: number;
  skipped_count?: number;
  errors?: Array<{ key: string; error: string }>;
}

/**
 * Custom error class for OpenSecureConf API errors
 */
export class OpenSecureConfError extends Error {
  public statusCode: number;
  public detail?: string;

  constructor(statusCode: number, message: string, detail?: string) {
    super(message);
    this.name = 'OpenSecureConfError';
    this.statusCode = statusCode;
    this.detail = detail;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenSecureConfError);
    }
  }
}

/**
 * Detect if running in Node.js environment
 */
function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' &&
    process.versions != null &&
    process.versions.node != null;
}

/**
 * OpenSecureConf API Client
 * 
 * @example
 * // Basic HTTP usage
 * const client = new OpenSecureConfClient({
 *   baseUrl: 'http://localhost:9000',
 *   userKey: 'my-secret-key-12345'
 * });
 * 
 * @example
 * // HTTPS with valid certificate
 * const client = new OpenSecureConfClient({
 *   baseUrl: 'https://config.example.com',
 *   userKey: 'my-secret-key-12345',
 *   apiKey: 'optional-api-key'
 * });
 * 
 * @example
 * // Create configurations with different value types
 * await client.create('database', { host: 'localhost', port: 5432 }, 
 *                     { category: 'config', environment: 'production' });
 * await client.create('api_token', 'secret-token-123', 
 *                     { category: 'auth', environment: 'staging' });
 * await client.create('max_retries', 3, { environment: 'production' });
 */
export class OpenSecureConfClient {
  private baseUrl: string;
  private userKey: string;
  private apiKey?: string;
  private timeout: number;
  private rejectUnauthorized: boolean;
  private httpsAgent?: any;

  constructor(options: OpenSecureConfOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.userKey = options.userKey;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;
    this.rejectUnauthorized = options.rejectUnauthorized !== false; // Default: true

    if (!this.userKey || this.userKey.length < 8) {
      throw new Error('userKey must be at least 8 characters long');
    }

    // Setup HTTPS agent for Node.js environment
    if (isNodeEnvironment() && this.baseUrl.startsWith('https://')) {
      this.setupNodeHttpsAgent();
    }
  }

  /**
   * Setup HTTPS agent for Node.js environment to handle SSL certificates
   */
  private setupNodeHttpsAgent(): void {
    try {
      // Dynamically import https module (Node.js only)
      const https = require('https');
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: this.rejectUnauthorized,
      });
    } catch (error) {
      // Silently fail if https module not available (browser environment)
    }
  }

  /**
   * Make HTTP request with HTTPS/SSL support
   */
  private async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Key': this.userKey,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Prepare fetch options
      const fetchOptions: RequestInit = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      };

      // Add HTTPS agent for Node.js
      if (this.httpsAgent) {
        (fetchOptions as any).agent = this.httpsAgent;
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail: string | undefined;
        try {
          const errorData = (await response.json()) as any;
          errorDetail = errorData.detail || errorData.message;
        } catch {
          errorDetail = response.statusText;
        }

        throw new OpenSecureConfError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`,
          errorDetail
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenSecureConfError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new OpenSecureConfError(
            408,
            'Request timeout',
            `Request exceeded ${this.timeout}ms`
          );
        }

        // Handle SSL/TLS errors
        if (error.message.includes('certificate') || error.message.includes('SSL')) {
          throw new OpenSecureConfError(
            0,
            'SSL/TLS error',
            `${error.message}. For self-signed certificates, set rejectUnauthorized: false`
          );
        }

        throw new OpenSecureConfError(0, 'Network error', error.message);
      }

      throw error;
    }
  }

  /**
   * Get service information
   */
  async getInfo(): Promise<Record<string, any>> {
    return this.request('GET', '/');
  }

  /**
   * Create a new configuration entry
   * 
   * @param key - Unique configuration key (1-255 characters)
   * @param value - Configuration value (object, string, number, boolean, or array)
   * @param options - Optional category and environment
   * 
   * @example
   * // Object value with category and environment
   * await client.create('database', { host: 'localhost', port: 5432 }, 
   *                     { category: 'config', environment: 'production' });
   * 
   * @example
   * // String value with environment only
   * await client.create('api_token', 'secret-token-123', 
   *                     { environment: 'staging' });
   * 
   * @example
   * // Number value with category
   * await client.create('max_retries', 3, { category: 'settings' });
   * 
   * @example
   * // Boolean without options
   * await client.create('debug_enabled', false);
   */
  async create(
    key: string, 
    value: ConfigValue, 
    options?: { category?: string; environment?: string }
  ): Promise<ConfigEntry> {
    return this.request('POST', '/configs', {
      key,
      value,
      category: options?.category,
      environment: options?.environment,
    });
  }

  /**
   * Read a configuration entry by key
   * 
   * @param key - Configuration key to retrieve
   * @returns Configuration entry with decrypted value (type preserved)
   * 
   * @example
   * const config = await client.read('database');
   * console.log(config.value);       // { host: 'localhost', port: 5432 }
   * console.log(config.environment); // 'production'
   * console.log(config.category);    // 'config'
   */
  async read(key: string): Promise<ConfigEntry> {
    return this.request('GET', `/configs/${encodeURIComponent(key)}`);
  }

  /**
   * Update an existing configuration entry
   * 
   * @param key - Configuration key to update
   * @param value - New configuration value (object, string, number, boolean, or array)
   * @param options - Optional new category and environment
   * 
   * @example
   * // Update value and environment
   * await client.update('database', { host: 'db.example.com', port: 5432 },
   *                     { environment: 'production' });
   * 
   * @example
   * // Update only value
   * await client.update('api_token', 'new-token-456');
   * 
   * @example
   * // Change category and environment
   * await client.update('setting', 100, 
   *                     { category: 'config', environment: 'staging' });
   */
  async update(
    key: string, 
    value: ConfigValue, 
    options?: { category?: string; environment?: string }
  ): Promise<ConfigEntry> {
    return this.request('PUT', `/configs/${encodeURIComponent(key)}`, {
      value,
      category: options?.category,
      environment: options?.environment,
    });
  }

  /**
   * Delete a configuration entry
   */
  async delete(key: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('DELETE', `/configs/${encodeURIComponent(key)}`);
  }

  /**
   * List all configurations with optional filters
   * 
   * @param options - Optional category and environment filters
   * 
   * @example
   * // List all configurations
   * const all = await client.list();
   * 
   * @example
   * // Filter by category
   * const dbConfigs = await client.list({ category: 'database' });
   * 
   * @example
   * // Filter by environment
   * const prodConfigs = await client.list({ environment: 'production' });
   * 
   * @example
   * // Filter by both
   * const configs = await client.list({ 
   *   category: 'database', 
   *   environment: 'production' 
   * });
   */
  async list(options?: { category?: string; environment?: string }): Promise<ConfigEntry[]> {
    const params = new URLSearchParams();
    if (options?.category) {
      params.append('category', options.category);
    }
    if (options?.environment) {
      params.append('environment', options.environment);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/configs?${queryString}` : '/configs';
    return this.request('GET', endpoint);
  }

  /**
   * Get cluster status
   */
  async getClusterStatus(): Promise<ClusterStatus> {
    return this.request('GET', '/cluster/status');
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<{ status: string; node_id: string }> {
    return this.request('GET', '/cluster/health');
  }

  /**
   * Get Prometheus metrics
   */
  async getMetrics(): Promise<string> {
    const url = `${this.baseUrl}/metrics`;
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const fetchOptions: RequestInit = { headers };

    // Add HTTPS agent for Node.js
    if (this.httpsAgent) {
      (fetchOptions as any).agent = this.httpsAgent;
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new OpenSecureConfError(
        response.status,
        `Failed to fetch metrics: ${response.statusText}`
      );
    }

    return await response.text();
  }

  /**
   * Check if configuration key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.read(key);
      return true;
    } catch (error) {
      if (error instanceof OpenSecureConfError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Count total configurations
   * 
   * @param options - Optional category and environment filters
   * 
   * @example
   * const total = await client.count();
   * const prodCount = await client.count({ environment: 'production' });
   * const dbProdCount = await client.count({ 
   *   category: 'database', 
   *   environment: 'production' 
   * });
   */
  async count(options?: { category?: string; environment?: string }): Promise<number> {
    const configs = await this.list(options);
    return configs.length;
  }

  /**
   * Get list of all unique categories
   * 
   * @example
   * const categories = await client.listCategories();
   * console.log(categories); // ['database', 'api', 'settings']
   */
  async listCategories(): Promise<string[]> {
    const configs = await this.list();
    const categories = new Set<string>();

    for (const config of configs) {
      if (config.category) {
        categories.add(config.category);
      }
    }

    return Array.from(categories).sort();
  }

  /**
   * Get list of all unique environments
   * 
   * @example
   * const environments = await client.listEnvironments();
   * console.log(environments); // ['development', 'production', 'staging']
   */
  async listEnvironments(): Promise<string[]> {
    const configs = await this.list();
    const environments = new Set<string>();

    for (const config of configs) {
      if (config.environment) {
        environments.add(config.environment);
      }
    }

    return Array.from(environments).sort();
  }

  /**
   * Bulk create configurations
   * 
   * @param configs - Array of configurations to create (supports mixed value types)
   * @param ignoreErrors - If true, continue on errors and return partial results
   * 
   * @example
   * const configs = [
   *   { key: 'db_host', value: 'localhost', category: 'db', environment: 'prod' },
   *   { key: 'db_port', value: 5432, category: 'db', environment: 'prod' },
   *   { key: 'use_ssl', value: true, category: 'security', environment: 'prod' },
   *   { key: 'api_token', value: 'secret-123', category: 'auth', environment: 'staging' }
   * ];
   * const results = await client.bulkCreate(configs);
   */
  async bulkCreate(
    configs: Array<{ 
      key: string; 
      value: ConfigValue; 
      category?: string;
      environment?: string;
    }>,
    ignoreErrors: boolean = false
  ): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    const errors: any[] = [];

    for (const config of configs) {
      try {
        const result = await this.create(
          config.key, 
          config.value, 
          { 
            category: config.category,
            environment: config.environment 
          }
        );
        results.push(result);
      } catch (error) {
        errors.push({ key: config.key, error });
        if (!ignoreErrors) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Bulk read configurations
   */
  async bulkRead(keys: string[], ignoreErrors: boolean = false): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    const errors: any[] = [];

    for (const key of keys) {
      try {
        const result = await this.read(key);
        results.push(result);
      } catch (error) {
        errors.push({ key, error });
        if (!ignoreErrors) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Bulk delete configurations
   */
  async bulkDelete(
    keys: string[],
    ignoreErrors: boolean = false
  ): Promise<{ deleted: string[]; failed: Array<{ key: string; error: any }> }> {
    const deleted: string[] = [];
    const failed: Array<{ key: string; error: any }> = [];

    for (const key of keys) {
      try {
        await this.delete(key);
        deleted.push(key);
      } catch (error) {
        failed.push({ key, error });
        if (!ignoreErrors) {
          throw error;
        }
      }
    }

    return { deleted, failed };
  }
    /**
   * Create an encrypted backup of all configurations
   * 
   * @param backupPassword - Password to encrypt the backup (required)
   * @param options - Optional filters for category and environment
   * 
   * @example
   * // Backup all configurations
   * const backup = await client.createBackup('my-secure-password-123');
   * console.log(backup.backup_data);      // Encrypted backup string
   * console.log(backup.total_configs);    // Number of configs backed up
   * console.log(backup.backup_timestamp); // ISO timestamp
   * 
   * @example
   * // Backup specific environment
   * const prodBackup = await client.createBackup('password123', {
   *   environment: 'production'
   * });
   * 
   * @example
   * // Backup specific category
   * const dbBackup = await client.createBackup('password123', {
   *   category: 'database'
   * });
   * 
   * @example
   * // Backup specific category and environment
   * const backup = await client.createBackup('password123', {
   *   category: 'database',
   *   environment: 'production'
   * });
   */
  async createBackup(
    backupPassword: string,
    options?: { category?: string; environment?: string }
  ): Promise<BackupResponse> {
    if (!backupPassword || backupPassword.length < 8) {
      throw new Error('backupPassword must be at least 8 characters long');
    }

    const params = new URLSearchParams();
    if (options?.category) {
      params.append('category', options.category);
    }
    if (options?.environment) {
      params.append('environment', options.environment);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/backup?${queryString}` : '/backup';

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Key': this.userKey,
      'X-Backup-Password': backupPassword,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers,
        signal: controller.signal,
      };

      if (this.httpsAgent) {
        (fetchOptions as any).agent = this.httpsAgent;
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail: string | undefined;
        try {
          const errorData = (await response.json()) as any;
          errorDetail = errorData.detail || errorData.message;
        } catch {
          errorDetail = response.statusText;
        }

        throw new OpenSecureConfError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`,
          errorDetail
        );
      }

      const data = await response.json();
      return data as BackupResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenSecureConfError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new OpenSecureConfError(
            408,
            'Request timeout',
            `Request exceeded ${this.timeout}ms`
          );
        }

        if (error.message.includes('certificate') || error.message.includes('SSL')) {
          throw new OpenSecureConfError(
            0,
            'SSL/TLS error',
            `${error.message}. For self-signed certificates, set rejectUnauthorized: false`
          );
        }

        throw new OpenSecureConfError(0, 'Network error', error.message);
      }

      throw error;
    }
  }

  /**
   * Import configurations from an encrypted backup
   * 
   * @param backupData - Encrypted backup string from createBackup()
   * @param backupPassword - Password used to encrypt the backup (required)
   * @param overwrite - If true, overwrite existing configurations (default: false)
   * 
   * @example
   * // Import backup without overwriting existing configs
   * const result = await client.importBackup(
   *   backup.backup_data,
   *   'my-secure-password-123'
   * );
   * console.log(result.imported_count); // Number of configs imported
   * console.log(result.skipped_count);  // Number of configs skipped
   * 
   * @example
   * // Import backup and overwrite existing configs
   * const result = await client.importBackup(
   *   backup.backup_data,
   *   'my-secure-password-123',
   *   true
   * );
   * console.log(result.message);        // Success message
   * console.log(result.imported_count); // Total imported
   */
  async importBackup(
    backupData: string,
    backupPassword: string,
    overwrite: boolean = false
  ): Promise<ImportResponse> {
    if (!backupPassword || backupPassword.length < 8) {
      throw new Error('backupPassword must be at least 8 characters long');
    }

    if (!backupData || backupData.trim().length === 0) {
      throw new Error('backupData cannot be empty');
    }

    const url = `${this.baseUrl}/import`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Key': this.userKey,
      'X-Backup-Password': backupPassword,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify({
          backup_data: backupData,
          overwrite: overwrite,
        }),
        signal: controller.signal,
      };

      if (this.httpsAgent) {
        (fetchOptions as any).agent = this.httpsAgent;
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail: string | undefined;
        try {
          const errorData = (await response.json()) as any;
          errorDetail = errorData.detail || errorData.message;
        } catch {
          errorDetail = response.statusText;
        }

        throw new OpenSecureConfError(
          response.status,
          `HTTP ${response.status}: ${response.statusText}`,
          errorDetail
        );
      }

      const data = await response.json();
      return data as ImportResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenSecureConfError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new OpenSecureConfError(
            408,
            'Request timeout',
            `Request exceeded ${this.timeout}ms`
          );
        }

        if (error.message.includes('certificate') || error.message.includes('SSL')) {
          throw new OpenSecureConfError(
            0,
            'SSL/TLS error',
            `${error.message}. For self-signed certificates, set rejectUnauthorized: false`
          );
        }

        throw new OpenSecureConfError(0, 'Network error', error.message);
      }

      throw error;
    }
  }

  /**
   * Create backup and save to file (Node.js only)
   * 
   * @param backupPassword - Password to encrypt the backup
   * @param filePath - Path where to save the backup file
   * @param options - Optional filters for category and environment
   * 
   * @example
   * // Save full backup to file
   * await client.backupToFile('password123', './backup-2026-02-05.json');
   * 
   * @example
   * // Save production backup
   * await client.backupToFile('password123', './prod-backup.json', {
   *   environment: 'production'
   * });
   */
  async backupToFile(
    backupPassword: string,
    filePath: string,
    options?: { category?: string; environment?: string }
  ): Promise<BackupResponse> {
    if (!isNodeEnvironment()) {
      throw new Error('backupToFile is only available in Node.js environment');
    }

    const backup = await this.createBackup(backupPassword, options);

    try {
      const fs = require('fs');
      fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8');
      return backup;
    } catch (error) {
      throw new Error(`Failed to write backup to file: ${error}`);
    }
  }

  /**
   * Import backup from file (Node.js only)
   * 
   * @param backupPassword - Password used to encrypt the backup
   * @param filePath - Path to the backup file
   * @param overwrite - If true, overwrite existing configurations
   * 
   * @example
   * // Import backup from file
   * const result = await client.importFromFile(
   *   'password123',
   *   './backup-2026-02-05.json'
   * );
   * console.log(result.imported_count);
   */
  async importFromFile(
    backupPassword: string,
    filePath: string,
    overwrite: boolean = false
  ): Promise<ImportResponse> {
    if (!isNodeEnvironment()) {
      throw new Error('importFromFile is only available in Node.js environment');
    }

    try {
      const fs = require('fs');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const backup = JSON.parse(fileContent) as BackupResponse;

      return await this.importBackup(backup.backup_data, backupPassword, overwrite);
    } catch (error) {
      if (error instanceof OpenSecureConfError) {
        throw error;
      }
      throw new Error(`Failed to import backup from file: ${error}`);
    }
  }
}



export default OpenSecureConfClient;