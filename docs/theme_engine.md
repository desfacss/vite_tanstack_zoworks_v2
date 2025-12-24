# Definitive Theme Engine Guide (v2)

This document is the **Single Source of Truth** for all styling in the Zoworks platform. Every component, page, and module MUST adhere to these standards.

---

## 1. The 5-Layer Styling Architecture

We use a layered CSS approach to ensure themes are consistent yet flexible.

| Layer | Name | Scope | Location | Responsibility |
|-------|------|-------|----------|----------------|
| **1** | **Tenant Tokens** | Dynamic | `ThemeRegistry.ts` | Sets CSS variables from DB (`--tenant-primary`, etc.) |
| **2** | **Semantic Map** | Global | `index.css` :root | Maps tokens to usable names (`--color-bg-primary`, `--color-primary-rgb`) |
| **3** | **AntD Overrides** | Base | `index.css` | Fixes Ant Design components to use Layer 2 variables. |
| **4** | **Theme Presets** | Preset | `index.css` | CSS Effects (`[data-theme-preset="neon"]`) like gradients and glows. |
| **5** | **Mode Overrides** | Light/Dark | `index.css` | Specific color/contrast tweaks for `.dark` and `:not(.dark)`. |

---

## 2. Mandatory CSS Variables

### Core Colors
| Variable | Usage | Source |
|----------|-------|--------|
| `var(--color-primary)` | Primary branding (buttons, links, active states) | `--tenant-primary` |
| `var(--color-secondary)` | Secondary branding / accents | `--tenant-secondary` |
| `rgba(var(--color-primary-rgb), alpha)` | For glows, transparent backgrounds, and borders | Synchronized by `ThemeRegistry` |

### Semantic Backgrounds
| Variable | Usage | Light Mode Default | Dark Mode Default |
|----------|-------|--------------------|-------------------|
| `var(--color-bg-primary)` | Main Page Background | `#ffffff` | `#0f172a` (Slate 900) |
| `var(--color-bg-secondary)` | Cards, Modals, Popovers | `#f8fafc` | `#1e293b` (Slate 800) |
| `var(--color-bg-tertiary)` | Headers, Hover States, Sidebars | `#f1f5f9` | `#334155` (Slate 700) |

### Semantic Typography
| Variable | Usage | Light Mode Default | Dark Mode Default |
|----------|-------|--------------------|-------------------|
| `var(--color-text-primary)` | Headings, Body Text | `#0f172a` | `#f8fafc` |
| `var(--color-text-secondary)`| Descriptions, Labels | `#64748b` | `#94a3b8` |
| `var(--color-text-tertiary)` | Mentions, Small Meta Data | `#94a3b8` | `#64748b` |
| `var(--tenant-brand-name)` | Raw brand name string | From DB | From DB |

---

## 3. Brand Identity Assets

We use a unified component system for branding to ensure consistency and robust fallbacks.

### Core Assets
| Asset | Usage | Fallback |
|-------|-------|----------|
| **Logo** | Header, Login, Hub (Horizontal) | **Brand Name** as styled text |
| **Icon** | Sider (Collapsed), Mobile Header | **First-Letter Avatar** with 4px border |

### Mandatory Components
**NEVER** use raw `<img>` tags for tenant logos. Use:
- `<BrandLogo />`: Automatically resolves mode-specific `logoUrl`.
- `<BrandIcon />`: Automatically resolves mode-specific `logoIconUrl`.

### Fallback Logic
1. **Icon**: If `logoIconUrl` is missing, renders a square box with the first letter of `brandName`, a 2px border of `var(--tenant-primary)`, and `4px` border radius.
2. **Logo**: If `logoUrl` is missing, renders `brandName` as an `h1` styled with `var(--tenant-primary)`.

---

## 3. Strict Prohibitions (NEVER DO THESE)

1.  **❌ NO Tailwind Color Classes**: Avoid `bg-blue-50`, `text-slate-900`, etc. Use CSS variables.
2.  **❌ NO Hardcoded Hex Colors**: All colors must come from the variable system.
3.  **❌ NO Manual Border Radius**: Use `var(--tenant-border-radius)` or `var(--tenant-border-radius-interactive)`.
4.  **❌ NO Height Overrides**: Let Ant Design's `size` prop control component height.
5.  **❌ NO Manual Transitions**: The system provides a global `0.2s` transition. Don't add custom ones unless absolutely necessary.

---

## 4. How to Style Your Component

### Option A: Standard Ant Design
Simply use the component. Layer 3 already ensures it looks correct.
```tsx
<Button type="primary">Branded Button</Button>
```

### Option B: Custom Element (Inline Style)
When you need custom styling, map to the variables.
```tsx
<div style={{ 
  background: 'var(--color-bg-secondary)', 
  borderColor: 'var(--color-border)',
  borderRadius: 'var(--tenant-border-radius)'
}}>
  <Text style={{ color: 'var(--color-primary)' }}>Branded Text</Text>
</div>
```

### Option C: Custom Element (Tailwind)
Use Tailwind for layout only, variables for style.
```tsx
<div className="p-4 border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
  ...
</div>
```

---

## 5. Agent Workflow: Styling Audit

When the USER requests a styling fix or a new component:

1.  **Grep for Leaks**: Check for `blue-`, `indigo-`, or hex codes in the new code.
2.  **Verify Variable Map**: Ensure the component uses `var(--color-...)` instead of hardcoded values.
3.  **Check Light/Dark**: Verify background colors are correctly inverted using semantic variables.
4.  **RGB Check**: If using transparency, ensure it uses `rgba(var(--color-primary-rgb), ...)` and NOT a hardcoded blue-rgba.
5.  **Branding Guard**: Ensure no raw `img` tags are used for tenant logos; use `BrandLogo`/`BrandIcon`.

---

## 6. Persistence & Configuration (Form Standards)

When implementing settings or branding forms:

1.  **Deep Save**: Always use `form.getFieldsValue(true)`. Ant Design's default `getFieldsValue()` omits fields that are currently unmounted (e.g., in a background tab or collapsed advanced section). Failure to use `true` will result in data loss on save.
2.  **Explicit Reset**: When implementing a "Reset" button, strictly pull from `THEME_PRESETS`. Never fall back to the "current" `themeConfig` as it may contain the very overrides you are trying to wipe.
3.  **Mode Awareness**: Always honor `allowUserDarkMode`. If `false`, the theme toggle should be hidden or disabled.

*Last Updated: 2025-12-24*
