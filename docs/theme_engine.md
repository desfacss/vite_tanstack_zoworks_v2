# Theme Engine Architecture - Zoworks SaaS

## 1. Overview: Base Theme vs. Presets

The Zoworks Theme Engine separates **Foundational Structure** from **Aesthetic Style**.

| Concept | Level | Description |
|-----------|-------|-------------|
| **Base Theme** | Foundation | The core Ant Design configuration + global CSS. It defines the "Clean Look" (borderless inputs, filled backgrounds, standard typography, and responsive spacing). |
| **Theme Presets** | Aesthetic | Pre-configured sets of aesthetic variables (colors, border radius, layout modes). Switching a preset instantly rebrands the entire app while maintaining the "Clean Look". |

## 2. Theme Configuration Layers

1.  **Platform Presets**: Standardized styles like `Glassmorphism`, `Gradient Premium`, or `Corporate`.
2.  **Tenant Override**: Brands can select a preset and then fine-tune their specific Primary/Secondary colors and Brand Name/Logo.
3.  **Advanced Mode**: A UI toggle that hides granular color settings (Card Background, Layout Background, etc.) to ensure consistency, while allowing power users to tweak specifics.

---

## 3. Available Theme Presets

Common presets defined in `src/core/theme/presets.ts`:

| Preset ID | Style | Layout Impact |
|-----------|-------|---------------|
| `gradient_card` | Indigo & Emerald gradients, white content cards. | **Gradient Page Header** |
| `glassmorphism` | Frosted glass effect, semi-transparent backgrounds. | **Blurred Containers** |
| `corporate` | Sharp corners, professional blues, high contrast. | Standard Layout |
| `ultra_glass` | Pink & Violet gradients with extreme transparency. | Standard Layout |

---

## 4. UI Consistency & Control

To ensure a consistent experience across all themes, the following UX rules are enforced:

### Scrolling & Layout
- **Global Scrolling**: The main content area (`Content`) is now the primary scroll container. `html` and `body` are non-scrollable to prevent "double scrollbars". 
- **Auto-Fixed Bottom Bar**: For list views and grids, the Pagination bar is strictly **sticky to the bottom** of the content area. This ensures navigation is always reachable without scrolling to the very end of a 100-record list.
- **Glass Effects**: Sticky bars and headers automatically gain a frosted glass (`backdrop-filter`) effect in modern presets for a premium feel.

### Advanced Branding
- **Default Simplicity**: When a preset is selected, all mode-specific colors are auto-filled.
- **Advanced Mode**: Users must explicitly enable "Advanced" in settings to see granular color pickers. This prevents accidental inconsistencies where light mode backgrounds might conflict with preset intentions.

---

## 5. Database Configuration (Per-Tenant)

Theme is stored in `identity.organizations.theme_config` as JSONB.

```json
{
  "preset": "gradient_card",
  "brandName": "Zoworks Premium",
  "primaryColor": "#4F46E5",
  "secondaryColor": "#10B981", 
  "borderRadius": 16,
  "light": {
    "logoUrl": "https://...",
    "cardBg": "#ffffff"
  },
  "dark": {
    "logoUrl": "https://...",
    "cardBg": "#1e293b"
  }
}
```

---

## 6. CSS Variable Reference

| Variable | Description |
|----------|-------------|
| `--tenant-primary` | Main brand color. |
| `--tenant-secondary` | Accent/Link color, often used in gradients. |
| `--tenant-card-bg` | Background for white/translucent card containers. |
| `--tenant-layout-bg` | Backdrop color for the entire page body. |

---

## 7. Responsive Behavior

- **Mobile**: Margins reduce to `16px`, pagination switches to "Mini" mode (icon-only), and inputs maintain a minimum `16px` font size to prevent iOS auto-zoom.
- **Desktop**: Margins expand to `32px`, full pagination is shown, and the Sidebar maintains a fixed width (`256px` or `80px`).

*Last Updated: 2025-12-22*
