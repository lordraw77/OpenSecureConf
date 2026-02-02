import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { OpenSecureConfService } from './services/opensecureconf.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MenubarModule, TagModule],
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
          </div>
          
          <div class="status-badge">
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .navbar {
      background: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      position: sticky;
      top: 0;
      z-index: 1000;
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
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      text-decoration: none;
      color: #495057;
      font-weight: 500;
      transition: all 0.2s;
    }

    .nav-link:hover {
      background: #f1f3f5;
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

    .status-badge {
      display: flex;
      align-items: center;
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
        flex-direction: column;
        gap: 1rem;
      }

      .nav-links {
        width: 100%;
        justify-content: center;
      }

      .nav-link span {
        display: none;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  connectionStatus = false;

  constructor(private oscService: OpenSecureConfService) {}

  ngOnInit() {
    this.oscService.getConnectionStatus().subscribe(status => {
      this.connectionStatus = status;
    });
  }
}
