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

      <div class="header-section">
        <h1>Gestione Configurazioni</h1>
        <p-button label="Nuova Configurazione" icon="pi pi-plus" (onClick)="showCreateDialog()"></p-button>
      </div>

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
            <th class="actions-column">Azioni</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-config>
          <tr>
            <td>
              <strong>{{ config.key }}</strong>
            </td>
            <td>
              <div class="value-preview">
                {{ formatValue(config.value) }}
              </div>
            </td>
            <td>
              <p-tag *ngIf="config.category" [value]="config.category"></p-tag>
              <span *ngIf="!config.category" class="text-muted">-</span>
            </td>
            <td>
              <p-tag *ngIf="config.environment" 
                     [value]="config.environment"
                     [severity]="getEnvironmentSeverity(config.environment)">
              </p-tag>
              <span *ngIf="!config.environment" class="text-muted">-</span>
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
            <td colspan="5" class="text-center">
              Nessuna configurazione trovata
            </td>
          </tr>
        </ng-template>
      </p-table>

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
        [style]="{ width: '50vw' }"
        [breakpoints]="{ '960px': '75vw', '640px': '90vw' }">
        
        <div class="view-container" *ngIf="viewingConfig">
          <div class="view-field">
            <strong>Chiave:</strong>
            <span>{{ viewingConfig.key }}</span>
          </div>

          <div class="view-field">
            <strong>Valore:</strong>
            <pre class="value-display">{{ formatValuePretty(viewingConfig.value) }}</pre>
          </div>

          <div class="view-field" *ngIf="viewingConfig.category">
            <strong>Categoria:</strong>
            <p-tag [value]="viewingConfig.category"></p-tag>
          </div>

          <div class="view-field" *ngIf="viewingConfig.environment">
            <strong>Ambiente:</strong>
            <p-tag [value]="viewingConfig.environment" 
                   [severity]="getEnvironmentSeverity(viewingConfig.environment)">
            </p-tag>
          </div>

          <div class="view-field" *ngIf="viewingConfig.id">
            <strong>ID:</strong>
            <span>{{ viewingConfig.id }}</span>
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
    .config-list { animation: fadeIn 0.3s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
    h1 { color: #495057; margin: 0; }
    .table-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .filter-section { display: flex; gap: 0.5rem; }
    .value-preview { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; font-size: 0.875rem; }
    .actions-column { width: 150px; text-align: center; }
    .form-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    .field label { font-weight: 600; color: #495057; }
    .text-muted { color: #6c757d; font-style: italic; }
    .view-container { display: flex; flex-direction: column; gap: 1.5rem; }
    .view-field { display: flex; flex-direction: column; gap: 0.5rem; }
    .view-field strong { color: #495057; }
    .value-display { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 1rem; font-family: monospace; font-size: 0.875rem; white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow-y: auto; }
    .w-full { width: 100%; }
    .text-center { text-align: center; padding: 2rem; }
  `]
})
export class ConfigListComponent implements OnInit {
  configs: ConfigEntry[] = [];
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
  viewingConfig: ConfigEntry | null = null;

  constructor(
    private oscService: OpenSecureConfService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadConfigs();
    this.loadFilters();
  }

  loadConfigs() {
    this.loading = true;
    const filters: any = {};
    
    if (this.selectedCategory) filters.category = this.selectedCategory;
    if (this.selectedEnvironment) filters.environment = this.selectedEnvironment;

    this.oscService.listConfigs(filters).subscribe({
      next: (configs) => {
        this.configs = configs;
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
    this.displayDialog = true;
  }

  editConfig(config: ConfigEntry) {
    this.dialogMode = 'edit';
    this.currentConfig = { ...config };
    this.currentConfigValueString = JSON.stringify(config.value, null, 2);
    this.displayDialog = true;
  }

  viewConfig(config: ConfigEntry) {
    this.viewingConfig = config;
    this.displayViewDialog = true;
  }

  saveConfig() {
    if (!this.currentConfig.key) {
      this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'La chiave è obbligatoria' });
      return;
    }

    let value: any;
    try {
      value = JSON.parse(this.currentConfigValueString);
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Errore', detail: 'Il valore non è un JSON valido' });
      return;
    }

    const options = { category: this.currentConfig.category, environment: this.currentConfig.environment };
    const operation = this.dialogMode === 'create'
      ? this.oscService.createConfig(this.currentConfig.key, value, options)
      : this.oscService.updateConfig(this.currentConfig.key!, value, options);

    operation.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Successo', detail: `Configurazione ${this.dialogMode === 'create' ? 'creata' : 'aggiornata'} con successo` });
        this.displayDialog = false;
        this.loadConfigs();
        this.loadFilters();
      },
      error: (error) => {
        this.messageService.add({ severity: 'error', summary: 'Errore', detail: error.detail || 'Operazione fallita' });
      }
    });
  }

  deleteConfig(config: ConfigEntry) {
    this.confirmationService.confirm({
      message: `Sei sicuro di voler eliminare la configurazione "${config.key}"?`,
      header: 'Conferma Eliminazione',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sì',
      rejectLabel: 'No',
      accept: () => {
        this.oscService.deleteConfig(config.key).subscribe({
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

  getEnvironmentSeverity(environment: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    const envLower = environment?.toLowerCase();
    if (envLower === 'production' || envLower === 'prod') return 'danger';
    if (envLower === 'staging' || envLower === 'stage') return 'warning';
    if (envLower === 'development' || envLower === 'dev') return 'info';
    return 'secondary';
  }
}
