# Page Layout Patterns

This document defines the consistent page layout patterns used across all pages and themes.

---

## Related Documentation

- **[Action Bar Patterns](./action_bar_patterns.md)** - Detailed component specifications for action bars
- **[Theme Engine](./theme_engine.md)** - Theme configuration and presets

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ APP HEADER (sticky)                                             │
│ Desktop: [Brand] [Navigation]     [Notifications] [User]        │
│ Mobile:  [☰] [Page Title]         [🔍] [🔔] [⚙️] [👤]           │
├─────────────────────────────────────────────────────────────────┤
│ PAGE HEADER (.page-header)                                      │
│   Contains: Action Bar                                          │
│   Desktop: [Title/Tabs] [Filters]      [Actions] [Views] [More] │
│   Mobile:  [Tabs ▼]                    [+] [View] [⋯]           │
├─────────────────────────────────────────────────────────────────┤
│ MAIN CONTENT (.main-content)                                    │
│   Contains: .content-body (with padding)                        │
│   Tables, Cards, Forms, etc.                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## CSS Classes

### Container Classes

| Class | Description |
|-------|-------------|
| `.page-content` | Wrapper with side margins (24px mobile, 32px desktop) |
| `.page-header` | Container for action bar |
| `.main-content` | White card container for page content |
| `.content-body` | Inner padding wrapper (20px) |

### Action Bar Classes

| Class | Description |
|-------|-------------|
| `.action-bar` | Flex container: left ↔ right layout |
| `.action-bar-left` | Left section container |
| `.action-bar-right` | Right section container |
| `.action-bar-title` | Title wrapper |
| `.action-bar-tabs-desktop` | Desktop tabs (radio buttons) |
| `.action-bar-tabs-mobile` | Mobile tabs (dropdown) |
| `.action-bar-filters` | Filter controls container |
| `.action-bar-view-desktop` | Desktop view toggle (radio group) |
| `.action-bar-view-mobile` | Mobile view toggle (cycle button) |
| `.action-bar-more` | More menu button |

---

## Responsive Margins

| Breakpoint | Side Padding |
|------------|--------------|
| Mobile (<768px) | 24px |
| Tablet/Desktop (≥768px) | 32px |

Content width is always 100% with fixed side margins (no max-width constraint).

---

## Desktop vs Mobile Behavior

### Header
| Element | Desktop | Mobile |
|---------|---------|--------|
| Page Title | In action bar | In header (next to ☰) |
| Search Icon | N/A | Opens filter drawer |
| Navigation | In header | In drawer (via ☰) |

### Action Bar
| Element | Desktop | Mobile |
|---------|---------|--------|
| Title | Left side | Moved to header |
| Tabs | Inline buttons | Dropdown |
| Filters | Up to 2 inline + [⋯] | All in drawer |
| Primary Action | Icon + text button | Icon-only button |
| View Toggle | All views visible | Current view only (cycles on click) |
| More Menu | Always visible | Always visible |

### View Toggle Rules
- **1 view available**: Hide completely (both desktop and mobile)
- **>1 views available**: Show toggle control

---

## Usage with ActionBar Components

### Import Components
```tsx
import {
  PageActionBar,
  ActionBarLeft,
  ActionBarRight,
  PageTitle,
  TabsComponent,
  InlineFilters,
  PrimaryAction,
  ViewToggle,
  MoreMenu,
} from '@/core/components/ActionBar';
```

### Simple Page (Title + Action)
```tsx
<>
  <PageActionBar>
    <ActionBarLeft>
      <PageTitle title="Accounts" />
    </ActionBarLeft>
    <ActionBarRight>
      <PrimaryAction label="Add" onClick={handleAdd} />
      <MoreMenu items={menuItems} />
    </ActionBarRight>
  </PageActionBar>
  
  <div className="main-content">
    <div className="content-body">
      {/* Content */}
    </div>
  </div>
</>
```

### List Page with Tabs and Filters
```tsx
<>
  <PageActionBar>
    <ActionBarLeft>
      <TabsComponent
        tabs={tabs}
        activeTab={currentTab}
        onChange={setCurrentTab}
      />
      <InlineFilters
        filters={filterConfig}
        values={filterValues}
        onChange={setFilterValues}
        maxVisible={2}
      />
    </ActionBarLeft>
    <ActionBarRight>
      <PrimaryAction label="Add" onClick={handleAdd} />
      <ViewToggle
        views={viewOptions}
        activeView={currentView}
        onChange={setCurrentView}
      />
      <MoreMenu items={menuItems} />
    </ActionBarRight>
  </PageActionBar>
  
  <div className="main-content">
    <div className="content-body">
      {/* Table/Grid content */}
    </div>
  </div>
</>
```

---

## Theme-Specific Overrides

The base layout CSS applies to all themes. Theme presets can override:

| Theme | Background | Card Style |
|-------|------------|------------|
| Default (no preset) | White | White with subtle border |
| `gradient_card` | Gradient (brand → white) | Solid white, rounded top |
| `glassmorphism` | Blur effect | Transparent with blur |
| `corporate` | Dark sidebar | Sharp corners |

---

## File Structure

```
src/core/components/
├── ActionBar/              # Action bar components
│   ├── index.tsx           # Main exports
│   ├── types.ts            # TypeScript interfaces
│   ├── PageActionBar.tsx   # Container
│   ├── PageTitle.tsx       # Title component
│   ├── TabsComponent.tsx   # Responsive tabs
│   ├── InlineFilters.tsx   # Desktop inline filters
│   ├── PrimaryAction.tsx   # Primary button
│   ├── ViewToggle.tsx      # View selector
│   └── MoreMenu.tsx        # Overflow menu
├── Layout/                 # Layout components
│   ├── AuthedLayout.tsx    # Main authenticated layout
│   ├── Header/             # App header
│   ├── Sider/              # Sidebar navigation
│   └── WelcomeHub/         # Welcome page
└── DynamicViews/           # Dynamic list views
```

---

*Last Updated: 2025-12-22*
