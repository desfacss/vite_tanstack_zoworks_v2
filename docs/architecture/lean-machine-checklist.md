# Lean Machine Checklist

> Quick reference for ZoWorks lean architecture verification

## Bundle Optimization ✅

| Optimization | Status | Impact |
|--------------|--------|--------|
| Object-based `manualChunks` | ✅ | React deduplication |
| Yarn resolutions (React 18.3.1) | ✅ | Version consistency |
| Vite aliases for React packages | ✅ | Single instance |
| Plotly dynamic import | ✅ | 4.8MB out of initial |
| Mermaid dynamic import | ✅ | 463KB out of initial |
| DetailOverview lazy loading | ✅ | ~820KB reduced |
| Lodash tree-shaking | ✅ | No standalone chunk |
| PWA precache exclusions | ✅ | Large chunks excluded |

## Current Bundle Sizes

| Chunk | Size | Type |
|-------|------|------|
| `vendor.js` | 160KB | Initial |
| `ui.js` | 1.3MB | Initial (Ant Design) |
| `form.js` | 328KB | Initial |
| `plotly.min.js` | 4.6MB | Async |
| `mermaid.core.js` | 463KB | Async |

## Plug-and-Play Architecture ✅

| Feature | Status |
|---------|--------|
| Config-driven DynamicViews | ✅ |
| Registry pattern for actions/tabs | ✅ |
| Lazy module loading | ✅ |
| Tenant-specific module activation | ✅ |
| Module handshake with config | ✅ |

## Multi-Tenant ✅

| Feature | Status |
|---------|--------|
| Subdomain-based tenant resolution | ✅ |
| Single database with RLS | ✅ |
| Tenant-specific theming | ✅ |
| Hierarchical config merging | ✅ |

## Future Optimizations

- [ ] Dynamic import for Leaflet (~151KB)
- [ ] Dynamic import for Cytoscape (~432KB)
- [ ] Remove Lodash entirely (use native JS)
- [ ] Plotly partial bundles for chart-specific loading

## Related Docs

- [Bundle Optimization](./bundle-optimization.md)
- [Modular Architecture](./modular-architecture.md)
- [Plug-and-Play Modules](./plug-and-play-modules.md)
