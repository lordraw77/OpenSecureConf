export type Language = 'it' | 'en' | 'de' | 'fr' | 'es';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
];

export interface Translations {
  // Sidebar nav
  nav: {
    dashboard:      string;
    configurations: string;
    charts:         string;
    cluster:        string;
    sseStats:       string;
    metrics:        string;
    backup:         string;
  };
  // Sidebar footer
  sidebar: {
    expandMenu:   string;
    lightMode:    string;
    darkMode:     string;
    connected:    string;
    disconnected: string;
    serverOk:     string;
    serverKo:     string;
  };
  // Topbar
  topbar: {
    title: string;
  };
}

export const translations: Record<Language, Translations> = {
  it: {
    nav: {
      dashboard:      'Dashboard',
      configurations: 'Configurazioni',
      charts:         'Grafici',
      cluster:        'Cluster',
      sseStats:       'SSE Stats',
      metrics:        'Metriche',
      backup:         'Backup',
    },
    sidebar: {
      expandMenu:   'Espandi menu',
      lightMode:    'Modalità chiara',
      darkMode:     'Modalità scura',
      connected:    'Connesso',
      disconnected: 'Disconnesso',
      serverOk:     'Server raggiungibile',
      serverKo:     'Server non raggiungibile',
    },
    topbar: {
      title: 'OpenSecureConf Admin',
    },
  },

  en: {
    nav: {
      dashboard:      'Dashboard',
      configurations: 'Configurations',
      charts:         'Charts',
      cluster:        'Cluster',
      sseStats:       'SSE Stats',
      metrics:        'Metrics',
      backup:         'Backup',
    },
    sidebar: {
      expandMenu:   'Expand menu',
      lightMode:    'Light mode',
      darkMode:     'Dark mode',
      connected:    'Connected',
      disconnected: 'Disconnected',
      serverOk:     'Server reachable',
      serverKo:     'Server unreachable',
    },
    topbar: {
      title: 'OpenSecureConf Admin',
    },
  },

  de: {
    nav: {
      dashboard:      'Dashboard',
      configurations: 'Konfigurationen',
      charts:         'Diagramme',
      cluster:        'Cluster',
      sseStats:       'SSE Stats',
      metrics:        'Metriken',
      backup:         'Backup',
    },
    sidebar: {
      expandMenu:   'Menü erweitern',
      lightMode:    'Helles Design',
      darkMode:     'Dunkles Design',
      connected:    'Verbunden',
      disconnected: 'Getrennt',
      serverOk:     'Server erreichbar',
      serverKo:     'Server nicht erreichbar',
    },
    topbar: {
      title: 'OpenSecureConf Admin',
    },
  },

  fr: {
    nav: {
      dashboard:      'Tableau de bord',
      configurations: 'Configurations',
      charts:         'Graphiques',
      cluster:        'Cluster',
      sseStats:       'Stats SSE',
      metrics:        'Métriques',
      backup:         'Sauvegarde',
    },
    sidebar: {
      expandMenu:   'Développer le menu',
      lightMode:    'Mode clair',
      darkMode:     'Mode sombre',
      connected:    'Connecté',
      disconnected: 'Déconnecté',
      serverOk:     'Serveur accessible',
      serverKo:     'Serveur inaccessible',
    },
    topbar: {
      title: 'OpenSecureConf Admin',
    },
  },

  es: {
    nav: {
      dashboard:      'Panel',
      configurations: 'Configuraciones',
      charts:         'Gráficos',
      cluster:        'Clúster',
      sseStats:       'Stats SSE',
      metrics:        'Métricas',
      backup:         'Copia de seguridad',
    },
    sidebar: {
      expandMenu:   'Expandir menú',
      lightMode:    'Modo claro',
      darkMode:     'Modo oscuro',
      connected:    'Conectado',
      disconnected: 'Desconectado',
      serverOk:     'Servidor accesible',
      serverKo:     'Servidor inaccesible',
    },
    topbar: {
      title: 'OpenSecureConf Admin',
    },
  },
};