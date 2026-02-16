/**
 * OpenSecureConf JavaScript/TypeScript Client
 * 
 * A comprehensive REST API client for OpenSecureConf - Encrypted configuration
 * management system with cluster support, HTTPS/SSL, and real-time SSE notifications.
 * 
 * @version 3.1.0
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
  environment: string;
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
 * SSE event types
 */
export type SSEEventType = 'connected' | 'created' | 'updated' | 'deleted' | 'sync';

/**
 * SSE event data interface
 */
export interface SSEEventData {
  event_type: SSEEventType;
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

/**
 * SSE client options
 */
export interface SSEOptions {
  key?: string;
  environment?: string;
  category?: string;
  onEvent?: (event: SSEEventData) => void | Promise<void>;
  onError?: (error: Error) => void;
  onConnected?: (subscriptionId: string) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  reconnectBackoff?: number;
  maxReconnectDelay?: number;
}

/**
 * SSE statistics interface
 */
export interface SSEStatistics {
  eventsReceived: number;
  eventsByType: Record<SSEEventType, number>;
  keepalivesReceived: number;
  reconnections: number;
  connectedAt?: Date;
  lastEventAt?: Date;
  errors: number;
  uptimeSeconds: number;
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
 * SSE error class
 */
export class SSEError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSEError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SSEError);
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
 * SSE Client for real-time configuration change notifications
 * 
 * @example
 * // Create SSE client with event handler
 * const sse = client.createSSEClient({
 *   environment: 'production',
 *   category: 'database',
 *   onEvent: (event) => {
 *     console.log(`${event.event_type}: ${event.key}@${event.environment}`);
 *   }
 * });
 * 
 * // Connect and listen
 * sse.connect();
 * 
 * // Later: disconnect
 * sse.disconnect();
 */
export class SSEClient {
  private baseUrl: string;
  private apiKey?: string;
  private options: SSEOptions;
  private eventSource?: any; // EventSource
  private isConnected: boolean = false;
  private shouldReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private subscriptionId?: string;
  
  // Statistics
  private stats: SSEStatistics = {
    eventsReceived: 0,
    eventsByType: {
      connected: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      sync: 0
    },
    keepalivesReceived: 0,
    reconnections: 0,
    errors: 0,
    uptimeSeconds: 0
  };

  constructor(baseUrl: string, apiKey: string | undefined, options: SSEOptions) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.options = {
      autoReconnect: true,
      maxReconnectAttempts: -1, // -1 = infinite
      reconnectDelay: 5000,
      reconnectBackoff: 2.0,
      maxReconnectDelay: 60000,
      ...options
    };
  }

  /**
   * Connect to SSE stream and start receiving events
   */
  connect(): void {
    if (this.isConnected) {
      console.warn('SSE client is already connected');
      return;
    }

    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this._connect();
  }

  /**
   * Internal connection method
   */
  private _connect(): void {
    try {
      // Build URL with filters
      const params = new URLSearchParams();
      if (this.options.key) params.append('key', this.options.key);
      if (this.options.environment) params.append('environment', this.options.environment);
      if (this.options.category) params.append('category', this.options.category);

      const url = `${this.baseUrl}/sse/subscribe?${params.toString()}`;

      // Check for EventSource availability
      let EventSourceClass: any;
      
      if (typeof EventSource !== 'undefined') {
        // Browser environment
        EventSourceClass = EventSource;
      } else if (isNodeEnvironment()) {
        // Node.js environment - require eventsource package
        try {
          EventSourceClass = require('eventsource');
        } catch (error) {
          throw new SSEError(
            'EventSource not available. Install with: npm install eventsource'
          );
        }
      } else {
        throw new SSEError('EventSource not supported in this environment');
      }

      // Create EventSource with headers (Node.js only)
      const eventSourceInitDict: any = {};
      if (this.apiKey && isNodeEnvironment()) {
        eventSourceInitDict.headers = {
          'X-API-Key': this.apiKey
        };
      }

      this.eventSource = new EventSourceClass(url, eventSourceInitDict);
      
      // Setup event listeners
      this.eventSource.addEventListener('connected', (e: any) => this._handleConnectedEvent(e));
      this.eventSource.addEventListener('created', (e: any) => this._handleEvent(e, 'created'));
      this.eventSource.addEventListener('updated', (e: any) => this._handleEvent(e, 'updated'));
      this.eventSource.addEventListener('deleted', (e: any) => this._handleEvent(e, 'deleted'));
      this.eventSource.addEventListener('sync', (e: any) => this._handleEvent(e, 'sync'));

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        if (!this.stats.connectedAt) {
          this.stats.connectedAt = new Date();
        }
      };

      this.eventSource.onerror = (error: any) => {
        this.stats.errors++;
        this.isConnected = false;

        if (this.options.onError) {
          this.options.onError(new SSEError('SSE connection error'));
        }

        // Handle reconnection
        if (this.shouldReconnect && this.options.autoReconnect) {
          this._scheduleReconnect();
        }
      };

      // Handle keep-alive comments (if needed)
      if (this.eventSource.addEventListener) {
        this.eventSource.addEventListener('message', (e: any) => {
          if (e.data.startsWith(':')) {
            this.stats.keepalivesReceived++;
          }
        });
      }

    } catch (error) {
      this.stats.errors++;
      
      if (this.options.onError) {
        this.options.onError(error as Error);
      }

      if (this.shouldReconnect && this.options.autoReconnect) {
        this._scheduleReconnect();
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle connected event
   */
  private _handleConnectedEvent(e: any): void {
    try {
      const data = JSON.parse(e.data) as SSEEventData;
      this.subscriptionId = data.subscription_id;
      
      this.stats.eventsReceived++;
      this.stats.eventsByType.connected++;
      this.stats.lastEventAt = new Date();

      if (this.options.onConnected && data.subscription_id) {
        this.options.onConnected(data.subscription_id);
      }

      if (this.options.onEvent) {
        this.options.onEvent(data);
      }
    } catch (error) {
      console.error('Failed to parse connected event:', error);
    }
  }

  /**
   * Handle SSE events
   */
  private _handleEvent(e: any, eventType: SSEEventType): void {
    try {
      const data = JSON.parse(e.data) as SSEEventData;
      data.event_type = eventType;

      this.stats.eventsReceived++;
      this.stats.eventsByType[eventType]++;
      this.stats.lastEventAt = new Date();

      if (this.options.onEvent) {
        const result = this.options.onEvent(data);
        
        // Handle async callbacks
        if (result && typeof (result as any).catch === 'function') {
          (result as Promise<void>).catch((error) => {
            console.error('Error in event handler:', error);
            if (this.options.onError) {
              this.options.onError(error);
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to parse ${eventType} event:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private _scheduleReconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }

    const maxAttempts = this.options.maxReconnectAttempts || -1;
    if (maxAttempts >= 0 && this.reconnectAttempts >= maxAttempts) {
      console.error(`Max reconnection attempts (${maxAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnections++;

    // Calculate delay with exponential backoff
    const baseDelay = this.options.reconnectDelay || 5000;
    const backoff = this.options.reconnectBackoff || 2.0;
    const maxDelay = this.options.maxReconnectDelay || 60000;
    
    const delay = Math.min(
      baseDelay * Math.pow(backoff, this.reconnectAttempts - 1),
      maxDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.shouldReconnect) {
        this._connect();
      }
    }, delay);
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.isConnected = false;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get subscription ID
   */
  getSubscriptionId(): string | undefined {
    return this.subscriptionId;
  }

  /**
   * Get SSE statistics
   */
  getStatistics(): SSEStatistics {
    // Calculate uptime
    if (this.stats.connectedAt) {
      this.stats.uptimeSeconds = Math.floor(
        (new Date().getTime() - this.stats.connectedAt.getTime()) / 1000
      );
    }

    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = {
      eventsReceived: 0,
      eventsByType: {
        connected: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        sync: 0
      },
      keepalivesReceived: 0,
      reconnections: 0,
      connectedAt: this.stats.connectedAt,
      errors: 0,
      uptimeSeconds: 0
    };
  }
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
 *                     'production', 'config');
 * await client.create('api_token', 'secret-token-123', 
 *                     'staging', 'auth');
 * await client.create('max_retries', 3, 'production');
 * 
 * @example
 * // Subscribe to real-time events
 * const sse = client.createSSEClient({
 *   environment: 'production',
 *   onEvent: (event) => {
 *     console.log(`${event.event_type}: ${event.key}@${event.environment}`);
 *   }
 * });
 * sse.connect();
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
   * @param environment - Environment identifier (REQUIRED)
   * @param category - Optional category for grouping
   * 
   * @example
   * // Object value with category and environment
   * await client.create('database', { host: 'localhost', port: 5432 }, 
   *                     'production', 'config');
   * 
   * @example
   * // Same key in different environments
   * await client.create('api_url', 'https://api.prod.com', 'production');
   * await client.create('api_url', 'https://api.staging.com', 'staging');
   */
  async create(
    key: string, 
    value: ConfigValue, 
    environment: string,
    category?: string
  ): Promise<ConfigEntry> {
    return this.request('POST', '/configs', {
      key,
      value,
      environment,
      category,
    });
  }

  /**
   * Read a configuration entry by key and environment
   * 
   * @param key - Configuration key to retrieve
   * @param environment - Environment identifier (REQUIRED)
   * @returns Configuration entry with decrypted value (type preserved)
   * 
   * @example
   * const prodConfig = await client.read('database', 'production');
   * const stagingConfig = await client.read('database', 'staging');
   * console.log(prodConfig.value);    // Different from staging
   * console.log(prodConfig.environment); // 'production'
   */
  async read(key: string, environment: string): Promise<ConfigEntry> {
    if (!environment || environment.trim().length === 0) {
      throw new Error('environment is required');
    }

    const params = new URLSearchParams({ environment });
    return this.request('GET', `/configs/${encodeURIComponent(key)}?${params.toString()}`);
  }

  /**
   * Update an existing configuration entry
   * 
   * @param key - Configuration key to update
   * @param environment - Environment identifier (REQUIRED, cannot be changed)
   * @param value - New configuration value
   * @param category - Optional new category
   * 
   * @example
   * // Update value in specific environment
   * await client.update('database', 'production', 
   *                     { host: 'db.prod.com', port: 5432 });
   * 
   * @example
   * // Update with new category
   * await client.update('api_token', 'staging', 'new-token-456', 'auth');
   */
  async update(
    key: string, 
    environment: string,
    value: ConfigValue, 
    category?: string  
  ): Promise<ConfigEntry> {
    if (!environment || environment.trim().length === 0) {
      throw new Error('environment is required');
    }

    const params = new URLSearchParams({ environment });
    return this.request('PUT', `/configs/${encodeURIComponent(key)}?${params.toString()}`, {
      value,
      category,
    });
  }

  /**
   * Delete a configuration entry
   * 
   * @param key - Configuration key to delete
   * @param environment - Environment identifier (REQUIRED)
   * 
   * @example
   * // Delete configuration in specific environment
   * await client.delete('database', 'production');
   * // The same key in 'staging' environment remains untouched
   */
  async delete(key: string, environment: string): Promise<{ message: string }> {
    if (!environment || environment.trim().length === 0) {
      throw new Error('environment is required');
    }

    const params = new URLSearchParams({ environment });
    return this.request<{ message: string }>(
      'DELETE', 
      `/configs/${encodeURIComponent(key)}?${params.toString()}`
    );
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
    
    params.append('mode', 'full');

    const queryString = params.toString();
    const endpoint = `/configs?${queryString}`;
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
   * Check if configuration key exists in specific environment
   * 
   * @param key - Configuration key
   * @param environment - Environment identifier (REQUIRED)
   * 
   * @example
   * const existsInProd = await client.exists('database', 'production');
   * const existsInStaging = await client.exists('database', 'staging');
   */
  async exists(key: string, environment: string): Promise<boolean> {
    try {
      await this.read(key, environment);
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
   * @param configs - Array of configurations to create (environment is REQUIRED)
   * @param ignoreErrors - If true, continue on errors and return partial results
   * 
   * @example
   * const configs = [
   *   { key: 'db_host', value: 'localhost', environment: 'production', category: 'db' },
   *   { key: 'db_host', value: 'localhost', environment: 'staging', category: 'db' },
   *   { key: 'db_port', value: 5432, environment: 'production', category: 'db' }
   * ];
   * const results = await client.bulkCreate(configs);
   */
  async bulkCreate(
    configs: Array<{ 
      key: string; 
      value: ConfigValue; 
      environment: string;
      category?: string;
    }>,
    ignoreErrors: boolean = false
  ): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    const errors: any[] = [];

    for (const config of configs) {
      if (!config.environment || config.environment.trim().length === 0) {
        const error = new Error(`environment is required for key '${config.key}'`);
        errors.push({ key: config.key, error });
        if (!ignoreErrors) {
          throw error;
        }
        continue;
      }

      try {
        const result = await this.create(
          config.key, 
          config.value, 
          config.environment,
          config.category
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
   * 
   * @param items - Array of {key, environment} pairs
   * @param ignoreErrors - If true, continue on errors
   * 
   * @example
   * const items = [
   *   { key: 'database', environment: 'production' },
   *   { key: 'database', environment: 'staging' },
   *   { key: 'api_url', environment: 'production' }
   * ];
   * const results = await client.bulkRead(items);
   */
  async bulkRead(
    items: Array<{ key: string; environment: string }>, 
    ignoreErrors: boolean = false
  ): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    const errors: any[] = [];

    for (const item of items) {
      if (!item.environment || item.environment.trim().length === 0) {
        const error = new Error(`environment is required for key '${item.key}'`);
        errors.push({ key: item.key, error });
        if (!ignoreErrors) {
          throw error;
        }
        continue;
      }

      try {
        const result = await this.read(item.key, item.environment);
        results.push(result);
      } catch (error) {
        errors.push({ key: item.key, environment: item.environment, error });
        if (!ignoreErrors) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Bulk delete configurations
   * 
   * @param items - Array of {key, environment} pairs
   * @param ignoreErrors - If true, continue on errors
   * 
   * @example
   * const items = [
   *   { key: 'database', environment: 'staging' },
   *   { key: 'api_url', environment: 'staging' }
   * ];
   * const result = await client.bulkDelete(items);
   * console.log(result.deleted);  // Successfully deleted items
   * console.log(result.failed);   // Failed items with errors
   */
  async bulkDelete(
    items: Array<{ key: string; environment: string }>,
    ignoreErrors: boolean = false
  ): Promise<{ 
    deleted: Array<{ key: string; environment: string }>; 
    failed: Array<{ key: string; environment: string; error: any }> 
  }> {
    const deleted: Array<{ key: string; environment: string }> = [];
    const failed: Array<{ key: string; environment: string; error: any }> = [];

    for (const item of items) {
      if (!item.environment || item.environment.trim().length === 0) {
        const error = new Error(`environment is required for key '${item.key}'`);
        failed.push({ key: item.key, environment: item.environment, error });
        if (!ignoreErrors) {
          throw error;
        }
        continue;
      }

      try {
        await this.delete(item.key, item.environment);
        deleted.push({ key: item.key, environment: item.environment });
      } catch (error) {
        failed.push({ key: item.key, environment: item.environment, error });
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

  /**
   * Create an SSE client for real-time configuration change notifications
   * 
   * @param options - SSE client options including filters and event handlers
   * 
   * @example
   * // Subscribe to all production events
   * const sse = client.createSSEClient({
   *   environment: 'production',
   *   onEvent: (event) => {
   *     console.log(`${event.event_type}: ${event.key}@${event.environment}`);
   *   },
   *   onError: (error) => {
   *     console.error('SSE error:', error);
   *   }
   * });
   * 
   * sse.connect();
   * 
   * // Later: disconnect
   * sse.disconnect();
   * 
   * @example
   * // Subscribe to specific key in staging
   * const sse = client.createSSEClient({
   *   key: 'database',
   *   environment: 'staging',
   *   category: 'config',
   *   onEvent: async (event) => {
   *     if (event.event_type === 'updated') {
   *       // Reload configuration in your application
   *       const config = await client.read(event.key!, event.environment!);
   *       console.log('New value:', config.value);
   *     }
   *   }
   * });
   * 
   * sse.connect();
   * 
   * @example
   * // Monitor connection statistics
   * const sse = client.createSSEClient({
   *   environment: 'production',
   *   onEvent: (event) => console.log(event),
   *   onConnected: (subscriptionId) => {
   *     console.log('Connected with subscription:', subscriptionId);
   *   }
   * });
   * 
   * sse.connect();
   * 
   * // Check statistics periodically
   * setInterval(() => {
   *   const stats = sse.getStatistics();
   *   console.log('Events received:', stats.eventsReceived);
   *   console.log('Uptime:', stats.uptimeSeconds, 'seconds');
   * }, 60000);
   */
  createSSEClient(options: SSEOptions = {}): SSEClient {
    return new SSEClient(this.baseUrl, this.apiKey, options);
  }

  /**
   * Get SSE statistics from server
   * 
   * @example
   * const stats = await client.getSSEStats();
   * console.log('Active subscriptions:', stats.subscriptions.active);
   * console.log('Total events sent:', stats.events.total_sent);
   */
  async getSSEStats(): Promise<any> {
    return this.request('GET', '/sse/stats');
  }

  /**
   * Get active SSE subscriptions from server
   * 
   * @example
   * const subscriptions = await client.getSSESubscriptions();
   * for (const sub of subscriptions) {
   *   console.log(`${sub.subscription_id}: ${sub.filters}`);
   * }
   */
  async getSSESubscriptions(): Promise<any[]> {
    return this.request('GET', '/sse/subscriptions');
  }

  /**
   * Check SSE service health
   * 
   * @example
   * const health = await client.getSSEHealth();
   * console.log('SSE status:', health.status);
   * console.log('Active subscriptions:', health.active_subscriptions);
   */
  async getSSEHealth(): Promise<{ status: string; active_subscriptions: number; total_events_sent: number }> {
    return this.request('GET', '/sse/health');
  }
}

export default OpenSecureConfClient;