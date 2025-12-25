# Theme Engine

> Tenant-aware theming with light/dark mode support, presets, and CSS variables.

> [!CAUTION]
> **Styling system is frozen.** Do not modify `index.css`, theme files, or add inline styles when auditing pages.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      BOOTSTRAP                                   │
│  loadTenantTheme(config) - Sets tenant colors, branding         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      THEME PROVIDER                              │
│  <ThemeProvider>                                                 │
│  - Wraps app with ConfigProvider                                │
│  - Generates AntD theme from tenant config + user mode          │
│  - Subscribes to theme changes                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CSS VARIABLE LAYER                          │
│  :root { --tenant-primary, --color-bg-primary, etc. }           │
│  .dark { mode-specific overrides }                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/core/theme/
├── ThemeProvider.tsx    # React provider wrapping ConfigProvider
├── ThemeRegistry.ts     # Tenant config, CSS variables, AntD theme
├── presets.ts           # Theme presets (base, glassmorphism, neon, etc.)
└── settings.ts          # Base AntD theme settings
```

---

## Tenant Theme Configuration

Stored in `identity.organizations.theme_config`:

```typescript
interface TenantThemeConfig {
  // Branding
  brandName: string;             // "VKBS"
  faviconUrl?: string;           // Browser tab icon
  
  // Mode-specific overrides
  light?: ThemeModeConfig;
  dark?: ThemeModeConfig;
  
  // Common/Fallback
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
  logoIconUrl?: string;          // Square icon for collapsed sider
  loginBgImage?: string;
  
  // Typography
  fontFamily?: string;
  baseFontSize?: number;         // Default: 14
  
  // Layout
  borderRadius: number;          // 0=sharp, 16=rounded
  containerPadding?: number;     // px
  globalGutter?: number;         // Default: 16
  compactMode?: boolean;
  
  // Feature Flags
  allowUserDarkMode?: boolean;   // Default: true
  defaultMode?: 'light' | 'dark';
  preset?: string;               // 'base', 'glassmorphism', 'neon', etc.
  heroHeader?: boolean;          // Enable gradient hero header
}

interface ThemeModeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  logoIconUrl?: string;
  cardBg?: string;
  layoutBg?: string;
  headerBg?: string;
  siderBg?: string;
  inputBg?: string;
  textColor?: string;
}
```

---

## Theme Presets

Available in `src/core/theme/presets.ts`:

| Preset | Border Radius | Style | Features |
|--------|--------------|-------|----------|
| `base` | 8px | Clean, minimal | Standard |
| `glassmorphism` | 16px | Frosted glass | Blur effects |
| `corporate` | 4px | Sharp, professional | Dark sider |
| `gradient_card` | 16px | Bold gradients | Hero header |
| `neon` | 8px | Electric, high-impact | Thunder animations |

### Preset Merge Order:
```
Default Values → Preset → Tenant Config
```

---

## CSS Variable System

### Layer 1: Tenant Tokens (Set by ThemeRegistry)

```css
--tenant-primary: #00E599;
--tenant-secondary: #00E599;
--tenant-brand-name: "VKBS";
--tenant-border-radius: 8px;
--tenant-border-radius-interactive: 6px;
--tenant-card-bg: #ffffff;
--tenant-layout-bg: #f5f5f5;
--tenant-sider-bg: #ffffff;
```

### Layer 2: Mode Data Attributes

```css
[data-light-primary]: #00E599;
[data-dark-primary]: #00E599;
[data-light-card]: #ffffff;
[data-dark-card]: #1f1f1f;
```

### Layer 3: RGB Values (for rgba())

```css
--color-primary-rgb: 0, 229, 153;
--color-secondary-rgb: 0, 229, 153;
--color-bg-primary-rgb: 245, 245, 245;
--color-bg-secondary-rgb: 255, 255, 255;
```

### Layer 4: Semantic Variables (index.css)

```css
:root {
  --color-primary: var(--tenant-primary);
  --color-bg-primary: var(--tenant-layout-bg);
  --color-bg-secondary: var(--tenant-card-bg);
}
```

---

## Initialization

### At Bootstrap

```typescript
import { loadTenantTheme } from '@/core/theme/ThemeRegistry';

// After fetching organization config
loadTenantTheme({
  brandName: org.name,
  primaryColor: org.theme_config?.primaryColor || '#1890ff',
  preset: org.theme_config?.preset || 'base',
  borderRadius: org.theme_config?.borderRadius ?? 8,
  // ... other config
});
```

### What `loadTenantTheme` Does:
1. Resolve preset (fallback to 'base')
2. Deep merge: Default → Preset → Config
3. Apply CSS variables to `:root`
4. Set `document.title` and favicon
5. Notify listeners

---

## ThemeProvider Usage

```tsx
import { ThemeProvider } from '@/core/theme/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  );
}
```

---

## Light/Dark Mode Toggle

### Hook Usage

```tsx
import { useThemeToggle } from '@/core/theme/ThemeProvider';

const ThemeSwitch = () => {
  const { isDarkMode, toggleTheme, canToggle } = useThemeToggle();

  if (!canToggle) return null;  // Tenant disabled dark mode

  return (
    <Switch
      checked={isDarkMode}
      onChange={toggleTheme}
    />
  );
};
```

### Persistence
- Mode stored in `localStorage` via Zustand (`theme-store`)
- Respects `allowUserDarkMode` flag

---

## API Reference

### Theme Loading

```typescript
// Load tenant theme at bootstrap
loadTenantTheme(config: TenantThemeConfig): void

// Update theme dynamically (e.g., from settings)
updateTenantTheme(config: Partial<TenantThemeConfig>): void

// Subscribe to theme changes
subscribeToTheme(listener: () => void): () => void
```

### Theme Getters

```typescript
getTenantThemeConfig(): TenantThemeConfig | null
getTenantPrimaryColor(): string
getTenantBrandName(): string
getTenantLogoUrl(isDarkMode: boolean): string | undefined
getTenantLogoIconUrl(isDarkMode: boolean): string | undefined
isUserDarkModeAllowed(): boolean
getTenantDefaultMode(): 'light' | 'dark'
```

### Theme Application

```typescript
// Get Ant Design theme config
getAntdTheme(isDarkMode: boolean): ThemeConfig

// Apply mode to document (.dark class, meta theme-color)
applyThemeMode(isDarkMode: boolean): void

// Convert hex to RGB for CSS
hexToRgb(hex: string): string  // "#00E599" → "0, 229, 153"
```

---

## Styling Components

### ✅ Use CSS Variables

```tsx
// Inline style
<div style={{ 
  background: 'var(--color-bg-secondary)', 
  borderColor: 'var(--color-border)',
  borderRadius: 'var(--tenant-border-radius)'
}}>
  <Text style={{ color: 'var(--color-primary)' }}>Branded</Text>
</div>

// Tailwind with variables
<div className="bg-[var(--color-bg-primary)] border-[var(--color-border)]">
  ...
</div>

// For transparency (use RGB variables)
<div style={{ 
  background: 'rgba(var(--color-primary-rgb), 0.1)' 
}}>
  Glow effect
</div>
```

### ❌ Prohibited Patterns

```tsx
// BAD - Hardcoded colors
<div style={{ background: '#f0f0f0' }}>

// BAD - Tailwind color classes
<div className="bg-blue-50 text-slate-900">

// BAD - Raw img for logos
<img src={logoUrl} />  // Use <BrandLogo /> instead
```

---

## Brand Components

Always use these instead of raw `<img>`:

```tsx
import { BrandLogo, BrandIcon } from '@/core/components/shared/Branding';

// Full logo (header, login)
<BrandLogo />

// Square icon (collapsed sider, mobile)
<BrandIcon />
```

### Fallback Behavior:
- **Logo**: If missing, renders brandName as styled text
- **Icon**: If missing, renders first letter with primary color border

---

## Preset Data Attributes

CSS can target presets via data attributes:

```css
/* Glassmorphism effects */
[data-glass-effect="true"] .card {
  backdrop-filter: blur(var(--tenant-backdrop-blur));
  border: var(--tenant-card-border);
}

/* Gradient header */
[data-hero-header="true"] .header {
  background: linear-gradient(135deg, var(--tenant-primary), var(--tenant-secondary));
}

/* Neon preset */
[data-theme-preset="neon"] .primary-button {
  box-shadow: 0 0 20px rgba(var(--color-primary-rgb), 0.5);
}
```

---

## Page Card Layout

Use `.page-card` for animated containers that receive theme-specific effects.

### Structure
```tsx
<div className="page-content layout-record">
  <PageActionBar>...</PageActionBar>
  <div className="page-card">
    {/* Content here */}
  </div>
</div>
```

### Theme Layer Separation

| Component | Base Theme | Neon Theme |
|-----------|------------|------------|
| `.page-card` | Background, border, animation | Thunderbolt, shimmer |
| `.ant-card` inside `.page-card` | Plain styling | Subtle bg (no effects) |

### Rules
1. Every page needs at least one `.page-card`
2. Never nest `.page-card` inside another `.page-card`
3. `.ant-card` inside `.page-card` inherits no animation

See [Page Layouts](file:///docs/frontend/patterns/page-layouts.md) for complete documentation.

---

## Settings Form Best Practices

1. **Deep Save**: Use `form.getFieldsValue(true)` to include unmounted fields
2. **Explicit Reset**: Pull from `THEME_PRESETS`, not current config
3. **Loading States**: Show spinner during uploads
4. **Mode Awareness**: Hide dark mode toggle if `allowUserDarkMode: false`

---

## Implementation Checklist

- [x] Tenant config loading via `loadTenantTheme`
- [x] Preset system with deep merge
- [x] Mode-specific colors (light/dark)
- [x] CSS variables on `:root`
- [x] RGB variables for rgba() support
- [x] Dynamic favicon and title
- [x] User dark mode preference (localStorage)
- [x] `allowUserDarkMode` flag respect
- [x] Subscribe to theme changes

---

*Last Updated: 2025-12-25*
*Source: `src/core/theme/ThemeRegistry.ts`, `src/core/theme/ThemeProvider.tsx`, `src/core/theme/presets.ts`*
