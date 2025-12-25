# Page Layout Patterns

> Layout components and structure for authenticated pages.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AuthedLayout                                │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌─────────────────────────────────────────────────┐│
│ │  SIDER   │ │                    HEADER                       ││
│ │ (fixed)  │ │ [☰] [Title]        [Org] [Loc] [🔔] [⚙️] [👤]   ││
│ │          │ ├─────────────────────────────────────────────────┤│
│ │ [Brand]  │ │                    CONTENT                      ││
│ │          │ │                                                 ││
│ │ [Nav]    │ │   .page-content                                 ││
│ │          │ │   ├── PageActionBar                             ││
│ │          │ │   └── .main-content                             ││
│ │          │ │                                                 ││
│ └──────────┘ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/core/components/Layout/
├── AuthedLayout.tsx            # Main layout wrapper
├── AuthedLayoutContext.tsx     # Context for page config
├── AuthGuard.tsx               # Route protection
├── GlobalSessionWatcher.tsx    # Session management
├── PublicLayout.tsx            # Unauthenticated layout
│
├── Header/
│   └── index.tsx               # Sticky header with org/location
├── Sider/
│   ├── index.tsx               # Fixed sidebar
│   └── navigation.tsx          # Menu generation
├── MobileMenu/
│   └── index.tsx               # Mobile drawer menu
├── NotificationsDrawer/
│   └── index.tsx               # Notifications panel
├── ProfileMenu/
│   └── index.tsx               # User avatar dropdown
├── Settings/
│   └── index.tsx               # Global settings drawer
└── WelcomeHub/
    └── index.tsx               # Landing welcome page
```

---

## Key Layout Constants

```typescript
// src/core/components/Layout/AuthedLayout.tsx
const SIDER_WIDTH = 240;           // Expanded sidebar
const COLLAPSED_SIDER_WIDTH = 80;  // Collapsed sidebar

// CSS Variables (index.css)
--header-height: 56px;
--sidebar-width-expanded: 256px;
--layout-padding: 24px;
--layout-padding-mobile: 16px;
```

---

## Sider (Fixed Sidebar)

**Desktop only** — Hidden on mobile.

```tsx
<Sider
  collapsed={collapsed}
  navigationItems={navigationItems}
/>
```

**Key Features:**
- **Position**: Fixed left, full viewport height
- **Collapsed State**: Brand logo → Brand icon
- **openKeys Management**: Clear on collapse for native hover popups
- **Ctrl+Click**: Opens route in new tab

```tsx
// Handles Ctrl+Click for new tab
const handleMenuClick = ({ key, domEvent }) => {
  if (key.startsWith('/')) {
    if (domEvent.ctrlKey || domEvent.metaKey) {
      window.open(key, '_blank');
    } else {
      navigate(key);
    }
  }
};
```

---

## Header (Sticky)

**Full width**, adjusts content margin based on sider state.

```tsx
<Header
  collapsed={collapsed}
  setCollapsed={setCollapsed}
  isMobile={isMobile}
  unreadCount={unreadCount}
  setShowNotifications={setShowNotifications}
  setShowMobileMenu={setShowMobileMenu}
  showSearch={showSearch}
  setShowSearch={setShowSearch}
  pageTitle={getPageTitle()}
/>
```

### Desktop vs Mobile Layout

| Element | Desktop | Mobile |
|---------|---------|--------|
| Left | Hamburger (toggle sider) | Hamburger (open drawer) + Page Title |
| Center | — | Location selector (if multiple) |
| Right | Org selector, Location, Notifications, Settings, Profile | Notifications, Settings, Profile |

### Organization Switching

```typescript
const handleOrganizationChange = async (orgId: string) => {
  setIsSwitchingOrg(true);
  message.loading('Switching...');
  
  setOrganization({ id, name });
  navigate('/dashboard');
  
  // Persist preference
  await supabase.schema('identity').rpc('set_preferred_organization', { new_org_id: orgId });
  await supabase.auth.updateUser({ data: { org_id: orgId } });
  
  await queryClient.invalidateQueries({ queryKey: ['user-session'] });
};
```

---

## AuthedLayoutContext

Context for pages to inject content into header:

```typescript
interface AuthedLayoutConfig {
  searchFilters?: ReactNode;  // Shown in mobile search drawer
  actionButtons?: {           // Extra header actions
    icon: ReactNode;
    tooltip: string;
    onClick: () => void;
  }[];
}

// Usage in page
const { setConfig, setShowSettings } = useAuthedLayoutConfig();

useEffect(() => {
  setConfig({ searchFilters: <MyFilters /> });
}, []);
```

---

## Content Area

### Structure

```tsx
<Content style={{ flex: 1, overflowY: 'auto' }}>
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="page-content"
  >
    <Suspense fallback={<LoadingFallback />}>
      <Outlet />
    </Suspense>
  </motion.div>
</Content>
```

### Page Content Classes

| Class | Purpose |
|-------|---------|
| `.page-content` | Wrapper with side margins |
| `.page-header` | Action bar container |
| `.main-content` | White card for content |
| `.content-body` | Inner padding (20px) |

---

## Mobile Components

### MobileMenu (Drawer)

```tsx
<MobileMenu
  open={showMobileMenu}
  onClose={() => setShowMobileMenu(false)}
  navigationItems={navigationItems}
/>
```

### Search Drawer

Injected via context on mobile:

```tsx
{config.searchFilters && (
  <Drawer
    title="Search"
    placement="right"
    open={showSearch}
    onClose={() => setShowSearch(false)}
  >
    {config.searchFilters}
  </Drawer>
)}
```

---

## Responsive Behavior

| Breakpoint | Sider | Content Margin |
|------------|-------|----------------|
| Mobile (<768px) | Hidden (drawer menu) | 0 |
| Desktop (≥768px) | Fixed left | 240px / 80px |

```typescript
const contentMarginLeft = useMemo(() => {
  if (isMobile) return 0;
  return collapsed ? COLLAPSED_SIDER_WIDTH : SIDER_WIDTH;
}, [collapsed, isMobile]);
```

---

## Page Layout Modes

### Layout Record (Table View)

```tsx
<div className="main-content layout-record">
  {/* Full-width table */}
</div>
```

### Layout Canvas (Cards, Forms)

```tsx
<div className="main-content layout-canvas">
  {/* Grid of cards or form */}
</div>
```

---

## Usage Example

### Standard List Page

```tsx
import { PageActionBar, ActionBarLeft, ActionBarRight } from '@/core/components/ActionBar';

const TicketsPage = () => (
  <>
    <PageActionBar>
      <ActionBarLeft>
        <TabsComponent tabs={tabs} activeTab={tab} onChange={setTab} />
      </ActionBarLeft>
      <ActionBarRight>
        <PrimaryAction label="New" onClick={handleNew} />
        <ViewToggle views={views} activeView={view} onChange={setView} />
      </ActionBarRight>
    </PageActionBar>
    
    <div className="main-content">
      <div className="content-body">
        <DynamicViews entityType="tickets" />
      </div>
    </div>
  </>
);
```

---

## Theme-Specific Overrides

| Theme | Sider Style | Header Style |
|-------|-------------|--------------|
| `base` | White, border | White, border-bottom |
| `glassmorphism` | Frosted glass | Frosted glass |
| `corporate` | Dark sidebar | Branded header |
| `gradient_card` | White | Hero gradient |
| `neon` | Black | Black with glow |

---

## Implementation Checklist

- [x] Fixed sider (desktop only)
- [x] Sticky header
- [x] Organization & location switching
- [x] Mobile menu drawer
- [x] Mobile search drawer (via context)
- [x] Framer Motion page transitions
- [x] Suspense + LoadingFallback
- [x] GlobalLoader for org switching
- [x] Ctrl+Click for new tab navigation

---

*Last Updated: 2025-12-25*
*Source: `src/core/components/Layout/`*
