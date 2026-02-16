import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

interface SSEStats {
  subscriptions: {
    total_created: number;
    active: number;
    closed: number;
    wildcard: number;
    by_key: Record<string, number>;
    by_environment: Record<string, number>;
    by_category: Record<string, number>;
    last_created_at: string;
  };
  events: {
    total_sent: number;
    by_type: Record<string, number>;
    dropped_queue_full: number;
    last_sent_at: string;
  };
  connection_health: {
    keepalive_sent: number;
    disconnections_detected: number;
  };
  performance: {
    average_subscription_duration_seconds: number;
    max_queue_size_reached: number;
  };
}

@Component({
  selector: 'app-sse-stats',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, TagModule, ButtonModule, TooltipModule],
  template: `
    <div class="sse-stats">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>
              <i class="pi pi-bolt"></i>
              Statistiche SSE
            </h1>
            <p>Monitoring in tempo reale delle connessioni Server-Sent Events</p>
          </div>
          <div class="header-actions">
            <p-button 
              icon="pi pi-refresh" 
              label="Aggiorna"
              (onClick)="loadStats()"
              [loading]="loading">
            </p-button>
            <p-tag 
              [value]="autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'" 
              [severity]="autoRefreshEnabled ? 'success' : 'secondary'"
              [rounded]="true"
              styleClass="cursor-pointer"
              (click)="toggleAutoRefresh()"
              pTooltip="Clicca per {{ autoRefreshEnabled ? 'disabilitare' : 'abilitare' }} l'auto-refresh">
            </p-tag>
          </div>
        </div>
      </div>

      <div class="grid" *ngIf="stats">
        <!-- Subscriptions Overview -->
        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card stat-card-primary">
            <div class="stat-icon">
              <i class="pi pi-users"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.subscriptions.active }}</div>
              <div class="stat-label">Connessioni Attive</div>
              <div class="stat-detail">{{ stats.subscriptions.total_created }} totali create</div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card stat-card-success">
            <div class="stat-icon">
              <i class="pi pi-send"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.events.total_sent }}</div>
              <div class="stat-label">Eventi Inviati</div>
              <div class="stat-detail">{{ Object.keys(stats.events.by_type).length }} tipi diversi</div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card stat-card-info">
            <div class="stat-icon">
              <i class="pi pi-heart"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.connection_health.keepalive_sent }}</div>
              <div class="stat-label">Keepalive Inviati</div>
              <div class="stat-detail">{{ stats.connection_health.disconnections_detected }} disconnessioni</div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card" [class.stat-card-danger]="stats.events.dropped_queue_full > 0" [class.stat-card-success]="stats.events.dropped_queue_full === 0">
            <div class="stat-icon">
              <i class="pi" [class.pi-exclamation-triangle]="stats.events.dropped_queue_full > 0" [class.pi-check-circle]="stats.events.dropped_queue_full === 0"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.events.dropped_queue_full }}</div>
              <div class="stat-label">Eventi Persi</div>
              <div class="stat-detail">Coda piena</div>
            </div>
          </div>
        </div>

        <!-- Subscriptions Details -->
        <div class="col-12 lg:col-6">
          <p-card header="Dettagli Sottoscrizioni" styleClass="stats-card">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Totali Create:</span>
                <span class="detail-value">{{ stats.subscriptions.total_created }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Attive:</span>
                <span class="detail-value success">{{ stats.subscriptions.active }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Chiuse:</span>
                <span class="detail-value">{{ stats.subscriptions.closed }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Wildcard:</span>
                <span class="detail-value info">{{ stats.subscriptions.wildcard }}</span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Ultima Creazione:</span>
                <span class="detail-value">{{ formatDate(stats.subscriptions.last_created_at) }}</span>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Events Details -->
        <div class="col-12 lg:col-6">
          <p-card header="Dettagli Eventi" styleClass="stats-card">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Eventi Totali:</span>
                <span class="detail-value">{{ stats.events.total_sent }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Persi (coda):</span>
                <span class="detail-value" [class.danger]="stats.events.dropped_queue_full > 0">
                  {{ stats.events.dropped_queue_full }}
                </span>
              </div>
              <div class="detail-item full-width">
                <span class="detail-label">Ultimo Invio:</span>
                <span class="detail-value">{{ formatDate(stats.events.last_sent_at) }}</span>
              </div>
            </div>
          </p-card>
        </div>

        <!-- Events by Type -->
        <div class="col-12 lg:col-6" *ngIf="Object.keys(stats.events.by_type).length > 0">
          <p-card header="Eventi per Tipo" styleClass="stats-card">
            <p-table [value]="getEventTypeArray()" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>Tipo Evento</th>
                  <th class="text-right">Conteggio</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td>
                    <p-tag [value]="item.type" severity="info" [rounded]="true"></p-tag>
                  </td>
                  <td class="text-right">
                    <strong>{{ item.count }}</strong>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <!-- Subscriptions by Key -->
        <div class="col-12 lg:col-6" *ngIf="Object.keys(stats.subscriptions.by_key).length > 0">
          <p-card header="Sottoscrizioni per Chiave" styleClass="stats-card">
            <p-table [value]="getSubscriptionsByKeyArray()" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>Chiave</th>
                  <th class="text-right">Conteggio</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td>
                    <code class="key-code">{{ item.key }}</code>
                  </td>
                  <td class="text-right">
                    <strong>{{ item.count }}</strong>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <!-- Subscriptions by Environment -->
        <div class="col-12 lg:col-6" *ngIf="Object.keys(stats.subscriptions.by_environment).length > 0">
          <p-card header="Sottoscrizioni per Ambiente" styleClass="stats-card">
            <p-table [value]="getSubscriptionsByEnvironmentArray()" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>Ambiente</th>
                  <th class="text-right">Conteggio</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td>
                    <p-tag 
                      [value]="item.environment" 
                      [severity]="getEnvironmentSeverity(item.environment)"
                      [rounded]="true">
                    </p-tag>
                  </td>
                  <td class="text-right">
                    <strong>{{ item.count }}</strong>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <!-- Subscriptions by Category -->
        <div class="col-12 lg:col-6" *ngIf="Object.keys(stats.subscriptions.by_category).length > 0">
          <p-card header="Sottoscrizioni per Categoria" styleClass="stats-card">
            <p-table [value]="getSubscriptionsByCategoryArray()" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>Categoria</th>
                  <th class="text-right">Conteggio</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-item>
                <tr>
                  <td>
                    <p-tag [value]="item.category" severity="secondary" [rounded]="true"></p-tag>
                  </td>
                  <td class="text-right">
                    <strong>{{ item.count }}</strong>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <!-- Performance Metrics -->
        <div class="col-12">
          <p-card header="Metriche di Performance" styleClass="stats-card">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Durata Media Sottoscrizione:</span>
                <span class="detail-value">
                  {{ formatDuration(stats.performance.average_subscription_duration_seconds) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Max Dimensione Coda:</span>
                <span class="detail-value">{{ stats.performance.max_queue_size_reached }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Keepalive Inviati:</span>
                <span class="detail-value">{{ stats.connection_health.keepalive_sent }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Disconnessioni Rilevate:</span>
                <span class="detail-value" [class.danger]="stats.connection_health.disconnections_detected > 0">
                  {{ stats.connection_health.disconnections_detected }}
                </span>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <div class="empty-state" *ngIf="!stats && !loading">
        <i class="pi pi-info-circle"></i>
        <p>Nessuna statistica disponibile</p>
      </div>

      <div class="empty-state" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <p>Caricamento statistiche...</p>
      </div>
    </div>
  `,
  styles: [`
    .sse-stats {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
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
      
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-content h1 i {
      font-size: 1.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-content p {
      color: var(--text-secondary);
      margin: 0.5rem 0 0 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .stat-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 1.5rem;
      transition: all 0.3s;
      height: 100%;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px var(--shadow-md);
    }

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      flex-shrink: 0;
    }

    .stat-card-primary .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-card-success .stat-icon {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
    }

    .stat-card-info .stat-icon {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }

    .stat-card-warning .stat-icon {
      background: linear-gradient(135deg, #feca57 0%, #fd79a8 100%);
      color: white;
    }

    .stat-card-danger .stat-icon {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-detail {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .stats-card {
      height: 100%;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-item.full-width {
      grid-column: 1 / -1;
    }

    .detail-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .detail-value.success {
      color: #10b981;
    }

    .detail-value.info {
      color: #3b82f6;
    }

    .detail-value.danger {
      color: #ef4444;
    }

    .key-code {
      background: var(--bg-secondary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: #667eea;
    }

    .text-right {
      text-align: right;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }

    .empty-state i {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 1.25rem;
      margin: 0;
    }

    .cursor-pointer {
      cursor: pointer;
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

    :host ::ng-deep {
      .stats-card .p-card-body {
        padding: 0;
      }

      .stats-card .p-card-content {
        padding: 1.5rem;
      }

      .p-table .p-datatable-thead > tr > th {
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        padding: 1rem;
        border: none;
      }

      .p-table .p-datatable-tbody > tr {
        background: transparent;
        transition: background 0.2s;
      }

      .p-table .p-datatable-tbody > tr:hover {
        background: var(--hover-bg);
      }

      .p-table .p-datatable-tbody > tr > td {
        padding: 1rem;
        border: none;
        border-bottom: 1px solid var(--border-color);
      }
    }
  `]
})
export class SseStatsComponent implements OnInit, OnDestroy {
  stats: SSEStats | null = null;
  loading = false;
  autoRefreshEnabled = false;
  private refreshSubscription: any;
  Object = Object;

  constructor(private oscService: OpenSecureConfService) {}

  ngOnInit() {
    this.loadStats();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadStats() {
    this.loading = true;
    this.oscService.getSseStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento delle statistiche SSE:', error);
        this.loading = false;
      }
    });
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      // Refresh ogni 5 secondi
      this.refreshSubscription = interval(5000)
        .pipe(
          startWith(0),
          switchMap(() => this.oscService.getSseStats())
        )
        .subscribe({
          next: (data) => {
            this.stats = data;
          },
          error: (error) => {
            console.error('Errore nell\'auto-refresh:', error);
          }
        });
    } else {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
      }
    }
  }

  getEventTypeArray(): Array<{ type: string; count: number }> {
    if (!this.stats) return [];
    return Object.entries(this.stats.events.by_type).map(([type, count]) => ({
      type,
      count
    }));
  }

  getSubscriptionsByKeyArray(): Array<{ key: string; count: number }> {
    if (!this.stats) return [];
    return Object.entries(this.stats.subscriptions.by_key).map(([key, count]) => ({
      key,
      count
    }));
  }

  getSubscriptionsByEnvironmentArray(): Array<{ environment: string; count: number }> {
    if (!this.stats) return [];
    return Object.entries(this.stats.subscriptions.by_environment).map(([environment, count]) => ({
      environment,
      count
    }));
  }

  getSubscriptionsByCategoryArray(): Array<{ category: string; count: number }> {
    if (!this.stats) return [];
    return Object.entries(this.stats.subscriptions.by_category).map(([category, count]) => ({
      category,
      count
    }));
  }

  getEnvironmentSeverity(environment: string): 'success' | 'info' | 'warning' | 'danger' {
    const env = environment.toLowerCase();
    if (env.includes('prod')) return 'danger';
    if (env.includes('staging')) return 'warning';
    if (env.includes('dev')) return 'info';
    return 'success';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatDuration(seconds: number): string {
    if (seconds === 0) return '0s';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
}