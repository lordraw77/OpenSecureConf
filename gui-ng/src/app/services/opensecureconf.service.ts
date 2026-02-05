import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';
import OpenSecureConfClient, {
  ConfigEntry,
  ClusterStatus
} from 'opensecureconf-client';

declare global {
  interface Window {
    __env: {
      OSC_BASE_URL: string;
      OSC_USER_KEY: string;
      OSC_API_KEY?: string;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class OpenSecureConfService {
  private client!: OpenSecureConfClient;
  private connectionStatus$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const baseUrl = window.__env?.OSC_BASE_URL || 'http://localhost:9000';
    const userKey = window.__env?.OSC_USER_KEY || 'default-key-12345678';
    const apiKey = window.__env?.OSC_API_KEY;

    this.client = new OpenSecureConfClient({
      baseUrl,
      userKey,
      apiKey,
      timeout: 30000,
      rejectUnauthorized: false
    });

    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    try {
      await this.client.healthCheck();
      this.connectionStatus$.next(true);
    } catch (error) {
      this.connectionStatus$.next(false);
    }
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus$.asObservable();
  }

  getInfo() {
    return from(this.client.getInfo());
  }

  listConfigs(filters?: { category?: string; environment?: string }): Observable<ConfigEntry[]> {
    return from(this.client.list(filters));
  }

  /**
   * Get a configuration (environment is REQUIRED)
   * @param key Configuration key
   * @param environment Environment identifier (REQUIRED)
   */
  getConfig(key: string, environment: string): Observable<ConfigEntry> {
    return from(this.client.read(key, environment));
  }

  /**
   * Create a configuration (environment is REQUIRED)
   * @param key Configuration key
   * @param value Configuration value
   * @param environment Environment identifier (REQUIRED)
   * @param category Optional category
   */
  createConfig(
    key: string,
    value: any,
    environment: string,
    category?: string
  ): Observable<ConfigEntry> {
    return from(this.client.create(key, value, environment, category));
  }

  /**
   * Update a configuration (environment is REQUIRED)
   * @param key Configuration key
   * @param environment Environment identifier (REQUIRED)
   * @param value New configuration value
   * @param category Optional new category
   */
  updateConfig(
    key: string,
    environment: string,
    value: any,
    category?: string
  ): Observable<ConfigEntry> {
    return from(this.client.update(key, environment, value, category));
  }

  /**
   * Delete a configuration (environment is REQUIRED)
   * @param key Configuration key
   * @param environment Environment identifier (REQUIRED)
   */
  deleteConfig(key: string, environment: string): Observable<{ message: string }> {
    return from(this.client.delete(key, environment));
  }

  getClusterStatus(): Observable<ClusterStatus> {
    return from(this.client.getClusterStatus());
  }

  // Nuovo metodo per cluster distribution
  getClusterDistribution(): Observable<any> {
    return from(
      fetch(`${this.client['baseUrl']}/cluster/distribution`, {
        headers: {
          'x-user-key': this.client['userKey'],
          'x-api-key': this.client['apiKey'] || '',
          'accept': 'application/json'
        }
      }).then(res => res.json())
    );
  }

  healthCheck(): Observable<{ status: string; node_id: string }> {
    return from(this.client.healthCheck());
  }

  getMetrics(): Observable<string> {
    return from(this.client.getMetrics());
  }

  listCategories(): Observable<string[]> {
    return from(this.client.listCategories());
  }

  listEnvironments(): Observable<string[]> {
    return from(this.client.listEnvironments());
  }

  /**
   * Bulk delete configurations (environment REQUIRED for each)
   */
  bulkDelete(
    items: Array<{ key: string; environment: string }>
  ): Observable<{
    deleted: Array<{ key: string; environment: string }>;
    failed: Array<{ key: string; environment: string; error: any }>;
  }> {
    return from(this.client.bulkDelete(items, true));
  }

  count(options?: { category?: string; environment?: string }): Observable<number> {
    return from(this.client.count(options));
  }

  /**
   * Check if a configuration exists in specific environment
   */
  exists(key: string, environment: string): Observable<boolean> {
    return from(this.client.exists(key, environment));
  }

  /**
   * Bulk create configurations (environment REQUIRED for each)
   */
  bulkCreate(
    configs: Array<{
      key: string;
      value: any;
      environment: string;
      category?: string;
    }>
  ): Observable<ConfigEntry[]> {
    return from(this.client.bulkCreate(configs, true));
  }
}
