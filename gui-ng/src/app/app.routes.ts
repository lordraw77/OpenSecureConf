import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'configs',
    loadComponent: () => import('./components/config-list/config-list.component').then(m => m.ConfigListComponent)
  },
  {
    path: 'cluster',
    loadComponent: () => import('./components/cluster-status/cluster-status.component').then(m => m.ClusterStatusComponent)
  },
  {
    path: 'backup',
    loadComponent: () => import('./components/backup/backup.component').then(m => m.BackupComponent)
  },
  {
    path: 'sse-stats',  
    loadComponent: () => import('./components/sse-stats/sse-stats.component').then(m => m.SseStatsComponent)
  },
  {
    path: 'metrics',  
    loadComponent: () => import('./components/metrics/metrics.component').then(m => m.MetricsComponent)
  },
  { path: '**', redirectTo: '' }
];
