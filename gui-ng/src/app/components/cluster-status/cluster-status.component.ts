import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { ClusterStatus } from '../../models/config.model';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-cluster-status',
  standalone: true,
  imports: [CommonModule, CardModule, TagModule, ButtonModule],
  template: `
    <div class="cluster-status">
      <div class="header-section">
        <h1>Stato Cluster</h1>
        <p-button 
          label="Aggiorna" 
          icon="pi pi-refresh" 
          (onClick)="loadClusterStatus()"
          [loading]="loading">
        </p-button>
      </div>

      <div class="grid">
        <div class="col-12 lg:col-6">
          <p-card header="Informazioni Cluster">
            <div class="status-container" *ngIf="clusterStatus">
              <div class="status-item">
                <strong>Stato:</strong>
                <p-tag 
                  [value]="clusterStatus.enabled ? 'Abilitato' : 'Disabilitato'" 
                  [severity]="clusterStatus.enabled ? 'success' : 'warning'">
                </p-tag>
              </div>

              <div class="status-item" *ngIf="clusterStatus.mode">
                <strong>Modalità:</strong>
                <span>{{ clusterStatus.mode }}</span>
              </div>

              <div class="status-item" *ngIf="clusterStatus.node_id">
                <strong>Node ID:</strong>
                <code>{{ clusterStatus.node_id }}</code>
              </div>

              <div class="status-item" *ngIf="clusterStatus.total_nodes">
                <strong>Nodi Totali:</strong>
                <span>{{ clusterStatus.total_nodes }}</span>
              </div>

              <div class="status-item" *ngIf="clusterStatus.healthy_nodes !== undefined">
                <strong>Nodi Sani:</strong>
                <span>{{ clusterStatus.healthy_nodes }} / {{ clusterStatus.total_nodes }}</span>
              </div>
            </div>

            <div *ngIf="!clusterStatus && !loading" class="empty-state">
              <i class="pi pi-info-circle"></i>
              <p>Impossibile recuperare lo stato del cluster</p>
            </div>
          </p-card>
        </div>

        <div class="col-12 lg:col-6">
          <p-card header="Health Check">
            <div class="status-container" *ngIf="healthStatus">
              <div class="status-item">
                <strong>Stato:</strong>
                <p-tag 
                  [value]="healthStatus.status" 
                  [severity]="healthStatus.status === 'healthy' ? 'success' : 'danger'">
                </p-tag>
              </div>

              <div class="status-item" *ngIf="healthStatus.node_id">
                <strong>Node ID:</strong>
                <code>{{ healthStatus.node_id }}</code>
              </div>

              <div class="status-item">
                <strong>Ultimo aggiornamento:</strong>
                <span>{{ lastUpdate | date: 'dd/MM/yyyy HH:mm:ss' }}</span>
              </div>
            </div>

            <div *ngIf="!healthStatus && !loading" class="empty-state">
              <i class="pi pi-info-circle"></i>
              <p>Health check non disponibile</p>
            </div>
          </p-card>
        </div>
      </div>

      <div class="grid mt-4" *ngIf="metricsAvailable">
        <div class="col-12">
          <p-card header="Metriche Prometheus">
            <div class="metrics-actions">
              <p-button 
                label="Visualizza Metriche" 
                icon="pi pi-chart-line" 
                (onClick)="loadMetrics()">
              </p-button>
            </div>

            <pre class="metrics-display" *ngIf="metrics">{{ metrics }}</pre>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cluster-status {
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h1 {
      color: #495057;
      margin: 0;
    }

    .status-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-item strong {
      min-width: 150px;
      color: #495057;
    }

    .status-item code {
      background-color: #f8f9fa;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: #6c757d;
    }

    .empty-state i {
      font-size: 3rem;
      margin-bottom: 1rem;
      display: block;
    }

    .metrics-actions {
      margin-bottom: 1rem;
    }

    .metrics-display {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 1rem;
      font-family: monospace;
      font-size: 0.875rem;
      max-height: 400px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class ClusterStatusComponent implements OnInit, OnDestroy {
  clusterStatus: ClusterStatus | null = null;
  healthStatus: { status: string; node_id: string } | null = null;
  metrics: string | null = null;
  metricsAvailable = true;
  loading = false;
  lastUpdate = new Date();
  private refreshSubscription?: Subscription;

  constructor(private oscService: OpenSecureConfService) {}

  ngOnInit() {
    this.loadClusterStatus();
    this.loadHealthStatus();
    
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadHealthStatus();
    });
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
  }

  loadClusterStatus() {
    this.loading = true;
    this.oscService.getClusterStatus().subscribe({
      next: (status) => {
        this.clusterStatus = status;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading cluster status:', error);
        this.loading = false;
      }
    });
  }

  loadHealthStatus() {
    this.oscService.healthCheck().subscribe({
      next: (status) => {
        this.healthStatus = status;
        this.lastUpdate = new Date();
      },
      error: (error) => {
        console.error('Error loading health status:', error);
      }
    });
  }

  loadMetrics() {
    this.oscService.getMetrics().subscribe({
      next: (metrics) => {
        this.metrics = metrics;
      },
      error: (error) => {
        console.error('Error loading metrics:', error);
        this.metricsAvailable = false;
      }
    });
  }
}
