import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

interface ParsedMetric {
  name: string;
  type: string;
  help: string;
  values: Array<{
    labels: Record<string, string>;
    value: number;
  }>;
}

interface MetricGroup {
  title: string;
  icon: string;
  metrics: ParsedMetric[];
  color: string;
  collapsed: boolean;
}

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    TooltipModule,
    ProgressBarModule
  ],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: '0', overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: '1' }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: '1', overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: '0', opacity: '0' }))
      ])
    ])
  ],
  template: `
    <div class="metrics-container">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>
              <i class="pi pi-chart-bar"></i>
              Metriche 
            </h1>
            <p>Monitoring delle performance e statistiche del sistema</p>
          </div>
          <div class="header-actions">
            <p-button 
              icon="pi pi-refresh" 
              label="Aggiorna"
              (onClick)="loadMetrics()"
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

      <div class="metrics-grid" *ngIf="!loading && metricGroups.length > 0">
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="stat-card http-card">
            <div class="stat-icon">
              <i class="pi pi-globe"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalHttpRequests() }}</div>
              <div class="stat-label">Richieste HTTP Totali</div>
            </div>
          </div>

          <div class="stat-card config-card">
            <div class="stat-icon">
              <i class="pi pi-database"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalConfigs() }}</div>
              <div class="stat-label">Configurazioni Totali</div>
            </div>
          </div>

          <div class="stat-card encrypt-card">
            <div class="stat-icon">
              <i class="pi pi-lock"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalEncryptions() }}</div>
              <div class="stat-label">Operazioni Cifratura</div>
            </div>
          </div>

          <div class="stat-card error-card">
            <div class="stat-icon">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalErrors() }}</div>
              <div class="stat-label">Errori API</div>
            </div>
          </div>
        </div>

        <!-- Metric Groups -->
        <div class="metric-group" *ngFor="let group of metricGroups">
          <p-card styleClass="metric-card">
            <ng-template pTemplate="header">
              <div class="group-header" [style.background]="group.color" (click)="toggleGroup(group)" style="cursor: pointer;">
                <div class="header-left">
                  <div class="header-icon">
                    <i [class]="'pi ' + group.icon"></i>
                  </div>
                  <span>{{ group.title }}</span>
                </div>
                <div class="collapse-icon">
                  <i [class]="group.collapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"></i>
                </div>
              </div>
            </ng-template>

            <div class="metrics-list" *ngIf="!group.collapsed" [@slideDown]>
              <div class="metric-item" *ngFor="let metric of group.metrics">
                <div class="metric-header">
                  <h3>{{ formatMetricName(metric.name) }}</h3>
                  <p-tag 
                    [value]="metric.type" 
                    severity="info" 
                    [rounded]="true">
                  </p-tag>
                </div>
                <p class="metric-help">{{ metric.help }}</p>

                <div class="metric-values">
                  <p-table 
                    [value]="metric.values" 
                    [tableStyle]="{ 'min-width': '100%' }"
                    [scrollable]="true"
                    [scrollHeight]="metric.values.length > 10 ? '400px' : 'auto'">
                    <ng-template pTemplate="header">
                      <tr>
                        <th *ngFor="let label of getLabels(metric.values)">
                          {{ formatLabel(label) }}
                        </th>
                        <th class="text-right">Valore</th>
                      </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-item>
                      <tr>
                        <td *ngFor="let label of getLabels(metric.values)">
                          <span *ngIf="item.labels[label]" class="label-value">
                            {{ item.labels[label] }}
                          </span>
                          <span *ngIf="!item.labels[label]" class="label-empty">-</span>
                        </td>
                        <td class="text-right">
                          <strong class="value-display">{{ formatValue(item.value) }}</strong>
                        </td>
                      </tr>
                    </ng-template>
                  </p-table>
                </div>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && metricGroups.length === 0">
        <i class="pi pi-info-circle"></i>
        <p>Nessuna metrica disponibile</p>
      </div>

      <div class="empty-state" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <p>Caricamento metriche...</p>
      </div>
    </div>
  `,
  styles: [`
    .metrics-container {
      padding: 2rem;
      max-width: 1600px;
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

    .metrics-grid {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
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

    .http-card .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .config-card .stat-icon {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
    }

    .encrypt-card .stat-icon {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: white;
    }

    .error-card .stat-icon {
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
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-group {
      width: 100%;
    }

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 1.25rem;
      font-weight: 600;
      border-radius: 12px 12px 0 0;
      transition: all 0.3s ease;
      user-select: none;
    }

    .group-header:hover {
      filter: brightness(1.1);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .collapse-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      transition: transform 0.3s ease;
    }

    .collapse-icon:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .metrics-list {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 1.5rem;
    }

    .metric-item {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 2rem;
    }

    .metric-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .metric-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .metric-help {
      color: var(--text-secondary);
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
    }

    .metric-values {
      margin-top: 1rem;
    }

    .label-value {
      padding: 0.25rem 0.5rem;
      background: var(--bg-secondary);
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .label-empty {
      color: var(--text-secondary);
      font-style: italic;
    }

    .value-display {
      font-size: 1.1rem;
      font-weight: 700;
      color: #667eea;
    }

    .text-right {
      text-align: right;
    }

    .cursor-pointer {
      cursor: pointer;
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
      .metric-card {
        height: 100%;
      }

      .metric-card .p-card-body {
        padding: 0;
      }

      .metric-card .p-card-content {
        padding: 0;
      }

      .p-table .p-datatable-thead > tr > th {
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        padding: 1rem;
        border: none;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .p-table .p-datatable-tbody > tr {
        background: transparent;
        transition: background 0.2s;
      }

      .p-table .p-datatable-tbody > tr:hover {
        background: var(--hover-bg);
      }

      .p-table .p-datatable-tbody > tr > td {
        padding: 0.75rem 1rem;
        border: none;
        border-bottom: 1px solid var(--border-color);
      }

      .p-table .p-datatable-scrollable-body {
        scrollbar-width: thin;
        scrollbar-color: var(--border-color) transparent;
      }

      .p-table .p-datatable-scrollable-body::-webkit-scrollbar {
        width: 8px;
      }

      .p-table .p-datatable-scrollable-body::-webkit-scrollbar-track {
        background: transparent;
      }

      .p-table .p-datatable-scrollable-body::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
      }

      .p-table .p-datatable-scrollable-body::-webkit-scrollbar-thumb:hover {
        background: #667eea;
      }
    }
  `]
})
export class MetricsComponent implements OnInit, OnDestroy {
  loading = false;
  autoRefreshEnabled = false;
  metricGroups: MetricGroup[] = [];
  private refreshSubscription: any;

  constructor(private oscService: OpenSecureConfService) {}

  ngOnInit() {
    this.loadMetrics();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadMetrics() {
    this.loading = true;
    this.oscService.getMetrics().subscribe({
      next: (data: string) => {
        const parsed = this.parsePrometheusMetrics(data);
        this.organizeMetrics(parsed);
        this.loading = false;
      },
      error: (error) => {
        console.error('Errore nel caricamento delle metriche:', error);
        this.loading = false;
      }
    });
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(10000)
        .pipe(
          startWith(0),
          switchMap(() => this.oscService.getMetrics())
        )
        .subscribe({
          next: (data: string) => {
            const parsed = this.parsePrometheusMetrics(data);
            this.organizeMetrics(parsed);
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

  toggleGroup(group: MetricGroup) {
    group.collapsed = !group.collapsed;
  }

  parsePrometheusMetrics(text: string): ParsedMetric[] {
    const lines = text.split('\n');
    const metrics: Map<string, ParsedMetric> = new Map();
    
    let currentMetric: string | null = null;
    let currentHelp = '';
    let currentType = '';

    for (const line of lines) {
      if (line.startsWith('# HELP')) {
        const parts = line.split(' ');
        currentMetric = parts[2];
        currentHelp = parts.slice(3).join(' ');
      } else if (line.startsWith('# TYPE')) {
        const parts = line.split(' ');
        currentType = parts[3];
      } else if (line.trim() && !line.startsWith('#') && currentMetric) {
        const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*?)(?:\{([^}]*)\})?\s+(.+)$/);
        if (match) {
          const [, name, labelsStr, valueStr] = match;
          const value = parseFloat(valueStr);
          
          const labels: Record<string, string> = {};
          if (labelsStr) {
            const labelPairs = labelsStr.match(/(\w+)="([^"]*)"/g) || [];
            labelPairs.forEach(pair => {
              const [key, val] = pair.split('=');
              labels[key] = val.replace(/"/g, '');
            });
          }

          if (!metrics.has(name)) {
            metrics.set(name, {
              name,
              type: currentType,
              help: currentHelp,
              values: []
            });
          }

          metrics.get(name)!.values.push({ labels, value });
        }
      }
    }

    return Array.from(metrics.values());
  }

  organizeMetrics(metrics: ParsedMetric[]) {
    const groups: MetricGroup[] = [
      {
        title: 'Richieste HTTP',
        icon: 'pi-globe',
        metrics: metrics.filter(m => m.name.includes('http_request')),
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        collapsed: true
      },
      {
        title: 'Operazioni Configurazioni',
        icon: 'pi-cog',
        metrics: metrics.filter(m => m.name.includes('config_') && !m.name.includes('http')),
        color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        collapsed: true
      },
      {
        title: 'Cluster',
        icon: 'pi-server',
        metrics: metrics.filter(m => m.name.includes('cluster')),
        color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        collapsed: true
      },
      {
        title: 'Cifratura',
        icon: 'pi-lock',
        metrics: metrics.filter(m => m.name.includes('encryption')),
        color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        collapsed: true
      },
      {
        title: 'Errori API',
        icon: 'pi-exclamation-triangle',
        metrics: metrics.filter(m => m.name.includes('error')),
        color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
        collapsed: true
      }
    ];

    this.metricGroups = groups.filter(g => g.metrics.length > 0);
  }

  getLabels(values: Array<{ labels: Record<string, string> }>): string[] {
    const labelSet = new Set<string>();
    values.forEach(v => {
      Object.keys(v.labels).forEach(key => labelSet.add(key));
    });
    return Array.from(labelSet).sort();
  }

  formatMetricName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatLabel(label: string): string {
    return label
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatValue(value: number): string {
    if (Number.isInteger(value)) {
      return value.toLocaleString('it-IT');
    }
    return value.toFixed(6);
  }

  getTotalHttpRequests(): number {
    const metric = this.findMetric('osc_http_requests_total');
    return metric ? this.sumMetricValues(metric) : 0;
  }

  getTotalConfigs(): number {
    const metric = this.findMetric('osc_config_entries_total');
    return metric ? metric.values[0]?.value || 0 : 0;
  }

  getTotalEncryptions(): number {
    const metric = this.findMetric('osc_encryption_operations_total');
    return metric ? this.sumMetricValues(metric) : 0;
  }

  getTotalErrors(): number {
    const metric = this.findMetric('osc_api_errors_total');
    return metric ? this.sumMetricValues(metric) : 0;
  }

  private findMetric(name: string): ParsedMetric | undefined {
    for (const group of this.metricGroups) {
      const metric = group.metrics.find(m => m.name === name);
      if (metric) return metric;
    }
    return undefined;
  }

  private sumMetricValues(metric: ParsedMetric): number {
    return metric.values.reduce((sum, v) => sum + v.value, 0);
  }
}