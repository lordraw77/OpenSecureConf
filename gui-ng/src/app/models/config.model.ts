// Re-export dei tipi dalla libreria npm
export type { ConfigValue, ConfigEntry, ClusterStatus } from 'opensecureconf-client';

// Tipi aggiuntivi per l'applicazione
export interface ServiceInfo {
  service: string;
  version: string;
  cluster_enabled: boolean;
  [key: string]: any;
}
