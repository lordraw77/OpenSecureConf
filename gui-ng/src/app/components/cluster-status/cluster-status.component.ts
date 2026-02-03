import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { OpenSecureConfService } from '../../services/opensecureconf.service';

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

        <div class="col-12" *ngIf="clusterStatus">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-sitemap"></i>
                Nodi del Cluster
              </div>
            </ng-template>
            <p-table [value]="clusterStatus.nodes" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>Node ID</th>
                  <th>Stato</th>
                  <th>Host</th>
                  <th>Porta</th>
                  <th>Ultimo Heartbeat</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-node>
                <tr>
                  <td>
                    <span class="node-id">{{ node.node_id }}</span>
                  </td>
                  <td>
                    <p-tag 
                      [value]="node.status" 
                      [severity]="getNodeSeverity(node.status)"
                      [rounded]="true">
                    </p-tag>
                  </td>
                  <td>
                    <span class="node-value">{{ node.host }}</span>
                  </td>
                  <td>
                    <span class="node-value">{{ node.port }}</span>
                  </td>
                  <td>
                    <span class="node-value">{{ formatDate(node.last_heartbeat) }}</span>
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

    .node-id {
      color: var(--text-primary);
      font-family: 'Courier New', monospace;
      font-weight: 600;
      background: var(--bg-secondary);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      display: inline-block;
    }

    .node-value {
      color: var(--text-primary);
      font-weight: 500;
    }

    .text-center {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
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
  clusterStatus: any = null;
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

    this.oscService.getClusterStatus().subscribe({
      next: (status) => {
        this.clusterStatus = status;
        this.loading = false;
      },
      error: (error) => {
        console.error('Cluster status failed:', error);
        this.loading = false;
      }
    });
  }

  getNodeSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    if (status === 'active' || status === 'healthy') return 'success';
    if (status === 'inactive' || status === 'unhealthy') return 'danger';
    if (status === 'pending') return 'warning';
    return 'info';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT');
  }
}
