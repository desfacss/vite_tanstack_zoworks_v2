# 📚 ZoWorks Multi-Tenant SaaS Platform - Documentation Hub

> **AI Agent Start Here** - This is the master navigation document for understanding and working on the ZoWorks platform.

---

## 🚀 Quick Start for AI Agents

### Understanding the Project
1. **Start Here** → Read [Project Overview](./architecture/overview.md)
2. **Architecture** → Review [Core Architecture](./architecture/core-architecture.md)  
3. **Current State** → Check [Progress Status](./logs/PROGRESS.md)

### Before Making Changes
- Check `docs/logs/` for recent work sessions
- Review `docs/guides/` for context on how things work
- Run `yarn build` to verify the codebase compiles

---

## 📁 Documentation Structure

```
docs/
├── README.md                    # 🎯 YOU ARE HERE - Start here!
├── guides/                      # 📖 How-to guides for common tasks
│   ├── deployment.md            # Deploying to Vercel
│   ├── adding-new-org.md        # Onboarding a new organization
│   ├── adding-new-module.md     # Creating a new feature module
│   └── troubleshooting.md       # Common issues and fixes
├── architecture/                # 🏗️ System design & architecture
│   ├── overview.md              # High-level system overview
│   ├── core-architecture.md     # Core module design
│   ├── multi-tenant.md          # Multi-tenancy implementation
│   └── auth-flow.md             # Authentication architecture
├── backend/                     # 🗄️ Backend/Supabase documentation
│   └── dynamic_forms/           # Form generation system
├── reference/                   # 📋 Technical reference docs
│   ├── rpc-functions.md         # Supabase RPC function catalog
│   ├── schemas.md               # Database schema reference
│   └── env-variables.md         # Environment configuration
├── logs/                        # 📝 Work session logs
│   ├── PROGRESS.md              # Current progress summary
│   └── 2025-12/                 # Logs by month
│       └── 2025-12-21.md        # Daily logs
└── modules/                     # 📦 Module-specific docs
```

---

## 🎯 Key Concepts

### Multi-Tenant Architecture
- **Subdomain-based routing**: `{tenant}.zoworks.com`
- **Single Supabase backend** with RLS for data isolation
- **Lazy-loaded modules** based on tenant configuration

### Core Design Principles

| Principle | Description | Enforcement |
|-----------|-------------|-------------|
| **Core Must Be Self-Contained** | No imports from domain modules allowed in `src/core/` | ESLint `no-restricted-imports` |
| **Plugin Architecture** | Modules register via registries (actions, tabs, view types) | Registry pattern |
| **Tenant-Aware Everything** | All data/config is tenant-scoped via subdomain | Tenant Resolver |
| **Lazy Loading** | Only load what the tenant needs (modules, i18n) | Dynamic imports |
| **Registry Pattern** | Components discover capabilities at runtime | Central registry |
| **Hooks at Top** | All React hooks must be declared before any early returns | ESLint `rules-of-hooks` |

### Key Files to Know
| File | Purpose |
|------|---------|
| `src/core/bootstrap/TenantResolver.ts` | Resolves current tenant from subdomain |
| `src/core/bootstrap/ModuleLoader.ts` | Loads modules based on tenant config |
| `src/core/registry/index.ts` | Central registry for actions/tabs |
| `src/App.tsx` | Application entry with providers |
| `.env` / `.env.production.example` | Environment configuration |

---

## 📋 Important Guides

| Guide | When to Use |
|-------|-------------|
| [Deployment Guide](./guides/deployment.md) | Deploying to production |
| [Adding New Organization](./guides/adding-new-org.md) | Onboarding a new tenant |
| [Adding New Module](./guides/adding-new-module.md) | Creating new features |
| [Auth Flow](./architecture/auth-flow.md) | Understanding authentication |
| [Troubleshooting](./guides/troubleshooting.md) | Fixing common issues |

---

## 🗄️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI** | Ant Design 5, Tailwind CSS |
| **State** | Zustand (persisted), React Query |
| **Routing** | React Router v6 |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **Deployment** | Vercel (with wildcard subdomains) |

---

## 📊 Current Status

**Last Updated**: 2025-12-21 (Evening)

| Area | Status | Notes |
|------|--------|-------|
| Core Architecture | ✅ Complete | Registry-based, zero module imports |
| Multi-Tenant Auth | ✅ Complete | Subdomain-based routing |
| Module System | ✅ Complete | 14 modules with manifest/i18n/help |
| Core Independence | ✅ Complete | DetailOverview, DetailsView decoupled |
| Bundle Analysis | ✅ Complete | ~350KB gzipped (Balanced for stability) |
| Production Deploy | ⏳ Pending | Vercel wildcard configuration |
| Legacy Cleanup | ✅ Complete | getUserPermissions deprecated, v7→v8 done |

**See**: [Architecture Status Report](./architecture_status_report_dec_2025.md) for details.
**See**: [Verification Checklist](./architecture/verification-checklist.md) for module compliance.

---

## 🔗 Quick Links

### Codebase
- **Package.json**: `/package.json`
- **Vite Config**: `/vite.config.ts`
- **TypeScript Config**: `/tsconfig.app.json`
- **Tailwind Config**: `/tailwind.config.js`

### Entry Points
- **Main**: `src/main.tsx`
- **App**: `src/App.tsx`
- **Routes**: `src/RouteConfig.tsx`

### Core Modules
- **Bootstrap**: `src/core/bootstrap/`
- **Registry**: `src/core/registry/`
- **Components**: `src/core/components/`

---

## 📝 Work Session Logs

For AI agents working on this project, please:
1. **Read** the latest log in `docs/logs/` before starting
2. **Update** the log with your session's work when done
3. **Note** any unfinished tasks for the next session

**Latest**: [2025-12-21 Log](./logs/2025-12/2025-12-21.md)

---

## 🆘 Getting Help

If you're an AI agent and stuck:
1. Check `docs/guides/troubleshooting.md`
2. Review recent logs in `docs/logs/`
3. Search codebase for similar patterns
4. Ask the user for clarification

---

*This documentation is maintained for both human developers and AI coding assistants.*
