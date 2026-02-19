import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Language, LANGUAGES, Translations, translations } from '../i18n/translations';

const LANG_KEY = 'osc_language';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  private langSubject = new BehaviorSubject<Language>(this.loadInitialLang());
  public lang$: Observable<Language> = this.langSubject.asObservable();

  readonly availableLanguages = LANGUAGES;

  private loadInitialLang(): Language {
    const saved = localStorage.getItem(LANG_KEY) as Language | null;
    if (saved && this.isValidLang(saved)) { return saved; }

    // Rileva lingua del browser
    const browserLang = navigator.language?.slice(0, 2) as Language;
    if (this.isValidLang(browserLang)) { return browserLang; }

    return 'it';
  }

  private isValidLang(lang: string): lang is Language {
    return ['it', 'en', 'de', 'fr', 'es'].includes(lang);
  }

  setLanguage(lang: Language): void {
    this.langSubject.next(lang);
    localStorage.setItem(LANG_KEY, lang);
  }

  getCurrentLang(): Language {
    return this.langSubject.value;
  }

  getTranslations(): Translations {
    return translations[this.langSubject.value];
  }

  t(lang: Language): Translations {
    return translations[lang];
  }
}