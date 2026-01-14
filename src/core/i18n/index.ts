/**
 * Core i18n System - Lazy Loading with Module Namespaces
 * 
 * Design Principles:
 * 1. Load ONLY tenant-enabled languages (never bundle all)
 * 2. Core labels loaded at bootstrap
 * 3. Module labels loaded when module registers
 * 4. Uses dynamic imports for code splitting
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';

// Import dayjs locales (these are small and needed for date formatting)
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/hi';
import 'dayjs/locale/kn';
import 'dayjs/locale/ta';
import 'dayjs/locale/te';
import 'dayjs/locale/mr';

// ============================================================================
// LANGUAGE MANIFEST - Maps language codes to lazy imports
// These are NEVER bundled until explicitly loaded
// ============================================================================

const CORE_LANGUAGE_MANIFEST: Record<string, () => Promise<{ default: object } | object>> = {
  'en': () => import('./locales/en.json'),
  'fr': () => import('./locales/fr.json'),
  'hi': () => import('./locales/hi.json'),
  'kn': () => import('./locales/kn.json'),
  'ta': () => import('./locales/ta.json'),
  'te': () => import('./locales/te.json'),
  'mr': () => import('./locales/mr.json'),
  // Add more as needed
};

// RTL languages for auto-direction
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Track loaded namespaces to prevent duplicate loads
const loadedNamespaces = new Set<string>();

// Track enabled languages for the current tenant
let tenantEnabledLanguages: string[] = ['en'];

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize i18n with tenant-specific languages.
 * Called once during app bootstrap.
 * 
 * @param enabledLanguages - Array of language codes enabled for this tenant
 * @param defaultLanguage - Default language code
 */
export async function initI18n(
  enabledLanguages: string[] = ['en'],
  defaultLanguage: string = 'en'
): Promise<void> {
  tenantEnabledLanguages = enabledLanguages;

  console.log('[i18n] Initializing with languages:', enabledLanguages);

  // Initialize i18next with empty resources (will load lazily)
  if (!i18next.isInitialized) {
    await i18next
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        fallbackLng: 'en',
        defaultNS: 'translation',
        ns: ['translation'],
        interpolation: { escapeValue: false },
        resources: {}, // Start empty - lazy load everything
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage'],
        },
        // Format missing translation keys as readable text
        parseMissingKeyHandler: (key: string) => {
          // Extract last part after the final dot (e.g., "common.label.sample" → "sample")
          const lastPart = key.split('.').pop() || key;

          // Replace underscores and hyphens with spaces, then apply title case
          return lastPart
            .replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        },
      });
  }

  // Load ONLY enabled core languages
  await loadCoreLanguages(enabledLanguages);

  // Set default language (respecting user preference if available)
  const savedLang = localStorage.getItem('i18nextLng');
  const targetLang = savedLang && enabledLanguages.includes(savedLang)
    ? savedLang
    : defaultLanguage;

  await i18next.changeLanguage(targetLang);
  dayjs.locale(targetLang);

  // Apply RTL if needed
  applyTextDirection(targetLang);

  console.log('[i18n] ✓ Initialization complete. Active language:', targetLang);
}

/**
 * Load core translation bundles for enabled languages
 */
async function loadCoreLanguages(enabledLanguages: string[]): Promise<void> {
  // Always ensure 'en' is in the list as it's our fallback
  const languagesToLoad = Array.from(new Set(['en', ...enabledLanguages]));

  const loadPromises = languagesToLoad
    .filter(lang => CORE_LANGUAGE_MANIFEST[lang] && !loadedNamespaces.has(`core:${lang}`))
    .map(async (lang) => {
      try {
        const startTime = performance.now();
        const module = await CORE_LANGUAGE_MANIFEST[lang]();
        const rawTranslations = 'default' in module ? module.default : module;

        // Ensure we handle both wrapped and unwrapped JSON
        const resources = (rawTranslations as any).translation || rawTranslations;

        // Add resources to the 'translation' namespace
        i18next.addResourceBundle(lang, 'translation', resources, true, true);

        loadedNamespaces.add(`core:${lang}`);
        const duration = Math.round(performance.now() - startTime);
        console.log(`[i18n] ✓ Core/${lang} loaded (${duration}ms)`);
      } catch (error) {
        console.error(`[i18n] ✗ Failed to load Core/${lang}:`, error);
      }
    });

  await Promise.all(loadPromises);
}

// ============================================================================
// MODULE TRANSLATIONS
// ============================================================================

/**
 * Register module-specific translations.
 * Called by each module during its registration.
 * 
 * @param moduleId - Module identifier (becomes namespace)
 * @param languageImports - Map of lang codes to lazy import functions
 * @param enabledLanguages - Optional override, defaults to tenant languages
 */
export async function registerModuleTranslations(
  moduleId: string,
  languageImports: Record<string, () => Promise<{ default: object } | object>>,
  enabledLanguages?: string[]
): Promise<void> {
  const langs = enabledLanguages || tenantEnabledLanguages;
  const namespace = moduleId;

  const loadPromises = langs
    .filter(lang => languageImports[lang] && !loadedNamespaces.has(`${namespace}:${lang}`))
    .map(async (lang) => {
      try {
        const startTime = performance.now();
        const module = await languageImports[lang]();
        const translations = 'default' in module ? module.default : module;

        i18next.addResourceBundle(lang, namespace, translations, true, true);
        loadedNamespaces.add(`${namespace}:${lang}`);

        const duration = Math.round(performance.now() - startTime);
        console.log(`[i18n] ✓ ${namespace}/${lang} loaded (${duration}ms)`);
      } catch (error) {
        console.error(`[i18n] ✗ Failed to load ${namespace}/${lang}:`, error);
      }
    });

  await Promise.all(loadPromises);
}

// ============================================================================
// LANGUAGE UTILITIES
// ============================================================================

/**
 * Change the active language
 */
export async function changeLanguage(lang: string): Promise<void> {
  if (!tenantEnabledLanguages.includes(lang)) {
    console.warn(`[i18n] Language ${lang} not enabled for this tenant`);
    return;
  }

  // Ensure language is loaded
  if (!loadedNamespaces.has(`core:${lang}`)) {
    await loadCoreLanguages([lang]);
  }

  await i18next.changeLanguage(lang);
  dayjs.locale(lang);
  applyTextDirection(lang);
}

/**
 * Apply RTL direction for RTL languages
 */
function applyTextDirection(lang: string): void {
  const isRTL = RTL_LANGUAGES.includes(lang);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}

/**
 * Get list of enabled languages for the current tenant
 */
export function getEnabledLanguages(): string[] {
  return [...tenantEnabledLanguages];
}

/**
 * Check if a language is enabled for the current tenant
 */
export function isLanguageEnabled(lang: string): boolean {
  return tenantEnabledLanguages.includes(lang);
}

/**
 * Get language display names (for language selector)
 */
export function getLanguageDisplayNames(): Record<string, string> {
  const displayNames: Record<string, string> = {
    'en': 'English',
    'hi': 'हिन्दी (Hindi)',
    'ta': 'தமிழ் (Tamil)',
    'te': 'తెలుగు (Telugu)',
    'kn': 'ಕನ್ನಡ (Kannada)',
    'mr': 'मराठी (Marathi)',
    'fr': 'Français (French)',
    'ar': 'العربية (Arabic)',
  };

  return Object.fromEntries(
    tenantEnabledLanguages
      .filter(lang => displayNames[lang])
      .map(lang => [lang, displayNames[lang]])
  );
}

// ============================================================================
// LANGUAGE CHANGE LISTENER
// ============================================================================

// Update dayjs locale when i18n language changes
i18next.on('languageChanged', (lng) => {
  dayjs.locale(lng);
  applyTextDirection(lng);
});

export default i18next;