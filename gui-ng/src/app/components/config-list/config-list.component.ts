import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { ConfigEntry } from 'opensecureconf-client';

// Aggiunto tipo per PrimeNG severity
type PrimeNGSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';

interface ExtendedConfigEntry extends ConfigEntry {
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-config-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    DropdownModule,
    InputTextareaModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="config-list">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>
              <i class="pi pi-cog"></i>
              Gestione Configurazioni
            </h1>
            <p>Gestisci tutte le configurazioni del sistema</p>
          </div>
          <p-button 
            label="Nuova Configurazione" 
            icon="pi pi-plus" 
            (onClick)="showCreateDialog()"
            styleClass="p-button-success">
          </p-button>
        </div>
      </div>

      <div class="table-card">
        <p-table 
          #dt
          [value]="configs" 
          [paginator]="true" 
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          [loading]="loading"
          [globalFilterFields]="['key', 'category', 'environment']"
          [tableStyle]="{ 'min-width': '100%' }"
          styleClass="p-datatable-striped">
          
          <ng-template pTemplate="caption">
            <div class="table-header">
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input 
                  pInputText 
                  type="text" 
                  (input)="dt.filterGlobal($any($event.target).value, 'contains')" 
                  placeholder="Cerca..." />
              </span>
              
              <div class="filter-section">
                <p-dropdown 
                  [options]="categoryOptions" 
                  [(ngModel)]="selectedCategory"
                  (onChange)="loadConfigs()"
                  placeholder="Filtra per Categoria"
                  [showClear]="true"
                  styleClass="mr-2">
                </p-dropdown>
                
                <p-dropdown 
                  [options]="environmentOptions" 
                  [(ngModel)]="selectedEnvironment"
                  (onChange)="loadConfigs()"
                  placeholder="Filtra per Ambiente"
                  [showClear]="true">
                </p-dropdown>
              </div>
            </div>
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="key">
                Chiave <p-sortIcon field="key"></p-sortIcon>
              </th>
              <th>Valore</th>
              <th pSortableColumn="category">
                Categoria <p-sortIcon field="category"></p-sortIcon>
              </th>
              <th pSortableColumn="environment">
                Ambiente <p-sortIcon field="environment"></p-sortIcon>
              </th>
              <th pSortableColumn="created_at">
                Creazione <p-sortIcon field="created_at"></p-sortIcon>
              </th>
              <th pSortableColumn="updated_at">
                Modifica <p-sortIcon field="updated_at"></p-sortIcon>
              </th>
              <th class="actions-column">Azioni</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-config>
            <tr>
              <td>
                <strong class="key-text">{{ config.key }}</strong>
              </td>
              <td>
                <div class="value-preview">
                  {{ formatValue(config.value) }}
                </div>
              </td>
              <td>
                <span 
                  *ngIf="config.category" 
                  class="custom-tag"
                  [style.background-color]="getColorForValue(config.category)"
                  [style.color]="getTextColor(getColorForValue(config.category))">
                  {{ config.category }}
                </span>
                <span *ngIf="!config.category" class="text-muted">-</span>
              </td>
              <td>
                <span 
                  *ngIf="config.environment" 
                  class="custom-tag"
                  [style.background-color]="getColorForValue(config.environment)"
                  [style.color]="getTextColor(getColorForValue(config.environment))">
                  {{ config.environment }}
                </span>
                <span *ngIf="!config.environment" class="text-muted">-</span>
              </td>
              <td>
                <span class="date-text" *ngIf="getCreatedAt(config)">
                  <i class="pi pi-calendar-plus"></i>
                  {{ formatDate(getCreatedAt(config)) }}
                </span>
                <span *ngIf="!getCreatedAt(config)" class="text-muted">-</span>
              </td>
              <td>
                <span class="date-text" *ngIf="getUpdatedAt(config)">
                  <i class="pi pi-calendar"></i>
                  {{ formatDate(getUpdatedAt(config)) }}
                </span>
                <span *ngIf="!getUpdatedAt(config)" class="text-muted">-</span>
              </td>
              <td class="actions-column">
                <p-button 
                  icon="pi pi-eye" 
                  [rounded]="true" 
                  [text]="true" 
                  severity="info"
                  (onClick)="viewConfig(config)"
                  pTooltip="Visualizza">
                </p-button>
                <p-button 
                  icon="pi pi-pencil" 
                  [rounded]="true" 
                  [text]="true" 
                  severity="success"
                  (onClick)="editConfig(config)"
                  pTooltip="Modifica">
                </p-button>
                <p-button 
                  icon="pi pi-trash" 
                  [rounded]="true" 
                  [text]="true" 
                  severity="danger"
                  (onClick)="deleteConfig(config)"
                  pTooltip="Elimina">
                </p-button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center">
                Nessuna configurazione trovata
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <p-dialog 
        [(visible)]="displayDialog" 
        [header]="dialogMode === 'create' ? 'Nuova Configurazione' : 'Modifica Configurazione'"
        [modal]="true"
        [style]="{ width: '50vw' }"
        [breakpoints]="{ '960px': '75vw', '640px': '90vw' }">
        
        <div class="form-container">
          <div class="field">
            <label for="key">Chiave *</label>
            <input 
              id="key" 
              type="text" 
              pInputText 
              [(ngModel)]="currentConfig.key"
              [disabled]="dialogMode === 'edit'"
              class="w-full" />
          </div>

          <div class="field">
            <label for="value">Valore * (JSON)</label>
            <textarea 
              id="value" 
              pInputTextarea 
              [(ngModel)]="currentConfigValueString"
              [rows]="8"
              class="w-full"
              placeholder='Es: {"host": "localhost", "port": 5432} o "stringa" o 123 o true'>
            </textarea>
            <small class="text-muted">Inserisci un valore JSON valido</small>
          </div>

          <div class="field">
            <label for="category">Categoria</label>
            <input 
              id="category" 
              type="text" 
              pInputText 
              [(ngModel)]="currentConfig.category"
              class="w-full" />
          </div>

          <div class="field">
            <label for="environment">Ambiente</label>
            <p-dropdown 
              id="environment"
              [options]="environmentDropdownOptions"
              [(ngModel)]="currentConfig.environment"
              [editable]="true"
              placeholder="Seleziona o inserisci"
              class="w-full">
            </p-dropdown>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button 
            label="Annulla" 
            icon="pi pi-times" 
            [text]="true" 
            (onClick)="displayDialog = false">
          </p-button>
          <p-button 
            [label]="dialogMode === 'create' ? 'Crea' : 'Salva'" 
            icon="pi pi-check" 
            (onClick)="saveConfig()">
          </p-button>
        </ng-template>
      </p-dialog>

      <p-dialog 
        [(visible)]="displayViewDialog" 
        header="Dettagli Configurazione"
        [modal]="true"
        [style]="{ width: '60vw' }"
        [breakpoints]="{ '960px': '75vw', '640px': '90vw' }">
        
        <div class="view-container" *ngIf="viewingConfig">
          <div class="view-grid">
            <div class="view-field">
              <strong>Chiave:</strong>
              <span class="view-value">{{ viewingConfig.key }}</span>
            </div>

            <div class="view-field" *ngIf="viewingConfig.id">
              <strong>ID:</strong>
              <span class="view-value">{{ viewingConfig.id }}</span>
            </div>

            <div class="view-field" *ngIf="viewingConfig.category">
              <strong>Categoria:</strong>
              <span 
                class="custom-tag-large"
                [style.background-color]="getColorForValue(viewingConfig.category)"
                [style.color]="getTextColor(getColorForValue(viewingConfig.category))">
                {{ viewingConfig.category }}
              </span>
            </div>

            <div class="view-field" *ngIf="viewingConfig.environment">
              <strong>Ambiente:</strong>
              <span 
                class="custom-tag-large"
                [style.background-color]="getColorForValue(viewingConfig.environment)"
                [style.color]="getTextColor(getColorForValue(viewingConfig.environment))">
                {{ viewingConfig.environment }}
              </span>
            </div>

            <div class="view-field" *ngIf="getCreatedAt(viewingConfig)">
              <strong>Data Creazione:</strong>
              <span class="view-value">
                <i class="pi pi-calendar-plus"></i>
                {{ formatDateLong(getCreatedAt(viewingConfig)) }}
              </span>
            </div>

            <div class="view-field" *ngIf="getUpdatedAt(viewingConfig)">
              <strong>Ultima Modifica:</strong>
              <span class="view-value">
                <i class="pi pi-calendar"></i>
                {{ formatDateLong(getUpdatedAt(viewingConfig)) }}
              </span>
            </div>
          </div>

          <div class="view-field-full">
            <strong>Valore:</strong>
            <pre class="value-display">{{ formatValuePretty(viewingConfig.value) }}</pre>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button 
            label="Chiudi" 
            icon="pi pi-times" 
            (onClick)="displayViewDialog = false">
          </p-button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .config-list { 
      animation: fadeInUp 0.5s ease-out; 
    }

    .page-header {
      margin-bottom: 2rem;
      background: var(--card-bg);
      padding: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 20px var(--shadow-sm);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
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

    .table-card {
      background: var(--card-bg);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px var(--shadow-sm);
    }

    .table-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      flex-wrap: wrap; 
      gap: 1rem; 
    }
    
    .filter-section { 
      display: flex; 
      gap: 0.5rem; 
    }
    
    .key-text {
      color: var(--text-primary) !important;
      font-weight: 600;
    }
    
    .value-preview { 
      max-width: 300px; 
      overflow: hidden; 
      text-overflow: ellipsis; 
      white-space: nowrap; 
      font-family: monospace; 
      font-size: 0.875rem;
      color: var(--text-primary);
      background: var(--bg-secondary);
      padding: 0.5rem;
      border-radius: 6px;
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

    .custom-tag-large {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 25px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .date-text {
      color: var(--text-secondary);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .date-text i {
      color: #667eea;
    }
    
    .actions-column { 
      width: 150px; 
      text-align: center; 
    }
    
    .form-container { 
      display: flex; 
      flex-direction: column; 
      gap: 1.5rem; 
    }
    
    .field { 
      display: flex; 
      flex-direction: column; 
      gap: 0.5rem; 
    }
    
    .field label { 
      font-weight: 600; 
      color: var(--text-primary);
    }
    
    .text-muted { 
      color: var(--text-secondary) !important; 
      font-style: italic; 
    }
    
    .view-container { 
      display: flex; 
      flex-direction: column; 
      gap: 2rem; 
    }

    .view-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    
    .view-field { 
      display: flex; 
      flex-direction: column; 
      gap: 0.75rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 12px;
    }

    .view-field-full {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .view-field strong,
    .view-field-full strong { 
      color: var(--text-secondary);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .view-value {
      color: var(--text-primary);
      font-size: 1.1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .view-value i {
      color: #667eea;
    }
    
    .value-display { 
      background-color: var(--bg-secondary) !important;
      color: var(--text-primary) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 8px !important;
      padding: 1rem !important;
      font-family: 'Courier New', monospace !important;
      font-size: 0.875rem !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      max-height: 400px !important;
      overflow-y: auto !important;
      line-height: 1.6 !important;
    }
    
    .w-full { 
      width: 100%; 
    }
    
    .text-center { 
      text-align: center; 
      padding: 2rem;
      color: var(--text-secondary);
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
export class ConfigListComponent implements OnInit {
  configs: ExtendedConfigEntry[] = [];
  categories: string[] = [];
  environments: string[] = [];
  categoryOptions: Array<{ label: string; value: string }> = [];
  environmentOptions: Array<{ label: string; value: string }> = [];
  environmentDropdownOptions: Array<{ label: string; value: string }> = [
    { label: 'Development', value: 'development' },
    { label: 'Staging', value: 'staging' },
    { label: 'Production', value: 'production' }
  ];
  
  loading = false;
  selectedCategory: string | null = null;
  selectedEnvironment: string | null = null;

  displayDialog = false;
  displayViewDialog = false;
  dialogMode: 'create' | 'edit' = 'create';
  
  currentConfig: Partial<ConfigEntry> = {};
  currentConfigValueString = '';
  viewingConfig: ExtendedConfigEntry | null = null;
  
  // Memorizza l'environment originale per l'edit
  private originalEnvironment: string = '';

  constructor(
    private oscService: OpenSecureConfService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadConfigs();
    this.loadFilters();
  }

  getCreatedAt(config: any): string | null {
    return config?.created_at || config?.createdAt || null;
  }

  getUpdatedAt(config: any): string | null {
    return config?.updated_at || config?.updatedAt || null;
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

  loadConfigs() {
    this.loading = true;
    const filters: any = {};
    
    if (this.selectedCategory) filters.category = this.selectedCategory;
    if (this.selectedEnvironment) filters.environment = this.selectedEnvironment;

    this.oscService.listConfigs(filters).subscribe({
      next: (configs) => {
        this.configs = configs as ExtendedConfigEntry[];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading configs:', error);
        this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'Impossibile caricare le configurazioni' });
        this.loading = false;
      }
    });
  }

  loadFilters() {
    this.oscService.listCategories().subscribe(cats => {
      this.categories = cats;
      this.categoryOptions = cats.map(cat => ({ label: cat, value: cat }));
    });

    this.oscService.listEnvironments().subscribe(envs => {
      this.environments = envs;
      this.environmentOptions = envs.map(env => ({ label: env, value: env }));
    });
  }

  showCreateDialog() {
    this.dialogMode = 'create';
    this.currentConfig = {};
    this.currentConfigValueString = '""';
    this.originalEnvironment = '';
    this.displayDialog = true;
  }

  editConfig(config: ConfigEntry) {
    this.dialogMode = 'edit';
    this.currentConfig = { ...config };
    this.currentConfigValueString = JSON.stringify(config.value, null, 2);
    // Memorizza l'environment originale per l'update
    this.originalEnvironment = config.environment;
    this.displayDialog = true;
  }

  viewConfig(config: ExtendedConfigEntry) {
    this.viewingConfig = config;
    this.displayViewDialog = true;
  }

  saveConfig() {
    if (!this.currentConfig.key) {
      this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'La chiave è obbligatoria' });
      return;
    }

    // Validazione environment obbligatorio
    if (!this.currentConfig.environment) {
      this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'L\'ambiente è obbligatorio' });
      return;
    }

    let value: any;
    try {
      value = JSON.parse(this.currentConfigValueString);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'Il valore non è un JSON valido' });
      return;
    }

    const operation = this.dialogMode === 'create'
      // Create: environment è il terzo parametro
      ? this.oscService.createConfig(
          this.currentConfig.key,
          value,
          this.currentConfig.environment,
          this.currentConfig.category
        )
      // Update: environment è il secondo parametro (usa l'originale)
      : this.oscService.updateConfig(
          this.currentConfig.key!,
          this.originalEnvironment,
          value,
          this.currentConfig.category
        );

    operation.subscribe({
      next: () => {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Successo', 
          detail: `Configurazione ${this.dialogMode === 'create' ? 'creata' : 'aggiornata'} con successo` 
        });
        this.displayDialog = false;
        this.loadConfigs();
        this.loadFilters();
      },
      error: (error) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Errore', 
          detail: error.detail || 'Operazione fallita' 
        });
      }
    });
  }

  deleteConfig(config: ConfigEntry) {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler eliminare la configurazione "${config.key}" dall'ambiente "${config.environment}"?`,
      header: 'Conferma Eliminazione',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sì',
      rejectLabel: 'No',
      accept: () => {
        // Delete richiede environment come secondo parametro
        this.oscService.deleteConfig(config.key, config.environment).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Successo', detail: 'Configurazione eliminata' });
            this.loadConfigs();
            this.loadFilters();
          },
          error: (error) => {
            this.messageService.add({ severity: 'error', summary: 'Errore', detail: error.detail || 'Impossibile eliminare' });
          }
        });
      }
    });
  }

  formatValue(value: any): string {
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  formatValuePretty(value: any): string {
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateLong(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
