# UI Technical Features, Theme & Localization Reference

This document outlines the technical design, configuration architecture, and runtime behavior of the frontend UI systems including theming, multi-tenant branding, internationalization, and user accessibility controls.

---

## 1. Dynamic Tenant Theming Engine

The application implements a real-time, tenant-driven theming registry that combines organization-level styling preferences with user-level dark/light mode toggles.

### 1.1 Architecture & Preset Schemes
- **Registry Source**: [src/core/theme/ThemeRegistry.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/theme/ThemeRegistry.ts)
- **Base Theme Overrides**: [src/core/theme/settings.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/theme/settings.ts)
- **Core Style Presets**: [src/core/theme/presets.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/theme/presets.ts)

Supported style presets allow organizations to completely modify their look-and-feel:
- `base`: Sleek, flat component containers with subtle borders.
- `glassmorphism`: Semi-transparent background cards with backdrop filters (`blur(15px)`) and glossy borders.
- `ultra_glass`: High blur factor with low opacity backgrounds.
- `gradient_card` / `branded_header`: Top headers or card container headers filled with tenant primary/secondary gradients.

### 1.2 Dual-Mode Reactive CSS Variables
When a tenant's theme configuration loads, it computes color schemes for both Light and Dark modes. These variables are written directly to the document root as CSS custom properties. This avoids runtime flickers and enables immediate style switching when dark mode is toggled:

```css
:root {
  /* Common static parameters */
  --tenant-brand-name: "Zoworks";
  --tenant-border-radius: 12px;
  --tenant-font-size: 14px;
  --tenant-zoom-factor: 1;

  /* Light mode variables */
  --tenant-primary-light: #47c6e3;
  --tenant-secondary-light: #47c6e3;
  --tenant-card-bg-light: #ffffff;
  --tenant-layout-bg-light: #f8faf9;
  
  /* Dark mode variables */
  --tenant-primary-dark: #1e8fa8;
  --tenant-secondary-dark: #1e8fa8;
  --tenant-card-bg-dark: #212121;
  --tenant-layout-bg-dark: #171717;
}
```

### 1.3 Ant Design Integration & Component Styling
The theme registry uses the configuration to generate a custom Ant Design `ThemeConfig` at runtime (`getAntdTheme(isDarkMode)`):
- **Border Radius**: Auto-scales container margins and inputs (`componentRadius = Math.max(3, borderRadius - 2)`).
- **Variant Inputs**: Selectors, DatePickers, and inputs render with custom border-less container variables.
- **Header & Sider**: Custom sidebar and top nav styling dynamically adjusted based on tenant overrides.

---

## 2. Localization & Multi-Language Engine (`i18n`)

The application supports language switching and RTL layouts using a lazy-loaded namespace configuration.

- **i18n Core Entry**: [src/core/i18n/index.ts](file:///c:/Users/ganesh/zoworks/new_vite_v2/vite_tanstack_zoworks_v2/src/core/i18n/index.ts)

### 2.1 Lazy-Loaded Manifest
To keep the bundle size small, translation resource bundles are not compiled into the primary build. Instead, they are dynamically imported when a tenant's enabled language settings are initialized:

```typescript
const CORE_LANGUAGE_MANIFEST = {
  'en': () => import('./locales/en.json'),
  'hi': () => import('./locales/hi.json'),
  'kn': () => import('./locales/kn.json'),
  'ta': () => import('./locales/ta.json'),
  'te': () => import('./locales/te.json'),
  'mr': () => import('./locales/mr.json'),
  'fr': () => import('./locales/fr.json'),
};
```

### 2.2 Core i18n Features
1. **RTL Text Direction Mapping**: Auto-detects Right-to-Left writing directions (e.g., Arabic, Hebrew, Urdu) and updates `<html dir="rtl">` on-the-fly.
2. **Missing Translation Keys Handler**: Includes an automatic parser. If a translation string is missing, it strips the prefix namespace paths (e.g. `common.label.sample_field`) and converts the final token to title-case spaces (`Sample Field`).
3. **DayJS Locale Binding**: Synchronizes localized date-formatting tables inside `dayjs` automatically upon language modification.
4. **Module Translation Registration**: Custom plugin modules register namespace translations dynamically (`registerModuleTranslations`) upon lazy route mounting.

---

## 3. Accessibility & Layout Zoom Features

The registry exposes fine-grained variables to help users scale the user interface layout.

### 3.1 Proportional Scaling
Using the `applyAccessibility()` controls, the browser scales CSS custom variables based on the font size zoom factor:
- **Font Scale**: Scales root font size (`--layout-font-size-px`).
- **Viewport Zoom**: Modifies the overall CSS scale of the primary dashboard panel (`--layout-zoom-percent`).
- **Derived Gutters**: Automatically adjusts padding, grid lines, and spacing gutters proportionally.

### 3.2 Compact UI Mode
- Allows power users to switch to a compact layout view. This decreases component padding and list row heights, maximizing information density on table grids.
