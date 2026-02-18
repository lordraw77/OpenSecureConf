import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { OpenSecureConfService } from '../../services/opensecureconf.service';

interface ClusterDistribution {
  cluster_mode: string;
  is_replica: boolean;
  all_nodes_synced: boolean;
  nodes_distribution: NodeDistribution[];
}

interface NodeDistribution {
  node_id: string;
  is_local: boolean;
  is_healthy: boolean;
  keys_count: number;
}

@Component({
  selector: 'app-cluster-status',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, TagModule, ButtonModule],
  template: `
    <div class="cluster-status">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>
              <i class="pi pi-server"></i>
              Cluster Status
            </h1>
            <p>Monitora lo stato del cluster OpenSecureConf</p>
          </div>
          <p-button 
            label="Aggiorna" 
            icon="pi pi-refresh" 
            (onClick)="loadClusterStatus()"
            [loading]="loading">
          </p-button>
        </div>
      </div>

      <div class="grid">
        <!-- Cluster Info Card -->
        <div class="col-12" *ngIf="clusterDistribution">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-sitemap"></i>
                Informazioni Cluster
              </div>
            </ng-template>
            <div class="cluster-info-grid">
              <div class="info-item">
                <span class="info-label">Modalità Cluster:</span>
                <span 
                  class="custom-tag-medium"
                  [style.background-color]="getClusterModeColor(clusterDistribution.cluster_mode)"
                  [style.color]="'#ffffff'">
                  {{ clusterDistribution.cluster_mode.toUpperCase() }}
                </span>
              </div>
              
              <div class="info-item">
                <span class="info-label">Tipo Nodo:</span>
                <p-tag 
                  [value]="clusterDistribution.is_replica ? 'Replica' : 'Master'" 
                  [severity]="clusterDistribution.is_replica ? 'info' : 'success'"
                  [rounded]="true">
                </p-tag>
              </div>
              
              <div class="info-item">
                <span class="info-label">Sincronizzazione:</span>
                <p-tag 
                  [value]="clusterDistribution.all_nodes_synced ? 'Sincronizzati' : 'Non Sincronizzati'" 
                  [severity]="clusterDistribution.all_nodes_synced ? 'success' : 'warning'"
                  [rounded]="true">
                </p-tag>
              </div>
              
              <div class="info-item">
                <span class="info-label">Totale Nodi:</span>
                <span class="info-value-large">
                  {{ clusterDistribution.nodes_distribution.length }}
                </span>
              </div>
              
              <div class="info-item">
                <span class="info-label">Nodi Attivi:</span>
                <span class="info-value-large healthy-count">
                  {{ getHealthyNodesCount() }}
                </span>
              </div>
              
              <div class="info-item">
                <span class="info-label">Totale Chiavi:</span>
                <span class="info-value-large">
                  {{ getTotalKeys() }}
                </span>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Health Check Card -->
        <div class="col-12">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-heart-fill"></i>
                Health Check
              </div>
            </ng-template>
            <div class="health-check" *ngIf="healthCheck">
              <div class="health-item">
                <span class="health-label">Stato:</span>
                <p-tag 
                  [value]="healthCheck.status" 
                  [severity]="healthCheck.status === 'healthy' ? 'success' : 'danger'"
                  [rounded]="true">
                </p-tag>
              </div>
              <div class="health-item">
                <span class="health-label">Node ID:</span>
                <span class="health-value">{{ healthCheck.node_id }}</span>
              </div>
              <div class="health-item" *ngIf="healthCheck.timestamp">
                <span class="health-label">Ultimo aggiornamento:</span>
                <span class="health-value">{{ formatDate(healthCheck.timestamp) }}</span>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Nodes Table -->
        <div class="col-12" *ngIf="clusterDistribution">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-sitemap"></i>
                Distribuzione Nodi ({{ clusterDistribution.nodes_distribution.length }} nodi)
              </div>
            </ng-template>
            <p-table 
              [value]="clusterDistribution.nodes_distribution" 
              [tableStyle]="{ 'min-width': '100%' }"
              styleClass="p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th>Node ID</th>
                  <th>Locale</th>
                  <th>Stato</th>
                  <th>Chiavi</th>
                  <th>Performance</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-node>
                <tr [class.local-node]="node.is_local">
                  <td>
                    <div class="node-id-container">
                      <span class="node-id">{{ node.node_id }}</span>
                      <p-tag 
                        *ngIf="node.is_local" 
                        value="LOCALE" 
                        severity="contrast"
                        [rounded]="true"
                        styleClass="ml-2">
                      </p-tag>
                    </div>
                  </td>
                  <td>
                    <i 
                      [class]="node.is_local ? 'pi pi-check-circle' : 'pi pi-circle'" 
                      [style.color]="node.is_local ? '#22c55e' : '#6c757d'"
                      style="font-size: 1.25rem;">
                    </i>
                  </td>
                  <td>
                    <p-tag 
                      [value]="node.is_healthy ? 'Healthy' : 'Unhealthy'" 
                      [severity]="node.is_healthy ? 'success' : 'danger'"
                      [rounded]="true">
                    </p-tag>
                  </td>
                  <td>
                    <span class="keys-count">
                      <i class="pi pi-key"></i>
                      {{ node.keys_count }}
                    </span>
                  </td>
                  <td>
                    <div class="performance-bar">
                      <div 
                        class="performance-fill"
                        [style.width.%]="getPerformancePercentage(node.keys_count)"
                        [style.background-color]="getPerformanceColor(node.keys_count)"> 
                        <span class="performance-label">
                          {{ getPerformancePercentage(node.keys_count) | number:'1.0-0' }}%
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="5" class="text-center">
                    Nessun nodo trovato
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cluster-status {
      animation: fadeInUp 0.5s ease-out;
    }

    .page-header {
      margin-bottom: 2rem;
      background: var(--card-bg);
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 20px var(--shadow-sm);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .page-header h1 {
      color: var(--text-primary);
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-header h1 i {
      color: #667eea;
    }

    .page-header p {
      color: var(--text-secondary);
      margin: 0;
      font-size: 1.1rem;
    }

    .card-header-custom {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .cluster-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.5rem;
      background: var(--bg-secondary);
      border-radius: 12px;
      transition: all 0.2s;
    }

    .info-item:hover {
      background: var(--hover-bg);
      transform: translateY(-2px);
    }

    .info-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value-large {
      color: var(--text-primary);
      font-size: 2rem;
      font-weight: 700;
    }

    .healthy-count {
      color: #22c55e;
    }

    .custom-tag-medium {
      display: inline-block;
      padding: 0.5rem 1rem;
      font-size: 1rem;
      font-weight: 700;
      border-radius: 20px;
      letter-spacing: 1px;
    }

    .health-check {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }

    .health-item {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.5rem;
      background: var(--bg-secondary);
      border-radius: 12px;
    }

    .health-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .health-value {
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }

    .node-id-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .node-id {
      color: var(--text-primary);
      font-family: 'Courier New', monospace;
      font-weight: 600;
      background: var(--bg-secondary);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      display: inline-block;
    }

    .local-node {
      background: var(--hover-bg) !important;
    }

    .keys-count {
      color: var(--text-primary);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
    }

    .keys-count i {
      color: #667eea;
    }

    // .performance-bar {
    //   width: 100%;
    //   height: 24px;
    //   background: var(--bg-secondary);
    //   border-radius: 12px;
    //   overflow: hidden;
    // }
    .performance-bar {
      position: relative;
      width: 100%;
      height: 24px;
      background: var(--bg-secondary);
      border-radius: 12px;
      overflow: hidden;
    }
    .performance-label {
      position: absolute;        
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 0.75rem;
      font-weight: 700;
      //color: #ffffff;
      //text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);  
      pointer-events: none;
      white-space: nowrap;
      color: #000000;           
      text-shadow: none;        
    }

    .performance-fill {
      height: 100%;
      transition: width 0.3s ease;
      border-radius: 12px;
    }

    .text-center {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .ml-2 {
      margin-left: 0.5rem;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ClusterStatusComponent implements OnInit {
  clusterDistribution: ClusterDistribution | null = null;
  healthCheck: any = null;
  loading = false;

  constructor(private oscService: OpenSecureConfService) {}

  ngOnInit() {
    this.loadClusterStatus();
  }

  loadClusterStatus() {
    this.loading = true;

    this.oscService.healthCheck().subscribe({
      next: (health) => {
        this.healthCheck = health;
        this.healthCheck.timestamp = new Date().toISOString();
      },
      error: (error) => {
        console.error('Health check failed:', error);
      }
    });

    this.oscService.getClusterDistribution().subscribe({
      next: (distribution) => {
        this.clusterDistribution = distribution;
        this.loading = false;
      },
      error: (error) => {
        console.error('Cluster distribution failed:', error);
        this.loading = false;
      }
    });
  }

  getClusterModeColor(mode: string): string {
    if (mode === 'replica') return '#3b82f6';
    if (mode === 'master') return '#22c55e';
    return '#6c757d';
  }

  getHealthyNodesCount(): number {
    if (!this.clusterDistribution) return 0;
    return this.clusterDistribution.nodes_distribution.filter(n => n.is_healthy).length;
  }

  // getTotalKeys(): number {
  //   if (!this.clusterDistribution) return 0;
  //   return this.clusterDistribution.nodes_distribution.reduce((sum, node) => sum + node.keys_count, 0);
  // }
  getTotalKeys(): number {
    if (!this.clusterDistribution) return 0;
    const nodes = this.clusterDistribution.nodes_distribution;
    if (nodes.length === 0) return 0;
    const total = nodes.reduce((sum, node) => sum + node.keys_count, 0);
    return Math.round(total / nodes.length);
  }

  getPerformancePercentage(keys: number): number {
    if (!this.clusterDistribution) return 0;
    const max = Math.max(...this.clusterDistribution.nodes_distribution.map(n => n.keys_count), 1);
    return (keys / max) * 100;
  }

  getPerformanceColor(keys: number): string {
    const percentage = this.getPerformancePercentage(keys);
    if (percentage >= 80) return '#22c55e';
    if (percentage >= 50) return '#3b82f6';
    if (percentage >= 20) return '#f59e0b';
    return '#6c757d';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT');
  }
}
