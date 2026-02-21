import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { LanguageService } from '../../services/language.service';
import { Language, Translations } from '../../i18n/translations';

interface ConfigEntry {
  key: string;
  value: any;
  category?: string;
  environment?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, ChartModule, CardModule, SkeletonModule, ButtonModule, TooltipModule],
  template: `
    <div class="charts-page">
      <div class="page-header">
        <div class="header-left">
          <h1>
            <i class="pi pi-chart-pie"></i>
            {{ t.charts.title }}
          </h1>
          <p>{{ t.charts.subtitle }}</p>
        </div>
        <div class="header-actions">
          <p-button
            icon="pi pi-refresh"
            [label]="t.charts.refresh"
            [outlined]="true"
            (onClick)="loadData()"
            [pTooltip]="t.charts.refreshTooltip"
            tooltipPosition="left">
          </p-button>
        </div>
      </div>

      <!-- KPI Summary -->
      <div class="kpi-row" *ngIf="!loading">
        <div class="kpi-card kpi-primary">
          <div class="kpi-icon"><i class="pi pi-database"></i></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ totalConfigs }}</div>
            <div class="kpi-label">{{ t.charts.kpiTotalConfigs }}</div>
          </div>
        </div>
        <div class="kpi-card kpi-success">
          <div class="kpi-icon"><i class="pi pi-tag"></i></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ totalCategories }}</div>
            <div class="kpi-label">{{ t.charts.kpiUniqueCategories }}</div>
          </div>
        </div>
        <div class="kpi-card kpi-info">
          <div class="kpi-icon"><i class="pi pi-sitemap"></i></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ totalEnvironments }}</div>
            <div class="kpi-label">{{ t.charts.kpiUniqueEnvironments }}</div>
          </div>
        </div>
        <div class="kpi-card kpi-warn">
          <div class="kpi-icon"><i class="pi pi-exclamation-circle"></i></div>
          <div class="kpi-body">
            <div class="kpi-value">{{ uncategorized }}</div>
            <div class="kpi-label">{{ t.charts.kpiUncategorized }}</div>
          </div>
        </div>
      </div>

      <!-- Skeleton KPI -->
      <div class="kpi-row" *ngIf="loading">
        <div class="kpi-card" *ngFor="let i of [1,2,3,4]">
          <p-skeleton height="80px" borderRadius="16px"></p-skeleton>
        </div>
      </div>

      <!-- Charts Row 1: Doughnut -->
      <div class="charts-grid">

        <div class="chart-card">
          <div class="chart-card-header">
            <i class="pi pi-chart-pie"></i>
            <span>{{ t.charts.chartByCategory }}</span>
            <span class="chart-count" *ngIf="!loading">{{ categoryData.length }} {{ t.charts.badgeCategories }}</span>
          </div>
          <div class="chart-wrapper" *ngIf="!loading && categoryChartData">
            <p-chart type="doughnut" [data]="categoryChartData" [options]="doughnutOptions" [width]="'100%'" height="320px"></p-chart>
          </div>
          <div class="chart-wrapper" *ngIf="loading">
            <p-skeleton height="320px" borderRadius="12px"></p-skeleton>
          </div>
          <div class="chart-empty" *ngIf="!loading && !categoryChartData">
            <i class="pi pi-inbox"></i>
            <p>{{ t.charts.noData }}</p>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <i class="pi pi-chart-pie"></i>
            <span>{{ t.charts.chartByEnvironment }}</span>
            <span class="chart-count" *ngIf="!loading">{{ environmentData.length }} {{ t.charts.badgeEnvironments }}</span>
          </div>
          <div class="chart-wrapper" *ngIf="!loading && environmentChartData">
            <p-chart type="doughnut" [data]="environmentChartData" [options]="doughnutOptions" [width]="'100%'" height="320px"></p-chart>
          </div>
          <div class="chart-wrapper" *ngIf="loading">
            <p-skeleton height="320px" borderRadius="12px"></p-skeleton>
          </div>
          <div class="chart-empty" *ngIf="!loading && !environmentChartData">
            <i class="pi pi-inbox"></i>
            <p>{{ t.charts.noData }}</p>
          </div>
        </div>

      </div>

      <!-- Charts Row 2: Stacked bar -->
      <div class="chart-card full-width">
        <div class="chart-card-header">
          <i class="pi pi-chart-bar"></i>
          <span>{{ t.charts.chartByEnvAndCat }}</span>
          <span class="chart-count" *ngIf="!loading">{{ t.charts.badgeDetailed }}</span>
        </div>
        <div class="chart-wrapper" *ngIf="!loading && stackedBarData">
          <p-chart type="bar" [data]="stackedBarData" [options]="stackedBarOptions" [width]="'100%'" height="380px"></p-chart>
        </div>
        <div class="chart-wrapper" *ngIf="loading">
          <p-skeleton height="380px" borderRadius="12px"></p-skeleton>
        </div>
        <div class="chart-empty" *ngIf="!loading && !stackedBarData">
          <i class="pi pi-inbox"></i>
          <p>{{ t.charts.noData }}</p>
        </div>
      </div>

      <!-- Charts Row 3: Horizontal bar -->
      <div class="chart-card full-width">
        <div class="chart-card-header">
          <i class="pi pi-sort-amount-down"></i>
          <span>{{ t.charts.chartTopCategories }}</span>
          <span class="chart-count" *ngIf="!loading">{{ t.charts.badgeSortedByCount }}</span>
        </div>
        <div class="chart-wrapper" *ngIf="!loading && horizontalBarData">
          <p-chart type="bar" [data]="horizontalBarData" [options]="horizontalBarOptions" [width]="'100%'" height="350px"></p-chart>
        </div>
        <div class="chart-wrapper" *ngIf="loading">
          <p-skeleton height="350px" borderRadius="12px"></p-skeleton>
        </div>
        <div class="chart-empty" *ngIf="!loading && !horizontalBarData">
          <i class="pi pi-inbox"></i>
          <p>{{ t.charts.noData }}</p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .charts-page {
      padding: 0;
      animation: fadeInUp 0.5s ease-out;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0);    }
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
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

    .page-header h1 i { color: #667eea; }

    .page-header p {
      color: var(--text-secondary);
      margin: 0;
      font-size: 1.1rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* KPI */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 900px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 500px) { .kpi-row { grid-template-columns: 1fr; } }

    .kpi-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      box-shadow: 0 4px 20px var(--shadow-sm);
      border-left: 4px solid #667eea;
      transition: all 0.3s;
    }

    .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px var(--shadow-md); }

    .kpi-primary { border-left-color: #667eea; }
    .kpi-success { border-left-color: #22c55e; }
    .kpi-info    { border-left-color: #3b82f6; }
    .kpi-warn    { border-left-color: #f59e0b; }

    .kpi-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
      flex-shrink: 0;
    }

    .kpi-primary .kpi-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
    .kpi-success .kpi-icon { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .kpi-info    .kpi-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .kpi-warn    .kpi-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }

    .kpi-value { font-size: 2.2rem; font-weight: 700; color: var(--text-primary); line-height: 1; margin-bottom: 0.25rem; }
    .kpi-label { font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }

    /* Charts */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

    .chart-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 4px 20px var(--shadow-sm);
      transition: box-shadow 0.3s;
    }

    .chart-card:hover { box-shadow: 0 8px 30px var(--shadow-md); }

    .chart-card.full-width { margin-bottom: 1.5rem; }

    .chart-card-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .chart-card-header i { color: #667eea; font-size: 1.25rem; }

    .chart-count {
      margin-left: auto;
      font-size: 0.8rem;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-weight: 500;
    }

    .chart-wrapper { display: flex; justify-content: center; }

    .chart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .chart-empty i { font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--text-tertiary); }
  `]
})
export class ChartsComponent implements OnInit, OnDestroy {

  loading = false;

  totalConfigs      = 0;
  totalCategories   = 0;
  totalEnvironments = 0;
  uncategorized     = 0;

  categoryData:    { label: string; count: number }[] = [];
  environmentData: { label: string; count: number }[] = [];

  categoryChartData:    any = null;
  environmentChartData: any = null;
  stackedBarData:       any = null;
  horizontalBarData:    any = null;

  doughnutOptions:      any;
  stackedBarOptions:    any;
  horizontalBarOptions: any;

  t!: Translations;
  private langSub!: Subscription;
  private cachedConfigs: any[] = [];

  private readonly PALETTE = [
    '#667eea', '#43e97b', '#f093fb', '#feca57', '#ff6348',
    '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
    '#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#e879f9',
    '#4ade80', '#facc15', '#38bdf8', '#c084fc', '#f87171',
  ];

  constructor(
    private oscService:  OpenSecureConfService,
    private langService: LanguageService,
  ) {}

  ngOnInit() {
    this.t = this.langService.getTranslations();
    this.langSub = this.langService.lang$.subscribe((lang: Language) => {
      this.t = this.langService.t(lang);
      // Rebuild charts so labels/tooltips update immediately
      if (this.cachedConfigs.length) {
        this.buildAllCharts(this.cachedConfigs);
      }
      this.initChartOptions();
    });

    this.initChartOptions();
    this.loadData();
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
  }

  initChartOptions() {
    const isDark =
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      document.body.classList.contains('dark-mode') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    const textColor = isDark ? '#e2e8f0' : '#334155';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const tooltipLabel = this.t?.charts?.tooltipConfigs ?? 'configurations';

    this.doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            padding: 16,
            font: { size: 13 },
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const pct   = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            },
          },
        },
      },
      cutout: '60%',
    };

    this.stackedBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { size: 12 }, usePointStyle: true },
        },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor } },
        y: { stacked: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
      },
    };

    this.horizontalBarOptions = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.parsed.x} ${tooltipLabel}`,
          },
        },
      },
      scales: {
        x: { ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { size: 12 } }, grid: { display: false } },
      },
    };
  }

  loadData() {
    this.loading = true;
    this.oscService.listConfigs({}).subscribe({
      next: (configs: any[]) => {
        this.cachedConfigs = configs;
        this.buildAllCharts(configs);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private buildAllCharts(configs: any[]) {
    const noEnvLabel = this.t.charts.noEnvironment;

    this.totalConfigs = configs.length;

    // Category map
    const catMap = new Map<string, number>();
    let noCategory = 0;
    configs.forEach(c => {
      const cat = c.category?.trim() || null;
      if (cat) catMap.set(cat, (catMap.get(cat) || 0) + 1);
      else noCategory++;
    });
    this.uncategorized   = noCategory;
    this.totalCategories = catMap.size;

    // Environment map
    const envMap = new Map<string, number>();
    configs.forEach(c => {
      const env = c.environment?.trim() || noEnvLabel;
      envMap.set(env, (envMap.get(env) || 0) + 1);
    });
    this.totalEnvironments = envMap.size;

    this.categoryData = [...catMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    this.environmentData = [...envMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    this.buildCategoryChart();
    this.buildEnvironmentChart();
    this.buildStackedBar(configs, noEnvLabel);
    this.buildHorizontalBar();
  }

  private buildCategoryChart() {
    if (!this.categoryData.length) { this.categoryChartData = null; return; }
    const labels = this.categoryData.map(d => this.truncate(d.label, 25));
    const data   = this.categoryData.map(d => d.count);
    const bg     = this.categoryData.map((_, i) => this.PALETTE[i % this.PALETTE.length]);
    this.categoryChartData = {
      labels,
      datasets: [{ data, backgroundColor: bg, hoverBackgroundColor: bg.map(c => c + 'cc'), borderWidth: 2, borderColor: 'transparent' }],
    };
  }

  private buildEnvironmentChart() {
    if (!this.environmentData.length) { this.environmentChartData = null; return; }
    const labels = this.environmentData.map(d => d.label);
    const data   = this.environmentData.map(d => d.count);
    const bg     = this.environmentData.map((_, i) => this.PALETTE[(i + 5) % this.PALETTE.length]);
    this.environmentChartData = {
      labels,
      datasets: [{ data, backgroundColor: bg, hoverBackgroundColor: bg.map(c => c + 'cc'), borderWidth: 2, borderColor: 'transparent' }],
    };
  }

  private buildStackedBar(configs: any[], noEnvLabel: string) {
    const envs    = this.environmentData.map(d => d.label);
    const cats    = this.categoryData.map(d => d.label);
    if (!envs.length || !cats.length) { this.stackedBarData = null; return; }

    const topCats = cats.slice(0, 10);
    const datasets = topCats.map((cat, i) => ({
      label: this.truncate(cat, 20),
      data: envs.map(env =>
        configs.filter(c =>
          (c.category?.trim() === cat) &&
          ((c.environment?.trim() || noEnvLabel) === env)
        ).length
      ),
      backgroundColor: this.PALETTE[i % this.PALETTE.length],
      borderRadius: 4,
    }));

    this.stackedBarData = { labels: envs, datasets };
  }

  private buildHorizontalBar() {
    if (!this.categoryData.length) { this.horizontalBarData = null; return; }
    const top    = this.categoryData.slice(0, 15);
    const labels = top.map(d => this.truncate(d.label, 30));
    const data   = top.map(d => d.count);
    const bg     = top.map((_, i) => this.PALETTE[i % this.PALETTE.length]);
    this.horizontalBarData = {
      labels,
      datasets: [{
        label: this.t.charts.configurations,
        data,
        backgroundColor: bg,
        borderRadius: 6,
        borderSkipped: false,
      }],
    };
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? s.substring(0, n) + '…' : s;
  }
}