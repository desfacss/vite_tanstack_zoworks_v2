# NestedContext Architecture Review

> **Status**: Active  
> **Priority**: Medium  
> **Component**: [NestedContext.tsx](file:///Users/macbookpro/zo_v2/mini_project/src/core/lib/NestedContext.tsx)

## Current Implementation

A React Context-based stack for managing nested entity drill-downs (e.g., Project → Task → Subtask). Each level opens in a drawer, preserving parent context.

**Key behaviors:**
- Stack-based: `openContext()` pushes, `closeContext()` pops
- Clears on route change (prevents state leakage)
- Currently limited to 2 levels via hardcoded check in `RowActions.tsx`

## Strengths

- ✅ Simple, no external dependencies
- ✅ Route-aware cleanup
- ✅ UUID tracking for precise context management

## Issues to Address

| Issue | Priority | Description |
|-------|----------|-------------|
| **Depth limit not centralized** | High | Limit is in `RowActions`, not the provider. Other components can exceed it. |
| **Memory pressure** | Medium | Each context stores full `editItem`. Consider storing just `{ entityType, id }` and lazy-fetching. |
| **No `closeAll` method** | Low | Useful for escape keys or "back to root" actions. |

## Recommended Changes

### 1. Centralize Depth Limit (High Priority)
```typescript
// In NestedContext.tsx
const MAX_DEPTH = 3;

const openContext = (entry) => {
  if (contextStack.length >= MAX_DEPTH) {
    console.warn('Max nesting depth reached');
    return null;
  }
  // ...
};
```

### 2. Lazy Data Fetching (Medium Priority)
Store minimal context, fetch on drawer mount:
```typescript
interface ContextEntry {
  id: string;
  entityType: string;
  entityId: string;
  // Remove: editItem, config, viewConfig
}
```

### 3. Add `closeAll` Method (Low Priority)
```typescript
const closeAll = () => setContextStack([]);
```

## Future Considerations

If requirements grow to include:
- Persisted open contexts across refresh
- Deeplinking to nested entities
- 5+ nesting levels

Then migrate to **Zustand with persistence** or URL-based state management.

## Rating

**7/10** — Solid for current drawer-based UX. Clear upgrade paths exist.
