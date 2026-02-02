import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { OpenSecureConfService } from '../../services/opensecureconf.service';

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
          Dashboard
        </h1>
        <p>Panoramica generale del sistema OpenSecureConf</p>
      </div>

      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card stat-card-primary">
            <div class="stat-icon">
              <i class="pi pi-database"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ totalConfigs }}</div>
              <div class="stat-label">Configurazioni Totali</div>
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
              <div class="stat-label">Categorie</div>
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
              <div class="stat-label">Ambienti</div>
            </div>
          </div>
        </div>

        <div class="col-12 md:col-6 lg:col-3">
          <div class="stat-card" [class.stat-card-success]="clusterEnabled" [class.stat-card-warning]="!clusterEnabled">
            <div class="stat-icon">
              <i class="pi pi-server"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ clusterEnabled ? 'Attivo' : 'Inattivo' }}</div>
              <div class="stat-label">Cluster</div>
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
                Informazioni Servizio
              </div>
            </ng-template>
            <div class="service-info-grid">
              <div class="info-item">
                <i class="pi pi-server info-icon"></i>
                <div>
                  <div class="info-label">Servizio</div>
                  <div class="info-value">{{ serviceInfo.service }}</div>
                </div>
              </div>
              <div class="info-item">
                <i class="pi pi-tag info-icon"></i>
                <div>
                  <div class="info-label">Versione</div>
                  <div class="info-value">{{ serviceInfo.version }}</div>
                </div>
              </div>
              <div class="info-item">
                <i class="pi pi-sitemap info-icon"></i>
                <div>
                  <div class="info-label">Cluster</div>
                  <p-tag 
                    [value]="serviceInfo.cluster_enabled ? 'Abilitato' : 'Disabilitato'" 
                    [severity]="serviceInfo.cluster_enabled ? 'success' : 'warning'"
                    [rounded]="true">
                  </p-tag>
                </div>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <div class="grid mt-4">
        <div class="col-12 lg:col-6" *ngIf="categories.length > 0">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-tag"></i>
                Configurazioni per Categoria
              </div>
            </ng-template>
            <p-table [value]="categoryStats" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>Categoria</th>
                  <th class="text-right">Conteggio</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-stat>
                <tr>
                  <td>
                    <p-tag [value]="stat.category || 'Senza categoria'" [rounded]="true"></p-tag>
                  </td>
                  <td class="text-right">
                    <span class="count-badge">{{ stat.count }}</span>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </p-card>
        </div>

        <div class="col-12 lg:col-6" *ngIf="environments.length > 0">
          <p-card>
            <ng-template pTemplate="header">
              <div class="card-header-custom">
                <i class="pi pi-sitemap"></i>
                Configurazioni per Ambiente
              </div>
            </ng-template>
            <p-table [value]="environmentStats" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>Ambiente</th>
                  <th class="text-right">Conteggio</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-stat>
                <tr>
                  <td>
                    <p-tag 
                      [value]="stat.environment || 'Senza ambiente'" 
                      [severity]="getEnvironmentSeverity(stat.environment)"
                      [rounded]="true">
                    </p-tag>
                  </td>
                  <td class="text-right">
                    <span class="count-badge">{{ stat.count }}</span>
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
export class DashboardComponent implements OnInit {
  serviceInfo: ServiceInfo | null = null;
  totalConfigs = 0;
  totalCategories = 0;
  totalEnvironments = 0;
  clusterEnabled = false;
  categories: string[] = [];
  environments: string[] = [];
  categoryStats: Array<{ category: string; count: number }> = [];
  environmentStats: Array<{ environment: string; count: number }> = [];

  constructor(private oscService: OpenSecureConfService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private async loadDashboardData() {
    try {
      this.oscService.getInfo().subscribe(info => {
        this.serviceInfo = info as ServiceInfo;
        this.clusterEnabled = (info as any).cluster_enabled || false;
      });

      this.oscService.listConfigs().subscribe(configs => {
        this.totalConfigs = configs.length;

        const categoryMap = new Map<string, number>();
        const environmentMap = new Map<string, number>();

        configs.forEach(config => {
          const cat = config.category || 'uncategorized';
          const env = config.environment || 'default';

          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
          environmentMap.set(env, (environmentMap.get(env) || 0) + 1);
        });

        this.categoryStats = Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
          count
        }));

        this.environmentStats = Array.from(environmentMap.entries()).map(([environment, count]) => ({
          environment,
          count
        }));
      });

      this.oscService.listCategories().subscribe(cats => {
        this.categories = cats;
        this.totalCategories = cats.length;
      });

      this.oscService.listEnvironments().subscribe(envs => {
        this.environments = envs;
        this.totalEnvironments = envs.length;
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  getEnvironmentSeverity(environment: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    const envLower = environment?.toLowerCase();
    if (envLower === 'production' || envLower === 'prod') return 'danger';
    if (envLower === 'staging' || envLower === 'stage') return 'warning';
    if (envLower === 'development' || envLower === 'dev') return 'info';
    return 'secondary';
  }
}
