---
description: Checklist for verifying a new component or page for AI-native standardization
---

# Component & Page Verification Checklist

Use this checklist whenever creating or refactoring a component/page to ensure it meets the project's high standards.

## 1. Internationalization (i18n)
- [ ] **No Hardcoded Strings**: Every user-facing string must use the `t()` function.
- [ ] **Standardized Keys**: Keys follow `[namespace].[module].[context].[element]` (e.g., `common.action.save`).
- [ ] **Cross-Language Sync**: Ensure keys added to `en.json` are also implemented in `kn.json`.
- [ ] **Context-Aware Props**: Use `common.label.loading`, `common.label.no_data`, and `common.message.error` for generic states.
- [ ] **Interpolation**: Use `t('key', { variable })` for dynamic content.

## 2. Design & Aesthetics
- [ ] **Theme Tokens**: Use CSS variables for colors (e.g., `var(--color-primary)`, `var(--color-bg-secondary)`).
- [ ] **Lucide Icons Only**: Avoid Ant Design icons; use `lucide-react` equivalents.
- [ ] **Visual Impact**: Ensure appropriate use of gradients, spacing, and modern typography.
- [ ] **Dark Mode**: Verify the component looks premium in both light and dark modes.
- [ ] **Micro-animations**: Use `framer-motion` or CSS transitions for hover effects and state changes.

## 3. Architecture & Code Quality
- [ ] **Functional Components**: Use `React.FC` (or just functions in modern Vite setups) consistently.
- [ ] **Modern JSX**: No `import React from 'react'` unless using Legacy features.
- [ ] **Clean Imports**: Use `@/core/...` and `@/lib/...` aliases correctly.
- [ ] **State Management**: Use `useAuthStore` for session/tenant data and `useThemeStore` for styling logic.
- [ ] **Lazy Loading**: Ensure module-specific pages are lazily loaded in `AppRoutes`.

## 4. Multi-Tenant & SaaS Readiness
- [ ] **Org/Location Awareness**: Component respects `organization.id` and `location.id`.
- [ ] **Permission Handling**: Content is conditionally rendered based on user roles/permissions.
- [ ] **Subdomain Resilience**: UI adapts to branding defined in `ThemeRegistry`.

## 5. Performance & UX
- [ ] **Memoization**: Use `useMemo` and `useCallback` for expensive calculations or callback props.
- [ ] **Loading Skeletors**: Provide a smooth loading experience (e.g., `Spin` or custom skeleton).
- [ ] **Error Boundaries**: Component handles API failures gracefully with user feedback.

---
// standard-verify
