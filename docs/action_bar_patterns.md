# Action Bar Component Patterns

This document defines the responsive action bar patterns used across all pages. These patterns apply to **all themes**.

---

## Overview

The Action Bar is a flexible container that sits between the app header and main content. It contains page-level controls like titles, tabs, filters, actions, and view toggles.

```
┌─────────────────────────────────────────────────────────────────────┐
│ APP HEADER (sticky)                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ ACTION BAR (page-header)                                            │
│   Left Side                              Right Side                 │
│   [Title/Tabs] [Filters...]              [Actions] [Views] [More]   │
├─────────────────────────────────────────────────────────────────────┤
│ MAIN CONTENT                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Desktop Layout (≥768px)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ACTION BAR                                                              │
│ ┌────────────────────────────────────────┬────────────────────────────┐ │
│ │ LEFT SECTION                           │ RIGHT SECTION              │ │
│ │ [Title/Tabs] [Filter1] [Filter2] [⋯]   │ [+ Action] [Views] [⋯]    │ │
│ └────────────────────────────────────────┴────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Left Section (in order)
1. **Title** - Page name (e.g., "Accounts")
   - OR **Tabs** - If page has multiple views (e.g., "My Tickets | All Tickets")
   - Tabs render as inline buttons on desktop
2. **Inline Filters** - Show up to 2 filter controls based on available space
3. **More Filters** `[⋯]` - Button that opens dropdown/popover with remaining filters

### Right Section (in order)
1. **Primary Action** `[+ Add]` - Always visible, primary colored button
2. **View Toggle** - Radio group showing all available views (Table, Grid, Calendar, etc.)
   - Only show if more than 1 view available
   - If only 1 view, hide completely
3. **More Menu** `[⋯]` - Dropdown with secondary actions (Import, Export, Print, etc.)

---

## Mobile Layout (<768px)

### Header (App-level)
```
┌─────────────────────────────────────────┐
│ [☰] Page Title      [🔍] [🔔] [⚙️] [👤] │
└─────────────────────────────────────────┘
```

- **Hamburger** `[☰]` - Opens navigation drawer
- **Page Title** - Shows current page name (NEW requirement)
- **Search Icon** `[🔍]` - Opens filter drawer with ALL search/filter params
- Other header icons (notifications, settings, profile)

### Action Bar
```
┌─────────────────────────────────────────┐
│ [Tabs ▼]                  [+] [View] [⋯]│
└─────────────────────────────────────────┘
```

- **Left**: Tabs as dropdown (if tabs exist), otherwise empty
- **Right**: Primary action, current view icon (if >1 view), more menu

### Filter Drawer (accessed via 🔍)
```
┌─────────────────────────────────────────┐
│ × Search                                │
├─────────────────────────────────────────┤
│ Filter Field 1                          │
│ [__________________________]            │
│                                         │
│ Filter Field 2                          │
│ [__________________________]            │
│                                         │
│ Filter Field 3                          │
│ [__________________________]            │
│                                         │
│ [Column Selector ⚙️]                     │
│                                         │
│ [Apply Filters]          [Clear All]    │
└─────────────────────────────────────────┘
```

---

## Component Specifications

### 1. PageTitle Component

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Page title text |
| `description` | string? | Optional subtitle |
| `icon` | ReactNode? | Optional icon |

**Responsive Behavior:**
- **Desktop**: Renders in action bar left section
- **Mobile**: Renders in app header (next to hamburger)

---

### 2. TabsComponent

| Property | Type | Description |
|----------|------|-------------|
| `tabs` | Tab[] | Array of tab objects |
| `activeTab` | string | Current active tab key |
| `onChange` | (key: string) => void | Tab change handler |

**Tab Object:**
```typescript
interface Tab {
  key: string;
  label: string;
  icon?: ReactNode;
  count?: number;  // Optional badge count
}
```

**Responsive Behavior:**
- **Desktop**: Inline pill buttons
- **Mobile**: Dropdown selector showing active tab label

---

### 3. InlineFilters Component

| Property | Type | Description |
|----------|------|-------------|
| `filters` | FilterConfig[] | All available filters |
| `values` | Record<string, any> | Current filter values |
| `onChange` | (values: Record<string, any>) => void | Value change handler |
| `maxVisible` | number | Max filters to show inline (default: 2) |

**FilterConfig Object:**
```typescript
interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'daterange' | 'multiselect';
  options?: { label: string; value: any }[];  // For select types
  placeholder?: string;
  width?: number;  // Width in pixels
}
```

**Responsive Behavior:**
- **Desktop**: Show up to `maxVisible` filters inline, rest in "More" popover
- **Mobile**: All filters go to search drawer (component not rendered)

---

### 4. PrimaryAction Component

| Property | Type | Description |
|----------|------|-------------|
| `label` | string | Button text (e.g., "Add") |
| `icon` | ReactNode | Button icon (e.g., Plus) |
| `onClick` | () => void | Click handler |
| `loading` | boolean? | Loading state |
| `disabled` | boolean? | Disabled state |

**Responsive Behavior:**
- **Desktop**: Full button with icon + text
- **Mobile**: Icon-only button (square)

---

### 5. ViewToggle Component

| Property | Type | Description |
|----------|------|-------------|
| `views` | ViewOption[] | Available view types |
| `activeView` | string | Current active view |
| `onChange` | (view: string) => void | View change handler |

**ViewOption Object:**
```typescript
interface ViewOption {
  key: 'table' | 'grid' | 'calendar' | 'kanban' | 'map' | 'gantt';
  label: string;
  icon: ReactNode;
}
```

**Responsive Behavior:**
- **If only 1 view**: Hide completely (both desktop and mobile)
- **Desktop (>1 view)**: Radio button group showing all view icons
- **Mobile (>1 view)**: Single button showing current view icon, click cycles through views

---

### 6. MoreMenu Component

| Property | Type | Description |
|----------|------|-------------|
| `items` | MenuItem[] | Menu items |

**MenuItem Object:**
```typescript
interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;  // Red text for destructive actions
  divider?: boolean; // Show divider before this item
}
```

**Responsive Behavior:**
- Same on desktop and mobile (dropdown menu)

---

## CSS Classes

```css
/* Container */
.page-header { }
.page-header .action-bar { }

/* Left section */
.action-bar-left { }
.action-bar-title { }
.action-bar-tabs { }
.action-bar-filters { }

/* Right section */
.action-bar-right { }
.action-bar-primary { }
.action-bar-views { }
.action-bar-more { }

/* Responsive utilities */
.desktop-only { }  /* Hidden on mobile */
.mobile-only { }   /* Hidden on desktop */
```

---

## Usage Examples

### Simple Page (Title + Primary Action)
```tsx
<PageActionBar>
  <PageTitle title="Accounts" />
  <ActionBarRight>
    <PrimaryAction label="Add" icon={<Plus />} onClick={handleAdd} />
    <MoreMenu items={menuItems} />
  </ActionBarRight>
</PageActionBar>
```

### List Page with Tabs and Filters
```tsx
<PageActionBar>
  <TabsComponent
    tabs={[
      { key: 'mine', label: 'My Tickets' },
      { key: 'all', label: 'All Tickets' },
    ]}
    activeTab={currentTab}
    onChange={setCurrentTab}
  />
  <InlineFilters
    filters={filterConfig}
    values={filterValues}
    onChange={setFilterValues}
    maxVisible={2}
  />
  <ActionBarRight>
    <PrimaryAction label="Add" icon={<Plus />} onClick={handleAdd} />
    <ViewToggle
      views={availableViews}
      activeView={currentView}
      onChange={setCurrentView}
    />
    <MoreMenu items={menuItems} />
  </ActionBarRight>
</PageActionBar>
```

### Dashboard (Selector + Actions)
```tsx
<PageActionBar>
  <Select value={currentDashboard} onChange={setDashboard}>
    {dashboards.map(d => <Option key={d.id}>{d.name}</Option>)}
  </Select>
  <ActionBarRight>
    <Button icon={<RefreshCw />}>Refresh</Button>
    <PrimaryAction label="Design" icon={<Pencil />} onClick={enterEditMode} />
  </ActionBarRight>
</PageActionBar>
```

### 7. RowActions Component

| Property | Type | Description |
|----------|------|-------------|
| `items` | ActionSheetItem[] | Action items |
| `title` | string? | Action sheet title (mobile) |
| `trigger` | ReactNode? | Custom trigger element |

**ActionSheetItem Object:**
```typescript
interface ActionSheetItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}
```

**Responsive Behavior:**
- **Desktop**: Dropdown menu on click
- **Mobile**: Bottom action sheet (native iOS/Android style)

### Usage Example (Row Actions):
```tsx
<RowActions
  items={[
    { key: 'view', label: 'View Details', icon: <Eye size={18} />, onClick: handleView },
    { key: 'edit', label: 'Edit', icon: <Pencil size={18} />, onClick: handleEdit },
    { key: 'delete', label: 'Delete', icon: <Trash size={18} />, onClick: handleDelete, danger: true },
  ]}
/>
```

---

## File Structure

```
src/core/components/ActionBar/
├── index.tsx                 # Main export
├── types.ts                  # TypeScript interfaces
├── PageActionBar.tsx         # Container component
├── PageTitle.tsx             # Title component
├── TabsComponent.tsx         # Tabs (inline/dropdown)
├── InlineFilters.tsx         # Desktop inline filters
├── PrimaryAction.tsx         # Primary action button
├── ViewToggle.tsx            # View selector
├── MoreMenu.tsx              # Overflow menu
├── MobileActionSheet.tsx     # Native-like bottom sheet (mobile)
├── RowActions.tsx            # Row-level action menu
└── hooks/
    └── useResponsive.ts      # Device detection
```


---

## Implementation Checklist

- [x] Create ActionBar component directory
- [x] Implement PageActionBar container
- [x] Implement PageTitle with mobile header integration
- [x] Implement TabsComponent (desktop inline, mobile dropdown)
- [x] Implement InlineFilters with overflow
- [x] Update Header to show page title on mobile
- [x] Implement ViewToggle with responsive logic
- [x] Implement MoreMenu
- [x] Add CSS variables for unified layout padding
- [x] Add action-bar component CSS classes
- [x] Update DynamicViews to use new components
- [x] Update static pages (Dashboard, Settings, WelcomeHub, SamplePage) to use new components

---


*Created: 2025-12-22*
*Applies to: All themes (base layout)*
