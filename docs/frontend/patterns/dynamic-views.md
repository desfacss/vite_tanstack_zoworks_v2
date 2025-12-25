# DynamicViews Pattern

> Config-driven views for entities — the core of the meta-driven UI.

---

## Philosophy

> **90% of views work via DynamicViews + config.**
> 
> Modules only contain custom components for complex UIs.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
│  identity.org_module_configs → view configs per tenant/entity   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DYNAMICVIEWS                                │
│  - Fetches config for entityType                                 │
│  - Renders appropriate view (Table, Grid, Kanban, etc.)          │
│  - Handles CRUD via DynamicQuery/DynamicSave                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      REGISTRY                                    │
│  - Injects registered tabs, actions from modules                 │
│  - Lazy-loads custom components                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Basic Usage

```tsx
import DynamicViews from '@/core/components/DynamicViews';

const TicketsPage = () => (
  <DynamicViews
    entityType="tickets"
    entitySchema="blueprint"
  />
);
```

With tab filtering:
```tsx
const { user } = useAuthStore();

const tabOptions = [
  { 
    key: '1', 
    label: 'My Tickets', 
    condition: { field: 'assignee_id', value: user?.id, filter_type: 'eq' } 
  },
  { key: '2', label: 'All Tickets' },
];

<DynamicViews
  entityType="tickets"
  entitySchema="blueprint"
  tabOptions={tabOptions}
/>
```

---

## View Types

| View | Component | When to Use |
|------|-----------|-------------|
| `table` | `TableView.tsx` | Default list view |
| `grid` | `GridView.tsx` | Card-based list |
| `kanban` | `KanbanView.tsx` | Status-based board |
| `calendar` | `CalendarView.tsx` | Date-based view |
| `map` | `MapViewComponent.tsx` | Location-based |
| `details` | `DetailsView.tsx` | Single record |

---

## Column Configuration

Columns are fetched from `identity.entity_configs`:

```json
{
  "entity_type": "tickets",
  "columns": [
    {
      "key": "title",
      "label": "Title",
      "type": "text",
      "sortable": true,
      "searchable": true
    },
    {
      "key": "status",
      "label": "Status",
      "type": "enum",
      "enum_key": "ticket_status",
      "filterable": true
    },
    {
      "key": "assignee_id",
      "label": "Assignee",
      "type": "relation",
      "relation_entity": "users"
    }
  ]
}
```

---

## Row Actions

Actions registered via registry:
```typescript
registry.registerAction({
  id: 'edit-ticket',
  entityTypes: ['tickets'],
  position: 'row',
  label: 'Edit',
  icon: () => <Pencil size={14} />,
  component: () => import('./TicketForm'),
});
```

DynamicViews renders these in `RowActions` component.

---

## Global Actions

Primary actions for the page:
```typescript
registry.registerAction({
  id: 'create-ticket',
  entityTypes: ['tickets'],
  position: 'global',
  label: 'Create Ticket',
  icon: () => <Plus size={14} />,
  component: () => import('./TicketForm'),
});
```

---

## Detail Tabs

Tabs in record detail view:
```typescript
registry.registerTab({
  id: 'ticket-logs',
  entityTypes: ['tickets'],
  label: 'Activity',
  component: () => import('./components/ActivityLog'),
  order: 10,
});
```

---

## Custom Detail Components

For specialized record views:
```typescript
registry.registerDetailComponent({
  id: 'expense-sheet',
  entityTypes: ['expense_sheets'],
  component: () => import('./components/ExpenseSheet'),
});
```

---

## When NOT to Use DynamicViews

| Scenario | Approach |
|----------|----------|
| Complex multi-step form | Custom page component |
| Specialized visualization | Custom component |
| External integrations | Custom component |
| Non-CRUD workflow | Custom page |

---

## File Locations

| Component | Path |
|-----------|------|
| Main orchestrator | `src/core/components/DynamicViews/index.tsx` |
| Table view | `src/core/components/DynamicViews/TableView.tsx` |
| Grid view | `src/core/components/DynamicViews/GridView.tsx` |
| Kanban view | `src/core/components/DynamicViews/KanbanView.tsx` |
| Calendar view | `src/core/components/DynamicViews/CalendarView.tsx` |
| Map view | `src/core/components/DynamicViews/MapViewComponent.tsx` |
| Details view | `src/core/components/DynamicViews/DetailsView.tsx` |
| Row actions | `src/core/components/DynamicViews/RowActions.tsx` |
| Global actions | `src/core/components/DynamicViews/GlobalActions.tsx` |

---

*Last Updated: 2025-12-25*
