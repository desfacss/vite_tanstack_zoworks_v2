# Style Consistency Audit Report

This report documents hardcoded styles (fonts, colors, border-radii) found in the `src` directory that bypass the centralized theme engine. 

## 1. Hardcoded Typography (Fonts)

Most files correctly inherit fonts from `ThemeRegistry.ts`, but a few outliers remain:

| File | Hardcoded Value | Recommendation |
| :--- | :--- | :--- |
| `src/core/components/details/DocView.css` | `font-family: Arial, sans-serif;` | Replace with `var(--tenant-font-family)` |

## 2. Hardcoded Colors (Hex Codes)

There are significant instances of hardcoded colors, particularly in detail views and specific modules.

### Core Components
- **`DocView.tsx` & `DocView.css`**: Extensive use of `#fff`, `#ccc`, `#666`, `#888`, and `#f0f2f5`.
- **`ApprovalActionButtons.tsx`**: Uses `#f0f0f0` for borders.
- **`EntityImages.tsx`**: Uses `#e8e8e8` and `#f0f0f0`.
- **`ImageUploader.tsx`**: Uses `#d9d9d9`, `#555`, and `#fff`.

### Dynamic Views
- **`CalendarView.tsx`**: Hardcoded palette for events (`#52c41a`, `#ff4d4f`, etc.).
- **`KanbanView.tsx`**: Fallback color `#f0f0f0`.
- **`MetricChartWidget.tsx`**: Hardcoded status colors (`#2fc25b`, `#facc14`, etc.).

### Recommendation:
Most of these should transition to:
- `var(--color-border)`
- `var(--color-bg-secondary)`
- `var(--color-text-secondary)`
- `var(--tenant-primary)` (with opacity if needed)

## 3. Hardcoded Border Radii

While many components now use `var(--tenant-border-radius)`, some legacy or module-specific files do not:

| File | Hardcoded Value | Recommendation |
| :--- | :--- | :--- |
| `src/App.css` | `border-radius: 8px;` | Replace with `var(--tenant-border-radius)` |
| `src/modules/wa/index.css` | `border-radius: 12px;` | Replace with `var(--tenant-border-radius)` |
| `src/core/components/shared/ImageUploader.tsx` | `borderRadius: 8`, `borderRadius: 6` | Replace with `var(--tenant-border-radius-interactive)` |

## 4. Hardcoded Font Sizes

| File | Hardcoded Value | Recommendation |
| :--- | :--- | :--- |
| `src/core/components/details/DocView.css` | `font-size: 24px`, `14px` | Replace with `rem` or `var(--tenant-font-size)` |
| `src/App.css` | `font-size: 14px`, `24px` | Integrate with theme scale |
| `src/modules/wa/index.css` | `font-size: 12px` | Integrate with theme scale |

## Summary of Impact
- **Theming Breaks**: Hardcoded hex colors (especially in `DocView`) mean those components won't correctly adapt to "Neon" or "Claude" color palettes.
- **Visual Jars**: Hardcoded fonts in `DocView` will clash when a tenant selects a premium font combo like Montserrat.
- **Roundedness Inconsistency**: A tenant selecting "Sharp" (0px) borders will still see rounded buttons in the WhatsApp module and Image Uploader.
