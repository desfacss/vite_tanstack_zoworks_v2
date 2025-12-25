# Typography & Spacing System

> Scalable typography and spacing using CSS variables for tenant-level zoom support.

---

## Core Variables

All spacing and typography scales with `--tenant-font-size` (set by ThemeRegistry.ts).

### Spacing Variables

| Variable | Default | Scaled By |
|----------|---------|-----------|
| `--tenant-font-size` | 14px | Tenant config |
| `--tenant-zoom-factor` | 1.0 | baseFontSize / 14 |
| `--layout-padding` | 24px | × zoomFactor |
| `--layout-padding-mobile` | 16px | × zoomFactor |
| `--tenant-gutter` | 16px | × zoomFactor |
| `--tenant-border-radius` | 12px | Fixed |
| `--tenant-border-radius-interactive` | 10px | Fixed |

---

## Typography Scale

All headings use **relative multipliers** from `--tenant-font-size`:

| Class | Element | Multiplier | @14px | @16px |
|-------|---------|------------|-------|-------|
| `.text-h1` | h1 | 2.285x | 32px | 36.5px |
| `.text-h2` | h2 | 1.714x | 24px | 27.4px |
| `.text-h3` | h3 | 1.428x | 20px | 22.8px |
| `.text-h4` | h4 | 1.285x | 18px | 20.6px |
| `.text-h5` | h5 | 1.142x | 16px | 18.3px |
| `.text-h6` | h6 | 1.0x | 14px | 16px |
| `.text-title` | — | 1.571x | 22px | 25.1px |
| `.text-subtitle` | — | 1.0x | 14px | 16px |
| `.text-small` | — | 0.857x | 12px | 13.7px |
| — | p | 1.0x | 14px | 16px |

---

## CSS Implementation

```css
/* Headings use calc() with multiplier */
h1, .text-h1 {
  font-size: calc(2.285 * var(--tenant-font-size, 14px));
}

h2, .text-h2 {
  font-size: calc(1.714 * var(--tenant-font-size, 14px));
}

/* Body uses base variable */
p, .text-subtitle {
  font-size: var(--tenant-font-size, 14px);
}

/* Small text */
.text-small {
  font-size: calc(0.857 * var(--tenant-font-size, 14px));
}
```

---

## Usage in Components

### Standard Typography
```tsx
// Use semantic elements - CSS handles sizing
<h1>Page Title</h1>
<h2>Section Header</h2>
<p>Body text paragraph</p>

// Or use utility classes
<span className="text-h3">Large Text</span>
<span className="text-small">Small caption</span>
```

### Custom Relative Sizing
```tsx
// For sizes not in the scale, use calc()
<span style={{ fontSize: 'calc(1.5 * var(--tenant-font-size))' }}>
  Custom size
</span>
```

---

## Spacing Usage

### Padding
```tsx
// ✅ CORRECT
<div style={{ padding: 'var(--layout-padding)' }}>

// ❌ WRONG
<div style={{ padding: '24px' }}>
```

### Gaps
```tsx
// ✅ CORRECT
<div style={{ gap: 'var(--tenant-gutter)' }}>

// ❌ WRONG
<div style={{ gap: '16px' }}>
```

### Border Radius
```tsx
// ✅ CORRECT - Cards, containers
<Card style={{ borderRadius: 'var(--tenant-border-radius)' }}>

// ✅ CORRECT - Buttons, inputs
<Button style={{ borderRadius: 'var(--tenant-border-radius-interactive)' }}>

// ❌ WRONG
<Card style={{ borderRadius: '12px' }}>
```

---

## ThemeRegistry.ts Integration

Variables are set dynamically based on tenant config:

```typescript
const baseSize = config.baseFontSize || 14;
const zoomFactor = baseSize / 14;

// Typography
root.style.setProperty('--tenant-font-size', `${baseSize}px`);
root.style.setProperty('--tenant-zoom-factor', `${zoomFactor}`);

// Spacing (scales with zoom)
const padding = (config.containerPadding || 24) * zoomFactor;
root.style.setProperty('--layout-padding', `${padding}px`);

const gutter = (config.globalGutter || 16) * zoomFactor;
root.style.setProperty('--tenant-gutter', `${gutter}px`);
```

---

## Zoom Behavior Example

| Config | Zoom Factor | --tenant-font-size | --layout-padding | h1 size |
|--------|-------------|-------------------|------------------|---------|
| Default | 1.0 | 14px | 24px | 32px |
| baseFontSize: 16 | 1.14 | 16px | 27.4px | 36.5px |
| baseFontSize: 18 | 1.29 | 18px | 30.9px | 41.1px |

---

## Prohibited Patterns

```tsx
// ❌ Hardcoded font sizes
style={{ fontSize: '24px' }}
style={{ fontSize: '12px' }}

// ❌ Hardcoded padding
style={{ padding: '24px' }}
className="p-6"  // Tailwind fixed values

// ❌ Hardcoded border radius
style={{ borderRadius: '8px' }}
```

---

*Last Updated: 2025-12-25*
*Source: `src/index.css`, `src/core/theme/ThemeRegistry.ts`*
