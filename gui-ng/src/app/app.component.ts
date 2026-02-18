import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { OpenSecureConfService } from './services/opensecureconf.service';
import { ThemeService } from './services/theme.service';

const SIDEBAR_KEY = 'osc_sidebar_collapsed';

interface NavItem {
  label: string;
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
          [pTooltip]="collapsed ? 'Espandi menu' : ''"
          tooltipPosition="right">
          <i [class]="collapsed ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"></i>
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
              [pTooltip]="collapsed ? item.label : ''"
              tooltipPosition="right">
              <i [class]="'pi ' + item.icon"></i>
              <span class="nav-label">{{ item.label }}</span>
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
            [pTooltip]="isDarkMode ? 'Modalità chiara' : 'Modalità scura'"
            tooltipPosition="right">
            <div class="theme-switch" [class.active]="isDarkMode">
              <div class="theme-switch-slider">
                <i [class]="isDarkMode ? 'pi pi-moon' : 'pi pi-sun'"></i>
              </div>
            </div>
            <span class="footer-label">{{ isDarkMode ? 'Dark mode' : 'Light mode' }}</span>
          </div>

          <!-- Connection status -->
          <div
            class="footer-action status-row"
            [pTooltip]="connectionStatus ? 'Server raggiungibile' : 'Server non raggiungibile'"
            tooltipPosition="right">
            <div class="status-dot" [class.connected]="connectionStatus"></div>
            <span class="footer-label">{{ connectionStatus ? 'Connesso' : 'Disconnesso' }}</span>
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
          <span class="topbar-title">OpenSecureConf Admin</span>
          <div class="topbar-actions">
            <div class="status-dot-sm" [class.connected]="connectionStatus"
                 [pTooltip]="connectionStatus ? 'Connesso' : 'Disconnesso'"
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

    /* In collapsed mode center the icon */
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

    /* Theme switch (piccolo) */
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
      color: #764ba2;
    }

    /* Connection status dot */
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(239,68,68,0.25);
      transition: background 0.3s, box-shadow 0.3s;
    }

    .status-dot.connected {
      background: #22c55e;
      box-shadow: 0 0 0 2px rgba(34,197,94,0.25);
      animation: pulse-green 2s infinite;
    }

    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
      50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0.1); }
    }

    /* ─── Main Wrapper ───────────────────────────────── */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-left: 260px;
      min-width: 0;
      transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .layout.sidebar-collapsed .main-wrapper {
      margin-left: 72px;
    }

    /* ─── Topbar (mobile + header strip) ─────────────── */
    .topbar {
      display: none;
      align-items: center;
      gap: 1rem;
      padding: 0 1.5rem;
      height: 60px;
      background: var(--card-bg);
      box-shadow: 0 2px 12px var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 100;
      flex-shrink: 0;
    }

    .hamburger {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-primary);
      font-size: 1.25rem;
      padding: 0.5rem;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .hamburger:hover {
      background: var(--hover-bg);
    }

    .topbar-title {
      font-weight: 700;
      font-size: 1.1rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .topbar-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
    }

    .status-dot-sm {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      cursor: pointer;
    }

    .status-dot-sm.connected {
      background: #22c55e;
      animation: pulse-green 2s infinite;
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

      /* su mobile "collapsed" diventa il pannello aperto (slide-in) */
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

  navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'pi-home',       route: '/',         exact: true },
    { label: 'Configurazioni',  icon: 'pi-cog',        route: '/configs' },
    { label: 'Grafici',         icon: 'pi-chart-pie',  route: '/charts' },
    { label: 'Cluster',         icon: 'pi-server',     route: '/cluster' },
    { label: 'SSE Stats',       icon: 'pi-bolt',       route: '/sse-stats' },
    { label: 'Metriche',        icon: 'pi-chart-bar',  route: '/metrics' },
    { label: 'Backup',          icon: 'pi-download',   route: '/backup' },
  ];

  constructor(
    private oscService: OpenSecureConfService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    // Ripristina stato sidebar da localStorage
    const saved = localStorage.getItem(SIDEBAR_KEY);
    this.collapsed = saved === 'true';

    this.oscService.getConnectionStatus().subscribe(status => {
      this.connectionStatus = status;
    });

    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    localStorage.setItem(SIDEBAR_KEY, String(this.collapsed));
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}