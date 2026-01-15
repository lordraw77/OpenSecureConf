/**
 * OpenSecureConf JavaScript/TypeScript Client
 *
 * A comprehensive REST API client for OpenSecureConf - Encrypted configuration
 * management system with cluster support.
 *
 * @version 1.0.0
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
  nodeid?: string;
  totalnodes?: number;
  healthynodes?: number;
}

/**
 * Client configuration options
 */
export interface OpenSecureConfOptions {
  baseUrl: string;
  userKey: string;
  apiKey?: string;
  timeout?: number;
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
 * OpenSecureConf API Client
 */
export class OpenSecureConfClient {
  private baseUrl: string;
  private userKey: string;
  private apiKey?: string;
  private timeout: number;

  constructor(options: OpenSecureConfOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.userKey = options.userKey;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;

    if (!this.userKey || this.userKey.length < 8) {
      throw new Error('userKey must be at least 8 characters long');
    }
  }

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
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

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
        throw new OpenSecureConfError(0, 'Network error', error.message);
      }

      throw error;
    }
  }

  async getInfo(): Promise<any> {
    return this.request('GET', '/');
  }

  async create(key: string, value: Record<string, any>, category?: string): Promise<ConfigEntry> {
    return this.request<ConfigEntry>('POST', '/configs', {
      key,
      value,
      category,
    });
  }

  async read(key: string): Promise<ConfigEntry> {
    return this.request<ConfigEntry>('GET', `/configs/${encodeURIComponent(key)}`);
  }

  async update(key: string, value: Record<string, any>, category?: string): Promise<ConfigEntry> {
    return this.request<ConfigEntry>('PUT', `/configs/${encodeURIComponent(key)}`, {
      value,
      category,
    });
  }

  async delete(key: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('DELETE', `/configs/${encodeURIComponent(key)}`);
  }

  async list(category?: string): Promise<ConfigEntry[]> {
    const endpoint = category ? `/configs?category=${encodeURIComponent(category)}` : '/configs';
    return this.request<ConfigEntry[]>('GET', endpoint);
  }

  async getClusterStatus(): Promise<ClusterStatus> {
    return this.request<ClusterStatus>('GET', '/cluster/status');
  }

  async healthCheck(): Promise<{ status: string; nodeid: string }> {
    return this.request('GET', '/cluster/health');
  }

  async getMetrics(): Promise<string> {
    const url = `${this.baseUrl}/metrics`;
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new OpenSecureConfError(
        response.status,
        `Failed to fetch metrics: ${response.statusText}`
      );
    }

    return await response.text();
  }
}

export default OpenSecureConfClient;
