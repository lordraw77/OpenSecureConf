export type Language = 'it' | 'en' | 'de' | 'fr' | 'es';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
];

export interface Translations {
  nav: { dashboard: string; configurations: string; charts: string; cluster: string; sseStats: string; metrics: string; backup: string };
  sidebar: { expandMenu: string; lightMode: string; darkMode: string; connected: string; disconnected: string; serverOk: string; serverKo: string };
  topbar: { title: string };
  dashboard: {
    subtitle: string; totalConfigs: string; categories: string; environments: string; cluster: string;
    clusterEnabled: string; clusterDisabled: string; serviceInfo: string; service: string; version: string;
    configsByCategory: string; configsByEnvironment: string; colCategory: string; colEnvironment: string;
    colCount: string; noCategory: string; noEnvironment: string; emptyCategoryMsg: string; emptyEnvironmentMsg: string;
  };
  configs: {
    title: string; subtitle: string; newConfig: string; searchPlaceholder: string; filterByCategory: string;
    filterByEnvironment: string; exportCsv: string; exportCsvTooltip: string; categoriesSelected: string;
    environmentsSelected: string; colKey: string; colValue: string; colCategory: string; colEnvironment: string;
    colCreated: string; colUpdated: string; colActions: string; total: string; totalConfigs: string; showing: string;
    newConfigTitle: string; editConfigTitle: string; fieldKey: string; fieldValue: string; fieldValueHint: string;
    fieldValuePlaceholder: string; fieldCategory: string; fieldCategoryHint: string; fieldCategoryPlaceholder: string;
    fieldEnvironment: string; fieldEnvironmentPlaceholder: string; btnCancel: string; btnCreate: string; btnSave: string;
    viewTitle: string; viewKey: string; viewId: string; viewCategory: string; viewEnvironment: string;
    viewCreated: string; viewUpdated: string; viewValue: string; deleteConfirmMsg: string; deleteConfirmHeader: string;
    deleteYes: string; deleteNo: string; toastSuccessSummary: string; toastCreated: string; toastUpdated: string;
    toastDeleted: string; toastErrorSummary: string; toastLoadError: string; toastDeleteError: string;
    toastOpFailed: string; toastKeyRequired: string; toastEnvRequired: string; toastInvalidJson: string;
  };
  charts: {
    title: string; subtitle: string; refresh: string; refreshTooltip: string; kpiTotalConfigs: string;
    kpiUniqueCategories: string; kpiUniqueEnvironments: string; kpiUncategorized: string; chartByCategory: string;
    chartByEnvironment: string; chartByEnvAndCat: string; chartTopCategories: string; badgeCategories: string;
    badgeEnvironments: string; badgeDetailed: string; badgeSortedByCount: string; noData: string;
    noEnvironment: string; configurations: string; tooltipConfigs: string;
  };
  cluster: {
    title: string; subtitle: string; nextRefresh: string; autoRefreshOn: string; autoRefreshOff: string;
    disableAutoRefresh: string; enableAutoRefresh: string; refresh: string; clusterInfo: string; clusterMode: string;
    nodeType: string; nodeTypeReplica: string; nodeTypeMaster: string; synchronization: string; syncOk: string;
    syncKo: string; totalNodes: string; inCluster: string; activeNodes: string; availability: string;
    totalKeys: string; perNode: string; healthCheck: string; status: string; nodeId: string; lastUpdate: string;
    loading: string; nodesDistribution: string; nodes: string; colNodeId: string; colLocal: string;
    colStatus: string; colKeys: string; colKeysDist: string; nodeLocal: string; nodeHealthy: string;
    nodeUnhealthy: string; noNodesFound: string;
  };
  sseStats: {
    title: string; subtitle: string; refresh: string; autoRefreshOn: string; autoRefreshOff: string;
    autoRefreshTooltipDisable: string; autoRefreshTooltipEnable: string; kpiActiveConnections: string;
    kpiTotalCreated: string; kpiEventsSent: string; kpiDifferentTypes: string; kpiKeepalive: string;
    kpiDisconnections: string; kpiLostEvents: string; kpiQueueFull: string; cardSubDetails: string;
    cardEventDetails: string; cardPerfMetrics: string; subTotalCreated: string; subActive: string;
    subClosed: string; subWildcard: string; subLastCreated: string; evtTotal: string; evtDropped: string;
    evtLastSent: string; perfAvgDuration: string; perfMaxQueue: string; perfKeepalive: string;
    perfDisconnections: string; cardEventsByType: string; cardSubsByKey: string; cardSubsByEnv: string;
    cardSubsByCategory: string; colEventType: string; colKey: string; colEnvironment: string; colCategory: string;
    colCount: string; noStats: string; loadingStats: string;
  };
  metrics: {
    title: string; subtitle: string; refresh: string; autoRefreshOn: string; autoRefreshOff: string;
    autoRefreshTooltipDisable: string; autoRefreshTooltipEnable: string; kpiHttpRequests: string;
    kpiTotalConfigs: string; kpiEncryptionOps: string; kpiApiErrors: string; groupHttp: string;
    groupConfigs: string; groupCluster: string; groupEncryption: string; groupErrors: string;
    colValue: string; noMetrics: string; loadingMetrics: string;
  };
  backup: {
    // Page header
    title:                    string;
    subtitle:                 string;
    // Export card
    cardExportTitle:          string;
    exportInfoBanner:         string;
    exportEnvLabel:           string;
    exportEnvPlaceholder:     string;
    exportCatLabel:           string;
    exportCatPlaceholder:     string;
    exportPasswordLabel:      string;
    exportPasswordPlaceholder: string;
    filterSummaryPrefix:      string;
    filterSummaryEnv:         string;
    filterSummaryCat:         string;
    btnGenerateBackup:        string;
    // Import (paste) card
    cardImportTitle:          string;
    importInfoBanner:         string;
    importDataLabel:          string;
    importDataPlaceholder:    string;
    importPasswordLabel:      string;
    importPasswordPlaceholder: string;
    importOverwriteLabel:     string;
    btnImportBackup:          string;
    // Import from file card
    cardFileTitle:            string;
    fileInfoBanner:           string;
    fileSelectLabel:          string;
    fileNoFileSelected:       string;
    filePasswordLabel:        string;
    filePasswordPlaceholder:  string;
    fileOverwriteLabel:       string;
    btnImportFromFile:        string;
    // Toast messages
    toastWarnSummary:         string;
    toastWarnNeedPassword:    string;
    toastWarnNeedDataAndPw:   string;
    toastWarnNeedFileAndPw:   string;
    toastSuccessSummary:      string;
    toastExportSuccess:       string;
    toastImportSuccess:       string;   // uses {imported} and {skipped}
    toastImportPartial:       string;   // uses {count}
    toastErrorSummary:        string;
    toastExportError:         string;
    toastImportError:         string;
    toastFileImportError:     string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a compact "all previous sections" object per language, then
// merge with the backup section. This keeps the file readable.
// ─────────────────────────────────────────────────────────────────────────────

export const translations: Record<Language, Translations> = {
  // ══════════════════════════════════════════════════════════════ ITALIANO ══
  it: {
    nav: { dashboard:'Dashboard', configurations:'Configurazioni', charts:'Grafici', cluster:'Cluster', sseStats:'SSE Stats', metrics:'Metriche', backup:'Backup' },
    sidebar: { expandMenu:'Espandi menu', lightMode:'Modalità chiara', darkMode:'Modalità scura', connected:'Connesso', disconnected:'Disconnesso', serverOk:'Server raggiungibile', serverKo:'Server non raggiungibile' },
    topbar: { title:'OpenSecureConf Admin' },
    dashboard: {
      subtitle:'Panoramica generale del sistema OpenSecureConf', totalConfigs:'Configurazioni Totali', categories:'Categorie',
      environments:'Ambienti', cluster:'Cluster', clusterEnabled:'Abilitato', clusterDisabled:'Disabilitato',
      serviceInfo:'Informazioni Servizio', service:'Servizio', version:'Versione',
      configsByCategory:'Configurazioni per Categoria', configsByEnvironment:'Configurazioni per Ambiente',
      colCategory:'Categoria', colEnvironment:'Ambiente', colCount:'Conteggio',
      noCategory:'Senza categoria', noEnvironment:'Senza ambiente',
      emptyCategoryMsg:'Nessuna categoria trovata', emptyEnvironmentMsg:'Nessun ambiente trovato',
    },
    configs: {
      title:'Gestione Configurazioni', subtitle:'Gestisci tutte le configurazioni del sistema',
      newConfig:'Nuova Configurazione', searchPlaceholder:'Cerca...', filterByCategory:'Filtra per Categoria',
      filterByEnvironment:'Filtra per Ambiente', exportCsv:'Esporta CSV', exportCsvTooltip:'Esporta i dati filtrati in CSV',
      categoriesSelected:'{0} categorie selezionate', environmentsSelected:'{0} ambienti selezionati',
      colKey:'Chiave', colValue:'Valore', colCategory:'Categoria', colEnvironment:'Ambiente',
      colCreated:'Creazione', colUpdated:'Modifica', colActions:'Azioni',
      total:'Totale', totalConfigs:'configurazioni', showing:'Visualizzate',
      newConfigTitle:'Nuova Configurazione', editConfigTitle:'Modifica Configurazione',
      fieldKey:'Chiave *', fieldValue:'Valore * (JSON)', fieldValueHint:'Inserisci un valore JSON valido',
      fieldValuePlaceholder:'Es: {"host": "localhost", "port": 5432} o "stringa" o 123 o true',
      fieldCategory:'Categoria', fieldCategoryHint:'Usa / o \\ per creare gerarchie (es: PARENT/CHILD)',
      fieldCategoryPlaceholder:'Es: STORAGE oppure LOGGING/DR', fieldEnvironment:'Ambiente *',
      fieldEnvironmentPlaceholder:'Seleziona o inserisci', btnCancel:'Annulla', btnCreate:'Crea', btnSave:'Salva',
      viewTitle:'Dettagli Configurazione', viewKey:'Chiave:', viewId:'ID:', viewCategory:'Categoria:',
      viewEnvironment:'Ambiente:', viewCreated:'Data Creazione:', viewUpdated:'Data Modifica:', viewValue:'Valore:',
      deleteConfirmMsg:'Sei sicuro di voler eliminare la configurazione "{key}" dall\'ambiente "{env}"?',
      deleteConfirmHeader:'Conferma Eliminazione', deleteYes:'Sì', deleteNo:'No',
      toastSuccessSummary:'Successo', toastCreated:'Configurazione creata con successo',
      toastUpdated:'Configurazione aggiornata con successo', toastDeleted:'Configurazione eliminata',
      toastErrorSummary:'Errore', toastLoadError:'Impossibile caricare le configurazioni',
      toastDeleteError:'Impossibile eliminare', toastOpFailed:'Operazione fallita',
      toastKeyRequired:'La chiave è obbligatoria', toastEnvRequired:'L\'ambiente è obbligatorio',
      toastInvalidJson:'Il valore non è un JSON valido',
    },
    charts: {
      title:'Grafici', subtitle:'Distribuzione visuale delle configurazioni per categoria e ambiente',
      refresh:'Aggiorna', refreshTooltip:'Ricarica i dati', kpiTotalConfigs:'Configurazioni Totali',
      kpiUniqueCategories:'Categorie Uniche', kpiUniqueEnvironments:'Ambienti Unici', kpiUncategorized:'Senza Categoria',
      chartByCategory:'Configurazioni per Categoria', chartByEnvironment:'Configurazioni per Ambiente',
      chartByEnvAndCat:'Configurazioni per Ambiente e Categoria', chartTopCategories:'Top Categorie per Numero di Configurazioni',
      badgeCategories:'categorie', badgeEnvironments:'ambienti', badgeDetailed:'distribuzione dettagliata',
      badgeSortedByCount:'ordinate per conteggio', noData:'Nessun dato disponibile', noEnvironment:'(nessuno)',
      configurations:'Configurazioni', tooltipConfigs:'configurazioni',
    },
    cluster: {
      title:'Cluster Status', subtitle:'Monitora lo stato del cluster OpenSecureConf',
      nextRefresh:'Prossimo refresh', autoRefreshOn:'ON', autoRefreshOff:'OFF',
      disableAutoRefresh:'Disattiva auto-refresh', enableAutoRefresh:'Attiva auto-refresh', refresh:'Aggiorna',
      clusterInfo:'Informazioni Cluster', clusterMode:'Modalità Cluster', nodeType:'Tipo Nodo',
      nodeTypeReplica:'Replica', nodeTypeMaster:'Master', synchronization:'Sincronizzazione',
      syncOk:'Sincronizzati', syncKo:'Non Sincronizzati', totalNodes:'Totale Nodi', inCluster:'nel cluster',
      activeNodes:'Nodi Attivi', availability:'disponibilità', totalKeys:'Totale Chiavi', perNode:'per nodo',
      healthCheck:'Health Check', status:'Stato', nodeId:'Node ID', lastUpdate:'Ultimo Aggiornamento',
      loading:'Caricamento...', nodesDistribution:'Distribuzione Nodi', nodes:'nodi',
      colNodeId:'Node ID', colLocal:'Locale', colStatus:'Stato', colKeys:'Chiavi', colKeysDist:'Distribuzione chiavi',
      nodeLocal:'LOCALE', nodeHealthy:'Healthy', nodeUnhealthy:'Unhealthy', noNodesFound:'Nessun nodo trovato',
    },
    sseStats: {
      title:'Statistiche SSE', subtitle:'Monitoring in tempo reale delle connessioni Server-Sent Events',
      refresh:'Aggiorna', autoRefreshOn:'Auto-refresh ON', autoRefreshOff:'Auto-refresh OFF',
      autoRefreshTooltipDisable:'Clicca per disabilitare l\'auto-refresh', autoRefreshTooltipEnable:'Clicca per abilitare l\'auto-refresh',
      kpiActiveConnections:'Connessioni Attive', kpiTotalCreated:'totali create', kpiEventsSent:'Eventi Inviati',
      kpiDifferentTypes:'tipi diversi', kpiKeepalive:'Keepalive Inviati', kpiDisconnections:'disconnessioni',
      kpiLostEvents:'Eventi Persi', kpiQueueFull:'Coda piena', cardSubDetails:'Dettagli Sottoscrizioni',
      cardEventDetails:'Dettagli Eventi', cardPerfMetrics:'Metriche di Performance',
      subTotalCreated:'Totali Create:', subActive:'Attive:', subClosed:'Chiuse:', subWildcard:'Wildcard:', subLastCreated:'Ultima Creazione:',
      evtTotal:'Eventi Totali:', evtDropped:'Persi (coda):', evtLastSent:'Ultimo Invio:',
      perfAvgDuration:'Durata Media Sottoscrizione:', perfMaxQueue:'Max Dimensione Coda:',
      perfKeepalive:'Keepalive Inviati:', perfDisconnections:'Disconnessioni Rilevate:',
      cardEventsByType:'Eventi per Tipo', cardSubsByKey:'Sottoscrizioni per Chiave',
      cardSubsByEnv:'Sottoscrizioni per Ambiente', cardSubsByCategory:'Sottoscrizioni per Categoria',
      colEventType:'Tipo Evento', colKey:'Chiave', colEnvironment:'Ambiente', colCategory:'Categoria',
      colCount:'Conteggio', noStats:'Nessuna statistica disponibile', loadingStats:'Caricamento statistiche...',
    },
    metrics: {
      title:'Metriche', subtitle:'Monitoring delle performance e statistiche del sistema',
      refresh:'Aggiorna', autoRefreshOn:'Auto-refresh ON', autoRefreshOff:'Auto-refresh OFF',
      autoRefreshTooltipDisable:'Clicca per disabilitare l\'auto-refresh', autoRefreshTooltipEnable:'Clicca per abilitare l\'auto-refresh',
      kpiHttpRequests:'Richieste HTTP Totali', kpiTotalConfigs:'Configurazioni Totali',
      kpiEncryptionOps:'Operazioni Cifratura', kpiApiErrors:'Errori API',
      groupHttp:'Richieste HTTP', groupConfigs:'Operazioni Configurazioni', groupCluster:'Cluster',
      groupEncryption:'Cifratura', groupErrors:'Errori API',
      colValue:'Valore', noMetrics:'Nessuna metrica disponibile', loadingMetrics:'Caricamento metriche...',
    },
    backup: {
      title:'Backup & Import', subtitle:'Gestisci import ed export delle configurazioni',
      cardExportTitle:'Esporta Configurazioni',
      exportInfoBanner:'Crea un backup crittografato delle configurazioni selezionate',
      exportEnvLabel:'Environment (opzionale)', exportEnvPlaceholder:'Tutti gli environment',
      exportCatLabel:'Categoria (opzionale)', exportCatPlaceholder:'Tutte le categorie',
      exportPasswordLabel:'Password Backup *', exportPasswordPlaceholder:'Inserisci password per crittografia',
      filterSummaryPrefix:'Verranno esportate solo le configurazioni',
      filterSummaryEnv:'dell\'environment', filterSummaryCat:'della categoria',
      btnGenerateBackup:'Genera Backup',
      cardImportTitle:'Importa Configurazioni',
      importInfoBanner:'Ripristina configurazioni da un backup crittografato',
      importDataLabel:'Dati Backup *', importDataPlaceholder:'Incolla qui i dati del backup...',
      importPasswordLabel:'Password Backup *', importPasswordPlaceholder:'Password del backup',
      importOverwriteLabel:'Sovrascrivi configurazioni esistenti', btnImportBackup:'Importa Backup',
      cardFileTitle:'Importa da File',
      fileInfoBanner:'Carica un file di backup (.json o .txt)',
      fileSelectLabel:'Seleziona File Backup', fileNoFileSelected:'Nessun file selezionato',
      filePasswordLabel:'Password Backup *', filePasswordPlaceholder:'Password del backup',
      fileOverwriteLabel:'Sovrascrivi configurazioni esistenti', btnImportFromFile:'Importa da File',
      toastWarnSummary:'Attenzione',
      toastWarnNeedPassword:'Inserisci una password per il backup',
      toastWarnNeedDataAndPw:'Inserisci i dati del backup e la password',
      toastWarnNeedFileAndPw:'Seleziona un file e inserisci la password',
      toastSuccessSummary:'Successo',
      toastExportSuccess:'Backup generato e scaricato con successo',
      toastImportSuccess:'Importate {imported} configurazioni, saltate {skipped}',
      toastImportPartial:'{count} configurazioni non importate',
      toastErrorSummary:'Errore',
      toastExportError:'Errore durante la generazione del backup',
      toastImportError:'Errore durante l\'importazione del backup',
      toastFileImportError:'Errore durante l\'importazione del file',
    },
  },

  // ══════════════════════════════════════════════════════════════ ENGLISH ══
  en: {
    nav: { dashboard:'Dashboard', configurations:'Configurations', charts:'Charts', cluster:'Cluster', sseStats:'SSE Stats', metrics:'Metrics', backup:'Backup' },
    sidebar: { expandMenu:'Expand menu', lightMode:'Light mode', darkMode:'Dark mode', connected:'Connected', disconnected:'Disconnected', serverOk:'Server reachable', serverKo:'Server unreachable' },
    topbar: { title:'OpenSecureConf Admin' },
    dashboard: {
      subtitle:'General overview of the OpenSecureConf system', totalConfigs:'Total Configurations', categories:'Categories',
      environments:'Environments', cluster:'Cluster', clusterEnabled:'Enabled', clusterDisabled:'Disabled',
      serviceInfo:'Service Information', service:'Service', version:'Version',
      configsByCategory:'Configurations by Category', configsByEnvironment:'Configurations by Environment',
      colCategory:'Category', colEnvironment:'Environment', colCount:'Count',
      noCategory:'No category', noEnvironment:'No environment',
      emptyCategoryMsg:'No categories found', emptyEnvironmentMsg:'No environments found',
    },
    configs: {
      title:'Configuration Management', subtitle:'Manage all system configurations',
      newConfig:'New Configuration', searchPlaceholder:'Search...', filterByCategory:'Filter by Category',
      filterByEnvironment:'Filter by Environment', exportCsv:'Export CSV', exportCsvTooltip:'Export filtered data to CSV',
      categoriesSelected:'{0} categories selected', environmentsSelected:'{0} environments selected',
      colKey:'Key', colValue:'Value', colCategory:'Category', colEnvironment:'Environment',
      colCreated:'Created', colUpdated:'Updated', colActions:'Actions',
      total:'Total', totalConfigs:'configurations', showing:'Showing',
      newConfigTitle:'New Configuration', editConfigTitle:'Edit Configuration',
      fieldKey:'Key *', fieldValue:'Value * (JSON)', fieldValueHint:'Enter a valid JSON value',
      fieldValuePlaceholder:'E.g.: {"host": "localhost", "port": 5432} or "string" or 123 or true',
      fieldCategory:'Category', fieldCategoryHint:'Use / or \\ to create hierarchies (e.g.: PARENT/CHILD)',
      fieldCategoryPlaceholder:'E.g.: STORAGE or LOGGING/DR', fieldEnvironment:'Environment *',
      fieldEnvironmentPlaceholder:'Select or type', btnCancel:'Cancel', btnCreate:'Create', btnSave:'Save',
      viewTitle:'Configuration Details', viewKey:'Key:', viewId:'ID:', viewCategory:'Category:',
      viewEnvironment:'Environment:', viewCreated:'Created At:', viewUpdated:'Updated At:', viewValue:'Value:',
      deleteConfirmMsg:'Are you sure you want to delete configuration "{key}" from environment "{env}"?',
      deleteConfirmHeader:'Confirm Deletion', deleteYes:'Yes', deleteNo:'No',
      toastSuccessSummary:'Success', toastCreated:'Configuration created successfully',
      toastUpdated:'Configuration updated successfully', toastDeleted:'Configuration deleted',
      toastErrorSummary:'Error', toastLoadError:'Unable to load configurations',
      toastDeleteError:'Unable to delete', toastOpFailed:'Operation failed',
      toastKeyRequired:'Key is required', toastEnvRequired:'Environment is required',
      toastInvalidJson:'Value is not valid JSON',
    },
    charts: {
      title:'Charts', subtitle:'Visual distribution of configurations by category and environment',
      refresh:'Refresh', refreshTooltip:'Reload data', kpiTotalConfigs:'Total Configurations',
      kpiUniqueCategories:'Unique Categories', kpiUniqueEnvironments:'Unique Environments', kpiUncategorized:'Uncategorized',
      chartByCategory:'Configurations by Category', chartByEnvironment:'Configurations by Environment',
      chartByEnvAndCat:'Configurations by Environment and Category', chartTopCategories:'Top Categories by Number of Configurations',
      badgeCategories:'categories', badgeEnvironments:'environments', badgeDetailed:'detailed distribution',
      badgeSortedByCount:'sorted by count', noData:'No data available', noEnvironment:'(none)',
      configurations:'Configurations', tooltipConfigs:'configurations',
    },
    cluster: {
      title:'Cluster Status', subtitle:'Monitor the OpenSecureConf cluster status',
      nextRefresh:'Next refresh', autoRefreshOn:'ON', autoRefreshOff:'OFF',
      disableAutoRefresh:'Disable auto-refresh', enableAutoRefresh:'Enable auto-refresh', refresh:'Refresh',
      clusterInfo:'Cluster Information', clusterMode:'Cluster Mode', nodeType:'Node Type',
      nodeTypeReplica:'Replica', nodeTypeMaster:'Master', synchronization:'Synchronization',
      syncOk:'Synchronized', syncKo:'Not Synchronized', totalNodes:'Total Nodes', inCluster:'in cluster',
      activeNodes:'Active Nodes', availability:'availability', totalKeys:'Total Keys', perNode:'per node',
      healthCheck:'Health Check', status:'Status', nodeId:'Node ID', lastUpdate:'Last Update',
      loading:'Loading...', nodesDistribution:'Node Distribution', nodes:'nodes',
      colNodeId:'Node ID', colLocal:'Local', colStatus:'Status', colKeys:'Keys', colKeysDist:'Key Distribution',
      nodeLocal:'LOCAL', nodeHealthy:'Healthy', nodeUnhealthy:'Unhealthy', noNodesFound:'No nodes found',
    },
    sseStats: {
      title:'SSE Statistics', subtitle:'Real-time monitoring of Server-Sent Events connections',
      refresh:'Refresh', autoRefreshOn:'Auto-refresh ON', autoRefreshOff:'Auto-refresh OFF',
      autoRefreshTooltipDisable:'Click to disable auto-refresh', autoRefreshTooltipEnable:'Click to enable auto-refresh',
      kpiActiveConnections:'Active Connections', kpiTotalCreated:'total created', kpiEventsSent:'Events Sent',
      kpiDifferentTypes:'different types', kpiKeepalive:'Keepalive Sent', kpiDisconnections:'disconnections',
      kpiLostEvents:'Lost Events', kpiQueueFull:'Queue full', cardSubDetails:'Subscription Details',
      cardEventDetails:'Event Details', cardPerfMetrics:'Performance Metrics',
      subTotalCreated:'Total Created:', subActive:'Active:', subClosed:'Closed:', subWildcard:'Wildcard:', subLastCreated:'Last Created:',
      evtTotal:'Total Events:', evtDropped:'Dropped (queue):', evtLastSent:'Last Sent:',
      perfAvgDuration:'Avg Subscription Duration:', perfMaxQueue:'Max Queue Size:',
      perfKeepalive:'Keepalive Sent:', perfDisconnections:'Disconnections Detected:',
      cardEventsByType:'Events by Type', cardSubsByKey:'Subscriptions by Key',
      cardSubsByEnv:'Subscriptions by Environment', cardSubsByCategory:'Subscriptions by Category',
      colEventType:'Event Type', colKey:'Key', colEnvironment:'Environment', colCategory:'Category',
      colCount:'Count', noStats:'No statistics available', loadingStats:'Loading statistics...',
    },
    metrics: {
      title:'Metrics', subtitle:'Performance monitoring and system statistics',
      refresh:'Refresh', autoRefreshOn:'Auto-refresh ON', autoRefreshOff:'Auto-refresh OFF',
      autoRefreshTooltipDisable:'Click to disable auto-refresh', autoRefreshTooltipEnable:'Click to enable auto-refresh',
      kpiHttpRequests:'Total HTTP Requests', kpiTotalConfigs:'Total Configurations',
      kpiEncryptionOps:'Encryption Operations', kpiApiErrors:'API Errors',
      groupHttp:'HTTP Requests', groupConfigs:'Configuration Operations', groupCluster:'Cluster',
      groupEncryption:'Encryption', groupErrors:'API Errors',
      colValue:'Value', noMetrics:'No metrics available', loadingMetrics:'Loading metrics...',
    },
    backup: {
      title:'Backup & Import', subtitle:'Manage configuration import and export',
      cardExportTitle:'Export Configurations',
      exportInfoBanner:'Create an encrypted backup of the selected configurations',
      exportEnvLabel:'Environment (optional)', exportEnvPlaceholder:'All environments',
      exportCatLabel:'Category (optional)', exportCatPlaceholder:'All categories',
      exportPasswordLabel:'Backup Password *', exportPasswordPlaceholder:'Enter password for encryption',
      filterSummaryPrefix:'Only configurations will be exported',
      filterSummaryEnv:'from environment', filterSummaryCat:'from category',
      btnGenerateBackup:'Generate Backup',
      cardImportTitle:'Import Configurations',
      importInfoBanner:'Restore configurations from an encrypted backup',
      importDataLabel:'Backup Data *', importDataPlaceholder:'Paste backup data here...',
      importPasswordLabel:'Backup Password *', importPasswordPlaceholder:'Backup password',
      importOverwriteLabel:'Overwrite existing configurations', btnImportBackup:'Import Backup',
      cardFileTitle:'Import from File',
      fileInfoBanner:'Upload a backup file (.json or .txt)',
      fileSelectLabel:'Select Backup File', fileNoFileSelected:'No file selected',
      filePasswordLabel:'Backup Password *', filePasswordPlaceholder:'Backup password',
      fileOverwriteLabel:'Overwrite existing configurations', btnImportFromFile:'Import from File',
      toastWarnSummary:'Warning',
      toastWarnNeedPassword:'Please enter a backup password',
      toastWarnNeedDataAndPw:'Please enter backup data and password',
      toastWarnNeedFileAndPw:'Please select a file and enter the password',
      toastSuccessSummary:'Success',
      toastExportSuccess:'Backup generated and downloaded successfully',
      toastImportSuccess:'Imported {imported} configurations, skipped {skipped}',
      toastImportPartial:'{count} configurations could not be imported',
      toastErrorSummary:'Error',
      toastExportError:'Error generating the backup',
      toastImportError:'Error importing the backup',
      toastFileImportError:'Error importing the file',
    },
  },

  // ══════════════════════════════════════════════════════════════ DEUTSCH ══
  de: {
    nav: { dashboard:'Dashboard', configurations:'Konfigurationen', charts:'Diagramme', cluster:'Cluster', sseStats:'SSE Stats', metrics:'Metriken', backup:'Backup' },
    sidebar: { expandMenu:'Menü erweitern', lightMode:'Helles Design', darkMode:'Dunkles Design', connected:'Verbunden', disconnected:'Getrennt', serverOk:'Server erreichbar', serverKo:'Server nicht erreichbar' },
    topbar: { title:'OpenSecureConf Admin' },
    dashboard: {
      subtitle:'Allgemeine Übersicht des OpenSecureConf-Systems', totalConfigs:'Gesamtkonfigurationen', categories:'Kategorien',
      environments:'Umgebungen', cluster:'Cluster', clusterEnabled:'Aktiviert', clusterDisabled:'Deaktiviert',
      serviceInfo:'Dienstinformationen', service:'Dienst', version:'Version',
      configsByCategory:'Konfigurationen nach Kategorie', configsByEnvironment:'Konfigurationen nach Umgebung',
      colCategory:'Kategorie', colEnvironment:'Umgebung', colCount:'Anzahl',
      noCategory:'Keine Kategorie', noEnvironment:'Keine Umgebung',
      emptyCategoryMsg:'Keine Kategorien gefunden', emptyEnvironmentMsg:'Keine Umgebungen gefunden',
    },
    configs: {
      title:'Konfigurationsverwaltung', subtitle:'Alle Systemkonfigurationen verwalten',
      newConfig:'Neue Konfiguration', searchPlaceholder:'Suchen...', filterByCategory:'Nach Kategorie filtern',
      filterByEnvironment:'Nach Umgebung filtern', exportCsv:'CSV exportieren', exportCsvTooltip:'Gefilterte Daten als CSV exportieren',
      categoriesSelected:'{0} Kategorien ausgewählt', environmentsSelected:'{0} Umgebungen ausgewählt',
      colKey:'Schlüssel', colValue:'Wert', colCategory:'Kategorie', colEnvironment:'Umgebung',
      colCreated:'Erstellt', colUpdated:'Geändert', colActions:'Aktionen',
      total:'Gesamt', totalConfigs:'Konfigurationen', showing:'Angezeigt',
      newConfigTitle:'Neue Konfiguration', editConfigTitle:'Konfiguration bearbeiten',
      fieldKey:'Schlüssel *', fieldValue:'Wert * (JSON)', fieldValueHint:'Gib einen gültigen JSON-Wert ein',
      fieldValuePlaceholder:'Z.B.: {"host": "localhost", "port": 5432} oder "string" oder 123 oder true',
      fieldCategory:'Kategorie', fieldCategoryHint:'Verwende / oder \\ für Hierarchien (z.B.: PARENT/CHILD)',
      fieldCategoryPlaceholder:'Z.B.: STORAGE oder LOGGING/DR', fieldEnvironment:'Umgebung *',
      fieldEnvironmentPlaceholder:'Auswählen oder eingeben', btnCancel:'Abbrechen', btnCreate:'Erstellen', btnSave:'Speichern',
      viewTitle:'Konfigurationsdetails', viewKey:'Schlüssel:', viewId:'ID:', viewCategory:'Kategorie:',
      viewEnvironment:'Umgebung:', viewCreated:'Erstellt am:', viewUpdated:'Geändert am:', viewValue:'Wert:',
      deleteConfirmMsg:'Möchten Sie die Konfiguration "{key}" aus der Umgebung "{env}" wirklich löschen?',
      deleteConfirmHeader:'Löschung bestätigen', deleteYes:'Ja', deleteNo:'Nein',
      toastSuccessSummary:'Erfolg', toastCreated:'Konfiguration erfolgreich erstellt',
      toastUpdated:'Konfiguration erfolgreich aktualisiert', toastDeleted:'Konfiguration gelöscht',
      toastErrorSummary:'Fehler', toastLoadError:'Konfigurationen konnten nicht geladen werden',
      toastDeleteError:'Löschen nicht möglich', toastOpFailed:'Vorgang fehlgeschlagen',
      toastKeyRequired:'Schlüssel ist erforderlich', toastEnvRequired:'Umgebung ist erforderlich',
      toastInvalidJson:'Wert ist kein gültiges JSON',
    },
    charts: {
      title:'Diagramme', subtitle:'Visuelle Verteilung der Konfigurationen nach Kategorie und Umgebung',
      refresh:'Aktualisieren', refreshTooltip:'Daten neu laden', kpiTotalConfigs:'Gesamtkonfigurationen',
      kpiUniqueCategories:'Eindeutige Kategorien', kpiUniqueEnvironments:'Eindeutige Umgebungen', kpiUncategorized:'Ohne Kategorie',
      chartByCategory:'Konfigurationen nach Kategorie', chartByEnvironment:'Konfigurationen nach Umgebung',
      chartByEnvAndCat:'Konfigurationen nach Umgebung und Kategorie', chartTopCategories:'Top-Kategorien nach Anzahl der Konfigurationen',
      badgeCategories:'Kategorien', badgeEnvironments:'Umgebungen', badgeDetailed:'detaillierte Verteilung',
      badgeSortedByCount:'nach Anzahl sortiert', noData:'Keine Daten verfügbar', noEnvironment:'(keine)',
      configurations:'Konfigurationen', tooltipConfigs:'Konfigurationen',
    },
    cluster: {
      title:'Cluster Status', subtitle:'Clusterstatus von OpenSecureConf überwachen',
      nextRefresh:'Nächste Aktualisierung', autoRefreshOn:'AN', autoRefreshOff:'AUS',
      disableAutoRefresh:'Auto-Aktualisierung deaktivieren', enableAutoRefresh:'Auto-Aktualisierung aktivieren', refresh:'Aktualisieren',
      clusterInfo:'Cluster-Informationen', clusterMode:'Cluster-Modus', nodeType:'Knotentyp',
      nodeTypeReplica:'Replikat', nodeTypeMaster:'Master', synchronization:'Synchronisierung',
      syncOk:'Synchronisiert', syncKo:'Nicht synchronisiert', totalNodes:'Knoten gesamt', inCluster:'im Cluster',
      activeNodes:'Aktive Knoten', availability:'Verfügbarkeit', totalKeys:'Schlüssel gesamt', perNode:'pro Knoten',
      healthCheck:'Health Check', status:'Status', nodeId:'Knoten-ID', lastUpdate:'Letzte Aktualisierung',
      loading:'Wird geladen...', nodesDistribution:'Knotenverteilung', nodes:'Knoten',
      colNodeId:'Knoten-ID', colLocal:'Lokal', colStatus:'Status', colKeys:'Schlüssel', colKeysDist:'Schlüsselverteilung',
      nodeLocal:'LOKAL', nodeHealthy:'Healthy', nodeUnhealthy:'Unhealthy', noNodesFound:'Keine Knoten gefunden',
    },
    sseStats: {
      title:'SSE-Statistiken', subtitle:'Echtzeit-Monitoring der Server-Sent Events Verbindungen',
      refresh:'Aktualisieren', autoRefreshOn:'Auto-Aktualisierung AN', autoRefreshOff:'Auto-Aktualisierung AUS',
      autoRefreshTooltipDisable:'Klicken zum Deaktivieren der Auto-Aktualisierung', autoRefreshTooltipEnable:'Klicken zum Aktivieren der Auto-Aktualisierung',
      kpiActiveConnections:'Aktive Verbindungen', kpiTotalCreated:'gesamt erstellt', kpiEventsSent:'Gesendete Ereignisse',
      kpiDifferentTypes:'verschiedene Typen', kpiKeepalive:'Keepalive gesendet', kpiDisconnections:'Trennungen',
      kpiLostEvents:'Verlorene Ereignisse', kpiQueueFull:'Warteschlange voll', cardSubDetails:'Abonnement-Details',
      cardEventDetails:'Ereignis-Details', cardPerfMetrics:'Leistungsmetriken',
      subTotalCreated:'Gesamt erstellt:', subActive:'Aktiv:', subClosed:'Geschlossen:', subWildcard:'Wildcard:', subLastCreated:'Zuletzt erstellt:',
      evtTotal:'Ereignisse gesamt:', evtDropped:'Verloren (Warteschlange):', evtLastSent:'Zuletzt gesendet:',
      perfAvgDuration:'Ø Abonnementdauer:', perfMaxQueue:'Max. Warteschlangengröße:',
      perfKeepalive:'Keepalive gesendet:', perfDisconnections:'Erkannte Trennungen:',
      cardEventsByType:'Ereignisse nach Typ', cardSubsByKey:'Abonnements nach Schlüssel',
      cardSubsByEnv:'Abonnements nach Umgebung', cardSubsByCategory:'Abonnements nach Kategorie',
      colEventType:'Ereignistyp', colKey:'Schlüssel', colEnvironment:'Umgebung', colCategory:'Kategorie',
      colCount:'Anzahl', noStats:'Keine Statistiken verfügbar', loadingStats:'Statistiken werden geladen...',
    },
    metrics: {
      title:'Metriken', subtitle:'Leistungsüberwachung und Systemstatistiken',
      refresh:'Aktualisieren', autoRefreshOn:'Auto-Aktualisierung AN', autoRefreshOff:'Auto-Aktualisierung AUS',
      autoRefreshTooltipDisable:'Klicken zum Deaktivieren der Auto-Aktualisierung', autoRefreshTooltipEnable:'Klicken zum Aktivieren der Auto-Aktualisierung',
      kpiHttpRequests:'HTTP-Anfragen gesamt', kpiTotalConfigs:'Gesamtkonfigurationen',
      kpiEncryptionOps:'Verschlüsselungsoperationen', kpiApiErrors:'API-Fehler',
      groupHttp:'HTTP-Anfragen', groupConfigs:'Konfigurationsoperationen', groupCluster:'Cluster',
      groupEncryption:'Verschlüsselung', groupErrors:'API-Fehler',
      colValue:'Wert', noMetrics:'Keine Metriken verfügbar', loadingMetrics:'Metriken werden geladen...',
    },
    backup: {
      title:'Backup & Import', subtitle:'Konfigurationsimport und -export verwalten',
      cardExportTitle:'Konfigurationen exportieren',
      exportInfoBanner:'Erstelle ein verschlüsseltes Backup der ausgewählten Konfigurationen',
      exportEnvLabel:'Umgebung (optional)', exportEnvPlaceholder:'Alle Umgebungen',
      exportCatLabel:'Kategorie (optional)', exportCatPlaceholder:'Alle Kategorien',
      exportPasswordLabel:'Backup-Passwort *', exportPasswordPlaceholder:'Passwort für Verschlüsselung eingeben',
      filterSummaryPrefix:'Es werden nur Konfigurationen exportiert',
      filterSummaryEnv:'aus Umgebung', filterSummaryCat:'aus Kategorie',
      btnGenerateBackup:'Backup erstellen',
      cardImportTitle:'Konfigurationen importieren',
      importInfoBanner:'Konfigurationen aus einem verschlüsselten Backup wiederherstellen',
      importDataLabel:'Backup-Daten *', importDataPlaceholder:'Backup-Daten hier einfügen...',
      importPasswordLabel:'Backup-Passwort *', importPasswordPlaceholder:'Backup-Passwort',
      importOverwriteLabel:'Vorhandene Konfigurationen überschreiben', btnImportBackup:'Backup importieren',
      cardFileTitle:'Aus Datei importieren',
      fileInfoBanner:'Backup-Datei hochladen (.json oder .txt)',
      fileSelectLabel:'Backup-Datei auswählen', fileNoFileSelected:'Keine Datei ausgewählt',
      filePasswordLabel:'Backup-Passwort *', filePasswordPlaceholder:'Backup-Passwort',
      fileOverwriteLabel:'Vorhandene Konfigurationen überschreiben', btnImportFromFile:'Aus Datei importieren',
      toastWarnSummary:'Achtung',
      toastWarnNeedPassword:'Bitte gib ein Backup-Passwort ein',
      toastWarnNeedDataAndPw:'Bitte gib Backup-Daten und Passwort ein',
      toastWarnNeedFileAndPw:'Bitte wähle eine Datei und gib das Passwort ein',
      toastSuccessSummary:'Erfolg',
      toastExportSuccess:'Backup erfolgreich erstellt und heruntergeladen',
      toastImportSuccess:'{imported} Konfigurationen importiert, {skipped} übersprungen',
      toastImportPartial:'{count} Konfigurationen konnten nicht importiert werden',
      toastErrorSummary:'Fehler',
      toastExportError:'Fehler beim Erstellen des Backups',
      toastImportError:'Fehler beim Importieren des Backups',
      toastFileImportError:'Fehler beim Importieren der Datei',
    },
  },

  // ══════════════════════════════════════════════════════════════ FRANÇAIS ══
  fr: {
    nav: { dashboard:'Tableau de bord', configurations:'Configurations', charts:'Graphiques', cluster:'Cluster', sseStats:'Stats SSE', metrics:'Métriques', backup:'Sauvegarde' },
    sidebar: { expandMenu:'Développer le menu', lightMode:'Mode clair', darkMode:'Mode sombre', connected:'Connecté', disconnected:'Déconnecté', serverOk:'Serveur accessible', serverKo:'Serveur inaccessible' },
    topbar: { title:'OpenSecureConf Admin' },
    dashboard: {
      subtitle:'Vue d\'ensemble générale du système OpenSecureConf', totalConfigs:'Configurations totales', categories:'Catégories',
      environments:'Environnements', cluster:'Cluster', clusterEnabled:'Activé', clusterDisabled:'Désactivé',
      serviceInfo:'Informations du service', service:'Service', version:'Version',
      configsByCategory:'Configurations par catégorie', configsByEnvironment:'Configurations par environnement',
      colCategory:'Catégorie', colEnvironment:'Environnement', colCount:'Nombre',
      noCategory:'Sans catégorie', noEnvironment:'Sans environnement',
      emptyCategoryMsg:'Aucune catégorie trouvée', emptyEnvironmentMsg:'Aucun environnement trouvé',
    },
    configs: {
      title:'Gestion des configurations', subtitle:'Gérez toutes les configurations du système',
      newConfig:'Nouvelle configuration', searchPlaceholder:'Rechercher...', filterByCategory:'Filtrer par catégorie',
      filterByEnvironment:'Filtrer par environnement', exportCsv:'Exporter CSV', exportCsvTooltip:'Exporter les données filtrées en CSV',
      categoriesSelected:'{0} catégories sélectionnées', environmentsSelected:'{0} environnements sélectionnés',
      colKey:'Clé', colValue:'Valeur', colCategory:'Catégorie', colEnvironment:'Environnement',
      colCreated:'Création', colUpdated:'Modification', colActions:'Actions',
      total:'Total', totalConfigs:'configurations', showing:'Affichées',
      newConfigTitle:'Nouvelle configuration', editConfigTitle:'Modifier la configuration',
      fieldKey:'Clé *', fieldValue:'Valeur * (JSON)', fieldValueHint:'Saisissez une valeur JSON valide',
      fieldValuePlaceholder:'Ex. : {"host": "localhost", "port": 5432} ou "chaîne" ou 123 ou true',
      fieldCategory:'Catégorie', fieldCategoryHint:'Utilisez / ou \\ pour des hiérarchies (ex. : PARENT/ENFANT)',
      fieldCategoryPlaceholder:'Ex. : STOCKAGE ou LOGS/DR', fieldEnvironment:'Environnement *',
      fieldEnvironmentPlaceholder:'Sélectionner ou saisir', btnCancel:'Annuler', btnCreate:'Créer', btnSave:'Enregistrer',
      viewTitle:'Détails de la configuration', viewKey:'Clé :', viewId:'ID :', viewCategory:'Catégorie :',
      viewEnvironment:'Environnement :', viewCreated:'Date de création :', viewUpdated:'Date de modification :', viewValue:'Valeur :',
      deleteConfirmMsg:'Êtes-vous sûr de vouloir supprimer la configuration "{key}" de l\'environnement "{env}" ?',
      deleteConfirmHeader:'Confirmer la suppression', deleteYes:'Oui', deleteNo:'Non',
      toastSuccessSummary:'Succès', toastCreated:'Configuration créée avec succès',
      toastUpdated:'Configuration mise à jour avec succès', toastDeleted:'Configuration supprimée',
      toastErrorSummary:'Erreur', toastLoadError:'Impossible de charger les configurations',
      toastDeleteError:'Impossible de supprimer', toastOpFailed:'Opération échouée',
      toastKeyRequired:'La clé est obligatoire', toastEnvRequired:'L\'environnement est obligatoire',
      toastInvalidJson:'La valeur n\'est pas un JSON valide',
    },
    charts: {
      title:'Graphiques', subtitle:'Distribution visuelle des configurations par catégorie et environnement',
      refresh:'Actualiser', refreshTooltip:'Recharger les données', kpiTotalConfigs:'Configurations totales',
      kpiUniqueCategories:'Catégories uniques', kpiUniqueEnvironments:'Environnements uniques', kpiUncategorized:'Sans catégorie',
      chartByCategory:'Configurations par catégorie', chartByEnvironment:'Configurations par environnement',
      chartByEnvAndCat:'Configurations par environnement et catégorie', chartTopCategories:'Top catégories par nombre de configurations',
      badgeCategories:'catégories', badgeEnvironments:'environnements', badgeDetailed:'distribution détaillée',
      badgeSortedByCount:'triées par nombre', noData:'Aucune donnée disponible', noEnvironment:'(aucun)',
      configurations:'Configurations', tooltipConfigs:'configurations',
    },
    cluster: {
      title:'Cluster Status', subtitle:'Surveiller l\'état du cluster OpenSecureConf',
      nextRefresh:'Prochaine actualisation', autoRefreshOn:'ON', autoRefreshOff:'OFF',
      disableAutoRefresh:'Désactiver l\'actualisation auto', enableAutoRefresh:'Activer l\'actualisation auto', refresh:'Actualiser',
      clusterInfo:'Informations du cluster', clusterMode:'Mode cluster', nodeType:'Type de nœud',
      nodeTypeReplica:'Réplique', nodeTypeMaster:'Maître', synchronization:'Synchronisation',
      syncOk:'Synchronisés', syncKo:'Non synchronisés', totalNodes:'Nœuds totaux', inCluster:'dans le cluster',
      activeNodes:'Nœuds actifs', availability:'disponibilité', totalKeys:'Clés totales', perNode:'par nœud',
      healthCheck:'Health Check', status:'Statut', nodeId:'ID du nœud', lastUpdate:'Dernière mise à jour',
      loading:'Chargement...', nodesDistribution:'Distribution des nœuds', nodes:'nœuds',
      colNodeId:'ID du nœud', colLocal:'Local', colStatus:'Statut', colKeys:'Clés', colKeysDist:'Distribution des clés',
      nodeLocal:'LOCAL', nodeHealthy:'Healthy', nodeUnhealthy:'Unhealthy', noNodesFound:'Aucun nœud trouvé',
    },
    sseStats: {
      title:'Statistiques SSE', subtitle:'Surveillance en temps réel des connexions Server-Sent Events',
      refresh:'Actualiser', autoRefreshOn:'Actualisation auto ON', autoRefreshOff:'Actualisation auto OFF',
      autoRefreshTooltipDisable:'Cliquer pour désactiver l\'actualisation auto', autoRefreshTooltipEnable:'Cliquer pour activer l\'actualisation auto',
      kpiActiveConnections:'Connexions actives', kpiTotalCreated:'créées au total', kpiEventsSent:'Événements envoyés',
      kpiDifferentTypes:'types différents', kpiKeepalive:'Keepalive envoyés', kpiDisconnections:'déconnexions',
      kpiLostEvents:'Événements perdus', kpiQueueFull:'File d\'attente pleine', cardSubDetails:'Détails des abonnements',
      cardEventDetails:'Détails des événements', cardPerfMetrics:'Métriques de performance',
      subTotalCreated:'Créés au total :', subActive:'Actifs :', subClosed:'Fermés :', subWildcard:'Wildcard :', subLastCreated:'Dernière création :',
      evtTotal:'Événements totaux :', evtDropped:'Perdus (file) :', evtLastSent:'Dernier envoi :',
      perfAvgDuration:'Durée moy. d\'abonnement :', perfMaxQueue:'Taille max. de file :',
      perfKeepalive:'Keepalive envoyés :', perfDisconnections:'Déconnexions détectées :',
      cardEventsByType:'Événements par type', cardSubsByKey:'Abonnements par clé',
      cardSubsByEnv:'Abonnements par environnement', cardSubsByCategory:'Abonnements par catégorie',
      colEventType:'Type d\'événement', colKey:'Clé', colEnvironment:'Environnement', colCategory:'Catégorie',
      colCount:'Nombre', noStats:'Aucune statistique disponible', loadingStats:'Chargement des statistiques...',
    },
    metrics: {
      title:'Métriques', subtitle:'Surveillance des performances et statistiques du système',
      refresh:'Actualiser', autoRefreshOn:'Actualisation auto ON', autoRefreshOff:'Actualisation auto OFF',
      autoRefreshTooltipDisable:'Cliquer pour désactiver l\'actualisation auto', autoRefreshTooltipEnable:'Cliquer pour activer l\'actualisation auto',
      kpiHttpRequests:'Requêtes HTTP totales', kpiTotalConfigs:'Configurations totales',
      kpiEncryptionOps:'Opérations de chiffrement', kpiApiErrors:'Erreurs API',
      groupHttp:'Requêtes HTTP', groupConfigs:'Opérations de configuration', groupCluster:'Cluster',
      groupEncryption:'Chiffrement', groupErrors:'Erreurs API',
      colValue:'Valeur', noMetrics:'Aucune métrique disponible', loadingMetrics:'Chargement des métriques...',
    },
    backup: {
      title:'Sauvegarde & Import', subtitle:'Gérer l\'import et l\'export des configurations',
      cardExportTitle:'Exporter les configurations',
      exportInfoBanner:'Créer une sauvegarde chiffrée des configurations sélectionnées',
      exportEnvLabel:'Environnement (optionnel)', exportEnvPlaceholder:'Tous les environnements',
      exportCatLabel:'Catégorie (optionnel)', exportCatPlaceholder:'Toutes les catégories',
      exportPasswordLabel:'Mot de passe de sauvegarde *', exportPasswordPlaceholder:'Entrer le mot de passe de chiffrement',
      filterSummaryPrefix:'Seules les configurations seront exportées',
      filterSummaryEnv:'de l\'environnement', filterSummaryCat:'de la catégorie',
      btnGenerateBackup:'Générer la sauvegarde',
      cardImportTitle:'Importer les configurations',
      importInfoBanner:'Restaurer les configurations depuis une sauvegarde chiffrée',
      importDataLabel:'Données de sauvegarde *', importDataPlaceholder:'Coller les données de sauvegarde ici...',
      importPasswordLabel:'Mot de passe de sauvegarde *', importPasswordPlaceholder:'Mot de passe de la sauvegarde',
      importOverwriteLabel:'Écraser les configurations existantes', btnImportBackup:'Importer la sauvegarde',
      cardFileTitle:'Importer depuis un fichier',
      fileInfoBanner:'Charger un fichier de sauvegarde (.json ou .txt)',
      fileSelectLabel:'Sélectionner le fichier de sauvegarde', fileNoFileSelected:'Aucun fichier sélectionné',
      filePasswordLabel:'Mot de passe de sauvegarde *', filePasswordPlaceholder:'Mot de passe de la sauvegarde',
      fileOverwriteLabel:'Écraser les configurations existantes', btnImportFromFile:'Importer depuis un fichier',
      toastWarnSummary:'Attention',
      toastWarnNeedPassword:'Veuillez entrer un mot de passe de sauvegarde',
      toastWarnNeedDataAndPw:'Veuillez entrer les données de sauvegarde et le mot de passe',
      toastWarnNeedFileAndPw:'Veuillez sélectionner un fichier et entrer le mot de passe',
      toastSuccessSummary:'Succès',
      toastExportSuccess:'Sauvegarde générée et téléchargée avec succès',
      toastImportSuccess:'{imported} configurations importées, {skipped} ignorées',
      toastImportPartial:'{count} configurations n\'ont pas pu être importées',
      toastErrorSummary:'Erreur',
      toastExportError:'Erreur lors de la génération de la sauvegarde',
      toastImportError:'Erreur lors de l\'importation de la sauvegarde',
      toastFileImportError:'Erreur lors de l\'importation du fichier',
    },
  },

  // ══════════════════════════════════════════════════════════════ ESPAÑOL ══
  es: {
    nav: { dashboard:'Panel', configurations:'Configuraciones', charts:'Gráficos', cluster:'Clúster', sseStats:'Stats SSE', metrics:'Métricas', backup:'Copia de seguridad' },
    sidebar: { expandMenu:'Expandir menú', lightMode:'Modo claro', darkMode:'Modo oscuro', connected:'Conectado', disconnected:'Desconectado', serverOk:'Servidor accesible', serverKo:'Servidor inaccesible' },
    topbar: { title:'OpenSecureConf Admin' },
    dashboard: {
      subtitle:'Resumen general del sistema OpenSecureConf', totalConfigs:'Configuraciones totales', categories:'Categorías',
      environments:'Entornos', cluster:'Clúster', clusterEnabled:'Habilitado', clusterDisabled:'Deshabilitado',
      serviceInfo:'Información del servicio', service:'Servicio', version:'Versión',
      configsByCategory:'Configuraciones por categoría', configsByEnvironment:'Configuraciones por entorno',
      colCategory:'Categoría', colEnvironment:'Entorno', colCount:'Recuento',
      noCategory:'Sin categoría', noEnvironment:'Sin entorno',
      emptyCategoryMsg:'No se encontraron categorías', emptyEnvironmentMsg:'No se encontraron entornos',
    },
    configs: {
      title:'Gestión de configuraciones', subtitle:'Administra todas las configuraciones del sistema',
      newConfig:'Nueva configuración', searchPlaceholder:'Buscar...', filterByCategory:'Filtrar por categoría',
      filterByEnvironment:'Filtrar por entorno', exportCsv:'Exportar CSV', exportCsvTooltip:'Exportar los datos filtrados a CSV',
      categoriesSelected:'{0} categorías seleccionadas', environmentsSelected:'{0} entornos seleccionados',
      colKey:'Clave', colValue:'Valor', colCategory:'Categoría', colEnvironment:'Entorno',
      colCreated:'Creación', colUpdated:'Modificación', colActions:'Acciones',
      total:'Total', totalConfigs:'configuraciones', showing:'Mostrando',
      newConfigTitle:'Nueva configuración', editConfigTitle:'Editar configuración',
      fieldKey:'Clave *', fieldValue:'Valor * (JSON)', fieldValueHint:'Introduce un valor JSON válido',
      fieldValuePlaceholder:'Ej.: {"host": "localhost", "port": 5432} o "cadena" o 123 o true',
      fieldCategory:'Categoría', fieldCategoryHint:'Usa / o \\ para jerarquías (ej.: PADRE/HIJO)',
      fieldCategoryPlaceholder:'Ej.: ALMACENAMIENTO o LOGS/DR', fieldEnvironment:'Entorno *',
      fieldEnvironmentPlaceholder:'Seleccionar o escribir', btnCancel:'Cancelar', btnCreate:'Crear', btnSave:'Guardar',
      viewTitle:'Detalles de la configuración', viewKey:'Clave:', viewId:'ID:', viewCategory:'Categoría:',
      viewEnvironment:'Entorno:', viewCreated:'Fecha de creación:', viewUpdated:'Fecha de modificación:', viewValue:'Valor:',
      deleteConfirmMsg:'¿Seguro que deseas eliminar la configuración "{key}" del entorno "{env}"?',
      deleteConfirmHeader:'Confirmar eliminación', deleteYes:'Sí', deleteNo:'No',
      toastSuccessSummary:'Éxito', toastCreated:'Configuración creada correctamente',
      toastUpdated:'Configuración actualizada correctamente', toastDeleted:'Configuración eliminada',
      toastErrorSummary:'Error', toastLoadError:'No se pueden cargar las configuraciones',
      toastDeleteError:'No se puede eliminar', toastOpFailed:'Operación fallida',
      toastKeyRequired:'La clave es obligatoria', toastEnvRequired:'El entorno es obligatorio',
      toastInvalidJson:'El valor no es un JSON válido',
    },
    charts: {
      title:'Gráficos', subtitle:'Distribución visual de las configuraciones por categoría y entorno',
      refresh:'Actualizar', refreshTooltip:'Recargar datos', kpiTotalConfigs:'Configuraciones totales',
      kpiUniqueCategories:'Categorías únicas', kpiUniqueEnvironments:'Entornos únicos', kpiUncategorized:'Sin categoría',
      chartByCategory:'Configuraciones por categoría', chartByEnvironment:'Configuraciones por entorno',
      chartByEnvAndCat:'Configuraciones por entorno y categoría', chartTopCategories:'Top categorías por número de configuraciones',
      badgeCategories:'categorías', badgeEnvironments:'entornos', badgeDetailed:'distribución detallada',
      badgeSortedByCount:'ordenadas por recuento', noData:'No hay datos disponibles', noEnvironment:'(ninguno)',
      configurations:'Configuraciones', tooltipConfigs:'configuraciones',
    },
    cluster: {
      title:'Cluster Status', subtitle:'Monitorear el estado del clúster OpenSecureConf',
      nextRefresh:'Próxima actualización', autoRefreshOn:'ON', autoRefreshOff:'OFF',
      disableAutoRefresh:'Desactivar actualización automática', enableAutoRefresh:'Activar actualización automática', refresh:'Actualizar',
      clusterInfo:'Información del clúster', clusterMode:'Modo clúster', nodeType:'Tipo de nodo',
      nodeTypeReplica:'Réplica', nodeTypeMaster:'Maestro', synchronization:'Sincronización',
      syncOk:'Sincronizados', syncKo:'No sincronizados', totalNodes:'Nodos totales', inCluster:'en el clúster',
      activeNodes:'Nodos activos', availability:'disponibilidad', totalKeys:'Claves totales', perNode:'por nodo',
      healthCheck:'Health Check', status:'Estado', nodeId:'ID de nodo', lastUpdate:'Última actualización',
      loading:'Cargando...', nodesDistribution:'Distribución de nodos', nodes:'nodos',
      colNodeId:'ID de nodo', colLocal:'Local', colStatus:'Estado', colKeys:'Claves', colKeysDist:'Distribución de claves',
      nodeLocal:'LOCAL', nodeHealthy:'Healthy', nodeUnhealthy:'Unhealthy', noNodesFound:'No se encontraron nodos',
    },
    sseStats: {
      title:'Estadísticas SSE', subtitle:'Monitoreo en tiempo real de las conexiones Server-Sent Events',
      refresh:'Actualizar', autoRefreshOn:'Actualización auto ON', autoRefreshOff:'Actualización auto OFF',
      autoRefreshTooltipDisable:'Clic para desactivar la actualización automática', autoRefreshTooltipEnable:'Clic para activar la actualización automática',
      kpiActiveConnections:'Conexiones activas', kpiTotalCreated:'creadas en total', kpiEventsSent:'Eventos enviados',
      kpiDifferentTypes:'tipos diferentes', kpiKeepalive:'Keepalive enviados', kpiDisconnections:'desconexiones',
      kpiLostEvents:'Eventos perdidos', kpiQueueFull:'Cola llena', cardSubDetails:'Detalles de suscripciones',
      cardEventDetails:'Detalles de eventos', cardPerfMetrics:'Métricas de rendimiento',
      subTotalCreated:'Creadas en total:', subActive:'Activas:', subClosed:'Cerradas:', subWildcard:'Wildcard:', subLastCreated:'Última creación:',
      evtTotal:'Eventos totales:', evtDropped:'Perdidos (cola):', evtLastSent:'Último envío:',
      perfAvgDuration:'Duración media de suscripción:', perfMaxQueue:'Tamaño máx. de cola:',
      perfKeepalive:'Keepalive enviados:', perfDisconnections:'Desconexiones detectadas:',
      cardEventsByType:'Eventos por tipo', cardSubsByKey:'Suscripciones por clave',
      cardSubsByEnv:'Suscripciones por entorno', cardSubsByCategory:'Suscripciones por categoría',
      colEventType:'Tipo de evento', colKey:'Clave', colEnvironment:'Entorno', colCategory:'Categoría',
      colCount:'Recuento', noStats:'No hay estadísticas disponibles', loadingStats:'Cargando estadísticas...',
    },
    metrics: {
      title:'Métricas', subtitle:'Monitoreo de rendimiento y estadísticas del sistema',
      refresh:'Actualizar', autoRefreshOn:'Actualización auto ON', autoRefreshOff:'Actualización auto OFF',
      autoRefreshTooltipDisable:'Clic para desactivar la actualización automática', autoRefreshTooltipEnable:'Clic para activar la actualización automática',
      kpiHttpRequests:'Solicitudes HTTP totales', kpiTotalConfigs:'Configuraciones totales',
      kpiEncryptionOps:'Operaciones de cifrado', kpiApiErrors:'Errores API',
      groupHttp:'Solicitudes HTTP', groupConfigs:'Operaciones de configuración', groupCluster:'Clúster',
      groupEncryption:'Cifrado', groupErrors:'Errores API',
      colValue:'Valor', noMetrics:'No hay métricas disponibles', loadingMetrics:'Cargando métricas...',
    },
    backup: {
      title:'Copia de seguridad & Import', subtitle:'Gestionar importación y exportación de configuraciones',
      cardExportTitle:'Exportar configuraciones',
      exportInfoBanner:'Crear una copia de seguridad cifrada de las configuraciones seleccionadas',
      exportEnvLabel:'Entorno (opcional)', exportEnvPlaceholder:'Todos los entornos',
      exportCatLabel:'Categoría (opcional)', exportCatPlaceholder:'Todas las categorías',
      exportPasswordLabel:'Contraseña de copia *', exportPasswordPlaceholder:'Introducir contraseña de cifrado',
      filterSummaryPrefix:'Solo se exportarán las configuraciones',
      filterSummaryEnv:'del entorno', filterSummaryCat:'de la categoría',
      btnGenerateBackup:'Generar copia de seguridad',
      cardImportTitle:'Importar configuraciones',
      importInfoBanner:'Restaurar configuraciones desde una copia de seguridad cifrada',
      importDataLabel:'Datos de copia *', importDataPlaceholder:'Pegar aquí los datos de la copia de seguridad...',
      importPasswordLabel:'Contraseña de copia *', importPasswordPlaceholder:'Contraseña de la copia',
      importOverwriteLabel:'Sobrescribir configuraciones existentes', btnImportBackup:'Importar copia de seguridad',
      cardFileTitle:'Importar desde archivo',
      fileInfoBanner:'Cargar un archivo de copia de seguridad (.json o .txt)',
      fileSelectLabel:'Seleccionar archivo de copia', fileNoFileSelected:'Ningún archivo seleccionado',
      filePasswordLabel:'Contraseña de copia *', filePasswordPlaceholder:'Contraseña de la copia',
      fileOverwriteLabel:'Sobrescribir configuraciones existentes', btnImportFromFile:'Importar desde archivo',
      toastWarnSummary:'Atención',
      toastWarnNeedPassword:'Por favor, introduce una contraseña de copia de seguridad',
      toastWarnNeedDataAndPw:'Por favor, introduce los datos de la copia y la contraseña',
      toastWarnNeedFileAndPw:'Por favor, selecciona un archivo e introduce la contraseña',
      toastSuccessSummary:'Éxito',
      toastExportSuccess:'Copia de seguridad generada y descargada correctamente',
      toastImportSuccess:'{imported} configuraciones importadas, {skipped} omitidas',
      toastImportPartial:'{count} configuraciones no pudieron importarse',
      toastErrorSummary:'Error',
      toastExportError:'Error al generar la copia de seguridad',
      toastImportError:'Error al importar la copia de seguridad',
      toastFileImportError:'Error al importar el archivo',
    },
  },
};