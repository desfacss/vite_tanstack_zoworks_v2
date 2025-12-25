---
description: Definitive agentic checklist for auditing styling across all components.
---

# Theme Styling Audit & Enforcement Workflow

// turbo-all

This workflow ensures all components strictly adhere to the Zoworks 5-layer architecture and page-card layout system. **NO LEAKS ALLOWED.**

> **References:**
> - [Theme Engine Guide](file:///docs/frontend/patterns/theme-engine.md)
> - [Page Layouts](file:///docs/frontend/patterns/page-layouts.md)

> [!CAUTION]
> **STYLING SYSTEM IS FROZEN**
> When auditing pages/components:
> - ❌ Do NOT modify `index.css` or theme files
> - ❌ Do NOT add inline styles
> - ❌ Do NOT alter colors or typography
> - ✅ Only wrap existing content in correct structure (`.page-content`, `.page-card`)
> - ✅ Use existing CSS classes only

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

## 1. Layout Pattern Matching (CRITICAL)

**Match the page to one of 5 documented layout patterns:**

> [!IMPORTANT]
> Reference: [Layout Patterns](file:///docs/frontend/patterns/page-layouts.md#layout-patterns)

### Step 1: Identify Current Structure

Examine the page and determine what type of content it displays:
- Dashboard/Analytics with widgets? → **Dashboard Layout**
- Hero/landing with columns? → **Hero Layout**
- Table/list of records? → **Table Layout**
- Grid/kanban of cards? → **Card Grid Layout**
- Stacked content sections? → **Multi-Card Layout**

### Step 2: Apply Matching Pattern

| Pattern | Class Combo | When to Use |
|---------|-------------|-------------|
| **Dashboard** | `page-card page-card-flush` | Widget grids, analytics |
| **Hero** | `page-card` (internal grid) | Welcome, onboarding |
| **Table** | `page-card page-card-flush` | Data tables, lists |
| **Card Grid** | `page-card page-card-flush` | Kanban, grid views |
| **Multi-Card** | Multiple `page-card` | Settings, stacked sections |

### Step 3: Wrap Existing Content

```tsx
// Before (any old structure)
<>
  <PageActionBar>...</PageActionBar>
  <OldWrapper>
    <ExistingContent />
  </OldWrapper>
</>

// After (matching pattern)
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  <div className="page-card page-card-flush">
    <ExistingContent />  {/* Keep internal structure intact */}
  </div>
</div>
```

### Step 4: If No Pattern Matches

If the page doesn't fit any known pattern, **ASK THE USER**:

```markdown
## Layout Pattern Question

This page doesn't match any documented layout pattern.
Current structure: [describe what you see]

**Options:**
1. Dashboard Layout (widget grid, flush padding)
2. Hero Layout (two-column with internal grid)
3. Table Layout (single card, flush padding)
4. Card Grid Layout (grid of item cards)
5. Multi-Card Layout (stacked sections)
6. New Pattern (describe what you need)

Which pattern should I apply?
```

### Consistency Checklist

- [ ] Page wrapped in `.page-content.layout-canvas` or `.page-content.layout-record`
- [ ] At least one `.page-card` exists
- [ ] `PageActionBar` sits OUTSIDE `.page-card`
- [ ] Content aligns to layout padding edges (`--layout-padding`)
- [ ] No inline styles on `.page-card`
- [ ] No nested `.page-card` inside another `.page-card`

### Migration Rules (CRITICAL)

> [!IMPORTANT]
> When migrating pages to `.page-card`:
> - **ONLY wrap existing content** — don't restructure or redesign
> - Keep all columns, grids, and internal layouts intact
> - Don't add inline styles to `.page-card`
> - Don't remove existing animations (CSS handles it)

**DO THIS:**
```tsx
// Before (fragment + old classes)
<>
  <PageActionBar>...</PageActionBar>
  <div className="layout-canvas entry-animate">
    <div className="content-body">
      <TwoColumnLayout>...</TwoColumnLayout>  
    </div>
  </div>
</>

// After (page-content + page-card wrapping existing structure)
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  <div className="page-card">
    <TwoColumnLayout>...</TwoColumnLayout>  {/* Same internal structure */}
  </div>
</div>
```

**DON'T DO THIS:**
```tsx
// ❌ Don't restructure internal layout
// ❌ Don't add inline styles like style={{ background: 'transparent' }}
// ❌ Don't split existing content into multiple page-cards unless needed
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
