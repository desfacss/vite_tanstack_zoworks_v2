# ZoWorks Platform Overview

> AI-Native System of Records for Multi-Tenant B2B/B2B2C SaaS

---

## Platform Vision

A **meta-driven, AI-native system of records** that can instantiate any B2B or B2B2C process blueprint for multi-tenant SaaS deployments.

### Core Capabilities
- Blueprint compilation system
- Event-driven automation
- Multi-channel connectors (Email, SMS, WhatsApp)
- Process digital twin modeling

### Domain Modules
| Module | Description | Status |
|--------|-------------|--------|
| ERP | Enterprise Resource Planning | 🟡 In Progress |
| CRM | Customer Relationship Management | 🟡 In Progress |
| FSM | Field Service Management | 🟡 In Progress |
| HRMS | Human Resource Management | 🟡 In Progress |
| ESM | Enterprise Service Management | 🟡 In Progress |
| PayrollML | ML-powered Payroll | 🔴 Planned |
| RecruitML | ML-powered Recruitment | 🔴 Planned |
| WMS | Warehouse Management | 🟡 In Progress |
| POS | Point of Sale | 🟡 In Progress |

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  React Native App        │  React Web (this project)            │
│  - Geo tracking          │  - mini_project (vite)               │
│  - Device context        │  - Multi-tenant subdomain routing    │
│  - Webview wrapper       │  - Config-driven DynamicViews        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Edge Functions (15+)                                   │
│  - Auth, Session Management                                      │
│  - Webhook handlers                                              │
│  - Integration proxies                                           │
├─────────────────────────────────────────────────────────────────┤
│  Supabase RPC Functions (100s)                                   │
│  - CRUD operations                                               │
│  - Business logic                                                │
│  - Multi-tenant RLS enforcement                                  │
├─────────────────────────────────────────────────────────────────┤
│  Google Cloud Functions (Python)                                 │
│  - ML models (PayrollML, RecruitML)                              │
│  - AI processing                                                 │
│  - Heavy compute tasks                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL                                             │
│  - Schema per domain (identity, blueprint, external, etc.)       │
│  - RLS for tenant isolation                                      │
│  - JSONB for flexible config                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AUTOMATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Event-Driven Automation                                         │
│  - Blueprint triggers                                            │
│  - Workflow execution                                            │
│  - Connector orchestration (Email, SMS, WhatsApp)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

| Repository | Description | Tech Stack |
|------------|-------------|------------|
| `mini_project` (this) | React Web Frontend | Vite, React 18, Ant Design |
| `zo_rn_app` (?) | React Native Wrapper | React Native, Expo (?) |
| `zo_edge_functions` (?) | Supabase Edge Functions | TypeScript, Deno |
| `zo_gcp_functions` (?) | GCP Cloud Functions | Python, ML libs |
| `zo_supabase_db` (?) | Database migrations | SQL, RLS policies |

---

## Questions to Clarify

### 1. Repository Organization
- [ ] Are all backend functions in one repo or multiple?
- [ ] Where are the RPC function definitions stored?
- [ ] Is there a central schema/migration repo?

### 2. Supabase Structure
- [ ] What are all the schemas? (`identity`, `blueprint`, `external`, `automation`, ?)
- [ ] Do you have a schema diagram or ERD?
- [ ] Where is the RPC function catalog documented?

### 3. GCP Functions
- [ ] What functions exist? (List names)
- [ ] How are they triggered? (HTTP, Pub/Sub, etc.)
- [ ] Where is the Python code located?

### 4. React Native
- [ ] What's the repo name?
- [ ] How does it inject context into the webview?
- [ ] What native features does it use? (Geo, push, camera?)

### 5. Sub-modules to Merge
- [ ] What are they?
- [ ] Which are ready to merge?
- [ ] Any integration dependencies?

### 6. Blueprint System
- [ ] How are blueprints defined? (JSON, DB tables, code?)
- [ ] How does compilation work?
- [ ] Where is this documented?

---

## Documentation Structure (Proposed)

```
docs/
├── README.md                    # This file - platform overview
├── architecture/                # System design
│   ├── overview.md              # High-level architecture
│   ├── multi-tenant.md          # Tenancy model
│   ├── plug-and-play-modules.md # Module system
│   └── blueprint-system.md      # Blueprint compilation (NEW)
├── backend/
│   ├── README.md                # Backend overview
│   ├── schemas/                 # Database schemas
│   │   ├── identity.md
│   │   ├── blueprint.md
│   │   └── automation.md
│   ├── rpc/                     # RPC function docs
│   │   ├── README.md            # RPC catalog
│   │   └── by-schema/           # Grouped by schema
│   ├── edge-functions/          # Edge function docs
│   └── gcp-functions/           # GCP function docs
├── frontend/
│   ├── README.md                # Frontend overview
│   ├── web/                     # Web app (this project)
│   └── mobile/                  # React Native
├── modules/                     # Domain module docs
│   ├── crm/
│   ├── hrms/
│   ├── fsm/
│   └── ...
├── connectors/                  # Integration connectors
│   ├── whatsapp.md
│   ├── email.md
│   └── sms.md
└── logs/                        # Session logs
```

---

*Draft: 2025-12-25 — Needs input to complete*


what should be my workflow for giving the entire project context to start with? i have serverless backend mostly  15 supabase edge, several 100 rpc, some google cloud functions (python - ml, ai, or tools etc...)  along with this front end project - i also have several other sub modules which i will eventually merge with this project . i have a react native frame, within which i load this projects mini version insed the RN wrapper and inject context and on devece i track geo locations etc..)

I am developing a ai native system of records that can work for any b2b or b2b2c process blueprint for a multi tenant saas, a blueprint compilation system, event driven automation, connectors like email, sms, whatsapp automation, like erp, crm, fsm, hrms, esm, payrollML, recruitML, process digitaltwin etc...
 
start documenting important info and ask me what you need to organize the entire docs/ folder - specifically backend/ and frontend/ logic/ etc...