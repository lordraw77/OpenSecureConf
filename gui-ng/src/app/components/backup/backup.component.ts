import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { OpenSecureConfService } from '../../services/opensecureconf.service';
import { LanguageService } from '../../services/language.service';
import { Language, Translations } from '../../i18n/translations';

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
    ToastModule,
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
              {{ t.backup.title }}
            </h1>
            <p>{{ t.backup.subtitle }}</p>
          </div>
        </div>
      </div>

      <div class="backup-grid">

        <!-- ── EXPORT ─────────────────────────────────────────────────────── -->
        <div class="backup-card">
          <div class="card-header">
            <div class="header-icon">
              <i class="pi pi-cloud-download"></i>
            </div>
            <span>{{ t.backup.cardExportTitle }}</span>
          </div>

          <div class="card-body">
            <div class="info-banner">
              <i class="pi pi-info-circle"></i>
              <span>{{ t.backup.exportInfoBanner }}</span>
            </div>

            <div class="form-field">
              <label for="exportEnvironment">{{ t.backup.exportEnvLabel }}</label>
              <p-dropdown
                id="exportEnvironment"
                [options]="environmentOptions"
                [(ngModel)]="selectedExportEnvironment"
                [placeholder]="t.backup.exportEnvPlaceholder"
                [showClear]="true"
                styleClass="w-full custom-dropdown">
              </p-dropdown>
            </div>

            <div class="form-field">
              <label for="exportCategory">{{ t.backup.exportCatLabel }}</label>
              <p-dropdown
                id="exportCategory"
                [options]="categoryOptions"
                [(ngModel)]="selectedExportCategory"
                [placeholder]="t.backup.exportCatPlaceholder"
                [showClear]="true"
                styleClass="w-full custom-dropdown">
              </p-dropdown>
            </div>

            <div class="form-field">
              <label for="exportPassword">{{ t.backup.exportPasswordLabel }}</label>
              <span class="p-input-icon-right w-full">
                <i class="pi pi-lock"></i>
                <input
                  id="exportPassword"
                  type="password"
                  pInputText
                  [(ngModel)]="exportPassword"
                  [placeholder]="t.backup.exportPasswordPlaceholder"
                  class="w-full"
                />
              </span>
            </div>

            <div class="filter-summary" *ngIf="selectedExportEnvironment || selectedExportCategory">
              <i class="pi pi-filter"></i>
              <span>
                {{ t.backup.filterSummaryPrefix }}
                <strong *ngIf="selectedExportEnvironment">&nbsp;{{ t.backup.filterSummaryEnv }} "{{ selectedExportEnvironment }}"</strong>
                <strong *ngIf="selectedExportCategory">&nbsp;{{ t.backup.filterSummaryCat }} "{{ selectedExportCategory }}"</strong>
              </span>
            </div>

            <button
              pButton
              [label]="t.backup.btnGenerateBackup"
              icon="pi pi-download"
              class="w-full action-button export-button"
              (click)="exportBackup()"
              [disabled]="!exportPassword || isExporting"
              [loading]="isExporting">
            </button>
          </div>
        </div>

        <!-- ── IMPORT (paste) ────────────────────────────────────────────── -->
        <div class="backup-card">
          <div class="card-header">
            <div class="header-icon import-icon">
              <i class="pi pi-cloud-upload"></i>
            </div>
            <span>{{ t.backup.cardImportTitle }}</span>
          </div>

          <div class="card-body">
            <div class="info-banner info-banner-import">
              <i class="pi pi-info-circle"></i>
              <span>{{ t.backup.importInfoBanner }}</span>
            </div>

            <div class="form-field">
              <label for="importData">{{ t.backup.importDataLabel }}</label>
              <textarea
                id="importData"
                pInputTextarea
                [(ngModel)]="importData"
                [placeholder]="t.backup.importDataPlaceholder"
                rows="6"
                class="w-full">
              </textarea>
            </div>

            <div class="form-field">
              <label for="importPassword">{{ t.backup.importPasswordLabel }}</label>
              <span class="p-input-icon-right w-full">
                <i class="pi pi-lock"></i>
                <input
                  id="importPassword"
                  type="password"
                  pInputText
                  [(ngModel)]="importPassword"
                  [placeholder]="t.backup.importPasswordPlaceholder"
                  class="w-full"
                />
              </span>
            </div>

            <div class="checkbox-field">
              <p-checkbox
                [(ngModel)]="overwrite"
                [binary]="true"
                inputId="overwrite">
              </p-checkbox>
              <label for="overwrite">{{ t.backup.importOverwriteLabel }}</label>
            </div>

            <button
              pButton
              [label]="t.backup.btnImportBackup"
              icon="pi pi-upload"
              class="w-full action-button import-button"
              (click)="importBackup()"
              [disabled]="!importData || !importPassword || isImporting"
              [loading]="isImporting">
            </button>
          </div>
        </div>

        <!-- ── IMPORT FROM FILE ───────────────────────────────────────────── -->
        <div class="backup-card full-width">
          <div class="card-header">
            <div class="header-icon file-icon">
              <i class="pi pi-file"></i>
            </div>
            <span>{{ t.backup.cardFileTitle }}</span>
          </div>

          <div class="card-body">
            <div class="info-banner info-banner-file">
              <i class="pi pi-info-circle"></i>
              <span>{{ t.backup.fileInfoBanner }}</span>
            </div>

            <div class="file-upload-section">
              <div class="form-field">
                <label for="fileInput">{{ t.backup.fileSelectLabel }}</label>
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
                      {{ t.backup.fileNoFileSelected }}
                    </span>
                    <span *ngIf="uploadedFileName" class="file-name">
                      {{ uploadedFileName }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="form-field" *ngIf="uploadedFileName">
                <label for="filePassword">{{ t.backup.filePasswordLabel }}</label>
                <span class="p-input-icon-right w-full">
                  <i class="pi pi-lock"></i>
                  <input
                    id="filePassword"
                    type="password"
                    pInputText
                    [(ngModel)]="fileImportPassword"
                    [placeholder]="t.backup.filePasswordPlaceholder"
                    class="w-full"
                  />
                </span>
              </div>

              <div class="checkbox-field" *ngIf="uploadedFileName">
                <p-checkbox
                  [(ngModel)]="fileOverwrite"
                  [binary]="true"
                  inputId="fileOverwrite">
                </p-checkbox>
                <label for="fileOverwrite">{{ t.backup.fileOverwriteLabel }}</label>
              </div>

              <button
                pButton
                [label]="t.backup.btnImportFromFile"
                icon="pi pi-upload"
                class="w-full action-button file-button"
                (click)="importFromFile()"
                [disabled]="!fileImportPassword || isImporting"
                [loading]="isImporting">
              </button>
            </div>
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

    .page-header h1 i { color: #667eea; }

    .page-header p {
      color: var(--text-secondary);
      margin: 0;
      font-size: 1.1rem;
    }

    .backup-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    @media (max-width: 900px) {
      .backup-grid { grid-template-columns: 1fr; }
    }

    .backup-card {
      background: var(--card-bg);
      border-radius: 16px;
      box-shadow: 0 4px 20px var(--shadow-sm);
      overflow: hidden;
    }

    .backup-card.full-width {
      grid-column: 1 / -1;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .import-icon { background: rgba(255,255,255,0.2); }
    .file-icon   { background: rgba(255,255,255,0.2); }

    .card-body {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: rgba(102, 126, 234, 0.08);
      border-left: 3px solid #667eea;
      border-radius: 0 8px 8px 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .info-banner i { color: #667eea; flex-shrink: 0; margin-top: 0.1rem; }

    .info-banner-import {
      background: rgba(79, 172, 254, 0.08);
      border-left-color: #4facfe;
    }

    .info-banner-import i { color: #4facfe; }

    .info-banner-file {
      background: rgba(250, 112, 154, 0.08);
      border-left-color: #fa709a;
    }

    .info-banner-file i { color: #fa709a; }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-field label {
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
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
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .filter-summary i { color: #667eea; flex-shrink: 0; margin-top: 0.2rem; }
    .filter-summary strong { color: var(--text-primary); font-weight: 600; }

    .file-upload-section { margin-top: 0; }

    .file-input-wrapper { position: relative; }

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

    .file-input-display i { font-size: 1.5rem; color: #667eea; }
    .file-placeholder { color: var(--text-secondary); }
    .file-name { color: var(--text-primary); font-weight: 600; }

    .action-button {
      margin-top: 0.5rem;
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
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    :host ::ng-deep {
      .p-inputtext, .p-inputtextarea {
        background: var(--bg-secondary) !important;
        border: 1px solid var(--border-color) !important;
        color: var(--text-primary) !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
      }

      .p-inputtext:focus, .p-inputtextarea:focus {
        border-color: #667eea !important;
        box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
      }

      .custom-dropdown.p-dropdown {
        background: var(--bg-secondary) !important;
        border: 1px solid var(--border-color) !important;
        border-radius: 8px !important;
      }

      .custom-dropdown.p-dropdown .p-dropdown-label {
        color: var(--text-primary) !important;
      }

      .p-dropdown-panel {
        background: var(--card-bg) !important;
        border: 1px solid var(--border-color) !important;
        box-shadow: 0 4px 20px var(--shadow-sm) !important;
        border-radius: 8px !important;
      }

      .p-dropdown-panel .p-dropdown-item {
        color: var(--text-primary) !important;
        padding: 0.75rem 1rem !important;
      }

      .p-dropdown-panel .p-dropdown-item:not(.p-disabled):hover {
        background: var(--hover-bg) !important;
        color: #667eea !important;
      }

      .p-dropdown-panel .p-dropdown-item.p-highlight {
        background: rgba(102, 126, 234, 0.15) !important;
        color: #667eea !important;
      }

      .p-checkbox .p-checkbox-box {
        background: var(--card-bg) !important;
        border: 2px solid var(--border-color) !important;
        border-radius: 4px !important;
        transition: all 0.3s ease !important;
      }

      .p-checkbox .p-checkbox-box.p-highlight {
        background: #667eea !important;
        border-color: #667eea !important;
      }

      .p-checkbox .p-checkbox-box .p-checkbox-icon { color: white !important; }

      .p-input-icon-right > i:last-of-type {
        right: 1rem !important;
        color: var(--text-secondary) !important;
      }

      .p-input-icon-right > .p-inputtext { padding-right: 3rem !important; }

      .p-button:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }

      .p-toast { opacity: 0.98 !important; }

      .p-toast .p-toast-message {
        backdrop-filter: blur(10px) !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
      }
    }
  `]
})
export class BackupComponent implements OnInit, OnDestroy {

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

  environmentOptions: Array<{ label: string; value: string }> = [];
  categoryOptions:    Array<{ label: string; value: string }> = [];

  t!: Translations;
  private langSub!: Subscription;

  constructor(
    private oscService:     OpenSecureConfService,
    private messageService: MessageService,
    private langService:    LanguageService,
  ) {}

  ngOnInit(): void {
    this.t = this.langService.getTranslations();
    this.langSub = this.langService.lang$.subscribe((lang: Language) => {
      this.t = this.langService.t(lang);
    });
    this.loadFilters();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  // ── Filters ───────────────────────────────────────────────────────────────

  loadFilters(): void {
    this.oscService.listEnvironments().subscribe({
      next: (envs) => {
        this.environmentOptions = envs.map(env => ({ label: env, value: env }));
      },
      error: (err) => console.error('Errore caricamento environments:', err),
    });

    this.oscService.listCategories().subscribe({
      next: (cats) => {
        this.categoryOptions = cats.map(cat => ({ label: cat, value: cat }));
      },
      error: (err) => console.error('Errore caricamento categorie:', err),
    });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportBackup(): void {
    if (!this.exportPassword) {
      this.warn(this.t.backup.toastWarnNeedPassword);
      return;
    }

    this.isExporting = true;

    const filters: Record<string, string> = {};
    if (this.selectedExportEnvironment) filters['environment'] = this.selectedExportEnvironment;
    if (this.selectedExportCategory)    filters['category']    = this.selectedExportCategory;

    this.oscService.exportBackup(this.exportPassword, filters).subscribe({
      next: (response: any) => {
        const backupData = response.backup_data || JSON.stringify(response);
        const blob = new Blob([backupData], { type: 'application/json' });
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        const ts   = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `opensecureconf-backup-${ts}.json`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.success(this.t.backup.toastExportSuccess);
        this.exportPassword            = '';
        this.selectedExportEnvironment = null;
        this.selectedExportCategory    = null;
        this.isExporting               = false;
      },
      error: (err) => {
        console.error('Errore export:', err);
        this.error(this.t.backup.toastExportError);
        this.isExporting = false;
      },
    });
  }

  // ── Import (paste) ────────────────────────────────────────────────────────

  importBackup(): void {
    if (!this.importData || !this.importPassword) {
      this.warn(this.t.backup.toastWarnNeedDataAndPw);
      return;
    }

    this.isImporting = true;

    this.oscService.importBackup(this.importData, this.importPassword, this.overwrite).subscribe({
      next: (result) => {
        this.success(this.interpolate(this.t.backup.toastImportSuccess, {
          imported: String(result.imported),
          skipped:  String(result.skipped),
        }));

        if (result.errors?.length > 0) {
          this.messageService.add({
            severity: 'warn',
            summary:  this.t.backup.toastWarnSummary,
            detail:   this.interpolate(this.t.backup.toastImportPartial, { count: String(result.errors.length) }),
          });
        }

        this.importData     = '';
        this.importPassword = '';
        this.overwrite      = false;
        this.isImporting    = false;
      },
      error: (err) => {
        console.error('Errore import:', err);
        this.error(this.t.backup.toastImportError);
        this.isImporting = false;
      },
    });
  }

  // ── Import from file ──────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadedFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.uploadedFileContent = e.target?.result as string;
      };
      reader.readAsText(file);
    }
  }

  importFromFile(): void {
    if (!this.uploadedFileContent || !this.fileImportPassword) {
      this.warn(this.t.backup.toastWarnNeedFileAndPw);
      return;
    }

    this.isImporting = true;

    this.oscService.importBackup(this.uploadedFileContent, this.fileImportPassword, this.fileOverwrite).subscribe({
      next: (result) => {
        this.success(this.interpolate(this.t.backup.toastImportSuccess, {
          imported: String(result.imported),
          skipped:  String(result.skipped),
        }));

        if (result.errors?.length > 0) {
          this.messageService.add({
            severity: 'warn',
            summary:  this.t.backup.toastWarnSummary,
            detail:   this.interpolate(this.t.backup.toastImportPartial, { count: String(result.errors.length) }),
          });
        }

        this.uploadedFileName    = '';
        this.uploadedFileContent = '';
        this.fileImportPassword  = '';
        this.fileOverwrite       = false;
        this.isImporting         = false;

        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err) => {
        console.error('Errore import file:', err);
        this.error(this.t.backup.toastFileImportError);
        this.isImporting = false;
      },
    });
  }

  // ── Toast helpers ─────────────────────────────────────────────────────────

  private success(detail: string): void {
    this.messageService.add({ severity: 'success', summary: this.t.backup.toastSuccessSummary, detail });
  }

  private warn(detail: string): void {
    this.messageService.add({ severity: 'warn', summary: this.t.backup.toastWarnSummary, detail });
  }

  private error(detail: string): void {
    this.messageService.add({ severity: 'error', summary: this.t.backup.toastErrorSummary, detail });
  }

  /** Replace {key} placeholders in a translation string */
  private interpolate(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
  }
}