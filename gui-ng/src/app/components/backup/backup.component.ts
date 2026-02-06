import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
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
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="container">
      <div class="header">
        <h1><i class="pi pi-download"></i> Backup & Import</h1>
        <p class="subtitle">Gestisci import ed export delle configurazioni</p>
      </div>

      <div class="grid">
        <!-- EXPORT/BACKUP Section -->
        <div class="section-card">
          <div class="card-header">
            <i class="pi pi-cloud-download"></i>
            <span>Esporta Configurazioni</span>
          </div>
          
          <div class="card-body">
            <div class="info-box">
              <i class="pi pi-info-circle"></i>
              <span>Crea un backup crittografato delle configurazioni selezionate</span>
            </div>

            <div class="field">
              <label for="exportEnvironment">Environment (opzionale)</label>
              <p-dropdown
                id="exportEnvironment"
                [options]="environments"
                [(ngModel)]="selectedExportEnvironment"
                placeholder="Tutti gli environment"
                [showClear]="true"
                styleClass="w-full"
              ></p-dropdown>
            </div>

            <div class="field">
              <label for="exportCategory">Categoria (opzionale)</label>
              <p-dropdown
                id="exportCategory"
                [options]="categories"
                [(ngModel)]="selectedExportCategory"
                placeholder="Tutte le categorie"
                [showClear]="true"
                styleClass="w-full"
              ></p-dropdown>
            </div>

            <div class="field">
              <label for="backupPassword">Password Backup *</label>
              <input
                id="backupPassword"
                type="password"
                pInputText
                [(ngModel)]="exportPassword"
                placeholder="Inserisci password per crittografia"
                class="w-full"
              />
            </div>

            <button
              pButton
              label="Genera Backup"
              icon="pi pi-download"
              class="w-full p-button-success"
              (click)="exportBackup()"
              [disabled]="!exportPassword || isExporting"
              [loading]="isExporting"
            ></button>

            <div *ngIf="selectedExportEnvironment || selectedExportCategory" class="filter-info">
              <small>
                <i class="pi pi-filter"></i>
                Filtri attivi: 
                <span *ngIf="selectedExportEnvironment">Environment: <strong>{{ selectedExportEnvironment }}</strong></span>
                <span *ngIf="selectedExportEnvironment && selectedExportCategory"> | </span>
                <span *ngIf="selectedExportCategory">Categoria: <strong>{{ selectedExportCategory }}</strong></span>
              </small>
            </div>
          </div>
        </div>

        <!-- IMPORT Section -->
        <div class="section-card">
          <div class="card-header">
            <i class="pi pi-cloud-upload"></i>
            <span>Importa Configurazioni</span>
          </div>
          
          <div class="card-body">
            <div class="info-box">
              <i class="pi pi-info-circle"></i>
              <span>Ripristina configurazioni da un backup crittografato</span>
            </div>

            <div class="field">
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

            <div class="field">
              <label for="importPassword">Password Backup *</label>
              <input
                id="importPassword"
                type="password"
                pInputText
                [(ngModel)]="importPassword"
                placeholder="Password del backup"
                class="w-full"
              />
            </div>

            <div class="field-checkbox">
              <input
                type="checkbox"
                id="overwrite"
                [(ngModel)]="overwrite"
              />
              <label for="overwrite">Sovrascrivi configurazioni esistenti</label>
            </div>

            <button
              pButton
              label="Importa Backup"
              icon="pi pi-upload"
              class="w-full p-button-primary"
              (click)="importBackup()"
              [disabled]="!importData || !importPassword || isImporting"
              [loading]="isImporting"
            ></button>
          </div>
        </div>
      </div>

      <!-- File Upload Alternative -->
      <div class="section-card mt-4">
        <div class="card-header">
          <i class="pi pi-file"></i>
          <span>Importa da File</span>
        </div>
        
        <div class="card-body">
          <div class="info-box">
            <i class="pi pi-info-circle"></i>
            <span>Carica un file di backup (.json o .txt)</span>
          </div>

          <div class="field">
            <label for="fileInput">Seleziona File Backup</label>
            <input
              type="file"
              id="fileInput"
              accept=".json,.txt"
              (change)="onFileSelect($event)"
              class="file-input"
            />
          </div>

          <div *ngIf="uploadedFileName" class="file-info">
            <p><strong>File caricato:</strong> {{ uploadedFileName }}</p>
            
            <div class="field">
              <label for="fileImportPassword">Password Backup *</label>
              <input
                id="fileImportPassword"
                type="password"
                pInputText
                [(ngModel)]="fileImportPassword"
                placeholder="Password del backup"
                class="w-full"
              />
            </div>

            <div class="field-checkbox">
              <input
                type="checkbox"
                id="fileOverwrite"
                [(ngModel)]="fileOverwrite"
              />
              <label for="fileOverwrite">Sovrascrivi configurazioni esistenti</label>
            </div>

            <button
              pButton
              label="Importa da File"
              icon="pi pi-upload"
              class="w-full p-button-primary"
              (click)="importFromFile()"
              [disabled]="!fileImportPassword || isImporting"
              [loading]="isImporting"
            ></button>
          </div>
        </div>
      </div>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--text-color);
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header h1 i {
      color: var(--primary-color);
    }

    .subtitle {
      color: var(--text-color-secondary);
      margin: 0;
      font-size: 1rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 1.5rem;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }

    .section-card {
      background: var(--surface-card);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .card-header {
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-color);
      background: var(--surface-50);
      border-bottom: 1px solid var(--surface-border);
    }

    .card-header i {
      color: var(--primary-color);
      font-size: 1.5rem;
    }

    .card-body {
      padding: 1.5rem;
    }

    .info-box {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--blue-50);
      border-left: 3px solid var(--blue-500);
      border-radius: 4px;
      margin-bottom: 1.5rem;
      color: var(--text-color);
    }

    .info-box i {
      color: var(--blue-500);
      margin-top: 0.2rem;
      flex-shrink: 0;
    }

    .filter-info {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--surface-100);
      border-radius: 4px;
      color: var(--text-color-secondary);
    }

    .filter-info i {
      margin-right: 0.5rem;
    }

    .field {
      margin-bottom: 1.5rem;
    }

    .field label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--text-color);
    }

    .field-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .field-checkbox input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .field-checkbox label {
      margin: 0;
      color: var(--text-color);
      cursor: pointer;
    }

    .file-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      background: var(--surface-ground);
      color: var(--text-color);
      cursor: pointer;
    }

    .file-input:hover {
      border-color: var(--primary-color);
    }

    .file-info {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--surface-50);
      border-radius: 4px;
    }

    .file-info p {
      margin: 0 0 1rem 0;
      color: var(--text-color);
    }

    .mt-4 {
      margin-top: 1.5rem;
    }

    :host ::ng-deep {
      .p-button {
        padding: 0.75rem 1.5rem;
        font-weight: 500;
      }

      .p-inputtext,
      .p-inputtextarea {
        width: 100%;
      }

      .w-full {
        width: 100%;
      }

      .p-dropdown {
        width: 100%;
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

  // Filtri export
  selectedExportEnvironment: string | null = null;
  selectedExportCategory: string | null = null;
  environments: string[] = [];
  categories: string[] = [];

  constructor(
    private oscService: OpenSecureConfService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadFilters();
  }

  loadFilters(): void {
    // Carica environments
    this.oscService.listEnvironments().subscribe({
      next: (envs) => {
        this.environments = envs;
      },
      error: (error) => {
        console.error('Errore caricamento environments:', error);
      }
    });

    // Carica categorie
    this.oscService.listCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
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
      next: (response) => {
        this.downloadBackup(response.backup_data);
        
        let detail = 'Backup creato con successo';
        if (this.selectedExportEnvironment || this.selectedExportCategory) {
          detail += ' (filtrato)';
        }
        
        this.messageService.add({
          severity: 'success',
          summary: 'Successo',
          detail: detail,
          life: 3000
        });
        this.isExporting = false;
        this.exportPassword = '';
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: error.message || 'Errore durante la creazione del backup',
          life: 5000
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
      next: (response) => {
        let message = `Importate: ${response.imported} configurazioni`;
        if (response.skipped > 0) {
          message += `, saltate: ${response.skipped}`;
        }
        if (response.errors.length > 0) {
          message += `, errori: ${response.errors.length}`;
        }
        
        this.messageService.add({
          severity: response.errors.length > 0 ? 'warn' : 'success',
          summary: response.errors.length > 0 ? 'Importazione completata con errori' : 'Successo',
          detail: message,
          life: 5000
        });
        
        this.isImporting = false;
        this.importData = '';
        this.importPassword = '';
        this.overwrite = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: error.message || 'Errore durante l\'importazione del backup',
          life: 5000
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
        detail: 'Carica un file e inserisci la password'
      });
      return;
    }

    this.isImporting = true;
    this.oscService.importBackup(this.uploadedFileContent, this.fileImportPassword, this.fileOverwrite).subscribe({
      next: (response) => {
        let message = `Importate: ${response.imported} configurazioni`;
        if (response.skipped > 0) {
          message += `, saltate: ${response.skipped}`;
        }
        if (response.errors.length > 0) {
          message += `, errori: ${response.errors.length}`;
        }
        
        this.messageService.add({
          severity: response.errors.length > 0 ? 'warn' : 'success',
          summary: response.errors.length > 0 ? 'Importazione completata con errori' : 'Successo',
          detail: message,
          life: 5000
        });
        
        this.isImporting = false;
        this.uploadedFileName = '';
        this.uploadedFileContent = '';
        this.fileImportPassword = '';
        this.fileOverwrite = false;
        
        // Reset file input
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Errore',
          detail: error.message || 'Errore durante l\'importazione',
          life: 5000
        });
        this.isImporting = false;
      }
    });
  }

  private downloadBackup(backupData: string): void {
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nome file con filtri se presenti
    let filename = `backup-${new Date().toISOString().split('T')[0]}`;
    if (this.selectedExportEnvironment) {
      filename += `-${this.selectedExportEnvironment}`;
    }
    if (this.selectedExportCategory) {
      filename += `-${this.selectedExportCategory}`;
    }
    filename += '.json';
    
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
