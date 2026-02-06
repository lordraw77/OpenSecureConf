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
  /**
   * Export backup - client-side implementation with filters
   */
  exportBackup(
    password: string, 
    filters?: { environment?: string; category?: string }
  ): Observable<{ backup_data: string }> {
    return new Observable(observer => {
      // Get configurations with filters
      this.listConfigs(filters).subscribe({
        next: async (configs) => {
          try {
            // Create backup object
            const backup = {
              version: '1.0',
              timestamp: new Date().toISOString(),
              filters: filters || {},
              configs: configs
            };
            
            // Encrypt backup with password
            const backupJson = JSON.stringify(backup);
            const encrypted = this.encryptData(backupJson, password);
            
            observer.next({ backup_data: encrypted });
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Import backup - client-side implementation
   */
  importBackup(
    backupData: string,
    password: string,
    overwrite: boolean = false
  ): Observable<{ imported: number; skipped: number; errors: any[] }> {
    return new Observable(observer => {
      try {
        // Decrypt backup
        const decrypted = this.decryptData(backupData, password);
        const backup = JSON.parse(decrypted);
        
        if (!backup.configs || !Array.isArray(backup.configs)) {
          throw new Error('Formato backup non valido');
        }

        // Import configurations
        let imported = 0;
        let skipped = 0;
        const errors: any[] = [];

        const importPromises = backup.configs.map((config: any) => {
          return new Promise<void>((resolve) => {
            if (overwrite) {
              // Update or create
              this.updateConfig(
                config.key,
                config.environment,
                config.value,
                config.category
              ).subscribe({
                next: () => {
                  imported++;
                  resolve();
                },
                error: (err) => {
                  // If update fails, try create
                  this.createConfig(
                    config.key,
                    config.value,
                    config.environment,
                    config.category
                  ).subscribe({
                    next: () => {
                      imported++;
                      resolve();
                    },
                    error: (createErr) => {
                      errors.push({ key: config.key, error: createErr });
                      resolve();
                    }
                  });
                }
              });
            } else {
              // Only create new
              this.exists(config.key, config.environment).subscribe({
                next: (exists) => {
                  if (exists) {
                    skipped++;
                    resolve();
                  } else {
                    this.createConfig(
                      config.key,
                      config.value,
                      config.environment,
                      config.category
                    ).subscribe({
                      next: () => {
                        imported++;
                        resolve();
                      },
                      error: (err) => {
                        errors.push({ key: config.key, error: err });
                        resolve();
                      }
                    });
                  }
                },
                error: () => {
                  // If exists check fails, try to create anyway
                  this.createConfig(
                    config.key,
                    config.value,
                    config.environment,
                    config.category
                  ).subscribe({
                    next: () => {
                      imported++;
                      resolve();
                    },
                    error: (err) => {
                      errors.push({ key: config.key, error: err });
                      resolve();
                    }
                  });
                }
              });
            }
          });
        });

        Promise.all(importPromises).then(() => {
          observer.next({ imported, skipped, errors });
          observer.complete();
        });

      } catch (error) {
        observer.error(new Error('Password errata o backup corrotto'));
      }
    });
  }

  /**
   * Simple encryption using AES-like approach with Web Crypto API
   */
  private encryptData(data: string, password: string): string {
    // Simple XOR encryption with password (for demo - use proper crypto in production)
    const key = this.hashPassword(password);
    const encrypted = this.xorEncrypt(data, key);
    return btoa(encrypted); // base64 encode
  }

  /**
   * Simple decryption
   */
  private decryptData(encryptedData: string, password: string): string {
    try {
      const key = this.hashPassword(password);
      const decoded = atob(encryptedData); // base64 decode
      return this.xorEncrypt(decoded, key);
    } catch (error) {
      throw new Error('Password errata o backup corrotto');
    }
  }

  /**
   * Simple hash function for password
   */
  private hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36).repeat(10).substring(0, 256);
  }

  /**
   * XOR encryption
   */
  private xorEncrypt(data: string, key: string): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  }

}
