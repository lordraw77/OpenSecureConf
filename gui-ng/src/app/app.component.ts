import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { OpenSecureConfService } from './services/opensecureconf.service';
import { ThemeService } from './services/theme.service';
import { LanguageService } from './services/language.service';
import { Language, Translations, LANGUAGES } from './i18n/translations';

const SIDEBAR_KEY = 'osc_sidebar_collapsed';

interface NavItem {
  key: keyof Translations['nav'];
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TagModule, TooltipModule],
  template: `
    <div class="layout" [class.sidebar-collapsed]="collapsed">

      <!-- ═══════════════════════════════════════
           SIDEBAR
      ═══════════════════════════════════════ -->
      <aside class="sidebar">

        <!-- Logo -->
        <div class="sidebar-logo">
          <div class="logo-icon">
            <i class="pi pi-shield"></i>
          </div>
          <span class="logo-text">OpenSecureConf</span>
        </div>

        <!-- Toggle — sempre visibile, larghezza piena -->
        <button
          class="collapse-btn"
          (click)="toggleSidebar()"
          [pTooltip]="collapsed ? t.sidebar.expandMenu : ''"
          tooltipPosition="right">
          <i [class]="collapsed ? 'pi pi-angle-double-right' : 'pi pi-angle-double-left'"></i>
          <span class="collapse-label">-</span>
        </button>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <ng-container *ngFor="let item of navItems">
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              class="nav-item"
              [pTooltip]="collapsed ? t.nav[item.key] : ''"
              tooltipPosition="right">
              <i [class]="'pi ' + item.icon"></i>
              <span class="nav-label">{{ t.nav[item.key] }}</span>
              <span class="nav-indicator"></span>
            </a>
          </ng-container>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">

          <!-- Theme toggle -->
          <div
            class="footer-action"
            (click)="toggleTheme()"
            [pTooltip]="isDarkMode ? t.sidebar.lightMode : t.sidebar.darkMode"
            tooltipPosition="right">
            <div class="theme-switch" [class.active]="isDarkMode">
              <div class="theme-switch-slider">
                <i [class]="isDarkMode ? 'pi pi-moon' : 'pi pi-sun'"></i>
              </div>
            </div>
            <span class="footer-label">{{ isDarkMode ? t.sidebar.darkMode : t.sidebar.lightMode }}</span>
          </div>

          <!-- Language selector -->
          <div
            class="footer-action lang-action"
            [pTooltip]="collapsed ? currentLangLabel : ''"
            tooltipPosition="right">
            <div class="lang-selector">
              <span class="lang-flag">{{ currentLangFlag }}</span>
              <select
                class="lang-select"
                [value]="currentLang"
                (change)="onLangChange($event)"
                [class.collapsed-select]="collapsed">
                <option
                  *ngFor="let lang of availableLangs"
                  [value]="lang.code">
                  {{ lang.flag }} {{ lang.label }}
                </option>
              </select>
              <i class="pi pi-chevron-down lang-caret" *ngIf="!collapsed"></i>
            </div>
            <span class="footer-label">{{ currentLangLabel }}</span>
          </div>

          <!-- Connection status -->
          <div
            class="footer-action status-row"
            [pTooltip]="connectionStatus ? t.sidebar.serverOk : t.sidebar.serverKo"
            tooltipPosition="right">
            <div class="status-dot" [class.connected]="connectionStatus"></div>
            <span class="footer-label">{{ connectionStatus ? t.sidebar.connected : t.sidebar.disconnected }}</span>
          </div>

        </div>
      </aside>

      <!-- ═══════════════════════════════════════
           MAIN CONTENT
      ═══════════════════════════════════════ -->
      <div class="main-wrapper">

        <!-- Top bar (mobile hamburger + breadcrumb area) -->
        <header class="topbar">
          <button class="hamburger" (click)="toggleSidebar()">
            <i class="pi pi-bars"></i>
          </button>
          <span class="topbar-title">{{ t.topbar.title }}</span>
          <div class="topbar-actions">
            <div class="status-dot-sm" [class.connected]="connectionStatus"
                 [pTooltip]="connectionStatus ? t.sidebar.serverOk : t.sidebar.serverKo"
                 tooltipPosition="bottom">
            </div>
          </div>
        </header>

        <main class="content">
          <router-outlet></router-outlet>
        </main>

      </div>
    </div>
  `,
  styles: [`
    /* ─── Layout ─────────────────────────────────────── */
    .layout {
      display: flex;
      min-height: 100vh;
      background: var(--bg-secondary);
    }

    /* ─── Sidebar ─────────────────────────────────────── */
    .sidebar {
      width: 260px;
      min-height: 100vh;
      background: var(--card-bg);
      box-shadow: 4px 0 24px var(--shadow-sm);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 200;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .layout.sidebar-collapsed .sidebar {
      width: 72px;
    }

    /* ─── Logo ─────────────────────────────────────────── */
    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1.25rem 1rem 1.25rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      overflow: hidden;
      min-height: 72px;
      flex-shrink: 0;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-icon i {
      color: white;
      font-size: 1.25rem;
    }

    .logo-text {
      font-size: 1.05rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
      opacity: 1;
      transition: opacity 0.2s ease;
    }

    .layout.sidebar-collapsed .logo-text {
      opacity: 0;
      pointer-events: none;
    }

    /* ─── Collapse button ────────────────────────────── */
    .collapse-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.6rem 1.25rem;
      border: none;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background 0.2s, color 0.2s;
      flex-shrink: 0;
      text-align: left;
    }

    .collapse-btn i {
      font-size: 1rem;
      flex-shrink: 0;
      width: 22px;
      text-align: center;
      transition: transform 0.3s ease;
    }

    .collapse-btn:hover {
      background: var(--hover-bg);
      color: #667eea;
    }

    .collapse-label {
      opacity: 1;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }

    .layout.sidebar-collapsed .collapse-label {
      opacity: 0;
      pointer-events: none;
    }

    .layout.sidebar-collapsed .collapse-btn {
      justify-content: center;
      padding: 0.6rem 0;
    }

    /* ─── Navigation ─────────────────────────────────── */
    .sidebar-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 0.875rem;
      border-radius: 12px;
      text-decoration: none;
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.925rem;
      white-space: nowrap;
      position: relative;
      transition: all 0.2s ease;
      overflow: hidden;
    }

    .nav-item i {
      font-size: 1.15rem;
      flex-shrink: 0;
      width: 22px;
      text-align: center;
      transition: color 0.2s;
    }

    .nav-label {
      opacity: 1;
      transition: opacity 0.15s ease;
      flex: 1;
    }

    .layout.sidebar-collapsed .nav-label {
      opacity: 0;
      pointer-events: none;
    }

    .nav-indicator {
      position: absolute;
      left: 0;
      top: 20%;
      height: 60%;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: linear-gradient(135deg, #667eea, #764ba2);
      opacity: 0;
      transition: opacity 0.2s;
    }

    .nav-item:hover {
      background: var(--hover-bg);
      color: #667eea;
    }

    .nav-item:hover i {
      color: #667eea;
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.1) 100%);
      color: #667eea;
      font-weight: 600;
    }

    .nav-item.active i {
      color: #667eea;
    }

    .nav-item.active .nav-indicator {
      opacity: 1;
    }

    /* ─── Footer ─────────────────────────────────────── */
    .sidebar-footer {
      padding: 1rem 0.75rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow: hidden;
      flex-shrink: 0;
    }

    .footer-action {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.6rem 0.875rem;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .footer-action:hover {
      background: var(--hover-bg);
    }

    .footer-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      opacity: 1;
      transition: opacity 0.15s ease;
    }

    .layout.sidebar-collapsed .footer-label {
      opacity: 0;
      pointer-events: none;
    }

    /* ─── Theme switch ───────────────────────────────── */
    .theme-switch {
      position: relative;
      width: 44px;
      height: 24px;
      border-radius: 24px;
      background: var(--bg-tertiary);
      border: 1.5px solid var(--border-color);
      cursor: pointer;
      transition: background 0.3s;
      flex-shrink: 0;
    }

    .theme-switch.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-color: transparent;
    }

    .theme-switch-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.55rem;
      color: #667eea;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .theme-switch.active .theme-switch-slider {
      transform: translateX(20px);
    }

    /* ─── Language selector ──────────────────────────── */
    .lang-action {
      cursor: default;
    }

    .lang-selector {
      position: relative;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      width: 44px;
      height: 24px;
      border-radius: 8px;
      background: var(--bg-tertiary);
      border: 1.5px solid var(--border-color);
      overflow: hidden;
      transition: background 0.2s, border-color 0.2s;
    }

    .lang-selector:hover {
      border-color: #667eea;
      background: var(--hover-bg);
    }

    .lang-flag {
      position: absolute;
      left: 4px;
      font-size: 0.75rem;
      pointer-events: none;
      z-index: 1;
      line-height: 1;
    }

    .lang-select {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
      z-index: 2;
      font-size: 0.85rem;
    }

    .lang-caret {
      position: absolute;
      right: 3px;
      font-size: 0.55rem;
      color: var(--text-secondary);
      pointer-events: none;
    }

    /* In expanded mode, widen slightly to show caret */
    .layout:not(.sidebar-collapsed) .lang-selector {
      width: 44px;
    }

    /* ─── Connection status dot ──────────────────────── */
    .status-row {
      cursor: default;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--text-tertiary);
      flex-shrink: 0;
      transition: background 0.3s;
      box-shadow: 0 0 0 2px var(--bg-secondary);
    }

    .status-dot.connected {
      background: #22c55e;
      box-shadow: 0 0 0 2px var(--bg-secondary), 0 0 6px rgba(34,197,94,0.5);
      animation: pulse-green 2s infinite;
    }

    /* ─── Topbar ─────────────────────────────────────── */
    .main-wrapper {
      flex: 1;
      margin-left: 260px;
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .layout.sidebar-collapsed .main-wrapper {
      margin-left: 72px;
    }

    .topbar {
      display: none;
      align-items: center;
      gap: 1rem;
      padding: 0 1.25rem;
      height: 56px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px var(--shadow-sm);
    }

    .hamburger {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.4rem;
      border-radius: 8px;
    }

    .hamburger:hover {
      background: var(--hover-bg);
      color: #667eea;
    }

    .topbar-title {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text-primary);
      flex: 1;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-dot-sm {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-tertiary);
      flex-shrink: 0;
      cursor: pointer;
    }

    .status-dot-sm.connected {
      background: #22c55e;
      animation: pulse-green 2s infinite;
    }

    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
      50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0);  }
    }

    /* ─── Content ─────────────────────────────────────── */
    .content {
      padding: 2rem;
      flex: 1;
      min-width: 0;
    }

    /* ─── Responsive ─────────────────────────────────── */
    @media (max-width: 768px) {
      .topbar {
        display: flex;
      }

      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .layout:not(.sidebar-collapsed) .sidebar {
        transform: translateX(0);
      }

      .main-wrapper {
        margin-left: 0 !important;
      }

      .collapse-btn {
        display: none;
      }

      .content {
        padding: 1.25rem;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  connectionStatus = false;
  isDarkMode = false;
  collapsed = false;

  currentLang: Language = 'it';
  t!: ReturnType<LanguageService['getTranslations']>;
  availableLangs = LANGUAGES;

  navItems: NavItem[] = [
    { key: 'dashboard',      icon: 'pi-home',      route: '/',         exact: true },
    { key: 'configurations', icon: 'pi-cog',       route: '/configs' },
    { key: 'charts',         icon: 'pi-chart-pie', route: '/charts' },
    { key: 'cluster',        icon: 'pi-server',    route: '/cluster' },
    { key: 'sseStats',       icon: 'pi-bolt',      route: '/sse-stats' },
    { key: 'metrics',        icon: 'pi-chart-bar', route: '/metrics' },
    { key: 'backup',         icon: 'pi-download',  route: '/backup' },
  ];

  get currentLangFlag(): string {
    return this.availableLangs.find(l => l.code === this.currentLang)?.flag ?? '🌐';
  }

  get currentLangLabel(): string {
    return this.availableLangs.find(l => l.code === this.currentLang)?.label ?? '';
  }

  constructor(
    private oscService: OpenSecureConfService,
    private themeService: ThemeService,
    private langService: LanguageService
  ) {}

  ngOnInit() {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    this.collapsed = saved === 'true';

    this.oscService.getConnectionStatus().subscribe(status => {
      this.connectionStatus = status;
    });

    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });

    this.langService.lang$.subscribe(lang => {
      this.currentLang = lang;
      this.t = this.langService.t(lang);
    });
  }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    localStorage.setItem(SIDEBAR_KEY, String(this.collapsed));
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  onLangChange(event: Event) {
    const lang = (event.target as HTMLSelectElement).value as Language;
    this.langService.setLanguage(lang);
  }
}