import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { LanguageService } from '../../services/language.service';
import { Language, Translations } from '../../i18n/translations';

interface ConfigEntry {
  key:          string;
  value:        any;
  category:     string;
  environment:  string;
  created_at?:  string;
  updated_at?:  string;
}

interface ExtendedConfigEntry extends ConfigEntry {
  id?:          number | string;
  updated_at?:  string;
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
    MultiSelectModule,
    InputTextareaModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="config-list">
      <p-toast></p-toast>
      <p-confirmDialog></p-confirmDialog>

      <!-- ── Page Header ── -->
      <div class="page-header">
        <div class="header-content">
          <div>
            <h1><i class="pi pi-cog"></i> {{ t.configs.title }}</h1>
            <p>{{ t.configs.subtitle }}</p>
          </div>
          <p-button
            [label]="t.configs.newConfig"
            icon="pi pi-plus"
            (onClick)="showCreateDialog()"
            styleClass="p-button-success">
          </p-button>
        </div>
      </div>

      <!-- ── Table ── -->
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

          <!-- Caption / Filters -->
          <ng-template pTemplate="caption">
            <div class="table-header">
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input
                  pInputText
                  type="text"
                  (input)="dt.filterGlobal($any($event.target).value, 'contains')"
                  [placeholder]="t.configs.searchPlaceholder" />
              </span>

              <div class="filter-section">
                <!-- Category filter -->
                <p-multiSelect
                  [options]="categoryOptions"
                  [(ngModel)]="selectedCategories"
                  (ngModelChange)="onFilterChange()"
                  [placeholder]="t.configs.filterByCategory"
                  [showClear]="true"
                  [maxSelectedLabels]="2"
                  [selectedItemsLabel]="t.configs.categoriesSelected"
                  styleClass="mr-2"
                  display="chip">
                  <ng-template let-value pTemplate="selectedItems">
                    <div class="flex align-items-center gap-2" *ngIf="value && value.length > 0">
                      <div *ngFor="let cat of value" class="inline-flex">
                        <span class="filter-chip">{{ cat }}</span>
                      </div>
                      <span *ngIf="value.length > 2" class="more-label">+{{ value.length - 2 }}</span>
                    </div>
                    <span *ngIf="!value || value.length === 0">{{ t.configs.filterByCategory }}</span>
                  </ng-template>
                </p-multiSelect>

                <!-- Environment filter -->
                <p-multiSelect
                  [options]="environmentOptions"
                  [(ngModel)]="selectedEnvironments"
                  (ngModelChange)="onFilterChange()"
                  [placeholder]="t.configs.filterByEnvironment"
                  [showClear]="true"
                  [maxSelectedLabels]="2"
                  [selectedItemsLabel]="t.configs.environmentsSelected"
                  display="chip">
                  <ng-template let-value pTemplate="selectedItems">
                    <div class="flex align-items-center gap-2" *ngIf="value && value.length > 0">
                      <div *ngFor="let env of value" class="inline-flex">
                        <span class="filter-chip">{{ env }}</span>
                      </div>
                      <span *ngIf="value.length > 2" class="more-label">+{{ value.length - 2 }}</span>
                    </div>
                    <span *ngIf="!value || value.length === 0">{{ t.configs.filterByEnvironment }}</span>
                  </ng-template>
                </p-multiSelect>

                <!-- Export CSV -->
                <p-button
                  icon="pi pi-download"
                  [label]="t.configs.exportCsv"
                  (onClick)="exportFilteredDataToCSV()"
                  severity="success"
                  [outlined]="true"
                  styleClass="ml-2"
                  [pTooltip]="t.configs.exportCsvTooltip">
                </p-button>
              </div>
            </div>
          </ng-template>

          <!-- Column Headers -->
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="key">{{ t.configs.colKey }} <p-sortIcon field="key"></p-sortIcon></th>
              <th>{{ t.configs.colValue }}</th>
              <th pSortableColumn="category">{{ t.configs.colCategory }} <p-sortIcon field="category"></p-sortIcon></th>
              <th pSortableColumn="environment">{{ t.configs.colEnvironment }} <p-sortIcon field="environment"></p-sortIcon></th>
              <th pSortableColumn="created_at">{{ t.configs.colCreated }} <p-sortIcon field="created_at"></p-sortIcon></th>
              <th pSortableColumn="updated_at">{{ t.configs.colUpdated }} <p-sortIcon field="updated_at"></p-sortIcon></th>
              <th class="actions-column">{{ t.configs.colActions }}</th>
            </tr>
          </ng-template>

          <!-- Paginator Left -->
          <ng-template pTemplate="paginatorleft">
            <div class="paginator-info">
              <i class="pi pi-list"></i>
              <span>{{ t.configs.total }}: <strong>{{ configs.length }}</strong> {{ t.configs.totalConfigs }}</span>
            </div>
          </ng-template>

          <!-- Paginator Right -->
          <ng-template pTemplate="paginatorright">
            <div class="paginator-info">
              <i class="pi pi-eye"></i>
              <span>{{ t.configs.showing }}: <strong>{{ dt.first + 1 }}-{{ Math.min(dt.first + dt.rows, configs.length) }}</strong></span>
            </div>
          </ng-template>

          <!-- Body -->
          <ng-template pTemplate="body" let-config>
            <tr>
              <td>
                <strong class="key-text">{{ config.key }}</strong>
              </td>
              <td>
                <div class="value-preview">{{ formatValue(config.value) }}</div>
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
              </td>
              <td>
                <span class="date-text" *ngIf="config.updated_at">
                  <i class="pi pi-calendar"></i>
                  {{ formatDate(config.updated_at) }}
                </span>
              </td>
              <td class="actions-column">
                <p-button icon="pi pi-eye"    [text]="true" [rounded]="true" severity="info"    (onClick)="viewConfig(config)"></p-button>
                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="warning" (onClick)="editConfig(config)"></p-button>
                <p-button icon="pi pi-trash"  [text]="true" [rounded]="true" severity="danger"  (onClick)="deleteConfig(config)"></p-button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- ── Create / Edit Dialog ── -->
      <p-dialog
        [(visible)]="displayDialog"
        [header]="dialogMode === 'create' ? t.configs.newConfigTitle : t.configs.editConfigTitle"
        [modal]="true"
        [style]="{ width: '50vw' }"
        [breakpoints]="{ '960px': '75vw', '640px': '90vw' }">

        <div class="form-container">
          <div class="field">
            <label for="key">{{ t.configs.fieldKey }}</label>
            <input
              id="key"
              type="text"
              pInputText
              [(ngModel)]="currentConfig.key"
              [disabled]="dialogMode === 'edit'"
              class="w-full" />
          </div>

          <div class="field">
            <label for="value">{{ t.configs.fieldValue }}</label>
            <textarea
              id="value"
              pInputTextarea
              [(ngModel)]="currentConfigValueString"
              [rows]="8"
              class="w-full"
              [placeholder]="t.configs.fieldValuePlaceholder">
            </textarea>
            <small class="text-muted">{{ t.configs.fieldValueHint }}</small>
          </div>

          <div class="field">
            <label for="category">{{ t.configs.fieldCategory }}</label>
            <input
              id="category"
              type="text"
              pInputText
              [(ngModel)]="currentConfig.category"
              class="w-full"
              [placeholder]="t.configs.fieldCategoryPlaceholder" />
            <small class="text-muted">{{ t.configs.fieldCategoryHint }}</small>
          </div>

          <div class="field">
            <label for="environment">{{ t.configs.fieldEnvironment }}</label>
            <p-dropdown
              id="environment"
              [options]="environmentDropdownOptions"
              [(ngModel)]="currentConfig.environment"
              [editable]="true"
              [placeholder]="t.configs.fieldEnvironmentPlaceholder"
              class="w-full">
            </p-dropdown>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <p-button
            [label]="t.configs.btnCancel"
            icon="pi pi-times"
            [text]="true"
            (onClick)="displayDialog = false">
          </p-button>
          <p-button
            [label]="dialogMode === 'create' ? t.configs.btnCreate : t.configs.btnSave"
            icon="pi pi-check"
            (onClick)="saveConfig()">
          </p-button>
        </ng-template>
      </p-dialog>

      <!-- ── View Dialog ── -->
      <p-dialog
        [(visible)]="displayViewDialog"
        [header]="t.configs.viewTitle"
        [modal]="true"
        [style]="{ width: '60vw' }"
        [breakpoints]="{ '960px': '75vw', '640px': '90vw' }">

        <div class="view-container" *ngIf="viewingConfig">
          <div class="view-grid">
            <div class="view-field">
              <strong>{{ t.configs.viewKey }}</strong>
              <span class="view-value">{{ viewingConfig.key }}</span>
            </div>

            <div class="view-field" *ngIf="viewingConfig.id">
              <strong>{{ t.configs.viewId }}</strong>
              <span class="view-value">{{ viewingConfig.id }}</span>
            </div>

            <div class="view-field" *ngIf="viewingConfig.category">
              <strong>{{ t.configs.viewCategory }}</strong>
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
              <strong>{{ t.configs.viewEnvironment }}</strong>
              <span
                class="custom-tag-large"
                [style.background-color]="getColorForValue(viewingConfig.environment)"
                [style.color]="getTextColor(getColorForValue(viewingConfig.environment))">
                {{ viewingConfig.environment }}
              </span>
            </div>

            <div class="view-field" *ngIf="getCreatedAt(viewingConfig)">
              <strong>{{ t.configs.viewCreated }}</strong>
              <span class="view-value">
                <i class="pi pi-calendar-plus"></i>
                {{ formatDateLong(getCreatedAt(viewingConfig)) }}
              </span>
            </div>

            <div class="view-field" *ngIf="viewingConfig.updated_at">
              <strong>{{ t.configs.viewUpdated }}</strong>
              <span class="view-value">
                <i class="pi pi-calendar"></i>
                {{ formatDateLong(viewingConfig.updated_at) }}
              </span>
            </div>
          </div>

          <div class="view-field-full">
            <strong>{{ t.configs.viewValue }}</strong>
            <pre class="value-display">{{ formatValuePretty(viewingConfig.value) }}</pre>
          </div>
        </div>
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
export class ConfigListComponent implements OnInit, OnDestroy {
  @ViewChild('dt') table!: Table;

  configs:              ExtendedConfigEntry[] = [];
  filteredConfigs:      ExtendedConfigEntry[] = [];
  loading               = false;
  categories:           string[] = [];
  environments:         string[] = [];
  categoryOptions:      { label: string; value: string }[] = [];
  environmentOptions:   { label: string; value: string }[] = [];
  environmentDropdownOptions: { label: string; value: string }[] = [];
  selectedCategories:   string[] = [];
  selectedEnvironments: string[] = [];

  displayDialog     = false;
  displayViewDialog = false;
  dialogMode:         'create' | 'edit' = 'create';
  currentConfig:      Partial<ConfigEntry> = {};
  currentConfigValueString = '""';
  originalEnvironment      = '';
  viewingConfig:      ExtendedConfigEntry | null = null;

  t!: Translations;
  Math = Math;

  private langSub!: Subscription;

  constructor(
    private oscService:        OpenSecureConfService,
    private confirmationService: ConfirmationService,
    private messageService:    MessageService,
    private langService:       LanguageService,
  ) {}

  ngOnInit() {
    this.t = this.langService.getTranslations();
    this.langSub = this.langService.lang$.subscribe((lang: Language) => {
      this.t = this.langService.t(lang);
    });

    this.loadConfigs();
    this.loadFilters();
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
  }

  // ── Color helpers ─────────────────────────────────────────────────────────

  getColorForValue(value: string): string {
    if (!value) return '#6c757d';
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    hash = hash >>> 0;
    const colors = [
      '#667eea','#4facfe','#3b82f6','#2563eb','#1d4ed8','#60a5fa','#0ea5e9','#06b6d4',
      '#43e97b','#22c55e','#16a34a','#15803d','#10b981','#14b8a6','#1dd1a1','#00b894',
      '#5f27cd','#6c5ce7','#a29bfe','#764ba2','#f093fb','#fa709a','#fd79a8','#ec4899',
      '#feca57','#fdcb6e','#f59e0b','#d97706','#fb923c','#f97316','#ff6348','#fbbf24',
      '#ff7675','#ef4444','#dc2626','#b91c1c',
      '#00d2d3','#55efc4','#2dd4bf','#14b8a6',
      '#fab1a0','#ffeaa7','#dfe6e9','#b2bec3',
    ];
    return colors[hash % colors.length];
  }

  getColorForHierarchy(category: string, level: number): string {
    const base = this.getColorForValue(category);
    if (level === 0) return base;
    const hex = base.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + level * 30);
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + level * 30);
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + level * 30);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  getTextColor(bg: string): string {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#ffffff';
  }

  splitCategory(category: string): string[] {
    return category ? category.split(/[/\\]/) : [];
  }

  getCreatedAt(config: ExtendedConfigEntry): string | null {
    return (config as any).created_at ?? null;
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  onFilterChange() {
    setTimeout(() => this.loadConfigs(), 0);
  }

  loadConfigs() {
    this.loading = true;
    this.oscService.listConfigs({}).subscribe({
      next: (configs) => {
        let filtered = configs as ExtendedConfigEntry[];
        if (this.selectedCategories?.length)
          filtered = filtered.filter(c => this.selectedCategories.includes(c.category));
        if (this.selectedEnvironments?.length)
          filtered = filtered.filter(c => this.selectedEnvironments.includes(c.environment));
        this.configs = filtered;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: this.t.configs.toastErrorSummary, detail: this.t.configs.toastLoadError });
        this.loading = false;
      },
    });
  }

  loadFilters() {
    this.oscService.listCategories().subscribe(cats => {
      this.categories = cats;
      this.categoryOptions = cats.map(c => ({ label: c, value: c }));
    });
    this.oscService.listEnvironments().subscribe(envs => {
      this.environments = envs;
      this.environmentOptions        = envs.map(e => ({ label: e, value: e }));
      this.environmentDropdownOptions = envs.map(e => ({ label: e, value: e }));
    });
  }

  // ── CRUD dialogs ──────────────────────────────────────────────────────────

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
      this.messageService.add({ severity: 'error', summary: this.t.configs.toastErrorSummary, detail: this.t.configs.toastKeyRequired });
      return;
    }
    if (!this.currentConfig.environment) {
      this.messageService.add({ severity: 'error', summary: this.t.configs.toastErrorSummary, detail: this.t.configs.toastEnvRequired });
      return;
    }

    let value: any;
    try {
      value = JSON.parse(this.currentConfigValueString);
    } catch {
      this.messageService.add({ severity: 'error', summary: this.t.configs.toastErrorSummary, detail: this.t.configs.toastInvalidJson });
      return;
    }

    const operation = this.dialogMode === 'create'
      ? this.oscService.createConfig(this.currentConfig.key, value, this.currentConfig.environment, this.currentConfig.category)
      : this.oscService.updateConfig(this.currentConfig.key!, this.originalEnvironment, value, this.currentConfig.category);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.t.configs.toastSuccessSummary,
          detail: this.dialogMode === 'create' ? this.t.configs.toastCreated : this.t.configs.toastUpdated,
        });
        this.displayDialog = false;
        this.loadConfigs();
        this.loadFilters();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: this.t.configs.toastErrorSummary, detail: err.detail || this.t.configs.toastOpFailed });
      },
    });
  }

  deleteConfig(config: ConfigEntry) {
    this.confirmationService.confirm({
      message: this.t.configs.deleteConfirmMsg.replace('{key}', config.key).replace('{env}', config.environment),
      header:      this.t.configs.deleteConfirmHeader,
      icon:        'pi pi-exclamation-triangle',
      acceptLabel: this.t.configs.deleteYes,
      rejectLabel: this.t.configs.deleteNo,
      accept: () => {
        this.oscService.deleteConfig(config.key, config.environment).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: this.t.configs.toastSuccessSummary, detail: this.t.configs.toastDeleted });
            this.loadConfigs();
            this.loadFilters();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: this.t.configs.toastErrorSummary, detail: err.detail || this.t.configs.toastDeleteError });
          },
        });
      },
    });
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  formatValue(value: any): string {
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  formatValuePretty(value: any): string {
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(this.langService.getCurrentLang(), {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  formatDateLong(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString(this.langService.getCurrentLang(), {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  // ── CSV Export ────────────────────────────────────────────────────────────

  exportFilteredDataToCSV(): void {
    const data = this.filteredConfigs.length > 0 ? this.filteredConfigs : this.configs;
    if (!data?.length) return;

    const columns = [
      { field: 'key',        header: this.t.configs.colKey },
      { field: 'value',      header: this.t.configs.colValue },
      { field: 'category',   header: this.t.configs.colCategory },
      { field: 'environment',header: this.t.configs.colEnvironment },
      { field: 'created_at', header: this.t.configs.colCreated },
      { field: 'updated_at', header: this.t.configs.colUpdated },
    ];

    const header = columns.map(c => c.header).join(',');
    const rows = data.map(config =>
      columns.map(col => {
        let val = (config as any)[col.field];
        if ((col.field === 'created_at' || col.field === 'updated_at') && val) val = this.formatDate(val);
        else if (col.field === 'value') val = this.formatValueForCSV(val);
        if (val == null) val = '';
        val = String(val);
        if (val.includes(',') || val.includes('\n') || val.includes('"')) val = `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(',')
    );

    const csv   = [header, ...rows].join('\r\n');
    const blob  = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url   = window.URL.createObjectURL(blob);
    const link  = document.createElement('a');
    link.href   = url;
    link.download = `configurations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    link.remove();
  }

  private formatValueForCSV(value: any): string {
    if (value == null) return '';
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  }
}