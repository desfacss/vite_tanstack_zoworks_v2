# Core Refactoring: AI-Native Multi-Tenant SaaS Architecture

**Document Version:** 1.0  
**Created:** 2025-12-21  
**Author:** Principal Architecture  
**Classification:** Strategic Technical Design

---

## Executive Vision

Build an **AI-native, hyper-configurable SaaS platform** that can instantiate any B2B or B2B2C system of record (CRM, FSM, ERP, ESM, WMS, POS, etc.) for any enterprise size, running on a **single codebase, single deployment, single database** with **tenant-aware lazy loading**.

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Zero Waste Loading** | Load only what the tenant needs - never ship unused code |
| **Subdomain-Driven Configuration** | Subdomain determines tenant, modules, theme, language |
| **Feature Composition** | Build any SOR from composable capability modules |
| **AI-First Data Model** | Schema designed for AI agents to read, write, and reason |
| **Progressive Enhancement** | Works with minimal config, enhances with more |

---

## Part 1: Multi-Tenant Domain Architecture

### 1.1 Domain Hierarchy

```
zoworks.com                          # Main marketing site
├── zoworks.ai                       # Redirect / AI landing
│
├── PRODUCT LANDINGS
│   ├── crm.zoworks.com              # CRM product landing
│   ├── fsm.zoworks.com              # FSM product landing
│   ├── esm.zoworks.com              # ESM product landing
│   └── engage.zoworks.com           # WhatsApp Engage landing
│
├── AUTH PORTAL
│   └── login.zoworks.com            # Central login/register
│
├── DEMO INSTANCES (Pre-configured tenants)
│   ├── crm_retail_small.zoworks.com
│   ├── crm_fin_large.zoworks.com
│   ├── crm_retail_large.zoworks.com
│   ├── fsm_hvac_large.zoworks.com
│   └── demo.zoworks.com             # Demo selector portal
│
└── CLIENT INSTANCES (Production tenants)
    ├── vkbs.zoworks.com
    ├── sk.zoworks.com
    ├── valathi.zoworks.com
    └── {tenant_slug}.zoworks.com
```

### 1.2 Single Deployment, Multi-Subdomain Strategy

**Vercel Configuration:**

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Tenant-Resolution", "value": "subdomain" }
      ]
    }
  ]
}
```

**Custom Domain Mapping (Vercel Dashboard):**
```
*.zoworks.com → main deployment
login.zoworks.com → main deployment  
crm.zoworks.com → main deployment (with landing route)
vkbs.zoworks.com → main deployment
```

### 1.3 Tenant Resolution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser Request: https://vkbs.zoworks.com/dashboard            │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────┐                    │
│  │     1. SUBDOMAIN EXTRACTION             │                    │
│  │     hostname.split('.')[0] → 'vkbs'     │                    │
│  └─────────────────────────────────────────┘                    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────┐                    │
│  │     2. TENANT CONFIG LOOKUP             │                    │
│  │     Cache → Supabase → Default          │                    │
│  └─────────────────────────────────────────┘                    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────┐                    │
│  │     3. LOAD TENANT CONTEXT              │                    │
│  │     - Enabled modules                   │                    │
│  │     - Theme configuration               │                    │
│  │     - Language settings                 │                    │
│  │     - Partition rules                   │                    │
│  │     - Feature flags                     │                    │
│  └─────────────────────────────────────────┘                    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────┐                    │
│  │     4. DYNAMIC MODULE LOADING           │                    │
│  │     Only load enabled modules           │                    │
│  └─────────────────────────────────────────┘                    │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────┐                    │
│  │     5. RENDER APP                       │                    │
│  │     With tenant-specific config         │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Tenant Configuration Schema

### 2.1 Database Schema

```sql
-- identity.tenant_configs
CREATE TABLE identity.tenant_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,                    -- 'vkbs', 'sk', 'demo_crm_retail'
  organization_id UUID REFERENCES identity.organizations(id),
  
  -- Domain Configuration
  custom_domain TEXT,                           -- 'app.clientcompany.com'
  subdomain TEXT UNIQUE NOT NULL,               -- 'vkbs'
  
  -- Module Configuration
  enabled_modules TEXT[] DEFAULT '{"core"}',    -- ['core', 'crm', 'tickets']
  module_config JSONB DEFAULT '{}',             -- Module-specific settings
  
  -- Appearance (ONE theme per tenant - no user toggle)
  theme_config JSONB DEFAULT '{
    "mode": "light",
    "primaryColor": "#1890ff",
    "logoUrl": null,
    "faviconUrl": null,
    "brandName": "Zoworks"
  }',  -- mode: 'light' | 'dark' only (no 'system' option)
  
  -- Localization
  enabled_languages TEXT[] DEFAULT '{"en"}',    -- ['en', 'ar', 'hi']
  default_language TEXT DEFAULT 'en',
  rtl_languages TEXT[] DEFAULT '{"ar", "he"}',  -- RTL support languages
  
  -- Partition Configuration
  partition_config JSONB DEFAULT '{
    "organization": {"required": true, "visible": false},
    "location": {"required": false, "visible": true},
    "team": {"required": false, "visible": false},
    "role": {"required": false, "visible": false}
  }',
  
  -- Feature Flags
  features JSONB DEFAULT '{
    "ai_assistant": false,
    "workflow_automation": false,
    "api_access": false,
    "white_label": false,
    "sso": false,
    "audit_logs": true
  }',
  
  -- System
  is_demo BOOLEAN DEFAULT FALSE,
  demo_credentials JSONB,                       -- For demo instances
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX idx_tenant_configs_subdomain ON identity.tenant_configs(subdomain);
CREATE INDEX idx_tenant_configs_custom_domain ON identity.tenant_configs(custom_domain);
```

### 2.2 Module Configuration Examples

```jsonc
// CRM-focused tenant (small retail)
{
  "slug": "crm_retail_small",
  "enabled_modules": ["core", "crm"],
  "module_config": {
    "crm": {
      "entities": ["leads", "contacts", "accounts", "deals"],
      "pipeline_stages": 5,
      "email_integration": false
    }
  },
  "theme_config": {
    "mode": "light",
    "primaryColor": "#52c41a"
  },
  "enabled_languages": ["en"],
  "partition_config": {
    "organization": { "required": true, "visible": false },
    "location": { "required": false, "visible": false }
  }
}

// FSM-focused tenant (large HVAC)
{
  "slug": "fsm_hvac_large",
  "enabled_modules": ["core", "crm", "tickets", "fsm", "workforce", "contracts", "wa"],
  "module_config": {
    "fsm": {
      "tracking": true,
      "planner": true,
      "route_optimization": true
    },
    "workforce": {
      "timesheets": true,
      "expenses": true,
      "leaves": true
    }
  },
  "enabled_languages": ["en", "hi", "ta"],
  "partition_config": {
    "organization": { "required": true, "visible": false },
    "location": { "required": true, "visible": true },
    "team": { "required": false, "visible": true }
  }
}

// Enterprise with Arabic support
{
  "slug": "enterprise_mena",
  "enabled_modules": ["core", "crm", "tickets", "erp", "esm"],
  "theme_config": {
    "mode": "dark",
    "primaryColor": "#722ed1"
  },
  "enabled_languages": ["en", "ar"],
  "default_language": "ar",
  "rtl_languages": ["ar"],
  "partition_config": {
    "organization": { "required": true },
    "location": { "required": true },
    "team": { "required": true },
    "role": { "required": true }
  }
}
```

---

## Part 3: Lean Frontend Architecture

### 3.1 Application Shell (Minimal Core)

The core must be **under 200KB gzipped** and include ONLY:

```
src/core/
├── bootstrap/                     # App initialization
│   ├── index.tsx                  # Entry point
│   ├── TenantProvider.tsx         # Tenant context
│   ├── TenantResolver.ts          # Subdomain → config
│   └── ModuleLoader.ts            # Dynamic module loading
│
├── auth/                          # Authentication (required)
│   ├── AuthGuard.tsx
│   ├── SessionManager.tsx
│   ├── LoginPage.tsx              # Minimal login
│   └── hooks/
│       └── useUserSession.ts
│
├── layout/                        # Shell layout
│   ├── AppShell.tsx               # Minimal shell
│   ├── Header/                    # Dynamic header
│   ├── Sider/                     # Dynamic navigation
│   └── ErrorBoundary.tsx
│
├── theme/                         # Theming system
│   ├── ThemeProvider.tsx
│   ├── ThemeRegistry.ts           # Tenant theme loader
│   └── defaultTheme.ts
│
├── i18n/                          # Internationalization
│   ├── I18nProvider.tsx
│   ├── I18nRegistry.ts            # Tenant language loader
│   └── defaultLocale.json         # Minimal English
│
├── registry/                      # Central registration
│   ├── index.ts
│   ├── moduleRegistry.ts
│   ├── routeRegistry.ts
│   ├── navRegistry.ts
│   └── types.ts
│
├── components/                    # Shared primitives
│   ├── LoadingFallback.tsx
│   ├── ErrorDisplay.tsx
│   └── Suspense wrappers
│
└── lib/                           # Core utilities
    ├── supabase.ts
    ├── store.ts                   # Zustand core store
    ├── queryClient.ts
    └── types.ts
```

### 3.2 Tenant-Aware Bootstrap Sequence

```typescript
// src/core/bootstrap/index.tsx

import { resolveTenant } from './TenantResolver';
import { loadModules } from './ModuleLoader';
import { loadTheme } from '../theme/ThemeRegistry';
import { loadLanguages } from '../i18n/I18nRegistry';

async function bootstrap() {
  // 1. Resolve tenant from subdomain
  const subdomain = window.location.hostname.split('.')[0];
  const tenantConfig = await resolveTenant(subdomain);
  
  // 2. Load theme for tenant
  await loadTheme(tenantConfig.theme_config);
  
  // 3. Load enabled languages
  await loadLanguages(tenantConfig.enabled_languages);
  
  // 4. Load enabled modules (lazy)
  await loadModules(tenantConfig.enabled_modules, tenantConfig.module_config);
  
  // 5. Render app with tenant context
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <TenantProvider config={tenantConfig}>
      <App />
    </TenantProvider>
  );
}

bootstrap().catch(console.error);
```

### 3.3 Tenant Resolver with Caching

```typescript
// src/core/bootstrap/TenantResolver.ts

import { supabase } from '../lib/supabase';

interface TenantConfig {
  slug: string;
  organization_id: string;
  enabled_modules: string[];
  module_config: Record<string, any>;
  theme_config: ThemeConfig;
  enabled_languages: string[];
  default_language: string;
  partition_config: PartitionConfig;
  features: Record<string, boolean>;
  is_demo: boolean;
}

// In-memory cache
const tenantCache = new Map<string, { config: TenantConfig; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Special subdomains that are NOT tenants
const RESERVED_SUBDOMAINS = [
  'www', 'login', 'api', 'admin', 
  'crm', 'fsm', 'esm', 'erp',  // Product landings
  'demo', 'docs', 'help'
];

export async function resolveTenant(subdomain: string): Promise<TenantConfig> {
  // Handle reserved subdomains
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return getSpecialConfig(subdomain);
  }
  
  // Check cache
  const cached = tenantCache.get(subdomain);
  if (cached && cached.expiry > Date.now()) {
    console.log(`[Tenant] Cache hit: ${subdomain}`);
    return cached.config;
  }
  
  // Fetch from database
  console.log(`[Tenant] Fetching config: ${subdomain}`);
  const { data, error } = await supabase
    .schema('identity')
    .from('tenant_configs')
    .select('*')
    .or(`subdomain.eq.${subdomain},custom_domain.eq.${window.location.hostname}`)
    .single();
  
  if (error || !data) {
    console.warn(`[Tenant] Not found: ${subdomain}, using default`);
    return getDefaultConfig(subdomain);
  }
  
  // Cache result
  tenantCache.set(subdomain, {
    config: data,
    expiry: Date.now() + CACHE_TTL
  });
  
  return data;
}

function getSpecialConfig(subdomain: string): TenantConfig {
  const configs: Record<string, Partial<TenantConfig>> = {
    'login': {
      enabled_modules: ['core'],
      theme_config: { mode: 'light', primaryColor: '#1890ff' },
      enabled_languages: ['en'],
    },
    'crm': {
      enabled_modules: ['core', 'landing'],
      theme_config: { mode: 'light', primaryColor: '#52c41a' },
    },
    'fsm': {
      enabled_modules: ['core', 'landing'],
      theme_config: { mode: 'light', primaryColor: '#fa8c16' },
    },
  };
  
  return {
    slug: subdomain,
    ...getDefaultConfig(subdomain),
    ...configs[subdomain],
  } as TenantConfig;
}

function getDefaultConfig(subdomain: string): TenantConfig {
  return {
    slug: subdomain,
    organization_id: null,
    enabled_modules: ['core'],
    module_config: {},
    theme_config: {
      mode: 'system',
      primaryColor: '#1890ff',
      brandName: 'Zoworks',
    },
    enabled_languages: ['en'],
    default_language: 'en',
    partition_config: {
      organization: { required: true, visible: false },
      location: { required: false, visible: false },
    },
    features: {},
    is_demo: false,
  };
}
```

### 3.4 Dynamic Module Loader

```typescript
// src/core/bootstrap/ModuleLoader.ts

import { registry } from '../registry';

// Module manifest - maps module IDs to lazy imports
const MODULE_MANIFEST: Record<string, () => Promise<ModuleRegistration>> = {
  // Core modules (always available, but still lazy)
  'core': () => import('@/modules/core'),
  
  // CRM modules
  'crm': () => import('@/modules/crm'),
  'crm-advanced': () => import('@/modules/crm-advanced'),
  
  // Service modules
  'tickets': () => import('@/modules/tickets'),
  'fsm': () => import('@/modules/fsm'),
  'contracts': () => import('@/modules/contracts'),
  
  // Workforce modules
  'workforce': () => import('@/modules/workforce'),
  
  // Enterprise modules
  'erp': () => import('@/modules/erp'),
  'esm': () => import('@/modules/esm'),
  'wms': () => import('@/modules/wms'),
  
  // Communication modules
  'wa': () => import('@/modules/wa'),
  
  // Admin modules
  'admin': () => import('@/modules/admin'),
  
  // Landing pages (for product sites)
  'landing': () => import('@/modules/landing'),
};

interface ModuleRegistration {
  register: (config?: any) => void;
  routes?: RouteDefinition[];
  navItems?: NavItemDefinition[];
}

export async function loadModules(
  enabledModules: string[],
  moduleConfig: Record<string, any>
): Promise<void> {
  console.log('[ModuleLoader] Loading modules:', enabledModules);
  
  const loadPromises = enabledModules
    .filter(id => MODULE_MANIFEST[id])
    .map(async (moduleId) => {
      try {
        const startTime = performance.now();
        const module = await MODULE_MANIFEST[moduleId]();
        
        // Register module with its config
        module.register(moduleConfig[moduleId] || {});
        
        const duration = Math.round(performance.now() - startTime);
        console.log(`[ModuleLoader] ✓ ${moduleId} loaded in ${duration}ms`);
      } catch (error) {
        console.error(`[ModuleLoader] ✗ Failed to load ${moduleId}:`, error);
      }
    });
  
  await Promise.all(loadPromises);
  console.log('[ModuleLoader] All modules loaded');
}

// Verify module is loaded before accessing
export function isModuleLoaded(moduleId: string): boolean {
  return registry.hasModule(moduleId);
}

// Get module capability
export function getModuleCapability<T>(moduleId: string, capability: string): T | null {
  if (!isModuleLoaded(moduleId)) return null;
  return registry.getModuleCapability(moduleId, capability);
}
```

---

## Part 4: Theme System (Per-Tenant)

> **Design Decision:** One tenant = One fixed theme. No user toggle.  
> The theme is configured at tenant registration and applies to ALL users of that tenant.

### 4.1 Theme Model

```typescript
// Each tenant has exactly ONE theme configuration
interface TenantTheme {
  mode: 'light' | 'dark';           // Fixed - no 'system' option
  primaryColor: string;             // Brand color
  secondaryColor?: string;          // Accent color
  logoUrl?: string;                 // Tenant logo
  faviconUrl?: string;              // Browser favicon
  brandName: string;                // Document title, UI branding
  borderRadius?: number;            // UI roundness (default: 8)
  fontFamily?: string;              // Font (default: Inter)
}

// Examples:
// - vkbs.zoworks.com: { mode: 'light', primaryColor: '#1890ff' }
// - sk.zoworks.com: { mode: 'dark', primaryColor: '#722ed1' }
// Users CANNOT toggle theme - it's fixed per tenant
```

### 4.2 Theme Registry (No Toggle)

```typescript
// src/core/theme/ThemeRegistry.ts

import { theme as antTheme } from 'antd';

interface TenantTheme {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandName: string;
  borderRadius?: number;
  fontFamily?: string;
}

// Single tenant theme - immutable after load
let tenantTheme: TenantTheme | null = null;

export async function loadTheme(config: TenantTheme): Promise<void> {
  // Set once, never changes during session
  tenantTheme = Object.freeze(config);
  
  // Apply favicon
  if (config.faviconUrl) {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement 
      || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = config.faviconUrl;
    document.head.appendChild(link);
  }
  
  // Apply brand name to document title
  document.title = config.brandName || 'Zoworks';
  
  // Set CSS variables (used by custom styles)
  const root = document.documentElement;
  root.style.setProperty('--primary-color', config.primaryColor);
  root.style.setProperty('--brand-name', config.brandName);
  
  // Apply dark mode class - FIXED for tenant, no toggle
  const isDark = config.mode === 'dark';
  root.classList.toggle('dark', isDark);
  
  console.log('[Theme] Loaded (fixed for tenant):', config.mode);
}

export function getAntdTheme() {
  if (!tenantTheme) {
    return {
      algorithm: antTheme.defaultAlgorithm,
      token: { colorPrimary: '#1890ff', borderRadius: 8 },
    };
  }
  
  // Fixed theme - no system preference checking
  return {
    algorithm: tenantTheme.mode === 'dark' 
      ? antTheme.darkAlgorithm 
      : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: tenantTheme.primaryColor,
      borderRadius: tenantTheme.borderRadius || 8,
      fontFamily: tenantTheme.fontFamily || 'Inter, sans-serif',
    },
  };
}

export function getTenantTheme(): TenantTheme | null {
  return tenantTheme;
}

// NO toggleTheme function - theme is fixed per tenant
```

### 4.3 Theme Provider (Simple, No Toggle)

```typescript
// src/core/theme/ThemeProvider.tsx

import { ConfigProvider, App as AntApp } from 'antd';
import { getAntdTheme } from './ThemeRegistry';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Theme is loaded once during bootstrap - never changes
  const antdTheme = getAntdTheme();
  
  // NO useEffect for theme changes - theme is immutable per tenant
  
  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  );
}
```

---

## Part 5: i18n System (Per-Tenant Languages)

> **Design Decision:** Only load languages configured for the tenant.  
> If tenant has `enabled_languages: ['en']`, we never load Arabic, Hindi, etc.  
> This reduces bundle size and memory footprint.

### 5.1 Language Loading Model

```typescript
// Tenant A: Small US business
// enabled_languages: ['en']  
// → Only loads: en.json (~15KB)
// → No language selector shown

// Tenant B: India multi-regional
// enabled_languages: ['en', 'hi', 'ta', 'te']
// → Only loads: en.json, hi.json, ta.json, te.json (~60KB)
// → Language selector shown with 4 options

// Tenant C: MENA enterprise  
// enabled_languages: ['en', 'ar']
// → Only loads: en.json, ar.json (~30KB)
// → RTL applied when Arabic selected
// → Language selector shown with 2 options
```

### 5.2 Language Registry (Tenant-Specific Loading)

```typescript
// src/core/i18n/I18nRegistry.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Language manifest - these are all AVAILABLE languages
// But we only LOAD what the tenant needs
const LANGUAGE_MANIFEST: Record<string, () => Promise<{ default: object }>> = {
  'en': () => import('@/i18n/locales/en.json'),
  'ar': () => import('@/i18n/locales/ar.json'),
  'hi': () => import('@/i18n/locales/hi.json'),
  'ta': () => import('@/i18n/locales/ta.json'),
  'te': () => import('@/i18n/locales/te.json'),
  'kn': () => import('@/i18n/locales/kn.json'),
  'mr': () => import('@/i18n/locales/mr.json'),
  'fr': () => import('@/i18n/locales/fr.json'),
  'es': () => import('@/i18n/locales/es.json'),
  'de': () => import('@/i18n/locales/de.json'),
  'pt': () => import('@/i18n/locales/pt.json'),
  'zh': () => import('@/i18n/locales/zh.json'),
  'ja': () => import('@/i18n/locales/ja.json'),
};

// RTL languages
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Track which languages are loaded for THIS tenant
let loadedLanguages: Set<string> = new Set();

/**
 * Load ONLY the languages enabled for this tenant.
 * This function is called once during bootstrap.
 * Languages not in enabledLanguages are NEVER loaded.
 */
export async function loadLanguages(
  enabledLanguages: string[],
  defaultLanguage: string = 'en'
): Promise<void> {
  console.log('[i18n] Loading ONLY tenant languages:', enabledLanguages);
  
  // Initialize i18next if not already
  if (!i18n.isInitialized) {
    await i18n
      .use(initReactI18next)
      .init({
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        resources: {},
      });
  }
  
  // Load each enabled language
  const loadPromises = enabledLanguages
    .filter(lang => LANGUAGE_MANIFEST[lang] && !loadedLanguages.has(lang))
    .map(async (lang) => {
      try {
        const translations = await LANGUAGE_MANIFEST[lang]();
        i18n.addResourceBundle(lang, 'translation', translations.default, true, true);
        loadedLanguages.add(lang);
        console.log(`[i18n] ✓ ${lang} loaded`);
      } catch (error) {
        console.error(`[i18n] ✗ Failed to load ${lang}:`, error);
      }
    });
  
  await Promise.all(loadPromises);
  
  // Set default language
  if (enabledLanguages.includes(defaultLanguage)) {
    await i18n.changeLanguage(defaultLanguage);
  }
  
  // Apply RTL if needed
  applyRTL(defaultLanguage);
}

export function applyRTL(language: string): void {
  const isRTL = RTL_LANGUAGES.includes(language);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}

export function changeLanguage(language: string): void {
  if (loadedLanguages.has(language)) {
    i18n.changeLanguage(language);
    applyRTL(language);
  }
}

export function getLoadedLanguages(): string[] {
  return Array.from(loadedLanguages);
}

export function isLanguageLoaded(language: string): boolean {
  return loadedLanguages.has(language);
}
```

### 5.3 Language Selector (Only if Multiple Languages)

```typescript
// src/core/i18n/LanguageSelect.tsx

import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTenantConfig } from '../bootstrap/TenantProvider';
import { changeLanguage, getLoadedLanguages } from './I18nRegistry';

const LANGUAGE_LABELS: Record<string, string> = {
  'en': 'English',
  'ar': 'العربية',
  'hi': 'हिंदी',
  'ta': 'தமிழ்',
  'te': 'తెలుగు',
  'kn': 'ಕನ್ನಡ',
  'mr': 'मराठी',
  'fr': 'Français',
  'es': 'Español',
  'de': 'Deutsch',
  'pt': 'Português',
  'zh': '中文',
  'ja': '日本語',
};

export function LanguageSelect() {
  const { i18n } = useTranslation();
  const tenantConfig = useTenantConfig();
  
  // Get languages enabled for THIS tenant only
  const enabledLanguages = tenantConfig?.enabled_languages || ['en'];
  
  // CRITICAL: Don't render if single language tenant
  // Most tenants will have only English - no selector needed
  if (enabledLanguages.length <= 1) {
    return null; 
  }
  
  // Only show languages that are both enabled AND loaded
  const options = enabledLanguages
    .filter(lang => getLoadedLanguages().includes(lang))
    .map(lang => ({
      value: lang,
      label: LANGUAGE_LABELS[lang] || lang,
    }));
  
  return (
    <Select
      value={i18n.language}
      onChange={changeLanguage}
      options={options}
      style={{ width: 120 }}
      size="small"
    />
  );
}
```

### 5.4 Bundle Impact Summary

| Tenant Config | Languages Loaded | Approx Size | Selector Shown |
|---------------|------------------|-------------|----------------|
| `['en']` | English only | ~15KB | ❌ No |
| `['en', 'ar']` | English + Arabic | ~30KB | ✅ Yes |
| `['en', 'hi', 'ta', 'te']` | 4 Indian languages | ~60KB | ✅ Yes |
| `['en', 'fr', 'es', 'de']` | 4 European languages | ~60KB | ✅ Yes |

---

## Part 6: Partition-Aware Frontend

### 6.1 Partition Configuration

```typescript
// src/core/lib/partitionTypes.ts

export interface PartitionConfig {
  organization: PartitionRule;
  location?: PartitionRule;
  team?: PartitionRule;
  role?: PartitionRule;
}

export interface PartitionRule {
  required: boolean;        // Must be selected
  visible: boolean;         // Show in UI
  multi_select?: boolean;   // Allow multiple selection
  inherit?: string;         // Inherit from another partition
}

export interface PartitionContext {
  organization_id: string;
  location_id?: string | null;
  team_id?: string | null;
  role_ids?: string[];
}
```

### 6.2 Partition Provider

```typescript
// src/core/lib/PartitionProvider.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { useTenantConfig } from '../bootstrap/TenantProvider';
import { useAuthStore } from './store';

interface PartitionContextType {
  current: PartitionContext;
  setPartition: (key: keyof PartitionContext, value: string | null) => void;
  config: PartitionConfig;
  showLocationSelector: boolean;
  showTeamSelector: boolean;
}

const PartitionContext = createContext<PartitionContextType | null>(null);

export function PartitionProvider({ children }: { children: React.ReactNode }) {
  const tenantConfig = useTenantConfig();
  const { organization, location, team } = useAuthStore();
  
  const config = tenantConfig?.partition_config || {
    organization: { required: true, visible: false },
  };
  
  const [current, setCurrent] = useState<PartitionContext>({
    organization_id: organization?.id || '',
    location_id: location?.id || null,
    team_id: team?.id || null,
  });
  
  const setPartition = (key: keyof PartitionContext, value: string | null) => {
    setCurrent(prev => ({ ...prev, [key]: value }));
  };
  
  // Determine visibility based on tenant config
  const showLocationSelector = 
    config.location?.visible && 
    config.location?.required !== false;
  
  const showTeamSelector = 
    config.team?.visible && 
    config.team?.required !== false;
  
  return (
    <PartitionContext.Provider value={{
      current,
      setPartition,
      config,
      showLocationSelector,
      showTeamSelector,
    }}>
      {children}
    </PartitionContext.Provider>
  );
}

export function usePartition() {
  const context = useContext(PartitionContext);
  if (!context) throw new Error('usePartition must be within PartitionProvider');
  return context;
}
```

### 6.3 Partition-Aware Data Hooks

```typescript
// src/core/hooks/usePartitionedQuery.ts

import { useQuery } from '@tanstack/react-query';
import { usePartition } from '../lib/PartitionProvider';
import { supabase } from '../lib/supabase';

interface PartitionedQueryOptions {
  schema: string;
  table: string;
  select?: string;
  filters?: Record<string, any>;
  respectPartitions?: boolean;  // Default: true
}

export function usePartitionedQuery<T>(
  queryKey: string[],
  options: PartitionedQueryOptions
) {
  const { current: partition, config } = usePartition();
  
  return useQuery({
    queryKey: [...queryKey, partition],
    queryFn: async () => {
      let query = supabase
        .schema(options.schema)
        .from(options.table)
        .select(options.select || '*');
      
      // Apply partition filters based on tenant config
      if (options.respectPartitions !== false) {
        // Organization is always applied (via RLS usually)
        if (partition.organization_id) {
          query = query.eq('organization_id', partition.organization_id);
        }
        
        // Location filter - only if configured
        if (config.location?.required && partition.location_id) {
          query = query.eq('location_id', partition.location_id);
        }
        
        // Team filter - only if configured
        if (config.team?.required && partition.team_id) {
          query = query.eq('team_id', partition.team_id);
        }
      }
      
      // Apply additional filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
  });
}
```

### 6.4 Frontend RLS Implications

Even though RLS is enforced at the database level, the frontend should:

1. **Pre-filter UI** - Don't show options user can't access
2. **Cache per-partition** - Query keys include partition context
3. **Optimistic updates** - Assume RLS will pass for valid actions
4. **Handle 403 gracefully** - Show meaningful error, not crash

```typescript
// src/core/lib/queryClient.ts

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Include partition in cache key automatically
      queryKeyHashFn: (queryKey) => {
        const partition = usePartition.getState()?.current;
        return JSON.stringify([...queryKey, partition]);
      },
      
      // Handle RLS errors
      onError: (error: any) => {
        if (error?.code === '42501' || error?.status === 403) {
          console.error('[RLS] Permission denied:', error);
          message.error('You do not have permission to access this data');
        }
      },
    },
  },
});
```

---

## Part 7: Module Composition for SOR Types

### 7.1 System of Record Compositions

Each SOR type is a **composition of base modules**:

```typescript
// src/core/registry/systemPresets.ts

export const SYSTEM_PRESETS: Record<string, string[]> = {
  // Customer Relationship Management
  'crm-basic': ['core', 'crm'],
  'crm-full': ['core', 'crm', 'crm-advanced', 'wa', 'email'],
  
  // Field Service Management
  'fsm-basic': ['core', 'crm', 'tickets', 'fsm'],
  'fsm-full': ['core', 'crm', 'tickets', 'fsm', 'workforce', 'contracts', 'wa'],
  
  // Enterprise Service Management
  'esm-basic': ['core', 'tickets', 'knowledge'],
  'esm-full': ['core', 'tickets', 'knowledge', 'workforce', 'sla', 'automation'],
  
  // Enterprise Resource Planning
  'erp-basic': ['core', 'crm', 'inventory', 'invoicing'],
  'erp-full': ['core', 'crm', 'inventory', 'invoicing', 'procurement', 'accounting', 'hrms'],
  
  // Warehouse Management
  'wms-basic': ['core', 'inventory', 'receiving', 'shipping'],
  'wms-full': ['core', 'inventory', 'receiving', 'shipping', 'picking', 'bin-management'],
  
  // Point of Sale
  'pos-basic': ['core', 'catalog', 'pos', 'payments'],
  'pos-full': ['core', 'catalog', 'pos', 'payments', 'loyalty', 'inventory'],
  
  // WhatsApp Engage
  'wa-engage': ['core', 'wa', 'catalog', 'crm'],
};

export function getPresetModules(presetId: string): string[] {
  return SYSTEM_PRESETS[presetId] || ['core'];
}
```

### 7.2 Entity Capability Mapping

```typescript
// How entities map across modules

export const ENTITY_CAPABILITIES: Record<string, EntityCapability> = {
  'contacts': {
    baseModule: 'crm',
    enhancements: {
      'wa': ['whatsapp_id', 'wa_opt_in', 'conversation_link'],
      'tickets': ['open_tickets_count', 'last_ticket_date'],
      'contracts': ['active_contracts', 'sla_tier'],
    },
  },
  
  'tickets': {
    baseModule: 'tickets',
    enhancements: {
      'fsm': ['technician', 'scheduled_date', 'location_tracking'],
      'workforce': ['time_logged', 'expenses'],
      'sla': ['sla_status', 'breach_risk'],
    },
  },
  
  'products': {
    baseModule: 'catalog',
    enhancements: {
      'inventory': ['stock_level', 'reorder_point'],
      'pos': ['barcode', 'pos_display'],
      'wms': ['bin_location', 'lot_tracking'],
    },
  },
};
```

---

## Part 8: Performance Targets

### 8.1 Bundle Size Targets

| Segment | Target Size | Contents |
|---------|-------------|----------|
| **Core Shell** | < 150KB gzipped | Bootstrap, Auth, Router, Minimal UI |
| **Per Module** | < 100KB gzipped each | Module-specific code |
| **UI Library** | < 200KB gzipped | Ant Design (tree-shaken) |
| **Total Initial** | < 400KB gzipped | Before any module loads |

### 8.2 Loading Time Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **TTFB** | < 200ms | First byte from Vercel edge |
| **FCP** | < 1s | First contentful paint (loading shell) |
| **LCP** | < 2s | Largest contentful paint (after auth) |
| **TTI** | < 3s | Time to interactive (module loaded) |
| **Module Load** | < 500ms | Per-module lazy load |

### 8.3 Bundle Analysis Commands

```bash
# Analyze bundle composition
yarn build --analyze

# Check core size
du -sh dist/assets | grep -E 'core|vendor'

# Check module sizes
du -sh dist/assets | grep -E 'crm|tickets|fsm|workforce'
```

---

## Part 9: Deployment Architecture

### 9.1 Single Vercel Deployment

```yaml
# All subdomains → single deployment
Domains:
  - zoworks.com
  - *.zoworks.com            # Wildcard for all tenant subdomains
  - login.zoworks.com
  
Edge Functions:
  - /api/*                   # Serverless functions
  - /_vercel/functions/*     # Internal functions

Static Assets:
  - /_next/static/*          # Hashed, cached forever
  - /assets/*                # Public assets

Rewrites:
  - /*  →  /index.html       # SPA routing
```

### 9.2 CDN Caching Strategy

```typescript
// vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*).js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    }
  ]
}
```

### 9.3 Edge Caching of Tenant Configs

```typescript
// Optional: Vercel Edge Config for ultra-fast tenant resolution
// Alternative to database lookup for high-traffic tenants

import { get } from '@vercel/edge-config';

async function getTenantFromEdge(subdomain: string): Promise<TenantConfig | null> {
  try {
    return await get(subdomain);
  } catch {
    return null; // Fallback to database
  }
}
```

---

## Part 10: Implementation Roadmap

### Phase 0: Foundation (Week 1-2)
- [ ] Create `identity.tenant_configs` table
- [ ] Create core bootstrap infrastructure
- [ ] Implement TenantResolver
- [ ] Set up wildcard domain in Vercel

### Phase 1: Core Extraction (Week 3-4)
- [ ] Extract core to `src/core/`
- [ ] Create registry infrastructure
- [ ] Implement ModuleLoader
- [ ] Test with single tenant

### Phase 2: Module Migration (Week 5-8)
- [ ] Migrate CRM module
- [ ] Migrate Tickets module
- [ ] Migrate FSM module
- [ ] Migrate Workforce module
- [ ] Each module: Move files, create registration, test isolation

### Phase 3: Theming & i18n (Week 9-10)
- [ ] Implement ThemeRegistry
- [ ] Implement I18nRegistry
- [ ] Test RTL languages
- [ ] Test multi-theme tenants

### Phase 4: Partition System (Week 11-12)
- [ ] Implement PartitionProvider
- [ ] Update all queries to be partition-aware
- [ ] Test multi-location tenant
- [ ] Test RLS integration

### Phase 5: Demo & Production (Week 13-14)
- [ ] Create demo tenant configs
- [ ] Set up demo subdomains
- [ ] Migrate first production tenant
- [ ] Performance validation

---

## Appendix A: Lean Machine Checklist

Before every release, verify:

- [ ] Core bundle < 150KB gzipped
- [ ] No domain module imports in core
- [ ] All modules lazy-loaded
- [ ] Tenant config cached properly
- [ ] Languages load on-demand
- [ ] Theme applies without flash
- [ ] Partition filters applied consistently
- [ ] RLS errors handled gracefully
- [ ] No console errors on first load
- [ ] TTI < 3 seconds on 3G

---

## Appendix B: Tenant Configuration Examples

See: `docs/tenant-config-examples.md`

## Appendix C: Module Registration API

See: `docs/module-registration-api.md`
