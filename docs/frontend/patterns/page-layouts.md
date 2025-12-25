# Page Layout Patterns

> Layout components, content modes, and card structure for authenticated pages.

---

## Content Layout Modes

Every page inside `.page-content` MUST use one of these two layout modes:

### Canvas Layout (Multi-Card)

For content pages with multiple sections: settings, dashboards, content pages.

```
┌─────────────────────────────────────────────────────────────────┐
│ .page-content.layout-canvas                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ .page-card (animated) — "Current Session Context"           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ .page-card (animated) — "Development Notes"                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Usage:**
```tsx
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  
  <div className="page-card">
    <h2>Section Title</h2>
    <p>Content here...</p>
  </div>
  
  <div className="page-card">
    <h2>Another Section</h2>
    <p>More content...</p>
  </div>
</div>
```

---

### Record Layout (Single-Card)

For data-centric pages: tables, lists, grids. One card spans full width.

```
┌─────────────────────────────────────────────────────────────────┐
│ .page-content.layout-record                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ .page-card (animated) — Table/Grid                          │ │
│ │   ┌───────────────────────────────────────────────────────┐ │ │
│ │   │ Table rows (plain — no animation)                     │ │ │
│ │   └───────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Usage:**
```tsx
<div className="page-content layout-record">
  <PageActionBar>...</PageActionBar>
  
  <div className="page-card">
    <Table dataSource={data} columns={columns} />
  </div>
</div>
```

---

## Core Rules

| Rule | Description |
|------|-------------|
| **Every page needs a `.page-card`** | Animated container inside `.page-content` |
| **`.page-card` owns the animation** | Entrance animation, themed bg, border-radius, padding |
| **NEVER nest `.page-card`** | No `.page-card` inside another `.page-card` |
| **`.ant-card` inside `.page-card` is plain** | Inner cards have no animation effects |
| **Action Bar sits above cards** | Part of `.page-content`, not inside `.page-card` |

---

## CSS Classes Reference

| Class | Purpose | Animation |
|-------|---------|-----------|
| `.page-content` | Outer wrapper with side margins | No |
| `.layout-canvas` | Multi-card layout mode | No |
| `.layout-record` | Single-card layout mode | No |
| `.page-card` | **Animated container** with bg, padding, border-radius | **Yes** |
| `.main-content` | Legacy base class (backward compat) | No |
| `.content-body` | Inner padding wrapper | No |

---

## Page Card Styling (index.css)

```css
.page-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--tenant-border-radius, 12px);
  padding: var(--layout-padding);
  margin-bottom: var(--tenant-gutter, 16px);
  position: relative;
  overflow: hidden;
  
  /* Entrance animation */
  animation: pageCardEntry 0.4s ease-out forwards;
}

/* Staggered animation for multiple cards */
.page-card:nth-child(1) { animation-delay: 0s; }
.page-card:nth-child(2) { animation-delay: 0.08s; }
.page-card:nth-child(3) { animation-delay: 0.16s; }

/* Prevent nested .ant-card from having animations */
.page-card .ant-card {
  animation: none !important;
}
```

---

## Theme Integration

### Base Theme
- `.page-card` uses CSS variables for colors
- Works in both light and dark modes

### Neon Theme
```css
[data-theme-preset="neon"].dark .page-card {
  /* Thunderbolt animation, neon glow effects */
}

/* Nested .ant-card inside .page-card - NO neon effects */
[data-theme-preset="neon"].dark .page-card .ant-card {
  animation: none !important;
  /* Subtle styling without thunderbolt */
}
```

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
│ │ [Nav]    │ │   .page-content (.layout-canvas | .layout-record)│
│ │          │ │   ├── PageActionBar                             ││
│ │          │ │   └── .page-card (animated)                     ││
│ │          │ │                                                 ││
│ └──────────┘ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Usage Examples

### Canvas Layout (Settings Page)

```tsx
const SettingsPage = () => (
  <div className="page-content layout-canvas">
    <PageActionBar>
      <ActionBarLeft>
        <PageTitle title="Settings" />
      </ActionBarLeft>
    </PageActionBar>
    
    <div className="page-card">
      <h2>Profile Settings</h2>
      <Form>...</Form>
    </div>
    
    <div className="page-card">
      <h2>Notification Preferences</h2>
      <Form>...</Form>
    </div>
  </div>
);
```

### Record Layout (List Page)

```tsx
const TicketsPage = () => (
  <div className="page-content layout-record">
    <PageActionBar>
      <ActionBarLeft>
        <TabsComponent tabs={tabs} activeTab={tab} onChange={setTab} />
      </ActionBarLeft>
      <ActionBarRight>
        <PrimaryAction label="New" onClick={handleNew} />
        <ViewToggle views={views} activeView={view} onChange={setView} />
      </ActionBarRight>
    </PageActionBar>
    
    <div className="page-card">
      <DynamicViews entityType="tickets" />
    </div>
  </div>
);
```

### Using .ant-card Inside .page-card

```tsx
<div className="page-card">
  <h2>Dashboard Widgets</h2>
  <Row gutter={16}>
    <Col span={8}>
      <Card>Widget 1 (plain, no animation)</Card>
    </Col>
    <Col span={8}>
      <Card>Widget 2 (plain, no animation)</Card>
    </Col>
  </Row>
</div>
```

---

## File Structure

```
src/core/components/Layout/
├── AuthedLayout.tsx            # Main layout wrapper
├── AuthedLayoutContext.tsx     # Context for page config
├── Header/index.tsx            # Sticky header
├── Sider/index.tsx             # Fixed sidebar
├── MobileMenu/index.tsx        # Mobile drawer menu
└── ...
```

---

## Implementation Checklist

- [x] Fixed sider (desktop only)
- [x] Sticky header
- [x] Organization & location switching
- [x] Mobile menu drawer
- [x] Framer Motion page transitions
- [x] `.page-card` with entrance animation
- [x] Staggered animation for multiple cards
- [x] Neon theme targets `.page-card` only
- [x] Nested `.ant-card` effects disabled

---

*Last Updated: 2025-12-25*
*Source: `src/index.css`, `src/core/components/Layout/`*
