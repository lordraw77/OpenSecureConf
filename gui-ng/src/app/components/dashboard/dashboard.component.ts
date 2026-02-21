import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { LanguageService } from '../../services/language.service';
import { Language, Translations } from '../../i18n/translations';

interface ServiceInfo {
  service: string;
  version: string;
  cluster_enabled: boolean;
  [key: string]: any;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, TagModule],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <h1>
          <i class="pi pi-chart-line"></i>
          {{ t.nav.dashboard }}
        </h1>
        <p>{{ t.dashboard.subtitle }}</p>
      </div>

      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card stat-card-primary">
            <div class="stat-icon">
              <i class="pi pi-database"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalConfigs }}</div>
              <div class="stat-label">{{ t.dashboard.totalConfigs }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card stat-card-success">
            <div class="stat-icon">
              <i class="pi pi-tag"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalCategories }}</div>
              <div class="stat-label">{{ t.dashboard.categories }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card stat-card-info">
            <div class="stat-icon">
              <i class="pi pi-sitemap"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalEnvironments }}</div>
              <div class="stat-label">{{ t.dashboard.environments }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card" [class.stat-card-success]="clusterEnabled" [class.stat-card-warning]="!clusterEnabled">
            <div class="stat-icon">
              <i class="pi pi-server"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ clusterEnabled ? t.dashboard.clusterEnabled : t.dashboard.clusterDisabled }}</div>
              <div class="stat-label">{{ t.dashboard.cluster }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid mt-4" *ngIf="serviceInfo">
        <div class="col-12">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-info-circle"></i>
                {{ t.dashboard.serviceInfo }}
              </div>
            </ng-template>
            <div class="service-info-grid">
              <div class="service-info-item">
                <div class="info-label">{{ t.dashboard.service }}</div>
                <div class="info-value">{{ serviceInfo.service }}</div>
              </div>
              <div class="service-info-item">
                <div class="info-label">{{ t.dashboard.version }}</div>
                <div class="info-value">{{ serviceInfo.version }}</div>
              </div>
              <div class="service-info-item">
                <div class="info-label">{{ t.dashboard.cluster }}</div>
                <p-tag
                  [value]="clusterEnabled ? t.dashboard.clusterEnabled : t.dashboard.clusterDisabled"
                  [severity]="clusterEnabled ? 'success' : 'secondary'"
                  [rounded]="true">
                </p-tag>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <div class="grid mt-4">
        <div class="col-12 lg:col-6">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-tag"></i>
                {{ t.dashboard.configsByCategory }} ({{ categoryStats.length }})
              </div>
            </ng-template>
            <div *ngIf="categoryStats.length > 0">
              <p-table
                [value]="categoryStats"
                [tableStyle]="{ 'min-width': '100%' }"
                [scrollable]="true"
                scrollHeight="400px">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ t.dashboard.colCategory }}</th>
                    <th class="text-right">{{ t.dashboard.colCount }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-stat>
                  <tr>
                    <td>
                      <span
                        class="custom-tag"
                        [style.background-color]="getColorForValue(stat.category)"
                        [style.color]="getTextColor(getColorForValue(stat.category))">
                        {{ stat.category || t.dashboard.noCategory }}
                      </span>
                    </td>
                    <td class="text-right">
                      <span class="count-badge">{{ stat.count }}</span>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
            <div *ngIf="categoryStats.length === 0" class="empty-message">
              <i class="pi pi-inbox empty-icon"></i>
              <p>{{ t.dashboard.emptyCategoryMsg }}</p>
            </div>
          </p-card>
        </div>

        <div class="col-12 lg:col-6">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-sitemap"></i>
                {{ t.dashboard.configsByEnvironment }} ({{ environmentStats.length }})
              </div>
            </ng-template>
            <div *ngIf="environmentStats.length > 0">
              <p-table
                [value]="environmentStats"
                [tableStyle]="{ 'min-width': '100%' }"
                [scrollable]="true"
                scrollHeight="400px">
                <ng-template pTemplate="header">
                  <tr>
                    <th>{{ t.dashboard.colEnvironment }}</th>
                    <th class="text-right">{{ t.dashboard.colCount }}</th>
                  </tr>
                </ng-template>
                <ng-template pTemplate="body" let-stat>
                  <tr>
                    <td>
                      <span
                        class="custom-tag"
                        [style.background-color]="getColorForValue(stat.environment)"
                        [style.color]="getTextColor(getColorForValue(stat.environment))">
                        {{ stat.environment || t.dashboard.noEnvironment }}
                      </span>
                    </td>
                    <td class="text-right">
                      <span class="count-badge">{{ stat.count }}</span>
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
            <div *ngIf="environmentStats.length === 0" class="empty-message">
              <i class="pi pi-inbox empty-icon"></i>
              <p>{{ t.dashboard.emptyEnvironmentMsg }}</p>
            </div>
          </p-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      animation: fadeInUp 0.5s ease-out;
    }

    .page-header {
      margin-bottom: 2rem;
      background: var(--card-bg);
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 20px var(--shadow-sm);
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

    .stat-card {
      background: var(--card-bg);
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 20px var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 1.5rem;
      transition: all 0.3s;
      border-left: 4px solid #667eea;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px var(--shadow-md);
    }

    .stat-card-primary {
      border-left-color: #667eea;
    }

    .stat-card-primary .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .stat-card-success {
      border-left-color: #22c55e;
    }

    .stat-card-success .stat-icon {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    }

    .stat-card-info {
      border-left-color: #3b82f6;
    }

    .stat-card-info .stat-icon {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }

    .stat-card-warning {
      border-left-color: #f59e0b;
    }

    .stat-card-warning .stat-icon {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    .stat-icon {
      width: 70px;
      height: 70px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: white;
      flex-shrink: 0;
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
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 500;
    }

    .card-header-custom {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .service-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: var(--bg-secondary);
      border-radius: 12px;
      transition: all 0.2s;
    }

    .info-item:hover {
      background: var(--hover-bg);
      transform: translateX(4px);
    }

    .info-icon {
      font-size: 1.75rem;
      color: #667eea;
      margin-top: 0.25rem;
    }

    .info-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .info-value {
      color: var(--text-primary);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .custom-tag {
      display: inline-block;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.2s;
    }

    .custom-tag:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .text-right {
      text-align: right;
    }

    .count-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 20px;
      font-weight: 600;
      font-size: 1rem;
    }

    .empty-message {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 3rem;
      color: var(--text-tertiary);
      margin-bottom: 1rem;
    }

    .empty-message p {
      margin: 0;
      font-size: 1.1rem;
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
export class DashboardComponent implements OnInit, OnDestroy {
  serviceInfo: ServiceInfo | null = null;
  totalConfigs = 0;
  totalCategories = 0;
  totalEnvironments = 0;
  clusterEnabled = false;
  categories: string[] = [];
  environments: string[] = [];
  categoryStats: Array<{ category: string; count: number }> = [];
  environmentStats: Array<{ environment: string; count: number }> = [];

  t!: Translations;
  private langSub!: Subscription;

  constructor(
    private oscService: OpenSecureConfService,
    private langService: LanguageService
  ) {}

  ngOnInit() {
    // Inizializza le traduzioni e si aggiorna al cambio lingua
    this.t = this.langService.getTranslations();
    this.langSub = this.langService.lang$.subscribe((lang: Language) => {
      this.t = this.langService.t(lang);
    });

    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
  }

  getColorForValue(value: string): string {
    if (!value) return '#6c757d';

    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    hash = hash >>> 0;

    const colors = [
      '#667eea', '#4facfe', '#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#0ea5e9', '#06b6d4',
      '#43e97b', '#22c55e', '#16a34a', '#15803d', '#10b981', '#14b8a6', '#1dd1a1', '#00b894',
      '#5f27cd', '#6c5ce7', '#a29bfe', '#764ba2', '#f093fb', '#fa709a', '#fd79a8', '#ec4899',
      '#feca57', '#fdcb6e', '#f59e0b', '#d97706', '#fb923c', '#f97316', '#ff6348', '#fbbf24',
      '#ff7675', '#ef4444', '#dc2626', '#b91c1c',
      '#00d2d3', '#55efc4', '#2dd4bf', '#14b8a6',
      '#fab1a0', '#ffeaa7', '#dfe6e9', '#b2bec3'
    ];

    const index = hash % colors.length;
    return colors[index];
  }

  getTextColor(backgroundColor: string): string {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  private async loadDashboardData() {
    try {
      this.oscService.getInfo().subscribe({
        next: (info) => {
          this.serviceInfo = info as ServiceInfo;
          this.clusterEnabled = info.cluster_enabled === true;
          console.log('Service info loaded. Cluster enabled:', this.clusterEnabled);
        },
        error: (err) => {
          console.error('Error loading service info:', err);
          this.clusterEnabled = false;
        }
      });

      this.oscService.getClusterDistribution().subscribe({
        next: (distribution) => {
          console.log('Cluster distribution loaded:', distribution);
        },
        error: () => {
          console.log('Cluster distribution not available (expected if cluster is disabled)');
        }
      });

      this.oscService.listConfigs().subscribe({
        next: (configs) => {
          this.totalConfigs = configs.length;

          const categoryMap = new Map<string, number>();
          const environmentMap = new Map<string, number>();

          configs.forEach(config => {
            const cat = config.category || 'uncategorized';
            const env = config.environment || 'default';

            categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
            environmentMap.set(env, (environmentMap.get(env) || 0) + 1);
          });

          this.categoryStats = Array.from(categoryMap.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);

          this.environmentStats = Array.from(environmentMap.entries())
            .map(([environment, count]) => ({ environment, count }))
            .sort((a, b) => b.count - a.count);
        },
        error: (err) => console.error('Error loading configs:', err)
      });

      this.oscService.listCategories().subscribe({
        next: (cats) => {
          this.categories = cats;
          this.totalCategories = cats.length;
        },
        error: (err) => console.error('Error loading categories:', err)
      });

      this.oscService.listEnvironments().subscribe({
        next: (envs) => {
          this.environments = envs;
          this.totalEnvironments = envs.length;
        },
        error: (err) => console.error('Error loading environments:', err)
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }
}