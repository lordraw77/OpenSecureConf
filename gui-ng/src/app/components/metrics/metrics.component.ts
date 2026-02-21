import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate } from '@angular/animations';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { LanguageService } from '../../services/language.service';
import { Language, Translations } from '../../i18n/translations';

interface ParsedMetric {
  name: string;
  type: string;
  help: string;
  values: Array<{
    labels: Record<string, string>;
    value: number;
  }>;
}

/** Stable key used to track group identity across language changes */
type GroupKey = 'http' | 'configs' | 'cluster' | 'encryption' | 'errors';

interface MetricGroup {
  key:       GroupKey;
  title:     string;
  icon:      string;
  metrics:   ParsedMetric[];
  color:     string;
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
    ProgressBarModule,
  ],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: '0', opacity: '0', overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: '1' })),
      ]),
      transition(':leave', [
        style({ height: '*', opacity: '1', overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: '0', opacity: '0' })),
      ]),
    ]),
  ],
  template: `
    <div class="metrics-container">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>
              <i class="pi pi-chart-bar"></i>
              {{ t.metrics.title }}
            </h1>
            <p>{{ t.metrics.subtitle }}</p>
          </div>
          <div class="header-actions">
            <p-button
              icon="pi pi-refresh"
              [label]="t.metrics.refresh"
              (onClick)="loadMetrics()"
              [loading]="loading">
            </p-button>
            <p-tag
              [value]="autoRefreshEnabled ? t.metrics.autoRefreshOn : t.metrics.autoRefreshOff"
              [severity]="autoRefreshEnabled ? 'success' : 'secondary'"
              [rounded]="true"
              styleClass="cursor-pointer"
              (click)="toggleAutoRefresh()"
              [pTooltip]="autoRefreshEnabled ? t.metrics.autoRefreshTooltipDisable : t.metrics.autoRefreshTooltipEnable">
            </p-tag>
          </div>
        </div>
      </div>

      <div class="metrics-grid" *ngIf="!loading && metricGroups.length > 0">

        <!-- Summary KPI Cards -->
        <div class="summary-cards">
          <div class="stat-card http-card">
            <div class="stat-icon"><i class="pi pi-globe"></i></div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalHttpRequests() }}</div>
              <div class="stat-label">{{ t.metrics.kpiHttpRequests }}</div>
            </div>
          </div>

          <div class="stat-card config-card">
            <div class="stat-icon"><i class="pi pi-database"></i></div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalConfigs() }}</div>
              <div class="stat-label">{{ t.metrics.kpiTotalConfigs }}</div>
            </div>
          </div>

          <div class="stat-card encrypt-card">
            <div class="stat-icon"><i class="pi pi-lock"></i></div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalEncryptions() }}</div>
              <div class="stat-label">{{ t.metrics.kpiEncryptionOps }}</div>
            </div>
          </div>

          <div class="stat-card error-card">
            <div class="stat-icon"><i class="pi pi-exclamation-triangle"></i></div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalErrors() }}</div>
              <div class="stat-label">{{ t.metrics.kpiApiErrors }}</div>
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

            <div [@slideDown] *ngIf="!group.collapsed" class="metrics-list">
              <div class="metric-item" *ngFor="let metric of group.metrics">
                <div class="metric-header">
                  <h3>{{ formatMetricName(metric.name) }}</h3>
                  <p-tag [value]="metric.type" severity="secondary" [rounded]="true"></p-tag>
                </div>
                <p class="metric-help">{{ metric.help }}</p>
                <div class="metric-values" *ngIf="metric.values.length > 0">
                  <p-table
                    [value]="metric.values"
                    [tableStyle]="{ 'min-width': '100%' }"
                    [scrollable]="metric.values.length > 10"
                    [scrollHeight]="metric.values.length > 10 ? '400px' : 'auto'">
                    <ng-template pTemplate="header">
                      <tr>
                        <th *ngFor="let label of getLabels(metric.values)">
                          {{ formatLabel(label) }}
                        </th>
                        <th class="text-right">{{ t.metrics.colValue }}</th>
                      </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-item>
                      <tr>
                        <td *ngFor="let label of getLabels(metric.values)">
                          <span *ngIf="item.labels[label]"  class="label-value">{{ item.labels[label] }}</span>
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
        <p>{{ t.metrics.noMetrics }}</p>
      </div>

      <div class="empty-state" *ngIf="loading">
        <i class="pi pi-spin pi-spinner"></i>
        <p>{{ t.metrics.loadingMetrics }}</p>
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

    .page-header h1 i { color: #667eea; }

    .page-header p {
      color: var(--text-secondary);
      margin: 0;
      font-size: 1.1rem;
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

    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px var(--shadow-md); }

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

    .http-card    .stat-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .config-card  .stat-icon { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; }
    .encrypt-card .stat-icon { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; }
    .error-card   .stat-icon { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; }

    .stat-content { flex: 1; }
    .stat-value { font-size: 2.5rem; font-weight: 700; color: var(--text-primary); line-height: 1; margin-bottom: 0.5rem; }
    .stat-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

    .metric-group { width: 100%; }

    .group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      color: white;
      font-size: 1.25rem;
      font-weight: 600;
      border-radius: 12px 12px 0 0;
      transition: filter 0.3s ease;
      user-select: none;
    }

    .group-header:hover { filter: brightness(1.1); }

    .header-left { display: flex; align-items: center; gap: 1rem; }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .collapse-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      transition: background 0.2s;
    }

    .collapse-icon:hover { background: rgba(255,255,255,0.3); }

    .metrics-list {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 1.5rem;
      overflow: hidden;
    }

    .metric-item {
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 2rem;
    }

    .metric-item:last-child { border-bottom: none; padding-bottom: 0; }

    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .metric-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary); }

    .metric-help { color: var(--text-secondary); margin: 0 0 1rem 0; font-size: 0.875rem; }

    .metric-values { margin-top: 1rem; }

    .label-value {
      padding: 0.25rem 0.5rem;
      background: var(--bg-secondary);
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }

    .label-empty { color: var(--text-tertiary); }

    .value-display { font-size: 1rem; color: var(--text-primary); }

    .text-right { text-align: right; }

    .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-secondary); }
    .empty-state i { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
    .empty-state p { font-size: 1.25rem; margin: 0; }

    .cursor-pointer { cursor: pointer; }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0);    }
    }

    :host ::ng-deep {
      .metric-card .p-card-body    { padding: 0; }
      .metric-card .p-card-content { padding: 0; }

      .p-table .p-datatable-thead > tr > th {
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        padding: 1rem;
        border: none;
      }

      .p-table .p-datatable-tbody > tr { background: transparent; transition: background 0.2s; }
      .p-table .p-datatable-tbody > tr:hover { background: var(--hover-bg); }
      .p-table .p-datatable-tbody > tr > td { padding: 1rem; border: none; border-bottom: 1px solid var(--border-color); }
    }
  `]
})
export class MetricsComponent implements OnInit, OnDestroy {
  metricGroups: MetricGroup[] = [];
  loading = false;
  autoRefreshEnabled = false;

  t!: Translations;

  private refreshSubscription: Subscription | null = null;
  private langSub!: Subscription;

  constructor(
    private oscService:  OpenSecureConfService,
    private langService: LanguageService,
  ) {}

  ngOnInit() {
    this.t = this.langService.getTranslations();
    this.langSub = this.langService.lang$.subscribe((lang: Language) => {
      this.t = this.langService.t(lang);
      // Refresh group titles reactively (keeping collapsed state via key)
      this.updateGroupTitles();
    });

    this.loadMetrics();
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
    this.langSub?.unsubscribe();
  }

  loadMetrics() {
    this.loading = true;
    this.oscService.getMetrics().subscribe({
      next: (data: string) => {
        const parsed = this.parseMetrics(data);
        this.organizeMetrics(parsed);
        this.loading = false;
      },
      error: (err) => {
        console.error('Errore nel caricamento delle metriche:', err);
        this.loading = false;
      },
    });
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;

    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(10000)
        .pipe(
          startWith(0),
          switchMap(() => this.oscService.getMetrics()),
        )
        .subscribe({
          next:  (data: string) => { const p = this.parseMetrics(data); this.organizeMetrics(p); },
          error: (err) => console.error('Errore nell\'auto-refresh:', err),
        });
    } else {
      this.refreshSubscription?.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  toggleGroup(group: MetricGroup) {
    group.collapsed = !group.collapsed;
  }

  // ── Parsing ───────────────────────────────────────────────────────────────

  private parseMetrics(text: string): ParsedMetric[] {
    const metrics = new Map<string, ParsedMetric>();
    let currentType = '';
    let currentHelp = '';

    for (const line of text.split('\n')) {
      if (line.startsWith('# HELP')) {
        currentHelp = line.substring(7).split(' ').slice(1).join(' ');
      } else if (line.startsWith('# TYPE')) {
        currentType = line.split(' ')[3] || '';
      } else if (line.trim() && !line.startsWith('#')) {
        const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+(.+)$/);
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
            metrics.set(name, { name, type: currentType, help: currentHelp, values: [] });
          }
          metrics.get(name)!.values.push({ labels, value });
        }
      }
    }

    return Array.from(metrics.values());
  }

  // ── Grouping ──────────────────────────────────────────────────────────────

  /** Map from GroupKey to the group-title translation accessor */
  private groupTitle(key: GroupKey): string {
    const map: Record<GroupKey, string> = {
      http:       this.t.metrics.groupHttp,
      configs:    this.t.metrics.groupConfigs,
      cluster:    this.t.metrics.groupCluster,
      encryption: this.t.metrics.groupEncryption,
      errors:     this.t.metrics.groupErrors,
    };
    return map[key];
  }

  organizeMetrics(metrics: ParsedMetric[]) {
    const definitions: Array<{ key: GroupKey; icon: string; filter: (m: ParsedMetric) => boolean; color: string }> = [
      { key: 'http',       icon: 'pi-globe',               filter: m => m.name.includes('http_request'),                      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      { key: 'configs',    icon: 'pi-cog',                 filter: m => m.name.includes('config_') && !m.name.includes('http'), color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
      { key: 'cluster',    icon: 'pi-server',              filter: m => m.name.includes('cluster'),                            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
      { key: 'encryption', icon: 'pi-lock',                filter: m => m.name.includes('encryption'),                         color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
      { key: 'errors',     icon: 'pi-exclamation-triangle', filter: m => m.name.includes('error'),                             color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' },
    ];

    const newGroups: MetricGroup[] = definitions
      .map(def => ({
        key:       def.key,
        title:     this.groupTitle(def.key),
        icon:      def.icon,
        metrics:   metrics.filter(def.filter),
        color:     def.color,
        collapsed: true,
      }))
      .filter(g => g.metrics.length > 0);

    // Preserve collapsed state using stable key
    if (this.metricGroups.length > 0) {
      newGroups.forEach(ng => {
        const existing = this.metricGroups.find(g => g.key === ng.key);
        if (existing) ng.collapsed = existing.collapsed;
      });
    }

    this.metricGroups = newGroups;
  }

  /** Called on language change: only update titles, keep everything else */
  private updateGroupTitles() {
    this.metricGroups.forEach(g => {
      g.title = this.groupTitle(g.key);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getLabels(values: Array<{ labels: Record<string, string> }>): string[] {
    const labelSet = new Set<string>();
    values.forEach(v => Object.keys(v.labels).forEach(k => labelSet.add(k)));
    return Array.from(labelSet).sort();
  }

  formatMetricName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatLabel(label: string): string {
    return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatValue(value: number): string {
    if (Number.isInteger(value)) {
      return value.toLocaleString(this.langService.getCurrentLang());
    }
    return value.toFixed(6);
  }

  getTotalHttpRequests(): number {
    const m = this.findMetric('osc_http_requests_total');
    return m ? this.sumMetricValues(m) : 0;
  }

  getTotalConfigs(): number {
    const m = this.findMetric('osc_config_entries_total');
    return m ? (m.values[0]?.value || 0) : 0;
  }

  getTotalEncryptions(): number {
    const m = this.findMetric('osc_encryption_operations_total');
    return m ? this.sumMetricValues(m) : 0;
  }

  getTotalErrors(): number {
    const m = this.findMetric('osc_api_errors_total');
    return m ? this.sumMetricValues(m) : 0;
  }

  private findMetric(name: string): ParsedMetric | undefined {
    for (const group of this.metricGroups) {
      const m = group.metrics.find(x => x.name === name);
      if (m) return m;
    }
    return undefined;
  }

  private sumMetricValues(metric: ParsedMetric): number {
    return metric.values.reduce((sum, v) => sum + v.value, 0);
  }
}