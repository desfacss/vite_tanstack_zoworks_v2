# Action Bar Component Patterns

> Responsive action bar components for page-level controls.

---

## Overview

The Action Bar is a flexible container between the app header and main content. It contains page-level controls like titles, tabs, filters, actions, and view toggles.

```
┌─────────────────────────────────────────────────────────────────────┐
│ APP HEADER (sticky)                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ ACTION BAR (page-header)                                            │
│   Left Side                              Right Side                 │
│   [Tabs] [Filter1] [Filter2] [⋯]         [+ Action] [Views] [⋯]     │
├─────────────────────────────────────────────────────────────────────┤
│ MAIN CONTENT                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/core/components/ActionBar/
├── index.tsx              # Main export
├── types.ts               # TypeScript interfaces
├── PageActionBar.tsx      # Container + Left/Right sections
├── PageTitle.tsx          # Title component
├── TabsComponent.tsx      # Tabs (inline/dropdown)
├── InlineFilters.tsx      # Desktop filters with overflow
├── PrimaryAction.tsx      # Primary action (supports split button)
├── ViewToggle.tsx         # View selector
├── MoreMenu.tsx           # Overflow menu
├── RowActions.tsx         # Row-level actions with overflow
├── MobileActionSheet.tsx  # Native-like bottom sheet
├── Pagination.tsx         # Pagination controls
└── hooks/
    └── useResponsive.ts   # Device detection
```

---

## Responsive Behavior Summary

| Component | Desktop | Mobile |
|-----------|---------|--------|
| `TabsComponent` | Inline radio buttons | Dropdown selector |
| `InlineFilters` | Show maxVisible inline, rest in popover | Hidden (use drawer) |
| `PrimaryAction` | Icon + text button | Icon-only button |
| `ViewToggle` | Radio button group | Single cycling button |
| `RowActions` | Inline icons + overflow dropdown | Bottom sheet |

---

## Components

### 1. PageActionBar

Container for the action bar. Use with `ActionBarLeft` and `ActionBarRight`.

```tsx
import { PageActionBar, ActionBarLeft, ActionBarRight } from '@/core/components/ActionBar';

<PageActionBar>
  <ActionBarLeft>
    <TabsComponent tabs={tabs} activeTab={tab} onChange={setTab} />
    <InlineFilters filters={filters} values={filterValues} onChange={setFilterValues} />
  </ActionBarLeft>
  <ActionBarRight>
    <PrimaryAction label="Add" icon={<Plus />} onClick={handleAdd} />
    <ViewToggle views={views} activeView={view} onChange={setView} />
  </ActionBarRight>
</PageActionBar>
```

---

### 2. TabsComponent

Responsive tabs with automatic collapse on mobile.

**Props:**
```typescript
interface TabsComponentProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}

interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
  count?: number;  // Badge count
}
```

**Responsive:**
- **Desktop**: Inline pill-style radio buttons
- **Tablet (>2 tabs)**: Dropdown
- **Mobile**: Dropdown

```tsx
<TabsComponent
  tabs={[
    { key: 'mine', label: 'My Tickets', count: 5 },
    { key: 'all', label: 'All Tickets' },
  ]}
  activeTab={currentTab}
  onChange={setCurrentTab}
/>
```

---

### 3. InlineFilters

Filters with overflow popover.

**Props:**
```typescript
interface InlineFiltersProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  maxVisible?: number;  // Default: 2
  onClear?: () => void;
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'daterange' | 'multiselect' | 'search';
  options?: { label: string; value: any }[];
  placeholder?: string;
  width?: number;
}
```

**Responsive:**
- **Desktop**: Show up to `maxVisible` inline, rest in popover
- **Mobile**: Returns `null` (filters go to search drawer)

**Overflow Implementation:**
```tsx
// Internal logic
const visibleFilters = filters.slice(0, maxVisible);
const overflowFilters = filters.slice(maxVisible);
const hasOverflow = overflowFilters.length > 0;

// Overflow button opens Popover with remaining filters
{hasOverflow && (
  <Popover content={overflowContent} trigger="click">
    <Button icon={<MoreHorizontal />} />
  </Popover>
)}
```

---

### 4. PrimaryAction

Primary action button with optional split dropdown.

**Props:**
```typescript
interface PrimaryActionProps {
  label: string;
  icon?: ReactNode;        // Default: <Plus />
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  type?: 'primary' | 'default' | 'text';
  dropdownItems?: MenuItem[];  // For split button
}
```

**Modes:**
1. **Single Button**: Just `label` + `onClick`
2. **Split Button**: `onClick` + `dropdownItems` (Dropdown.Button)
3. **Dropdown Only**: Just `dropdownItems` (no `onClick`)

**Responsive:**
- **Desktop**: Full button with icon + text
- **Mobile**: Icon-only square button

```tsx
// Single action
<PrimaryAction label="Add" onClick={handleAdd} />

// Split button with dropdown
<PrimaryAction
  label="Create"
  onClick={handleCreate}
  dropdownItems={[
    { key: 'import', label: 'Import', icon: <Upload />, onClick: handleImport },
    { key: 'template', label: 'From Template', onClick: handleTemplate },
  ]}
/>
```

---

### 5. ViewToggle

View mode selector.

**Props:**
```typescript
interface ViewToggleProps {
  views: ViewOption[];
  activeView: string;
  onChange: (view: string) => void;
}

interface ViewOption {
  key: 'table' | 'grid' | 'calendar' | 'kanban' | 'map' | 'gantt' | 'list';
  label: string;
  icon: ReactNode;
}
```

**Responsive:**
- **Only 1 view**: Hidden completely
- **Desktop (>1 view)**: Radio button group with icons
- **Mobile (>1 view)**: Single button that cycles through views

```tsx
<ViewToggle
  views={[
    { key: 'table', label: 'Table', icon: <Table size={16} /> },
    { key: 'grid', label: 'Grid', icon: <Grid size={16} /> },
  ]}
  activeView={currentView}
  onChange={setCurrentView}
/>
```

---

### 6. RowActions

Row-level actions with overflow handling.

**Props:**
```typescript
interface RowActionsProps {
  items: ActionSheetItem[];
  title?: string;
  maxInline?: number;  // Default: 3
}

interface ActionSheetItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}
```

**Overflow Logic:**
```tsx
// If items > maxInline:
// - Show (maxInline - 1) inline
// - Rest go in "More" dropdown

const shouldOverflow = items.length > maxInline;
const inlineItems = shouldOverflow ? items.slice(0, maxInline - 1) : items;
const overflowItems = shouldOverflow ? items.slice(maxInline - 1) : [];
```

**Responsive:**
- **Desktop**: Inline icon buttons + overflow dropdown
- **Mobile**: Single "⋯" button → Bottom action sheet

```tsx
<RowActions
  items={[
    { key: 'view', label: 'View', icon: <Eye size={16} />, onClick: handleView },
    { key: 'edit', label: 'Edit', icon: <Pencil size={16} />, onClick: handleEdit },
    { key: 'delete', label: 'Delete', icon: <Trash size={16} />, onClick: handleDelete, danger: true },
  ]}
  maxInline={3}
/>
```

---

## CSS Classes

```css
/* Container */
.page-header { }
.action-bar { display: flex; justify-content: space-between; }

/* Sections */
.action-bar-left { display: flex; align-items: center; gap: 12px; }
.action-bar-right { display: flex; align-items: center; gap: 8px; }

/* Components */
.action-bar-tabs-desktop { }
.action-bar-tabs-mobile { }
.action-bar-filters { }
.action-bar-view-desktop { }
.action-bar-view-mobile { }
.action-bar-primary-split { }
```

---

## Complete Example

```tsx
import {
  PageActionBar,
  ActionBarLeft,
  ActionBarRight,
  TabsComponent,
  InlineFilters,
  PrimaryAction,
  ViewToggle,
} from '@/core/components/ActionBar';
import { Plus, Table, Grid } from 'lucide-react';

const TicketsPage = () => {
  const [tab, setTab] = useState('mine');
  const [filters, setFilters] = useState({});
  const [view, setView] = useState('table');

  return (
    <>
      <PageActionBar>
        <ActionBarLeft>
          <TabsComponent
            tabs={[
              { key: 'mine', label: 'My Tickets', count: 5 },
              { key: 'all', label: 'All Tickets' },
            ]}
            activeTab={tab}
            onChange={setTab}
          />
          <InlineFilters
            filters={[
              { key: 'status', label: 'Status', type: 'select', options: statusOptions },
              { key: 'priority', label: 'Priority', type: 'select', options: priorityOptions },
              { key: 'search', label: 'Search', type: 'search' },
            ]}
            values={filters}
            onChange={setFilters}
            maxVisible={2}
          />
        </ActionBarLeft>
        <ActionBarRight>
          <PrimaryAction label="Create Ticket" icon={<Plus size={18} />} onClick={openCreate} />
          <ViewToggle
            views={[
              { key: 'table', label: 'Table', icon: <Table size={16} /> },
              { key: 'grid', label: 'Grid', icon: <Grid size={16} /> },
            ]}
            activeView={view}
            onChange={setView}
          />
        </ActionBarRight>
      </PageActionBar>

      {/* Content */}
    </>
  );
};
```

---

## Implementation Checklist

- [x] PageActionBar container with Left/Right sections
- [x] TabsComponent (desktop inline, mobile/tablet dropdown)
- [x] InlineFilters with overflow popover
- [x] PrimaryAction with split button support
- [x] ViewToggle with cycling on mobile
- [x] RowActions with maxInline overflow
- [x] MobileActionSheet for native-like bottom sheet
- [x] All components use `useDeviceType()` for responsive behavior

---

*Last Updated: 2025-12-25*
*Source: `src/core/components/ActionBar/`*
