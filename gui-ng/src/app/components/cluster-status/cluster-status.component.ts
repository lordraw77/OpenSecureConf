import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { LanguageService } from '../../services/language.service';
import { Language, Translations } from '../../i18n/translations';

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

interface HealthCheck {
  status: string;
  node_id: string;
  timestamp?: string;
}

@Component({
  selector: 'app-cluster-status',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, TagModule, ButtonModule, TooltipModule],
  template: `
    <div class="cluster-status">

      <!-- ── Header ── -->
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1><i class="pi pi-server"></i> {{ t.cluster.title }}</h1>
            <p>{{ t.cluster.subtitle }}</p>
          </div>
          <div class="header-right">

            <!-- Countdown -->
            <div class="refresh-countdown" *ngIf="autoRefresh && !loading">
              <span class="countdown-label">{{ t.cluster.nextRefresh }}</span>
              <span class="countdown-value" [class.urgent]="countdown <= 5">{{ countdown }}s</span>
            </div>

            <!-- Toggle auto-refresh -->
            <button
              class="auto-refresh-toggle"
              [class.active]="autoRefresh"
              (click)="toggleAutoRefresh()"
              [pTooltip]="autoRefresh ? t.cluster.disableAutoRefresh : t.cluster.enableAutoRefresh"
              tooltipPosition="bottom">
              <i [class]="autoRefresh ? 'pi pi-pause-circle' : 'pi pi-play-circle'"></i>
              <span>Auto-refresh {{ autoRefresh ? t.cluster.autoRefreshOn : t.cluster.autoRefreshOff }}</span>
            </button>

            <!-- Manual refresh -->
            <p-button
              [label]="t.cluster.refresh"
              icon="pi pi-refresh"
              (onClick)="loadClusterStatus()"
              [loading]="loading">
            </p-button>

          </div>
        </div>
      </div>

      <div class="grid">

        <!-- ── Cluster Info ── -->
        <div class="col-12" *ngIf="clusterDistribution">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-sitemap"></i>
                {{ t.cluster.clusterInfo }}
              </div>
            </ng-template>
            <div class="cluster-info-grid">

              <div class="info-item">
                <span class="info-label">{{ t.cluster.clusterMode }}</span>
                <span class="mode-badge" [class.replica]="clusterDistribution.cluster_mode === 'replica'">
                  {{ clusterDistribution.cluster_mode.toUpperCase() }}
                </span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ t.cluster.nodeType }}</span>
                <p-tag
                  [value]="clusterDistribution.is_replica ? t.cluster.nodeTypeReplica : t.cluster.nodeTypeMaster"
                  [severity]="clusterDistribution.is_replica ? 'info' : 'success'"
                  [rounded]="true">
                </p-tag>
              </div>

              <div class="info-item">
                <span class="info-label">{{ t.cluster.synchronization }}</span>
                <p-tag
                  [value]="clusterDistribution.all_nodes_synced ? t.cluster.syncOk : t.cluster.syncKo"
                  [severity]="clusterDistribution.all_nodes_synced ? 'success' : 'warning'"
                  [rounded]="true">
                </p-tag>
              </div>

              <div class="info-item">
                <span class="info-label">{{ t.cluster.totalNodes }}</span>
                <span class="info-value-large">{{ clusterDistribution.nodes_distribution.length }}</span>
                <span class="info-sub">{{ t.cluster.inCluster }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ t.cluster.activeNodes }}</span>
                <span class="info-value-large"
                  [class.all-healthy]="getHealthyNodesCount() === clusterDistribution.nodes_distribution.length"
                  [class.some-down]="getHealthyNodesCount() < clusterDistribution.nodes_distribution.length">
                  {{ getHealthyNodesCount() }}
                </span>
                <span class="info-sub">{{ getAvailabilityPct() }}% {{ t.cluster.availability }}</span>
              </div>

              <div class="info-item">
                <span class="info-label">{{ t.cluster.totalKeys }}</span>
                <span class="info-value-large">{{ getTotalKeys() | number }}</span>
                <span class="info-sub">{{ clusterDistribution.nodes_distribution[0]?.keys_count | number }} {{ t.cluster.perNode }}</span>
              </div>

            </div>
          </p-card>
        </div>

        <!-- ── Health Check ── -->
        <div class="col-12">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-heart-fill"></i>
                {{ t.cluster.healthCheck }}
              </div>
            </ng-template>

            <div class="health-check" *ngIf="healthCheck">

              <div class="health-item">
                <span class="health-label">{{ t.cluster.status }}</span>
                <p-tag
                  [value]="healthCheck.status"
                  [severity]="healthCheck.status === 'healthy' ? 'success' : 'danger'"
                  [rounded]="true">
                </p-tag>
              </div>

              <div class="health-item">
                <span class="health-label">{{ t.cluster.nodeId }}</span>
                <span class="health-value mono">{{ healthCheck.node_id }}</span>
              </div>

              <div class="health-item" *ngIf="healthCheck.timestamp">
                <span class="health-label">{{ t.cluster.lastUpdate }}</span>
                <span class="health-value">{{ formatDate(healthCheck.timestamp) }}</span>
              </div>

            </div>

            <div class="health-empty" *ngIf="!healthCheck">
              <i class="pi pi-spin pi-spinner"></i> {{ t.cluster.loading }}
            </div>
          </p-card>
        </div>

        <!-- ── Nodes Table ── -->
        <div class="col-12" *ngIf="clusterDistribution">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-sitemap"></i>
                {{ t.cluster.nodesDistribution }} ({{ clusterDistribution.nodes_distribution.length }} {{ t.cluster.nodes }})
              </div>
            </ng-template>

            <p-table
              [value]="clusterDistribution.nodes_distribution"
              [tableStyle]="{ 'min-width': '100%' }"
              styleClass="p-datatable-striped">

              <ng-template pTemplate="header">
                <tr>
                  <th>{{ t.cluster.colNodeId }}</th>
                  <th style="text-align:center">{{ t.cluster.colLocal }}</th>
                  <th>{{ t.cluster.colStatus }}</th>
                  <th>{{ t.cluster.colKeys }}</th>
                  <th>{{ t.cluster.colKeysDist }}</th>
                </tr>
              </ng-template>

              <ng-template pTemplate="body" let-node>
                <tr [class.local-node]="node.is_local">

                  <td>
                    <div class="node-id-container">
                      <span class="node-id">{{ node.node_id }}</span>
                      <p-tag
                        *ngIf="node.is_local"
                        [value]="t.cluster.nodeLocal"
                        severity="contrast"
                        [rounded]="true">
                      </p-tag>
                    </div>
                  </td>

                  <td style="text-align:center">
                    <i
                      [class]="node.is_local ? 'pi pi-check-circle' : 'pi pi-circle'"
                      [style.color]="node.is_local ? '#22c55e' : '#6c757d'"
                      style="font-size: 1.25rem;">
                    </i>
                  </td>

                  <td>
                    <p-tag
                      [value]="node.is_healthy ? t.cluster.nodeHealthy : t.cluster.nodeUnhealthy"
                      [severity]="node.is_healthy ? 'success' : 'danger'"
                      [rounded]="true">
                    </p-tag>
                  </td>

                  <td>
                    <span class="keys-count">
                      <i class="pi pi-key"></i>
                      {{ node.keys_count | number }}
                    </span>
                  </td>

                  <td>
                    <div class="dist-bar-wrap">
                      <div class="dist-bar-track">
                        <div
                          class="dist-bar-fill"
                          [style.width.%]="getPerformancePercentage(node.keys_count)"
                          [style.background-color]="getPerformanceColor(node.keys_count)">
                        </div>
                      </div>
                      <span class="dist-pct">{{ getPerformancePercentage(node.keys_count) | number:'1.0-0' }}%</span>
                    </div>
                  </td>

                </tr>
              </ng-template>

              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="5" class="text-center">{{ t.cluster.noNodesFound }}</td>
                </tr>
              </ng-template>

            </p-table>
          </p-card>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .cluster-status { animation: fadeInUp 0.4s ease-out; }

    .page-header {
      margin-bottom: 1.5rem;
      background: var(--card-bg);
      padding: 1.5rem 2rem;
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
      margin: 0 0 0.35rem 0;
      font-size: 1.75rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .page-header h1 i { color: #667eea; }
    .page-header p {
      color: var(--text-secondary);
      margin: 0;
      font-size: 0.95rem;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .refresh-countdown {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .countdown-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }
    .countdown-value {
      font-size: 1.3rem;
      font-weight: 800;
      color: #22c55e;
      transition: color 0.3s;
    }
    .countdown-value.urgent { color: #ef4444; }

    .auto-refresh-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.6rem 1.25rem;
      border-radius: 50px;
      border: none;
      background: #6c757d;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      white-space: nowrap;
    }
    .auto-refresh-toggle:hover  { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .auto-refresh-toggle:active { transform: translateY(0); }
    .auto-refresh-toggle.active { background: #22c55e; box-shadow: 0 2px 10px rgba(34,197,94,0.4); }
    .auto-refresh-toggle.active:hover { box-shadow: 0 4px 16px rgba(34,197,94,0.5); }

    :host ::ng-deep .p-button {
      border-radius: 50px !important;
      font-weight: 600 !important;
      padding: 0.6rem 1.25rem !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
      transition: filter 0.2s, transform 0.1s, box-shadow 0.2s !important;
    }
    :host ::ng-deep .p-button:hover  { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; }
    :host ::ng-deep .p-button:active { transform: translateY(0); }

    .card-header-custom {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1rem;
      font-weight: 700;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.08));
    }

    .cluster-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.25rem;
      background: var(--bg-secondary);
      border-radius: 12px;
      transition: transform 0.2s, background 0.2s;
    }
    .info-item:hover { background: var(--hover-bg); transform: translateY(-2px); }
    .info-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
    }
    .info-value-large {
      font-size: 2rem;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1;
    }
    .info-value-large.all-healthy { color: #22c55e; }
    .info-value-large.some-down   { color: #f59e0b; }
    .info-sub {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .mode-badge {
      display: inline-block;
      padding: 0.35rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      background: rgba(108,126,234,0.15);
      color: #667eea;
      border: 1px solid rgba(108,126,234,0.35);
    }
    .mode-badge.replica {
      background: rgba(59,130,246,0.12);
      color: #3b82f6;
      border-color: rgba(59,130,246,0.3);
    }

    .health-check {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .health-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.25rem;
      background: var(--bg-secondary);
      border-radius: 12px;
    }
    .health-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
    }
    .health-value {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .health-value.mono { font-family: 'Courier New', monospace; }
    .health-empty {
      padding: 1rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .node-id-container { display: flex; align-items: center; gap: 0.5rem; }
    .node-id {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      font-size: 0.9rem;
      background: var(--bg-secondary);
      padding: 0.3rem 0.6rem;
      border-radius: 6px;
    }
    .local-node { background: var(--hover-bg) !important; }

    .keys-count {
      font-weight: 700;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .keys-count i { color: #667eea; }

    .dist-bar-wrap { display: flex; align-items: center; gap: 0.6rem; }
    .dist-bar-track { flex: 1; height: 10px; background: var(--bg-secondary); border-radius: 10px; overflow: hidden; }
    .dist-bar-fill  { height: 100%; background: #22c55e; border-radius: 10px; box-shadow: 0 0 6px rgba(34,197,94,0.5); transition: width 0.5s ease; }
    .dist-pct { min-width: 36px; font-size: 0.8rem; font-weight: 700; color: #22c55e; text-align: right; }

    .text-center { text-align: center; padding: 2rem; color: var(--text-secondary); }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
  `]
})
export class ClusterStatusComponent implements OnInit, OnDestroy {
  clusterDistribution: ClusterDistribution | null = null;
  healthCheck: HealthCheck | null = null;
  loading = false;

  countdown   = 30;
  autoRefresh = true;

  t!: Translations;

  private countdownInterval: any;
  private langSub!: Subscription;

  constructor(
    private oscService:  OpenSecureConfService,
    private langService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.t = this.langService.getTranslations();
    this.langSub = this.langService.lang$.subscribe((lang: Language) => {
      this.t = this.langService.t(lang);
    });

    this.loadClusterStatus();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
    this.langSub?.unsubscribe();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) this.countdown = 30;
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      if (!this.autoRefresh) return;
      this.countdown--;
      if (this.countdown <= 0) {
        this.loadClusterStatus();
        this.countdown = 30;
      }
    }, 1000);
  }

  loadClusterStatus(): void {
    this.loading  = true;
    this.countdown = 30;

    this.oscService.healthCheck().subscribe({
      next: (health) => {
        this.healthCheck = { ...health, timestamp: new Date().toISOString() };
      },
      error: (err) => console.error('Health check failed:', err),
    });

    this.oscService.getClusterDistribution().subscribe({
      next: (distribution) => {
        this.clusterDistribution = distribution;
        this.loading = false;
      },
      error: (err) => {
        console.error('Cluster distribution failed:', err);
        this.loading = false;
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getHealthyNodesCount(): number {
    return this.clusterDistribution?.nodes_distribution.filter(n => n.is_healthy).length ?? 0;
  }

  getAvailabilityPct(): number {
    if (!this.clusterDistribution) return 0;
    const total = this.clusterDistribution.nodes_distribution.length;
    return total === 0 ? 0 : Math.round((this.getHealthyNodesCount() / total) * 100);
  }

  getTotalKeys(): number {
    return this.clusterDistribution?.nodes_distribution.reduce((s, n) => s + n.keys_count, 0) ?? 0;
  }

  getPerformancePercentage(keys: number): number {
    if (!this.clusterDistribution) return 0;
    const max = Math.max(...this.clusterDistribution.nodes_distribution.map(n => n.keys_count), 1);
    return (keys / max) * 100;
  }

  getPerformanceColor(keys: number): string {
    const pct = this.getPerformancePercentage(keys);
    if (pct >= 80) return '#22c55e';
    if (pct >= 50) return '#3b82f6';
    if (pct >= 20) return '#f59e0b';
    return '#6c757d';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(this.langService.getCurrentLang());
  }
}