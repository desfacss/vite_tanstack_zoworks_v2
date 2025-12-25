---
description: Definitive agentic checklist for auditing styling across all components.
---

# Theme Styling Audit & Enforcement Workflow

// turbo-all

This workflow ensures all components strictly adhere to the Zoworks 5-layer architecture and page-card layout system. **NO LEAKS ALLOWED.**

> **References:**
> - [Theme Engine Guide](file:///docs/frontend/patterns/theme-engine.md)
> - [Page Layouts](file:///docs/frontend/patterns/page-layouts.md)

---

## Usage

Run this workflow on a specific module or folder:

```bash
# Audit a specific module
/styling-component-checklist src/modules/tickets

# Audit core components
/styling-component-checklist src/core/components/DynamicViews

# Audit all pages in a module
/styling-component-checklist src/modules/workforce/pages
```

---

## 1. Page Structure Audit (CRITICAL)

**Every page file must follow the page-card layout pattern:**

### Check Layout Mode
- [ ] Page uses `.page-content` wrapper
- [ ] Has `.layout-canvas` (multi-card) OR `.layout-record` (single-card)
- [ ] At least one `.page-card` exists inside `.page-content`

### Check Nesting Rules
- [ ] **NO nested `.page-card`** — Never `.page-card` inside another `.page-card`
- [ ] `.ant-card` inside `.page-card` is allowed (plain styling, no animation)
- [ ] `PageActionBar` sits OUTSIDE `.page-card`, directly in `.page-content`

### Correct Patterns

**Canvas Layout (Multi-Card):**
```tsx
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  <div className="page-card">Section 1</div>
  <div className="page-card">Section 2</div>
</div>
```

**Record Layout (Single-Card):**
```tsx
<div className="page-content layout-record">
  <PageActionBar>...</PageActionBar>
  <div className="page-card">
    <Table ... />
  </div>
</div>
```

---

## 2. Spacing & Padding Audit

Scan for hardcoded padding/margin values:

```bash
grep -rE "padding:\s*[0-9]+px|margin:\s*[0-9]+px" {TARGET} --include="*.tsx" --include="*.css"
```

### Required Variables

| Purpose | Variable | Default |
|---------|----------|---------|
| Page/card padding | `var(--layout-padding)` | 24px |
| Mobile padding | `var(--layout-padding-mobile)` | 16px |
| Gaps/gutters | `var(--tenant-gutter)` | 16px |

### Checks
- [ ] No hardcoded `padding: 24px` — Use `var(--layout-padding)`
- [ ] No hardcoded `gap: 16px` — Use `var(--tenant-gutter)`
- [ ] Responsive padding uses `--layout-padding-mobile` for mobile

---

## 3. Border Radius Audit

```bash
grep -rE "border-radius:\s*[0-9]+px" {TARGET} --include="*.tsx" --include="*.css"
```

### Required Variables

| Purpose | Variable | Default |
|---------|----------|---------|
| Cards, modals, large containers | `var(--tenant-border-radius)` | 12px |
| Buttons, inputs, interactive | `var(--tenant-border-radius-interactive)` | 10px |

### Checks
- [ ] No hardcoded `border-radius: 12px` — Use `var(--tenant-border-radius)`
- [ ] No hardcoded `border-radius: 8px` on buttons — Use `var(--tenant-border-radius-interactive)`

---

## 4. Typography Audit

```bash
grep -rE "font-size:\s*[0-9]+px" {TARGET} --include="*.tsx" --include="*.css"
```

### Typography Scale (All Relative to --tenant-font-size)

| Class | Multiplier | @14px | @16px |
|-------|------------|-------|-------|
| `.text-h1` / h1 | 2.285x | 32px | 36.5px |
| `.text-h2` / h2 | 1.714x | 24px | 27.4px |
| `.text-h3` / h3 | 1.428x | 20px | 22.8px |
| `.text-h4` / h4 | 1.285x | 18px | 20.6px |
| `.text-h5` / h5 | 1.142x | 16px | 18.3px |
| `.text-h6` / h6 | 1.0x | 14px | 16px |
| `.text-title` | 1.571x | 22px | 25.1px |
| `.text-subtitle` | 1.0x | 14px | 16px |
| `.text-small` | 0.857x | 12px | 13.7px |
| `p` / body | 1.0x | 14px | 16px |

### Checks
- [ ] No hardcoded `font-size: 24px` — Use `.text-h2` or `calc(1.714 * var(--tenant-font-size))`
- [ ] No hardcoded `font-size: 14px` — Use `var(--tenant-font-size)`
- [ ] No hardcoded `font-size: 12px` — Use `.text-small` or `calc(0.857 * var(--tenant-font-size))`

---

## 5. Color Leak Audit

```bash
grep -rE "blue-|indigo-|slate-|#([0-9a-fA-F]{3}){1,2}" {TARGET} --include="*.tsx" --include="*.ts"
```

### Required Variables

| Purpose | Variable |
|---------|----------|
| Backgrounds | `var(--color-bg-primary)`, `var(--color-bg-secondary)`, `var(--color-bg-tertiary)` |
| Text | `var(--color-text-primary)`, `var(--color-text-secondary)` |
| Borders | `var(--color-border)` |
| Primary brand | `var(--tenant-primary)` |

### Checks
- [ ] No Tailwind color classes (`bg-blue-50`)
- [ ] No hardcoded hex colors (`#ffffff`)
- [ ] Transparency uses RGB: `rgba(var(--color-primary-rgb), 0.1)`

---

## 6. Icon Compliance

```bash
grep -r "@ant-design/icons" {TARGET} --include="*.tsx"
```

- [ ] **Lucide Icons ONLY**: No Ant Design icons allowed
- [ ] Icon sizes: `size={14}` buttons, `size={18}` menus, `size={20}` header

---

## 7. Branding System

- [ ] **NO raw `<img>` for logos**: Use `<BrandLogo />` or `<BrandIcon />`

---

## 8. Responsive Pattern Check

- [ ] **Tabs**: Inline on desktop, dropdown on mobile
- [ ] **Filters**: Inline on desktop, drawer on mobile
- [ ] **Primary Action**: Icon+text on desktop, icon-only on mobile

---

## Fixing Patterns

### Hardcoded Padding
```tsx
// ❌ WRONG
<div style={{ padding: '24px' }}>

// ✅ CORRECT
<div style={{ padding: 'var(--layout-padding)' }}>
```

### Hardcoded Font Size
```tsx
// ❌ WRONG
<span style={{ fontSize: '12px' }}>Small text</span>

// ✅ CORRECT
<span className="text-small">Small text</span>
```

### Hardcoded Border Radius
```tsx
// ❌ WRONG
<Card style={{ borderRadius: '12px' }}>

// ✅ CORRECT
<Card style={{ borderRadius: 'var(--tenant-border-radius)' }}>
```

---

## Audit Report Template

```markdown
## Styling Audit: {MODULE_NAME}

**Date**: YYYY-MM-DD
**Files Audited**: X

### Page Structure
- [ ] All pages use .page-card
- [ ] No nested .page-card

### Spacing
- Hardcoded padding found: X
- Fixed: X

### Border Radius
- Hardcoded radius found: X
- Fixed: X

### Typography
- Hardcoded font-size found: X
- Fixed: X

### Color Leaks
- Found: X
- Fixed: X

### Icons
- Ant Design icons found: X
- Replaced: X
```

---

*Last Updated: 2025-12-25*
