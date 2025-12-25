# Layout Reference

> Visual reference for all layout boxes and their CSS classes.

---

## Full Application Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              .ant-layout (Root)                              │
├───────────────────┬─────────────────────────────────────────────────────────┤
│                   │                    .ant-layout (Main)                    │
│                   ├─────────────────────────────────────────────────────────┤
│                   │                     HEADER ZONE                          │
│   SIDER ZONE      │   ┌─────────────────────────────────────────────────┐   │
│                   │   │              .top-header                         │   │
│ ┌───────────────┐ │   │  [Brand] [Search] [Notifications] [User Avatar] │   │
│ │ .ant-layout-  │ │   └─────────────────────────────────────────────────┘   │
│ │    sider      │ │                                                         │
│ │               │ ├─────────────────────────────────────────────────────────┤
│ │ ┌───────────┐ │ │                     CONTENT ZONE                        │
│ │ │ Logo      │ │ │                                                         │
│ │ └───────────┘ │ │   ┌─────────────────────────────────────────────────┐   │
│ │               │ │   │              .page-content                       │   │
│ │ ┌───────────┐ │ │   │  ← LAYOUT PADDING →│← CONTENT AREA →│← PADDING →│   │
│ │ │ Menu      │ │ │   │                                                  │   │
│ │ │ Items     │ │ │   │   ┌───────────────────────────────────────────┐ │   │
│ │ │           │ │ │   │   │          PAGE ACTION BAR                  │ │   │
│ │ │           │ │ │   │   │  [Title/Tabs]              [Actions]      │ │   │
│ │ │           │ │ │   │   └───────────────────────────────────────────┘ │   │
│ │ │           │ │ │   │                                                  │   │
│ │ │           │ │ │   │   ┌───────────────────────────────────────────┐ │   │
│ │ │           │ │ │   │   │              .page-card                   │ │   │
│ │ │           │ │ │   │   │  (Animated container with theme effects) │ │   │
│ │ │           │ │ │   │   │                                           │ │   │
│ │ │           │ │ │   │   │   [ Your Page Content Here ]              │ │   │
│ │ │           │ │ │   │   │                                           │ │   │
│ │ └───────────┘ │ │   │   └───────────────────────────────────────────┘ │   │
│ │               │ │   │                                                  │   │
│ └───────────────┘ │   └─────────────────────────────────────────────────┘   │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## Named Regions

| # | Name | CSS Class | Description |
|---|------|-----------|-------------|
| 1 | **Sider** | `.ant-layout-sider` | Left navigation sidebar |
| 2 | **Header** | `.top-header` | Top bar with brand, search, user |
| 3 | **Content Zone** | `.ant-layout-content` | Main scrollable area |
| 4 | **Page Content** | `.page-content` | Wrapper with side padding (layout margins) |
| 5 | **Action Bar** | `.page-action-bar` | Header row with title and actions |
| 6 | **Page Card** | `.page-card` | Animated content container |

---

## Layout Padding

The **Layout Padding** is the horizontal margin between the sider and content edges:

```
.page-content {
  padding: 0 var(--layout-padding);  /* Sets the side margins */
}
```

This creates the **alignment zone** — all content (Action Bar, Page Card) aligns to these edges.

---

## Page Card Alignment

```
┌─────────────────────────────────────────────────────────────────┐
│  .page-content                                                   │
│  ├── padding-left: var(--layout-padding)                        │
│  └── padding-right: var(--layout-padding)                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  .page-action-bar (aligns to layout padding edges)          ││
│  │  [Title]                                    [Actions]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  .page-card (aligns to same edges)                          ││
│  │                                                              ││
│  │    Content fills edge-to-edge (with .page-card-flush)        ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## CSS Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `--layout-padding` | `24px` | Side padding for `.page-content` |
| `--tenant-gutter` | `16px` | Gap between `.page-card` elements |
| `--tenant-border-radius` | `12px` | Border radius for cards |

---

## Card Variants

| Class | Padding | Use Case |
|-------|---------|----------|
| `.page-card` | `var(--layout-padding)` | Standard content with internal padding |
| `.page-card-flush` | `0` | Dashboard/grid layouts with edge-to-edge content |

---

## Screenshot Reference

![Layout Reference](/Users/macbookpro/.gemini/antigravity/brain/f92daf6e-9e4c-463d-96cd-f5260b6e1090/uploaded_image_1766650089227.png)

**Legend:**
- **Orange line (left)**: Sider inner edge
- **Green line (right)**: Content outer edge  
- **Content Area**: Everything between these lines should align
