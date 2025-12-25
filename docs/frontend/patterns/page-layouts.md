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
| **Wrap, don't restructure** | When migrating, only wrap existing content; keep internal layout intact |

> [!CAUTION]
> **Styling system is frozen.** Do not modify `index.css` or add inline styles when auditing pages.

### Animation Architecture

| Element | Gets Neon Effects | Reason |
|---------|-------------------|--------|
| `.page-card` | ✅ Yes | Layout container |
| `.main-content` | ✅ Yes | Legacy layout container |
| `.ant-card` | ❌ No | Content card (plain styling) |

**Rule:** Animation on containers, not content. Individual grid/table cards should never animate.

### Card Hierarchy

| Card Type | CSS Class | Use For | Style |
|-----------|-----------|---------|-------|
| **Hero Card** | `.page-card` | Welcome, Onboarding | Neon effects, entrance animation, decorative |
| **Content Card** | `.ant-card` inside `.page-card` | Widgets, Grid items, Data cards | Plain white, subtle border, no animation |

**Design Rules:**

1. **Hero Card** (`.page-card`) = Special moment pages (Welcome, Onboarding)
   - Full-width, theme animations, premium feel
   
2. **Content Card** (`.ant-card`) = Operational surfaces
   - Dashboard widgets, Grid view items, Entity cards
   - All look the same: white bg, subtle border, clean typography
   - NO animation, NO neon effects

---

## Layout Patterns

All patterns use the same alignment: content aligns to `.page-content` padding edges (`--layout-padding`).

### 1. Dashboard Layout (Widget Grid)

Full-width grid of widgets with no internal padding.

```tsx
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  <div className="page-card page-card-flush">
    <DashboardCanvas widgets={...} />
  </div>
</div>
```

**Use for:** Dashboard, Analytics, Widget grids

---

### 2. Hero Layout (Two-Column)

Marketing-style landing with left content + right feature card.

```tsx
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  <div className="page-card">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div>Left content...</div>
      <div>Right feature card...</div>
    </div>
  </div>
</div>
```

**Use for:** Welcome page, Onboarding, Landing pages

---

### 3. Table Layout (Data View)

Single card with table/list data.

```tsx
<div className="page-content layout-record">
  <PageActionBar>...</PageActionBar>
  <div className="page-card page-card-flush">
    <Table dataSource={...} columns={...} />
  </div>
</div>
```

**Use for:** CRM Contacts, Users list, Any table view

---

### 4. Card Grid Layout (Kanban/Grid View)

Grid of individual item cards.

```tsx
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  <div className="page-card page-card-flush">
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => <ItemCard key={item.id} />)}
    </div>
  </div>
</div>
```

**Use for:** Service Assets, Kanban boards, Grid views

---

### 5. Multi-Card Layout (Stacked Sections)

Multiple section cards stacked vertically.

```tsx
<div className="page-content layout-canvas">
  <PageActionBar>...</PageActionBar>
  <div className="page-card">Section 1...</div>
  <div className="page-card">Section 2...</div>
</div>
```

**Use for:** Sample page, Settings, Profile pages

---

## CSS Classes Reference

| Class | Purpose | Animation |
|-------|---------|-----------|
| `.page-content` | Outer wrapper with side margins | No |
| `.layout-canvas` | Multi-card layout mode | No |
| `.layout-record` | Single-card layout mode | No |
| `.page-card` | **Animated container** with bg, padding, border-radius | **Yes** |
| `.page-card-flush` | Page-card variant with no internal padding (for dashboards/grids) | **Yes** |
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
