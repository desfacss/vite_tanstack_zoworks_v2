# Frontend Architecture

> Documentation for the ZoWorks frontend layer including Web and Mobile.

---

## Quick Links

| Topic | Document |
|-------|----------|
| **System Architecture** | [docs/architecture/](../architecture/README.md) |
| **Bundle Optimization** | [docs/architecture/bundle-optimization.md](../architecture/bundle-optimization.md) |
| **Multi-Tenant** | [docs/architecture/multi-tenant.md](../architecture/multi-tenant.md) |

---

## Web Application

| Document | Description |
|----------|-------------|
| [Web Overview](./web/README.md) | Project structure, tech stack |
| [Module System](./web/modules.md) | Domain modules + merge guide |
| [Core Layer](./web/core.md) | Shared infrastructure |

---

## UI Patterns

| Document | Description |
|----------|-------------|
| [DynamicViews](./patterns/dynamic-views.md) | Config-driven views |
| [Theme Engine](./patterns/theme-engine.md) | Multi-tenant theming |
| [Action Bar](./patterns/action-bar.md) | Page-level action patterns |
| [Page Layouts](./patterns/page-layouts.md) | Layout conventions |
| [i18n Strategy](./patterns/i18n.md) | Internationalization |
| [Entity Images](./patterns/entity-images.md) | Image handling |

---

## Mobile

| Document | Description |
|----------|-------------|
| [Mobile Overview](./mobile/README.md) | React Native integration |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Build | Vite 5 |
| Framework | React 18 |
| UI | Ant Design 5 |
| Styling | Tailwind CSS + CSS Variables |
| State | Zustand + React Query |
| Routing | React Router v6 |

---

*Last Updated: 2025-12-25*
