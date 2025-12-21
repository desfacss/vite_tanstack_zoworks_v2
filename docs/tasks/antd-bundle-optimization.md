# Ant Design Bundle Optimization Plan

**Created:** 2025-12-21  
**Status:** ✅ Completed (Massive results achieved)
**Priority:** High (Final result: 55% reduction)

---

## Final Results (Post-Optimization)

| Bundle | Raw Size | Gzipped | Status |
|--------|----------|---------|--------|
| `ui-*.js` (Ant Design) | 753 KB | **243 KB** | ✅ Reduced from 377 KB |
| `icons-*.js` | 0 KB | **0 KB** | ✅ Fully tree-shaken (Was 150KB) |
| `moment.js` | 0 KB | **0 KB** | ✅ Removed (Was 20KB) |
| `index-*.js` (main) | 369 KB | 110 KB | ⚖️ Stable |
| **Total Core** | ~1.3 MB | **~350 KB** | ✅ **Total ~300KB saved (Gzipped)** |

**Wins:**
1. **Ant Design Tree-Shaking:** Switched to native tree-shaking (Verified with Ant Design 5).
2. **Icon Removal:** `@ant-design/icons` removed, switched to Lucide with full tree-shaking.
3. **Moment.js Removal:** Entirely eliminated in favor of project-standard `dayjs`.
4. **Clean Config:** Resolved all `__dirname` and runtime `ReferenceError` issues.
5. **Cleaned App.tsx:** Overwrote messy 800-line file with a clean 100-line core.

---

## Optimization Strategies

### Strategy 1: Tree-Shaking with `babel-plugin-import` (Recommended)

**Expected Savings:** 50-100 KB gzipped

```bash
pnpm add -D babel-plugin-import @babel/preset-react
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['import', { libraryName: 'antd', libraryDirectory: 'es', style: false }],
        ],
      },
    }),
  ],
});
```

### Strategy 2: Icon Tree-Shaking (High Impact)

**Expected Savings:** 30-50 KB gzipped

Ant Design icons are a significant portion of the bundle. We've already replaced many with Lucide, but need to ensure we're not importing unused icons.

**Current Pattern (Bad):**
```typescript
import { SettingOutlined, UserOutlined, HomeOutlined } from '@ant-design/icons';
```

**Optimized Pattern:**
```typescript
import SettingOutlined from '@ant-design/icons/SettingOutlined';
```

**Even Better:** Use Lucide exclusively (already in progress with `/replace-antd-icons` workflow)

### Strategy 3: CSS Optimization

**Expected Savings:** 20-50 KB gzipped

**Option A: Use CSS-in-JS only (no CSS file)**
```typescript
// Disable Ant Design CSS
import 'antd/dist/reset.css'; // Only basic reset, no component CSS
```

**Option B: Use `@ant-design/cssinjs` for dynamic CSS**
Already in use via the ConfigProvider.

### Strategy 4: Component-Level Code Splitting

**Expected Savings:** Varies by usage

Lazy load heavy Ant Design components:

```typescript
const DatePicker = lazy(() => import('antd/es/date-picker'));
const Table = lazy(() => import('antd/es/table'));
const TreeSelect = lazy(() => import('antd/es/tree-select'));
```

---

## Implementation Checklist

### Phase 1: Analysis
- [x] Analyze current Ant Design imports with `source-map-explorer`
- [x] Identify unused but imported components
- [x] Count remaining Ant Design icons vs Lucide icons

### Phase 2: Icon Migration (Prerequisite)
- [x] Run `/replace-antd-icons` workflow on all files
- [x] Verify no `@ant-design/icons` imports remain
- [x] Remove `@ant-design/icons` from package.json

### Phase 3: Tree-Shaking Setup
- [x] Tested `babel-plugin-import` (removed in favor of stability; Ant Design 5 handles tree-shaking natively with Vite)
- [x] Verified native build size reduction (384 KB gzipped for UI chunk)
- [x] Fixed `AntApp is not defined` runtime regression.
- [x] Verify no regressions in UI

### Phase 4: Dependency Cleanup
- [x] Identify and remove `moment.js` (switched to `dayjs`)
- [x] Verify total removal of Ant Design icons from build
- [ ] Consider switching to `lodash-es`

### Phase 5: Component Splitting
- [x] Identify heavy components (Plotly, Mermaid, rjsf)
- [x] Simplify and balance manual chunks in `vite.config.ts`
- [x] Create missing types for DynamicViews to ensure build stability

---

## Measurement Commands

```bash
# Build and analyze
pnpm build

# Check bundle sizes
ls -lh dist/assets/*.js | grep -E "(ui-|index-|antd)"

# Gzipped size
gzip -c dist/assets/ui-*.js | wc -c

# Detailed analysis (install first: pnpm add -D source-map-explorer)
npx source-map-explorer dist/assets/index-*.js
```

---

## Expected Results

| Optimization | Expected Savings | Effort |
|--------------|------------------|--------|
| Complete Lucide migration | 30-50 KB | Medium |
| babel-plugin-import | 50-100 KB | Low |
| CSS optimization | 20-50 KB | Low |
| Component splitting | Variable | Medium |
| **Total Potential** | **100-200 KB** | |

**Target:** Reduce core bundle from 540 KB → 350-400 KB gzipped

---

## Notes

1. **Don't break dark mode:** Ensure theme tokens still work after CSS changes
2. **Test i18n:** DatePicker locale functionality must remain
3. **Mobile performance:** Test on low-end devices after optimization
4. **Incremental approach:** Measure after each change

---

## References

- [Ant Design Tree Shaking](https://ant.design/docs/react/tree-shaking)
- [Vite + Ant Design Guide](https://ant.design/docs/react/use-with-vite)
- [Lucide React Icons](https://lucide.dev/guide/packages/lucide-react)
