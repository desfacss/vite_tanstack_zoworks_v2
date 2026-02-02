# Theme Design Architecture Verification

This document clarifies the implementation of the "4 Layers of Theme Design" in the Zoworks V2 platform, as requested.

## 1. Documentation Reference
The primary documentation for the theme engine can be found here:
- [Theme Engine Documentation](file:///Users/macbookpro/zo_v2/mini_project/docs/frontend/patterns/theme-engine.md)

## 2. The 4 Layers of Theme Design

The system uses a layered approach to CSS variables to ensure that tenant branding, theme modes (light/dark), and semantic usage are decoupled and maintainable.

### Layer 1: Tenant Tokens
**Source**: [ThemeRegistry.ts](file:///Users/macbookpro/zo_v2/mini_project/src/core/theme/ThemeRegistry.ts) (`applyStaticBranding` function)
**Role**: These are the "raw" branding values fetched from the tenant configuration. They are applied to the `:root` element.
- `--tenant-primary`: The main brand color.
- `--tenant-secondary`: The secondary brand color.
- `--tenant-border-radius`: Global border radius (e.g., 8px, 12px).

### Layer 2: Mode Data Attributes
**Source**: [ThemeRegistry.ts](file:///Users/macbookpro/zo_v2/mini_project/src/core/theme/ThemeRegistry.ts)
**Role**: Data attributes on the document root that store pre-computed values for both light and dark modes. This allows the system to switch colors instantly when the `.dark` class is toggled.
- `[data-light-primary]` / `[data-dark-primary]`
- `[data-light-card]` / `[data-dark-card]`

### Layer 3: RGB Values
**Source**: [ThemeRegistry.ts](file:///Users/macbookpro/zo_v2/mini_project/src/core/theme/ThemeRegistry.ts) (`hexToRgb` utility)
**Role**: Provides comma-separated RGB values (e.g., `0, 229, 153`) for use with `rgba()` in CSS. This is critical for glassmorphism and glow effects.
- `--color-primary-rgb`
- `--color-bg-primary-rgb`

### Layer 4: Semantic Variables
**Source**: [index.css](file:///Users/macbookpro/zo_v2/mini_project/src/index.css) (Line 240+)
**Role**: The "public API" for styling. Components should almost always use these semantic variables instead of tenant tokens. They map to the current active tenant/mode values.
- `--color-primary`: Maps to `var(--tenant-primary)`.
- `--color-bg-primary`: Maps to `var(--tenant-layout-bg)`.
- `--color-bg-secondary`: Maps to `var(--tenant-card-bg)`.

---

## 3. Implementation Verification

| Layer | Implementation Location | Verified Statue |
|-------|-------------------------|-----------------|
| **Layer 1** | `ThemeRegistry.ts:L233` | ✅ Confirmed |
| **Layer 2** | `ThemeRegistry.ts:L268` | ✅ Confirmed |
| **Layer 3** | `ThemeRegistry.ts:L291` | ✅ Confirmed |
| **Layer 4** | `index.css:L240` | ✅ Confirmed |

### Key Files:
1. **[ThemeRegistry.ts](file:///Users/macbookpro/zo_v2/mini_project/src/core/theme/ThemeRegistry.ts)**: Orchestrates the loading and application of all layers.
2. **[ThemeProvider.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/core/theme/ThemeProvider.tsx)**: Provides the React context and integrates with Ant Design's `ConfigProvider`.
3. **[index.css](file:///Users/macbookpro/zo_v2/mini_project/src/index.css)**: Defines the semantic variable mappings and base styles.

*Last Verified: 2026-02-01*
