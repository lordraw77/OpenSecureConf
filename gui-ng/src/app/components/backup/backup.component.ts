import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { OpenSecureConfService } from '../../services/opensecureconf.service';

@Component({
  selector: 'app-backup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CheckboxModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="backup-container">
      <p-toast></p-toast>

      <div class="page-header">
        <div class="header-content">
          <div>
            <h1>
              <i class="pi pi-download"></i>
              Backup & Import
            </h1>
            <p>Gestisci import ed export delle configurazioni</p>
          </div>
        </div>
      </div>

      <div class="backup-grid">
        <!-- EXPORT Section -->
        <div class="backup-card">
          <div class="card-header">
            <div class="header-icon">
              <i class="pi pi-cloud-download"></i>
            </div>
            <span>Esporta Configurazioni</span>
          </div>
          
          <div class="card-body">
            <div class="info-banner">
              <i class="pi pi-info-circle"></i>
              <span>Crea un backup crittografato delle configurazioni selezionate</span>
            </div>

            <div class="form-field">
              <label for="exportEnvironment">Environment (opzionale)</label>
              <p-dropdown
                id="exportEnvironment"
                [options]="environmentOptions"
                [(ngModel)]="selectedExportEnvironment"
                placeholder="Tutti gli environment"
                [showClear]="true"
                styleClass="w-full custom-dropdown"
              ></p-dropdown>
            </div>

            <div class="form-field">
              <label for="exportCategory">Categoria (opzionale)</label>
              <p-dropdown
                id="exportCategory"
                [options]="categoryOptions"
                [(ngModel)]="selectedExportCategory"
                placeholder="Tutte le categorie"
                [showClear]="true"
                styleClass="w-full custom-dropdown"
              ></p-dropdown>
            </div>

            <div class="form-field">
              <label for="exportPassword">Password Backup *</label>
              <span class="p-input-icon-right w-full">
                <i class="pi pi-lock"></i>
                <input
                  id="exportPassword"
                  type="password"
                  pInputText
                  [(ngModel)]="exportPassword"
                  placeholder="Inserisci password per crittografia"
                  class="w-full"
                />
              </span>
            </div>

            <div class="filter-summary" *ngIf="selectedExportEnvironment || selectedExportCategory">
              <i class="pi pi-filter"></i>
              <span>
                Verranno esportate solo le configurazioni
                <strong *ngIf="selectedExportEnvironment">dell'environment "{{ selectedExportEnvironment }}"</strong>
                <strong *ngIf="selectedExportCategory">della categoria "{{ selectedExportCategory }}"</strong>
              </span>
            </div>

            <button
              pButton
              label="Genera Backup"
              icon="pi pi-download"
              class="w-full action-button export-button"
              (click)="exportBackup()"
              [disabled]="!exportPassword || isExporting"
              [loading]="isExporting"
            ></button>
          </div>
        </div>

        <!-- IMPORT Section -->
        <div class="backup-card">
          <div class="card-header">
            <div class="header-icon import-icon">
              <i class="pi pi-cloud-upload"></i>
            </div>
            <span>Importa Configurazioni</span>
          </div>
          
          <div class="card-body">
            <div class="info-banner info-banner-import">
              <i class="pi pi-info-circle"></i>
              <span>Ripristina configurazioni da un backup crittografato</span>
            </div>

            <div class="form-field">
              <label for="importData">Dati Backup *</label>
              <textarea
                id="importData"
                pInputTextarea
                [(ngModel)]="importData"
                placeholder="Incolla qui i dati del backup..."
                rows="6"
                class="w-full"
              ></textarea>
            </div>

            <div class="form-field">
              <label for="importPassword">Password Backup *</label>
              <span class="p-input-icon-right w-full">
                <i class="pi pi-lock"></i>
                <input
                  id="importPassword"
                  type="password"
                  pInputText
                  [(ngModel)]="importPassword"
                  placeholder="Password del backup"
                  class="w-full"
                />
              </span>
            </div>

            <div class="checkbox-field">
              <p-checkbox
                [(ngModel)]="overwrite"
                [binary]="true"
                inputId="overwrite"
              ></p-checkbox>
              <label for="overwrite">Sovrascrivi configurazioni esistenti</label>
            </div>

            <button
              pButton
              label="Importa Backup"
              icon="pi pi-upload"
              class="w-full action-button import-button"
              (click)="importBackup()"
              [disabled]="!importData || !importPassword || isImporting"
              [loading]="isImporting"
            ></button>
          </div>
        </div>
      </div>

      <!-- IMPORT FROM FILE Section -->
      <div class="backup-card full-width">
        <div class="card-header">
          <div class="header-icon file-icon">
            <i class="pi pi-file"></i>
          </div>
          <span>Importa da File</span>
        </div>
        
        <div class="card-body">
          <div class="info-banner info-banner-file">
            <i class="pi pi-info-circle"></i>
            <span>Carica un file di backup (.json o .txt)</span>
          </div>

          <div class="file-upload-section">
            <div class="form-field">
              <label for="fileInput">Seleziona File Backup</label>
              <div class="file-input-wrapper">
                <input
                  type="file"
                  id="fileInput"
                  accept=".json,.txt"
                  (change)="onFileSelect($event)"
                  class="file-input"
                />
                <div class="file-input-display">
                  <i class="pi pi-cloud-upload"></i>
                  <span *ngIf="!uploadedFileName" class="file-placeholder">
                    Nessun file selezionato
                  </span>
                  <span *ngIf="uploadedFileName" class="file-name">
                    {{ uploadedFileName }}
                  </span>
                </div>
              </div>
            </div>

            <div class="form-field" *ngIf="uploadedFileName">
              <label for="filePassword">Password Backup *</label>
              <span class="p-input-icon-right w-full">
                <i class="pi pi-lock"></i>
                <input
                  id="filePassword"
                  type="password"
                  pInputText
                  [(ngModel)]="fileImportPassword"
                  placeholder="Password del backup"
                  class="w-full"
                />
              </span>
            </div>

            <div class="checkbox-field" *ngIf="uploadedFileName">
              <p-checkbox
                [(ngModel)]="fileOverwrite"
                [binary]="true"
                inputId="fileOverwrite"
              ></p-checkbox>
              <label for="fileOverwrite">Sovrascrivi configurazioni esistenti</label>
            </div>

            <button
              pButton
              label="Importa da File"
              icon="pi pi-upload"
              class="w-full action-button file-button"
              (click)="importFromFile()"
              [disabled]="!fileImportPassword || isImporting"
              [loading]="isImporting"
            ></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .backup-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
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
      
    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 2rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-content h1 i {
      font-size: 1.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header-content p {
      color: var(--text-secondary);
      margin: 0.5rem 0 0 0;
      font-size: 1rem;
    }

    .backup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 1024px) {
      .backup-grid {
        grid-template-columns: 1fr;
      }
    }

    .backup-card {
      background: var(--card-bg);
      border-radius: 16px;
      box-shadow: 0 4px 20px var(--shadow-sm);
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .backup-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px var(--shadow-md);
    }

    .backup-card.full-width {
      grid-column: 1 / -1;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .import-icon {
      background: rgba(67, 233, 123, 0.2);
    }

    .file-icon {
      background: rgba(79, 172, 254, 0.2);
    }

    .card-body {
      padding: 2rem;
    }

    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border-left: 4px solid #667eea;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      color: var(--text-primary);
    }

    .info-banner i {
      color: #667eea;
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }

    .info-banner-import {
      background: linear-gradient(135deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%);
      border-left-color: #43e97b;
    }

    .info-banner-import i {
      color: #43e97b;
    }

    .info-banner-file {
      background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%);
      border-left-color: #4facfe;
    }

    .info-banner-file i {
      color: #4facfe;
    }

    .form-field {
      margin-bottom: 1.5rem;
    }

    .form-field label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .checkbox-field label {
      margin: 0;
      color: var(--text-primary);
      font-weight: 500;
      cursor: pointer;
      font-size: 0.938rem;
    }

    .filter-summary {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 1.5rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .filter-summary i {
      color: #667eea;
      flex-shrink: 0;
      margin-top: 0.2rem;
    }

    .filter-summary strong {
      color: var(--text-primary);
      font-weight: 600;
    }

    .file-upload-section {
      margin-top: 1rem;
    }

    .file-input-wrapper {
      position: relative;
    }

    .file-input {
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 2;
    }

    .file-input-display {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border: 2px dashed var(--border-color);
      border-radius: 8px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.3s;
    }

    .file-input-display:hover {
      border-color: #667eea;
      background: var(--hover-bg);
    }

    .file-input-display i {
      font-size: 1.5rem;
      color: #667eea;
    }

    .file-placeholder {
      color: var(--text-secondary);
    }

    .file-name {
      color: var(--text-primary);
      font-weight: 600;
    }

    .action-button {
      margin-top: 1rem;
      padding: 0.875rem 1.5rem !important;
      font-weight: 600 !important;
      font-size: 1rem !important;
      border-radius: 10px !important;
      transition: all 0.3s ease !important;
    }

    .export-button {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%) !important;
      border: none !important;
      color: white !important;
    }

    .export-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(67, 233, 123, 0.4) !important;
    }

    .import-button {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
      border: none !important;
      color: white !important;
    }

    .import-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4) !important;
    }

    .file-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      border: none !important;
      color: white !important;
    }

    .file-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
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

    /* PrimeNG Overrides */
    :host ::ng-deep {
      .w-full {
        width: 100%;
      }

      /* Input Text Styling */
      .p-inputtext {
        width: 100%;
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        color: var(--text-primary) !important;
        padding: 0.75rem 1rem !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      }

      .p-inputtext:enabled:hover {
        border-color: #667eea !important;
      }

      .p-inputtext:enabled:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
      }

      .p-inputtext::placeholder {
        color: var(--text-secondary) !important;
      }

      /* Textarea Styling */
      .p-inputtextarea {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        color: var(--text-primary) !important;
        padding: 0.75rem 1rem !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
        font-family: 'Courier New', monospace !important;
      }

      .p-inputtextarea:enabled:hover {
        border-color: #667eea !important;
      }

      .p-inputtextarea:enabled:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
      }

      /* Dropdown Styling */
      .p-dropdown {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      }

      .p-dropdown:not(.p-disabled):hover {
        border-color: #667eea !important;
      }

      .p-dropdown:not(.p-disabled).p-focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
      }

      .p-dropdown .p-dropdown-label {
        color: var(--text-primary) !important;
        padding: 0.75rem 1rem !important;
      }

      .p-dropdown .p-dropdown-label.p-placeholder {
        color: var(--text-secondary) !important;
      }

      .p-dropdown .p-dropdown-trigger {
        color: var(--text-primary) !important;
        width: 3rem !important;
      }

      .p-dropdown .p-dropdown-clear-icon {
        color: var(--text-secondary) !important;
      }

      /* Dropdown Panel */
      .p-dropdown-panel {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        box-shadow: 0 4px 20px var(--shadow-sm) !important;
        border-radius: 8px !important;
      }

      .p-dropdown-panel .p-dropdown-items {
        padding: 0.5rem 0 !important;
      }

      .p-dropdown-panel .p-dropdown-item {
        color: var(--text-primary) !important;
        padding: 0.75rem 1rem !important;
        transition: all 0.2s !important;
      }

      .p-dropdown-panel .p-dropdown-item:not(.p-disabled):hover {
        background: var(--hover-bg) !important;
        color: #667eea !important;
      }

      .p-dropdown-panel .p-dropdown-item.p-highlight {
        background: rgba(102, 126, 234, 0.15) !important;
        color: #667eea !important;
      }

      .p-dropdown-panel .p-dropdown-empty-message {
        color: var(--text-secondary) !important;
        padding: 1rem !important;
      }

      /* Checkbox Styling */
      .p-checkbox {
        width: 20px !important;
        height: 20px !important;
      }

      .p-checkbox .p-checkbox-box {
        width: 20px !important;
        height: 20px !important;
        background: var(--card-bg) !important;
        border: 2px solid var(--border-color) !important;
        border-radius: 4px !important;
        transition: all 0.3s ease !important;
      }

      .p-checkbox .p-checkbox-box:not(.p-disabled):hover {
        border-color: #667eea !important;
      }

      .p-checkbox .p-checkbox-box.p-highlight {
        background: #667eea !important;
        border-color: #667eea !important;
      }

      .p-checkbox .p-checkbox-box .p-checkbox-icon {
        color: white !important;
      }

      .p-checkbox:not(.p-checkbox-disabled) .p-checkbox-box.p-focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
      }

      /* Input Icon Right */
      .p-input-icon-right > i:last-of-type {
        right: 1rem !important;
        color: var(--text-secondary) !important;
      }

      .p-input-icon-right > .p-inputtext {
        padding-right: 3rem !important;
      }

      /* Button Disabled State */
      .p-button:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }

      /* Toast Messages */
      .p-toast {
        opacity: 0.98 !important;
      }

      .p-toast .p-toast-message {
        backdrop-filter: blur(10px) !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
      }
    }
  `]
})
export class BackupComponent implements OnInit {
  exportPassword = '';
  importData = '';
  importPassword = '';
  overwrite = false;
  isExporting = false;
  isImporting = false;
  
  uploadedFileName = '';
  uploadedFileContent = '';
  fileImportPassword = '';
  fileOverwrite = false;

  selectedExportEnvironment: string | null = null;
  selectedExportCategory: string | null = null;
  environments: string[] = [];
  categories: string[] = [];
  
  environmentOptions: Array<{ label: string; value: string }> = [];
  categoryOptions: Array<{ label: string; value: string }> = [];

  constructor(
    private oscService: OpenSecureConfService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadFilters();
  }

  loadFilters(): void {
    this.oscService.listEnvironments().subscribe({
      next: (envs) => {
        this.environments = envs;
        this.environmentOptions = envs.map(env => ({ label: env, value: env }));
      },
      error: (error) => {
        console.error('Errore caricamento environments:', error);
      }
    });

    this.oscService.listCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.categoryOptions = cats.map(cat => ({ label: cat, value: cat }));
      },
      error: (error) => {
        console.error('Errore caricamento categorie:', error);
      }
    });
  }

  exportBackup(): void {
    if (!this.exportPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Attenzione',
        detail: 'Inserisci una password per il backup'
      });
      return;
    }

    this.isExporting = true;

    const filters: any = {};
    if (this.selectedExportEnvironment) {
      filters.environment = this.selectedExportEnvironment;
    }
    if (this.selectedExportCategory) {
      filters.category = this.selectedExportCategory;
    }

    this.oscService.exportBackup(this.exportPassword, filters).subscribe({
      next: (response: any) => {
        // Estrai la stringa backup_data dall'oggetto risposta
        const backupData = response.backup_data || JSON.stringify(response);
        const blob = new Blob([backupData], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `opensecureconf-backup-${timestamp}.json`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Successo',
          detail: 'Backup generato e scaricato con successo'
        });

        this.exportPassword = '';
        this.selectedExportEnvironment = null;
        this.selectedExportCategory = null;
        this.isExporting = false;
      },
      error: (error) => {
        console.error('Errore export:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: 'Errore durante la generazione del backup'
        });
        this.isExporting = false;
      }
    });
  }

  importBackup(): void {
    if (!this.importData || !this.importPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Attenzione',
        detail: 'Inserisci i dati del backup e la password'
      });
      return;
    }

    this.isImporting = true;

    this.oscService.importBackup(this.importData, this.importPassword, this.overwrite).subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Successo',
          detail: `Importate ${result.imported} configurazioni, saltate ${result.skipped}`
        });

        if (result.errors && result.errors.length > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Attenzione',
            detail: `${result.errors.length} configurazioni non importate`
          });
        }

        this.importData = '';
        this.importPassword = '';
        this.overwrite = false;
        this.isImporting = false;
      },
      error: (error) => {
        console.error('Errore import:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: 'Errore durante l\'importazione del backup'
        });
        this.isImporting = false;
      }
    });
  }

  onFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadedFileContent = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  importFromFile(): void {
    if (!this.uploadedFileContent || !this.fileImportPassword) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Attenzione',
        detail: 'Seleziona un file e inserisci la password'
      });
      return;
    }

    this.isImporting = true;

    this.oscService.importBackup(this.uploadedFileContent, this.fileImportPassword, this.fileOverwrite).subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Successo',
          detail: `Importate ${result.imported} configurazioni, saltate ${result.skipped}`
        });

        if (result.errors && result.errors.length > 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Attenzione',
            detail: `${result.errors.length} configurazioni non importate`
          });
        }

        this.uploadedFileName = '';
        this.uploadedFileContent = '';
        this.fileImportPassword = '';
        this.fileOverwrite = false;
        this.isImporting = false;

        // Reset file input
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        console.error('Errore import file:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: 'Errore durante l\'importazione del file'
        });
        this.isImporting = false;
      }
    });
  }
}