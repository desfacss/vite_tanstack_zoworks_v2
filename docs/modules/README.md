# Module Documentation

This folder contains documentation for each module in the restructured architecture.

## Module List

| Module | Status | Description |
|--------|--------|-------------|
| [core](./core.md) | 🟢 Active | Always-loaded core functionality |
| [crm](./crm.md) | 🟢 Active | CRM entities (Leads, Contacts, Accounts) |
| [tickets](./tickets.md) | 🟢 Active | Support tickets and tasks |
| [workforce](./workforce.md) | 🟢 Active | Timesheet, Expenses, Leaves |
| [fsm](./fsm.md) | 🟢 Active | Field Service Management |
| [contracts](./contracts.md) | 🟢 Active | Contracts and SLAs |
| [admin](./admin.md) | 🟢 Active | Admin settings |
| [wa](./wa.md) | 🟡 Placeholder | WhatsApp Engage |
| [catalog](./catalog.md) | 🟡 Placeholder | Product catalog |
| [erp](./erp.md) | 🟡 Placeholder | Enterprise Resource Planning |
| [esm](./esm.md) | 🟡 Placeholder | Enterprise Service Management |
| [wms](./wms.md) | 🟡 Placeholder | Warehouse Management |
| [pos](./pos.md) | 🟡 Placeholder | Point of Sale |
| [landing](./landing.md) | 🟡 Placeholder | Landing pages |

## Module Template

Each module should follow this documentation structure:

```markdown
# {Module Name} Module

**Status:** 🟢 Active | 🟡 Placeholder | 🔴 Deprecated
**Module ID:** `{module-id}`
**Version:** 1.0

## Overview
Brief description of what this module provides.

## Features
- Feature 1
- Feature 2

## Dependencies
- List of required modules

## Components
List of components in this module.

## Pages
List of pages/routes.

## Registry Items
### Actions
### Tabs
### Navigation Items

## Configuration
Module-specific configuration options.

## Migration Notes
Notes about migration from old structure.
```

## Status Legend

- 🟢 **Active** - Fully implemented and migrated
- 🟡 **Placeholder** - Directory structure created, not implemented
- 🔴 **Deprecated** - Being phased out
- 🔵 **In Migration** - Currently being migrated

