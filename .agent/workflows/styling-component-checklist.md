---
description: Definitive agentic checklist for auditing styling across all components.
---

# Theme Styling Audit & Enforcement Workflow

// turbo-all

This workflow ensures all components strictly adhere to the Zoworks 5-layer architecture. **NO LEAKS ALLOWED.**

> **Reference:** [Theme Engine Guide](file:///Users/macbookpro/zo_v2/mini_project/docs/theme_engine.md)

---

## 1. Automated "Leak" Audit

Before proceeding, scan the relevant files for anti-patterns:

- [ ] Run: `grep -E "blue-|indigo-|slate-|#([0-9a-fA-F]{3}){1,2}" {filePath}`
- [ ] If any hardcoded colors are found, they **MUST** be replaced with variables.
- [ ] Check for hardcoded `border-radius: ...px`. Replace with `var(--tenant-border-radius)`.

---

## 2. Variable Compliance Check

### Backgrounds
- [ ] Main backgrounds use `var(--color-bg-primary)`
- [ ] Cards/Containers use `var(--color-bg-secondary)`
- [ ] Sidebars/Headers use `var(--color-bg-tertiary)`

### Typography
- [ ] Primary text uses `var(--color-text-primary)`
- [ ] Secondary text/labels use `var(--color-text-secondary)`
- [ ] All headers use standard classes: `.text-h1` to `.text-h6`

### Borders & Radius
- [ ] Borders use `var(--color-border)`
- [ ] Border-radius uses `var(--tenant-border-radius)`

---

## 3. Transparency & Effects (RGB)

If the component uses transparency:
- [ ] **WRONG**: `rgba(0, 163, 255, 0.1)` (Hardcoded blue)
- [ ] **WRONG**: `bg-blue-50/10` (Tailwind leak)
- [ ] **CORRECT**: `rgba(var(--color-primary-rgb), 0.1)`

If the component uses shadows:
- [ ] **CORRECT**: `box-shadow: 0 4px 12px var(--color-shadow)`

---

## 4. Preset Synchronization

Ensure the component's visual behavior aligns with the active preset:
- [ ] Check the root `data-theme-preset` attribute.
- [ ] If `preset="neon"`, verify that Layer 4 effects (gradients/glows) are active.
- [ ] If `preset="base"`, verify that the component uses clean, flat, professional styles.
- [ ] **NO DRIFT**: Component must not carry "Neon" styles when the preset is "Base".

---

## 5. Mode Verification

- [ ] **Light Mode**: Contrast is readable (Dark text on light).
- [ ] **Dark Mode**: Backgrounds are dark (`#0f172a` family), text is light.
- [ ] **Glow Effects**: Only prominent in Dark Mode.

---

## 5. Standard Component Verification

- [ ] All primary buttons are `.ant-btn-primary`.
- [ ] **NO CSS OVERRIDE** for height or padding.
- [ ] **Lucide Icons ONLY**: No Ant Design icons allowed.
- [ ] Icon sizes standardized: `size={14}` for buttons, `size={18}` for menus.
- [ ] **Branding System**: Tenant logos/icons MUST use `<BrandLogo />` or `<BrandIcon />` (from `@/core/components/shared/BrandAsset`). **NO** raw `<img>` tags.

---

## 6. Persistence & Form Audit

- [ ] **Deep Save**: Verify that `form.getFieldsValue(true)` is used in the save handler.
- [ ] **Unmounted Data**: Ensure fields in collapsed sections or background tabs are correctly captured.
- [ ] **Reset Integrity**: Verify "Reset to Defaults" strictly uses `THEME_PRESETS` and wipes all local overrides.

---

## 6. Execution Patterns

### Replacing a Leak
When you find a leak like `bg-blue-50`, replace it with:
`className="... bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"`

### Fixing a Primary Button
Ensure it uses:
`style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}` (if not already handled by Layer 3).

---

*Last Updated: 2025-12-24*
