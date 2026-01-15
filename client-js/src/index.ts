/**
 * OpenSecureConf JavaScript/TypeScript Client
 * 
 * A comprehensive REST API client for OpenSecureConf - Encrypted configuration
 * management system with cluster support and HTTPS/SSL.
 * 
 * @version 2.2.0
 * @license MIT
 */

/**
 * Configuration entry interface
 */
export interface ConfigEntry {
  id?: number;
  key: string;
  value: Record<string, any>;
  category?: string;
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
 * // HTTPS with self-signed certificate (Node.js)
 * const client = new OpenSecureConfClient({
 *   baseUrl: 'https://localhost:9443',
 *   userKey: 'my-secret-key-12345',
 *   rejectUnauthorized: false // Accept self-signed certs
 * });
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
   */
  async create(key: string, value: Record<string, any>, category?: string): Promise<ConfigEntry> {
    return this.request('POST', '/configs', {
      key,
      value,
      category,
    });
  }

  /**
   * Read a configuration entry by key
   */
  async read(key: string): Promise<ConfigEntry> {
    return this.request('GET', `/configs/${encodeURIComponent(key)}`);
  }

  /**
   * Update an existing configuration entry
   */
  async update(key: string, value: Record<string, any>, category?: string): Promise<ConfigEntry> {
    return this.request('PUT', `/configs/${encodeURIComponent(key)}`, {
      value,
      category,
    });
  }

  /**
   * Delete a configuration entry
   */
  async delete(key: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('DELETE', `/configs/${encodeURIComponent(key)}`);
  }

  /**
   * List all configurations with optional category filter
   */
  async list(category?: string): Promise<ConfigEntry[]> {
    const endpoint = category ? `/configs?category=${encodeURIComponent(category)}` : '/configs';
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
   */
  async count(category?: string): Promise<number> {
    const configs = await this.list(category);
    return configs.length;
  }

  /**
   * Bulk create configurations
   */
  async bulkCreate(
    configs: Array<{ key: string; value: Record<string, any>; category?: string }>,
    ignoreErrors: boolean = false
  ): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    const errors: any[] = [];

    for (const config of configs) {
      try {
        const result = await this.create(config.key, config.value, config.category);
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
}

export default OpenSecureConfClient;
