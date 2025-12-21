# Lean Architecture & Optimization Strategy

**Goal:** Transform the project into a "Lean Machine" - maximum performance, minimal footprint, zero technical debt.

This document outlines every opportunity to optimize the current `mini_project` codebase while maintaining full functionality.

## 1. Dependency Analysis & Pruning

### Current State
The `package.json` contains several heavy libraries that may be partially used or redundant.

### Opportunities
- [ ] **Remove Unused Dependencies**: Run `depcheck` or manual analysis to find unused packages.
- [ ] **Optimize UI Libraries**:
    - **Ant Design**: Verify tree-shaking is effective. Ensure we import only used components.
    - **Lucide React**: Ensure we are not bundling the entire icon set (use named imports carefully or use `lucide-react/dynamic`).
    - **Heavy Visuals**: Check usage of `leaflet`, `plotly.js`, `mermaid`. Can these be lazy-loaded?
- [ ] **Utility Libraries**:
    - **Lodash**: Replace with native ES6+ methods where possible, or ensure only sub-modules are imported.
    - **Moment/DayJS**: We have both? Consolidate to DayJS or date-fns (lighter).

## 2. Legacy Code & Dead Code Elimination

### Current State
We performed a major refactor, but kept some "backward compatibility" layers (e.g., `src/lib/store.ts` re-exports).

### Opportunities
- [ ] **Strict Removal of Re-exports**: Delete `src/lib/store.ts` and `src/hooks/useUserSession.ts`. Update all consumers to use `@/core/...`.
- [ ] **Component Folder Cleanup**:
    - `src/components/common` vs `src/core/components`. Merge or clearly delineate.
    - Remove any components in `src/components` that were migrated to modules but not deleted.
    - `src/utils` vs `src/core/utils`. Consolidate.
- [ ] **Unused Files**: Scan for files not imported by any entry point.

## 3. Bundle Optimization & Lazy Loading

### Current State
We use `React.lazy` for top-level pages and modules.

### Opportunities
- [ ] **Granular Lazy Loading**: Lazy load heavy components *inside* pages (e.g., complex forms, charts, maps) so they don't block the initial page render.
- [ ] **Vendor Chunking**: Tune `vite.config.ts` `manualChunks` to prevent a massive `vendor.js`. Split out `react`, `antd`, and `utils`.
- [ ] **Preloading**: Implement route preloading (prefetching chunks) for likely next user actions.

## 4. State Management Optimization

### Current State
Zustand store (`src/core/lib/store`) holds user sessions.

### Opportunities
- [ ] **Slice Pattern**: Ensure the store is sliced properly. If it grows, split into multiple stores to avoid unnecessary re-renders (though Zustand is good at this, structuring matters).
- [ ] **Selector Optimization**: Verify components only subscribe to the specific slice of state they need.

## 5. CSS & Styling

### Current State
Mixture of Tailwind and Ant Design styles.

### Opportunities
- [ ] **PurgeCSS / Tailwind JIT**: Ensure Tailwind is stripping all unused utility classes.
- [ ] **CSS-in-JS Overhead**: If using `styled-components` (seen in package.json?), verify if it's necessary or can be replaced by Tailwind to save runtime overhead.

## 6. Backend/Data Efficiency (Frontend View)

### Current State
Frontend asks for configuration.

### Opportunities
- [ ] **Cache Strategies**: Tune `react-query` `staleTime` and `gcTime` to minimize network requests for static config data (like Enums, Tenant Config).
- [ ] **Payload Size**: Ensure Supabase queries select only needed fields (`.select('id, name')` vs `.select('*')`).

## Action Plan
1.  **Audit**: Run bundle analyzer key metrics.
2.  **Prune**:
    - Remove `moment` (replace with `dayjs` or `date-fns`).
    - Remove `leaflet-draw` if not strictly required for core.
    - Consolidate `src/components/common` into `src/core/components`.
3.  **Refine**: Update imports and consolidate folders.
4.  **Tune**: Configure Vite and Cache.

### Specific Findings (2025-12-21)
- **Date Libraries**: Both `moment` and `dayjs` are used. `moment` is legacy and heavy.
    - Impact: ~300kb savings if removed.
    - Action: Migrate `TicketSummary.tsx` and `CalendarView.tsx` to `dayjs`.
- **Visuals**: `plotly.js-dist-min` is used in `Dashboard.tsx` and `MetricChartWidget.tsx`.
    - Impact: Large chunk.
    - Action: Ensure it is lazy-loaded via `React.lazy` or dynamic import.
- **Maps**: `leaflet` and `react-leaflet` are used in `MapViewComponent.tsx` and `AgentActivityReport`.
    - Action: Move these components to a `maps` module or lazy-load them.
- **Layout Duplication**: `src/components/common` still contains legacy components that overlap with `src/core/components`.
    - Action: Merge `src/components/common/doc` into `src/core/components/doc` and delete the legacy folder.

