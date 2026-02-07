import { Component, OnInit, ViewChild  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule,Table  } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';  
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
    MultiSelectModule,  // ✅ AGGIUNTO
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
          [rowsPerPageOptions]="[10, 25, 50, 75, 100]"
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
                <p-multiSelect 
                  [options]="categoryOptions" 
                  [(ngModel)]="selectedCategories"
                  (ngModelChange)="onFilterChange()"
                  placeholder="Filtra per Categoria"
                  [showClear]="true"
                  [maxSelectedLabels]="2"
                  selectedItemsLabel="{0} categorie selezionate"
                  styleClass="mr-2"
                  display="chip">
                  <ng-template let-value pTemplate="selectedItems">
                    <div class="flex align-items-center gap-2" *ngIf="value && value.length > 0">
                      <div *ngFor="let cat of value" class="inline-flex">
                        <span class="filter-chip">{{ cat }}</span>
                      </div>
                      <span *ngIf="value.length > 2" class="more-label">+{{ value.length - 2 }}</span>
                    </div>
                    <span *ngIf="!value || value.length === 0">Filtra per Categoria</span>
                  </ng-template>
                </p-multiSelect>
                

                <p-multiSelect 
                  [options]="environmentOptions" 
                  [(ngModel)]="selectedEnvironments"
                  (ngModelChange)="onFilterChange()"
                  placeholder="Filtra per Ambiente"
                  [showClear]="true"
                  [maxSelectedLabels]="2"
                  selectedItemsLabel="{0} ambienti selezionati"
                  display="chip">
                  <ng-template let-value pTemplate="selectedItems">
                    <div class="flex align-items-center gap-2" *ngIf="value && value.length > 0">
                      <div *ngFor="let env of value" class="inline-flex">
                        <span class="filter-chip">{{ env }}</span>
                      </div>
                      <span *ngIf="value.length > 2" class="more-label">+{{ value.length - 2 }}</span>
                    </div>
                    <span *ngIf="!value || value.length === 0">Filtra per Ambiente</span>
                  </ng-template>
                </p-multiSelect>

                <p-button 
                  icon="pi pi-download" 
                  label="Esporta CSV"
                  (onClick)="exportFilteredDataToCSV()"
                  severity="success"
                  [outlined]="true"
                  styleClass="ml-2"
                  pTooltip="Esporta i dati filtrati in CSV">
                </p-button>


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

          <ng-template pTemplate="paginatorleft">
            <div class="paginator-info">
              <i class="pi pi-list"></i>
              <span>Totale: <strong>{{ configs.length }}</strong> configurazioni</span>
            </div>
          </ng-template>
          <ng-template pTemplate="paginatorright">
            <div class="paginator-info">
              <i class="pi pi-eye"></i>
              <span>Visualizzate: <strong>{{ dt.first + 1 }}-{{ Math.min(dt.first + dt.rows, configs.length) }}</strong></span>
            </div>
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
                <div *ngIf="config.category" class="hierarchical-tags">
                  <ng-container *ngFor="let part of splitCategory(config.category); let i = index">
                    <span 
                      class="custom-tag"
                      [class.hierarchical-parent]="i === 0"
                      [class.hierarchical-child]="i > 0"
                      [style.background-color]="getColorForHierarchy(config.category, i)"
                      [style.color]="getTextColor(getColorForHierarchy(config.category, i))">
                      {{ part }}
                    </span>
                    <i *ngIf="i < splitCategory(config.category).length - 1" 
                       class="pi pi-angle-right hierarchy-separator"></i>
                  </ng-container>
                </div>
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

      <!-- DIALOG RIMANGONO IDENTICI ... -->
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
              class="w-full"
              placeholder="Es: STORAGE oppure LOGGING/DR" />
            <small class="text-muted">Usa / o \ per creare gerarchie (es: PARENT/CHILD)</small>
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
              <div class="hierarchical-tags-large">
                <ng-container *ngFor="let part of splitCategory(viewingConfig.category); let i = index">
                  <span 
                    class="custom-tag-large"
                    [class.hierarchical-parent]="i === 0"
                    [class.hierarchical-child]="i > 0"
                    [style.background-color]="getColorForHierarchy(viewingConfig.category, i)"
                    [style.color]="getTextColor(getColorForHierarchy(viewingConfig.category, i))">
                    {{ part }}
                  </span>
                  <i *ngIf="i < splitCategory(viewingConfig.category).length - 1" 
                     class="pi pi-angle-right hierarchy-separator-large"></i>
                </ng-container>
              </div>
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
      align-items: center;
    }

    /* ✅ Stili per MultiSelect Chip */
    .filter-chip {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.35rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-right: 0.5rem;
    }

    .more-label {
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
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

    /* Hierarchical Tags */
    .hierarchical-tags {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .hierarchical-tags-large {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .hierarchy-separator {
      color: var(--text-secondary);
      font-size: 1rem;
      opacity: 0.7;
      margin: 0 0.25rem;
    }

    .hierarchy-separator-large {
      color: var(--text-secondary);
      font-size: 1.5rem;
      opacity: 0.7;
      margin: 0 0.25rem;
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

    .custom-tag.hierarchical-parent {
      font-weight: 700;
      padding: 0.5rem 1.25rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .custom-tag.hierarchical-child {
      font-weight: 500;
      opacity: 0.95;
      font-size: 0.8rem;
      padding: 0.4rem 0.9rem;
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

    .custom-tag-large.hierarchical-parent {
      font-weight: 700;
      padding: 0.75rem 1.75rem;
      font-size: 1.1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .custom-tag-large.hierarchical-child {
      font-weight: 500;
      opacity: 0.95;
      padding: 0.65rem 1.3rem;
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

    /* Stilizzazione Paginator - RIMANE IDENTICO */
    :host ::ng-deep {
      .p-paginator {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border: none !important;
        border-radius: 0 0 12px 12px !important;
        padding: 1rem !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 1rem !important;
      }

      .paginator-info {
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
        color: white !important;
        font-weight: 500 !important;
        background: rgba(255, 255, 255, 0.15) !important;
        padding: 0.5rem 1rem !important;
        border-radius: 8px !important;
        font-size: 0.875rem !important;
      }
      .paginator-info i {
        font-size: 1rem !important;
      }
      .paginator-info strong {
        font-weight: 700 !important;
        font-size: 1rem !important;
      }
      
      .p-paginator .p-paginator-content {
        display: flex !important;
        align-items: center !important;
        gap: 1rem !important;
      }
      
      .p-input-icon-left > i:first-of-type {
        left: 0.75rem !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }

      .p-input-icon-left > .p-inputtext {
        padding-left: 2.5rem !important;
      }
      .p-multiselect-panel {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        box-shadow: 0 4px 20px var(--shadow-sm) !important;
      }

      .p-multiselect-panel .p-multiselect-header {
        background: var(--bg-secondary) !important;
        border-bottom: 1px solid var(--border-color) !important;
        padding: 0.5rem 0.75rem !important;
      }

      .p-multiselect-panel .p-multiselect-filter-container {
        padding: 0.5rem 0.75rem !important;
      }

      .p-multiselect-panel .p-multiselect-filter {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        color: var(--text-primary) !important;
        padding: 0.4rem 0.5rem 0.4rem 2rem !important;
        font-size: 0.813rem !important;
        height: 2rem !important;
      }
      .p-multiselect-panel .p-multiselect-filter::placeholder {
        color: var(--text-secondary) !important;
      }

      .p-multiselect-panel .p-multiselect-filter-container .p-multiselect-filter-icon {
        color: var(--text-secondary) !important;
        font-size: 0.813rem !important;
        left: 0.75rem !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }

      .p-multiselect-panel .p-multiselect-items {
        background: var(--card-bg) !important;
        padding: 0.5rem 0 !important;
      }

      .p-multiselect-panel .p-multiselect-items .p-multiselect-item {
        color: var(--text-primary) !important;
        background: transparent !important;
      }

      .p-multiselect-panel .p-multiselect-items .p-multiselect-item:not(.p-disabled):hover {
        background: var(--bg-secondary) !important;
      }

      .p-multiselect-panel .p-multiselect-items .p-multiselect-item.p-highlight {
        background: rgba(102, 126, 234, 0.15) !important;
        color: #667eea !important;
      }

      .p-multiselect-panel .p-multiselect-header .p-multiselect-close {
        color: var(--text-primary) !important;
      }

      .p-multiselect-panel .p-multiselect-header .p-multiselect-close:hover {
        background: var(--bg-secondary) !important;
        color: #667eea !important;
      }

      /* Checkbox styling per il tema */
      .p-multiselect-panel .p-checkbox .p-checkbox-box {
        background: var(--card-bg) !important;
        border: 2px solid var(--border-color) !important;
      }

      .p-multiselect-panel .p-checkbox .p-checkbox-box.p-highlight {
        background: #667eea !important;
        border-color: #667eea !important;
      }

      .p-multiselect-panel .p-checkbox .p-checkbox-box:hover {
        border-color: #667eea !important;
      }

      /* Empty message */
      .p-multiselect-panel .p-multiselect-empty-message {
        color: var(--text-secondary) !important;
      }

      /* Icona lente campo di ricerca principale */
      .p-input-icon-left > i:first-of-type {
        left: 0.75rem !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }

      .p-input-icon-left > .p-inputtext {
        padding-left: 2.5rem !important;
      }

      .p-multiselect {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        color: var(--text-primary) !important;
      }

      .p-multiselect:not(.p-disabled):hover {
        border-color: #667eea !important;
      }

      .p-multiselect:not(.p-disabled).p-focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
      }

      .p-multiselect .p-multiselect-label {
        color: var(--text-primary) !important;
        background: transparent !important;
      }

      .p-multiselect .p-multiselect-label.p-placeholder {
        color: var(--text-secondary) !important;
      }

      .p-multiselect .p-multiselect-trigger {
        color: var(--text-primary) !important;
      }

      /* Chips selezionati dentro il multiselect chiuso */
      .p-multiselect .p-multiselect-token {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
      }

      .p-multiselect .p-multiselect-token .p-multiselect-token-icon {
        color: white !important;
      }

      /* ✅ MultiSelect Panel aperto - Segue il tema */
      .p-multiselect-panel {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        box-shadow: 0 4px 20px var(--shadow-sm) !important;
      }

      .p-multiselect-panel .p-multiselect-header {
        background: var(--bg-secondary) !important;
        border-bottom: 1px solid var(--border-color) !important;
        padding: 0.5rem 0.75rem !important;
      }

      .p-multiselect-panel .p-multiselect-filter {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        color: var(--text-primary) !important;
        padding: 0.4rem 0.5rem 0.4rem 2rem !important;
        font-size: 0.813rem !important;
        height: 2rem !important;
      }

      .p-multiselect-panel .p-multiselect-filter::placeholder {
        color: var(--text-secondary) !important;
      }

      .p-multiselect-panel .p-multiselect-filter-container .p-multiselect-filter-icon {
        color: var(--text-secondary) !important;
        font-size: 0.813rem !important;
        left: 0.75rem !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }

      .p-multiselect-panel .p-multiselect-items {
        background: var(--card-bg) !important;
        padding: 0.5rem 0 !important;
      }

      .p-multiselect-panel .p-multiselect-items .p-multiselect-item {
        color: var(--text-primary) !important;
        background: transparent !important;
      }

      .p-multiselect-panel .p-multiselect-items .p-multiselect-item:not(.p-disabled):hover {
        background: var(--bg-secondary) !important;
      }

      .p-multiselect-panel .p-multiselect-items .p-multiselect-item.p-highlight {
        background: rgba(102, 126, 234, 0.15) !important;
        color: #667eea !important;
      }

      .p-multiselect-panel .p-multiselect-header .p-multiselect-close {
        color: var(--text-primary) !important;
      }

      .p-multiselect-panel .p-multiselect-header .p-multiselect-close:hover {
        background: var(--bg-secondary) !important;
        color: #667eea !important;
      }

      /* Checkbox styling per il tema */
      .p-multiselect-panel .p-checkbox .p-checkbox-box {
        background: var(--card-bg) !important;
        border: 2px solid var(--border-color) !important;
      }

      .p-multiselect-panel .p-checkbox .p-checkbox-box.p-highlight {
        background: #667eea !important;
        border-color: #667eea !important;
      }

      .p-multiselect-panel .p-checkbox .p-checkbox-box:hover {
        border-color: #667eea !important;
      }

      .p-multiselect-panel .p-multiselect-empty-message {
        color: var(--text-secondary) !important;
      }

      /* Icona lente campo di ricerca principale */
      .p-input-icon-left > i:first-of-type {
        left: 0.75rem !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }

      .p-input-icon-left > .p-inputtext {
        padding-left: 2.5rem !important;
      }


      .p-paginator .p-paginator-pages,
      .p-paginator .p-paginator-first,
      .p-paginator .p-paginator-prev,
      .p-paginator .p-paginator-next,
      .p-paginator .p-paginator-last {
        display: flex !important;
        align-items: center !important;
      }

      .p-paginator .p-paginator-page,
      .p-paginator .p-paginator-first,
      .p-paginator .p-paginator-prev,
      .p-paginator .p-paginator-next,
      .p-paginator .p-paginator-last {
        background: rgba(255, 255, 255, 0.2) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        min-width: 2.5rem !important;
        height: 2.5rem !important;
        margin: 0 0.25rem !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      }

      .p-paginator .p-paginator-page:not(.p-disabled):hover,
      .p-paginator .p-paginator-first:not(.p-disabled):hover,
      .p-paginator .p-paginator-prev:not(.p-disabled):hover,
      .p-paginator .p-paginator-next:not(.p-disabled):hover,
      .p-paginator .p-paginator-last:not(.p-disabled):hover {
        background: rgba(255, 255, 255, 0.4) !important;
        border-color: rgba(255, 255, 255, 0.6) !important;
        transform: translateY(-2px) !important;
      }

      .p-paginator .p-paginator-page.p-highlight {
        background: white !important;
        color: #667eea !important;
        border-color: white !important;
        font-weight: 700 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      }

      .p-paginator .p-disabled {
        opacity: 0.4 !important;
        cursor: not-allowed !important;
      }

      .p-paginator .p-dropdown {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        border-radius: 8px !important;
        height: 2.5rem !important;
        min-width: 4rem !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .p-paginator .p-dropdown .p-dropdown-label {
        color: #667eea !important;
        font-weight: 600 !important;
        padding: 0.5rem !important;
        text-align: center !important;
      }

      .p-paginator .p-dropdown .p-dropdown-trigger {
        color: #667eea !important;
        width: 2rem !important;
      }

      .p-paginator .p-dropdown:hover {
        background: white !important;
        border-color: white !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      }

      .p-paginator .p-paginator-current {
        color: white !important;
        font-weight: 500 !important;
        background: rgba(255, 255, 255, 0.15) !important;
        padding: 0.5rem 1rem !important;
        border-radius: 8px !important;
        margin: 0 0.5rem !important;
      }

      .p-paginator .p-paginator-rpp-options {
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
      }

      .p-paginator-rpp-options .p-dropdown {
        order: 2 !important;
      }

      .p-paginator-left-content,
      .p-paginator-right-content {
        color: white !important;
      }

      /* Stilizzazione Dialog Footer */
      .p-dialog .p-dialog-footer {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border-top: none !important;
        padding: 1.25rem 1.5rem !important;
        border-radius: 0 0 12px 12px !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 0.75rem !important;
      }

      .p-dialog .p-dialog-footer .p-button {
        background: rgba(255, 255, 255, 0.95) !important;
        color: #667eea !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        font-weight: 600 !important;
        padding: 0.75rem 1.5rem !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      }

      .p-dialog .p-dialog-footer .p-button:hover {
        background: white !important;
        border-color: white !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      }

      .p-dialog .p-dialog-footer .p-button.p-button-text {
        background: transparent !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.4) !important;
      }

      .p-dialog .p-dialog-footer .p-button.p-button-text:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        border-color: rgba(255, 255, 255, 0.6) !important;
      }

      /* Stilizzazione ConfirmDialog Footer */
      .p-confirm-dialog .p-dialog-footer {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border-top: none !important;
        padding: 1.25rem 1.5rem !important;
        border-radius: 0 0 12px 12px !important;
        display: flex !important;
        justify-content: flex-end !important;
        gap: 0.75rem !important;
      }

      .p-confirm-dialog .p-dialog-footer .p-button {
        background: rgba(255, 255, 255, 0.95) !important;
        color: #667eea !important;
        border: 1px solid rgba(255, 255, 255, 0.3) !important;
        font-weight: 600 !important;
        padding: 0.75rem 1.5rem !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      }

      .p-confirm-dialog .p-dialog-footer .p-button:hover {
        background: white !important;
        border-color: white !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      }

      .p-confirm-dialog .p-dialog-footer .p-button.p-button-text {
        background: transparent !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.4) !important;
      }

      .p-confirm-dialog .p-dialog-footer .p-button.p-button-text:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        border-color: rgba(255, 255, 255, 0.6) !important;
      }

      .p-confirm-dialog .p-dialog-footer .p-confirm-dialog-accept {
        background: white !important;
        color: #667eea !important;
        font-weight: 700 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
      }

      .p-confirm-dialog .p-dialog-footer .p-confirm-dialog-accept:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25) !important;
      }
    }
  `]
})
export class ConfigListComponent implements OnInit {
  @ViewChild('dt') table!: Table;
  Math = Math;
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
  filteredConfigs: any[] = [];

  loading = false;
  selectedCategories: string[] = [];  // ✅ MODIFICATO: Array invece di string
  selectedEnvironments: string[] = [];

  displayDialog = false;
  displayViewDialog = false;
  dialogMode: 'create' | 'edit' = 'create';

  currentConfig: Partial<ConfigEntry> = {};
  currentConfigValueString = '';
  viewingConfig: ExtendedConfigEntry | null = null;

  private originalEnvironment: string = '';

  constructor(
    private oscService: OpenSecureConfService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    this.loadConfigs();
    this.loadFilters();
  }

  splitCategory(category: string): string[] {
    if (!category) return [];
    const parts = category.split(/[\\\/]/).map(part => part.trim()).filter(part => part.length > 0);
    return parts.length > 0 ? parts : [category];
  }
  onTableFilter(event: any): void {
    this.filteredConfigs = event.filteredValue || this.configs;
  }
  /**
   * Genera colori contrastanti per ogni livello della gerarchia usando palette diverse
   */
  getColorForHierarchy(category: string, level: number): string {
    if (!category) return '#6c757d';

    // Palette di colori per ogni livello (0 = parent, 1 = child, 2 = grandchild, ecc.)
    const levelPalettes = [
      // Livello 0 (Parent) - Colori scuri e saturi
      ['#667eea', '#f093fb', '#43e97b', '#feca57', '#ff6348', '#06b6d4', '#ec4899', '#10b981'],

      // Livello 1 (Child) - Colori complementari
      ['#4facfe', '#fa709a', '#22c55e', '#fdcb6e', '#ef4444', '#00d2d3', '#764ba2', '#14b8a6'],

      // Livello 2 (Grandchild) - Colori intermedi
      ['#3b82f6', '#fd79a8', '#16a34a', '#f59e0b', '#dc2626', '#55efc4', '#a29bfe', '#1dd1a1'],

      // Livello 3+ - Altri colori
      ['#2563eb', '#f093fb', '#15803d', '#d97706', '#b91c1c', '#2dd4bf', '#6c5ce7', '#00b894']
    ];

    // Seleziona la palette per il livello corrente (ciclica se supera i livelli disponibili)
    const palette = levelPalettes[level % levelPalettes.length];

    // Genera un hash dalla categoria completa
    let hash = 2166136261;
    for (let i = 0; i < category.length; i++) {
      hash ^= category.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    hash = hash >>> 0;

    // Seleziona un colore dalla palette
    const index = hash % palette.length;
    return palette[index];
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
    if (backgroundColor.startsWith('rgb')) {
      const match = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
      }
    }

    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
 
  onFilterChange() {
    // Piccolo delay per assicurarsi che il modello sia aggiornato
    setTimeout(() => {
      this.loadConfigs();
    }, 0);
  }

  loadConfigs() {
    this.loading = true;

    // Carica tutte le configurazioni e filtra lato client
    this.oscService.listConfigs({}).subscribe({
      next: (configs) => {
        let filteredConfigs = configs as ExtendedConfigEntry[];

        // Filtra per categorie se selezionate
        if (this.selectedCategories && this.selectedCategories.length > 0) {
          filteredConfigs = filteredConfigs.filter(config =>
            this.selectedCategories.includes(config.category)
          );
        }

        // Filtra per ambienti se selezionati
        if (this.selectedEnvironments && this.selectedEnvironments.length > 0) {
          filteredConfigs = filteredConfigs.filter(config =>
            this.selectedEnvironments.includes(config.environment)
          );
        }

        this.configs = filteredConfigs;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading configs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: 'Impossibile caricare le configurazioni'
        });
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
      ? this.oscService.createConfig(
        this.currentConfig.key,
        value,
        this.currentConfig.environment,
        this.currentConfig.category
      )
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
  // Export personalizzato con tutti i dati filtrati
  exportFilteredDataToCSV(): void {
    // Usa i dati filtrati se disponibili, altrimenti tutti i dati
    const dataToExport = this.filteredConfigs.length > 0 
      ? this.filteredConfigs 
      : this.configs;

    if (!dataToExport || dataToExport.length === 0) {
      console.warn('Nessun dato da esportare');
      return;
    }

    // Definisci le colonne da esportare (escludi 'actions')
    const columns = [
      { field: 'key', header: 'Chiave' },
      { field: 'value', header: 'Valore' },
      { field: 'category', header: 'Categoria' },
      { field: 'environment', header: 'Ambiente' },
      { field: 'created_at', header: 'Data Creazione' },
      { field: 'updated_at', header: 'Data Modifica' }
    ];

    // Crea l'intestazione CSV
    const header = columns.map(col => col.header).join(',');

    // Crea le righe CSV
    const rows = dataToExport.map(config => {
      return columns.map(col => {
        let value = config[col.field];
        
        // Formatta le date
        if ((col.field === 'created_at' || col.field === 'updated_at') && value) {
          value = this.formatDate(value);
        }
        // Gestisci il campo 'value' che può essere di tipo complesso
        else if (col.field === 'value') {
          value = this.formatValueForCSV(value);
        }
        
        // Gestisci valori null/undefined
        if (value === null || value === undefined) {
          value = '';
        }
        
        // Converti tutto in stringa
        value = String(value);
        
        // Escape per CSV: aggiungi virgolette se contiene virgole, newline o virgolette
        if (value.includes(',') || value.includes('\n') || value.includes('"') || value.includes('\r')) {
          // Escape delle virgolette doppie: " diventa ""
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    });

    // Combina intestazione e righe
    const csvContent = [header, ...rows].join('\r\n');

    // Aggiungi BOM UTF-8 per compatibilità Excel
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });

    // Crea link per il download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nome file con timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `configuration-${timestamp}.csv`;
    
    // Trigger download
    link.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    link.remove();
  }

  /**
   * Formatta il valore per l'export CSV gestendo tutti i tipi di dato
   * @param value - Può essere dict, string, int, bool, o list
   * @returns Stringa formattata per CSV
   */
  private formatValueForCSV(value: any): string {
    // Gestisci null/undefined
    if (value === null || value === undefined) {
      return '';
    }
    
    // Se è un oggetto (dict) o un array (list), serializza in JSON
    if (typeof value === 'object') {
      try {
        // JSON.stringify formatta oggetti e array
        return JSON.stringify(value);
      } catch (error) {
        console.error('Errore nella serializzazione JSON:', error);
        return String(value);
      }
    }
    
    // Per tipi primitivi (string, number, boolean), converti in stringa
    return String(value);
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
