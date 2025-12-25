# Bundle Optimization Guide

> **Status**: Implemented | **Last Updated**: December 2025

## The Problem

The `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` error on Vercel was caused by:
1. `react-is@19.1.0` mixed with React 18
2. Function-based `manualChunks` creating separate React chunks

---

## Working Solution

### 1. Object-Based manualChunks
```typescript
// vite.config.ts
manualChunks: {
  vendor: ['react', 'react-dom', 'react-router-dom'],
  ui: ['antd', '@ant-design/icons'],
  form: ['@rjsf/antd', '@rjsf/core', '@rjsf/utils', '@rjsf/validator-ajv8'],
  state: ['@tanstack/react-query', 'zustand'],
  animation: ['framer-motion']
}
```

### 2. Yarn Resolutions
```json
"resolutions": {
  "react": "^18.3.1",
  "react-dom": "^18.3.1", 
  "react-is": "^18.3.1"
}
```

### 3. Vite Aliases
```typescript
alias: {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  'react-is': path.resolve(__dirname, 'node_modules/react-is'),
}
```

---

## Completed Optimizations

| Optimization | Savings | Files |
|--------------|---------|-------|
| Plotly async import | 4.8MB out of initial | `MetricChartWidget.tsx`, `WidgetRenderers.tsx` |
| Mermaid async import | 463KB out of initial | `ZeroStateContent.tsx`, `MermaidViewer.tsx` |
| DetailOverview lazy loading | ~820KB reduced | `DetailOverview.tsx` |
| PWA precache exclusions | N/A | `vite.config.ts` |
| Lodash tree-shaking | ~70KB (no standalone chunk) | `Dashboard.tsx`, `DashboardCanvas.tsx`, `WidgetRenderers.tsx` |

---

## Current Bundle Sizes

| Chunk | Size | Type |
|-------|------|------|
| `plotly.min.js` | 4.6MB | Async |
| `ui.js` | 1.3MB | Initial |
| `mermaid.core.js` | 463KB | Async |
| `vendor.js` | 160KB | Initial |
| `form.js` | 328KB | Initial |

---

## Future Optimizations

- [ ] Dynamic import for Leaflet (~151KB) — used only in MapView
- [ ] Dynamic import for Cytoscape (~432KB) — used via Mermaid
- [ ] Remove Lodash entirely — replace with native JS alternatives
- [ ] Plotly partial bundles — load chart-specific modules
