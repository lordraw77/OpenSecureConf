export type ConfigValue =
  | Record<string, any>
  | string
  | number
  | boolean
  | any[];

export interface ConfigEntry {
  id?: number;
  key: string;
  value: ConfigValue;
  category?: string;
  environment?: string;
}

export interface ClusterStatus {
  enabled: boolean;
  mode?: string;
  node_id?: string;
  total_nodes?: number;
  healthy_nodes?: number;
}

export interface OpenSecureConfOptions {
  baseUrl: string;
  userKey: string;
  apiKey?: string;
  timeout?: number;
  rejectUnauthorized?: boolean;
}

export class OpenSecureConfError extends Error {
  public statusCode: number;
  public detail?: string;

  constructor(statusCode: number, message: string, detail?: string) {
    super(message);
    this.name = 'OpenSecureConfError';
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

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
          const errorData = await response.json();
          errorDetail = errorData.detail || errorData.message;
        } catch {
          errorDetail = response.statusText;
        }
        throw new OpenSecureConfError(response.status, `HTTP ${response.status}`, errorDetail);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof OpenSecureConfError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new OpenSecureConfError(0, 'Network error', error.message);
      }
      throw error;
    }
  }

  async getInfo(): Promise<Record<string, any>> {
    return this.request('GET', '/');
  }

  async create(key: string, value: ConfigValue, options?: { category?: string; environment?: string }): Promise<ConfigEntry> {
    return this.request('POST', '/configs', { key, value, category: options?.category, environment: options?.environment });
  }

  async read(key: string): Promise<ConfigEntry> {
    return this.request('GET', `/configs/${encodeURIComponent(key)}`);
  }

  async update(key: string, value: ConfigValue, options?: { category?: string; environment?: string }): Promise<ConfigEntry> {
    return this.request('PUT', `/configs/${encodeURIComponent(key)}`, { value, category: options?.category, environment: options?.environment });
  }

  async delete(key: string): Promise<{ message: string }> {
    return this.request('DELETE', `/configs/${encodeURIComponent(key)}`);
  }

  async list(options?: { category?: string; environment?: string }): Promise<ConfigEntry[]> {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.environment) params.append('environment', options.environment);
    const queryString = params.toString();
    return this.request('GET', queryString ? `/configs?${queryString}` : '/configs');
  }

  async getClusterStatus(): Promise<ClusterStatus> {
    return this.request('GET', '/cluster/status');
  }

  async healthCheck(): Promise<{ status: string; node_id: string }> {
    return this.request('GET', '/cluster/health');
  }

  async getMetrics(): Promise<string> {
    const url = `${this.baseUrl}/metrics`;
    const headers: Record<string, string> = {};
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new OpenSecureConfError(response.status, 'Failed to fetch metrics');
    return await response.text();
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.read(key);
      return true;
    } catch (error) {
      if (error instanceof OpenSecureConfError && error.statusCode === 404) return false;
      throw error;
    }
  }

  async count(options?: { category?: string; environment?: string }): Promise<number> {
    const configs = await this.list(options);
    return configs.length;
  }

  async listCategories(): Promise<string[]> {
    const configs = await this.list();
    const categories = new Set<string>();
    configs.forEach(c => { if (c.category) categories.add(c.category); });
    return Array.from(categories).sort();
  }

  async listEnvironments(): Promise<string[]> {
    const configs = await this.list();
    const environments = new Set<string>();
    configs.forEach(c => { if (c.environment) environments.add(c.environment); });
    return Array.from(environments).sort();
  }

  async bulkDelete(keys: string[], ignoreErrors = false): Promise<{ deleted: string[]; failed: Array<{ key: string; error: any }> }> {
    const deleted: string[] = [];
    const failed: Array<{ key: string; error: any }> = [];
    for (const key of keys) {
      try {
        await this.delete(key);
        deleted.push(key);
      } catch (error) {
        failed.push({ key, error });
        if (!ignoreErrors) throw error;
      }
    }
    return { deleted, failed };
  }

  async bulkCreate(configs: Array<{ key: string; value: ConfigValue; category?: string; environment?: string }>, ignoreErrors = false): Promise<ConfigEntry[]> {
    const results: ConfigEntry[] = [];
    for (const config of configs) {
      try {
        const result = await this.create(config.key, config.value, { category: config.category, environment: config.environment });
        results.push(result);
      } catch (error) {
        if (!ignoreErrors) throw error;
      }
    }
    return results;
  }
}

export default OpenSecureConfClient;
