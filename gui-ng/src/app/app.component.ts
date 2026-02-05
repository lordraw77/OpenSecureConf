import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { OpenSecureConfService } from './services/opensecureconf.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TagModule, TooltipModule],
  template: `
    <div class="app-container">
      <div class="navbar">
        <div class="navbar-content">
          <div class="logo-section">
            <i class="pi pi-shield" style="font-size: 2rem; color: #667eea;"></i>
            <span class="logo-text">OpenSecureConf Admin</span>
          </div>
          
          <div class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
              <i class="pi pi-home"></i>
              <span>Dashboard</span>
            </a>
            <a routerLink="/configs" routerLinkActive="active" class="nav-link">
              <i class="pi pi-cog"></i>
              <span>Configurazioni</span>
            </a>
            <a routerLink="/cluster" routerLinkActive="active" class="nav-link">
              <i class="pi pi-server"></i>
              <span>Cluster</span>
            </a>
            <a routerLink="/backup" routerLinkActive="active" class="nav-link">
              <i class="pi pi-download"></i>
              <span>Backup</span>
            </a>
          </div>
          
          <div class="navbar-actions">
            <div 
              class="theme-switch" 
              [class.active]="isDarkMode"
              (click)="toggleTheme()"
              pTooltip="{{ isDarkMode ? 'Modalità chiara' : 'Modalità scura' }}"
              tooltipPosition="bottom">
              <div class="theme-switch-slider">
                <i [class]="isDarkMode ? 'pi pi-moon' : 'pi pi-sun'"></i>
              </div>
            </div>
            
            <p-tag 
              [value]="connectionStatus ? 'Connesso' : 'Disconnesso'" 
              [severity]="connectionStatus ? 'success' : 'danger'"
              [rounded]="true">
            </p-tag>
          </div>
        </div>
      </div>

      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--primary-gradient-start) 0%, var(--primary-gradient-end) 100%);
    }

    .navbar {
      background: var(--card-bg);
      box-shadow: 0 4px 20px var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 1000;
      transition: background-color 0.3s;
    }

    .navbar-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1400px;
      margin: 0 auto;
      padding: 1rem 2rem;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-text {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav-links {
      display: flex;
      gap: 0.5rem;
      flex: 1;
      justify-content: center;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 500;
      transition: all 0.2s;
    }

    .nav-link:hover {
      background: var(--hover-bg);
      color: #667eea;
    }

    .nav-link.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .nav-link i {
      font-size: 1.25rem;
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .theme-switch {
      position: relative;
      width: 60px;
      height: 30px;
      background: var(--bg-tertiary);
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.3s;
      border: 2px solid var(--border-color);
    }

    .theme-switch:hover {
      transform: scale(1.05);
    }

    .theme-switch.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .theme-switch-slider {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 22px;
      height: 22px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: #667eea;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .theme-switch.active .theme-switch-slider {
      transform: translateX(30px);
      color: white;
    }

    .content {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      animation: fadeIn 0.5s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      .navbar-content {
        flex-wrap: wrap;
        gap: 1rem;
      }

      .nav-links {
        order: 3;
        width: 100%;
        justify-content: center;
      }

      .nav-link span {
        display: none;
      }

      .navbar-actions {
        order: 2;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  connectionStatus = false;
  isDarkMode = false;

  constructor(
    private oscService: OpenSecureConfService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    this.oscService.getConnectionStatus().subscribe(status => {
      this.connectionStatus = status;
    });

    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
