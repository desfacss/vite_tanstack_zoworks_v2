# How to Run Lean-Architect Locally

> **Project location:** `vite_tanstack_zoworks_v2/Lean-Architect/`

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v18+ (project targets v24) | https://nodejs.org |
| pnpm | Latest | `npm install -g pnpm` |

---

## Setup (First Time Only)

```bash
# Navigate to Lean-Architect folder
cd "c:\Users\ganesh\zoworks\vite_tanstack_zoworks_v2\Lean-Architect"

# Install all workspace dependencies
pnpm install
```

---

## Run (Two Terminals Required)

### Terminal 1 — API Server (port 8080)

```bash
cd "c:\Users\ganesh\zoworks\vite_tanstack_zoworks_v2\Lean-Architect"

pnpm --filter @workspace/api-server run dev
```

Expected output:
```
> @workspace/api-server@0.0.0 dev
> export NODE_ENV=development && pnpm run build && pnpm run start
[pino] {"level":"info","msg":"Server listening","port":8080}
```

**API endpoints available:**
- `GET  /api/config` — list all entity configs
- `GET  /api/config/:entity` — get config for one entity
- `POST /api/entity/data` — fetch records with filters/sort/pagination
- `POST /api/entity/upsert` — create/update a record
- `POST /api/entity/delete` — delete a record

---

### Terminal 2 — Frontend (port 5173)

```bash
cd "c:\Users\ganesh\zoworks\vite_tanstack_zoworks_v2\Lean-Architect"

pnpm --filter @workspace/dynamic-views run dev
```

Expected output:
```
> @workspace/dynamic-views@0.0.0 dev
> vite --config vite.config.ts --host 0.0.0.0

  VITE v7.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://0.0.0.0:5173/
```

---

## Open in Browser

```
http://localhost:5173
```

You'll be redirected to `/tasks` and see the **Kanban view** by default.

---

## What to Explore

| URL | Entity | Default View | Highlights |
|-----|--------|-------------|------------|
| `/tasks` | Tasks | Kanban | Drag cards between statuses, switch to Gantt (dep arrows), Calendar |
| `/projects` | Projects | Gantt | Dependency arrows, Day/Week/Month zoom levels |
| `/crm.leads` | CRM Leads | Pipeline (Kanban) | Sales stages, deal values in Table view |
| `/real-estate.listings` | Properties | Gallery | Image cards, switch to Map (Leaflet pins) |
| `/ecommerce.products` | Products | Catalog (Gallery) | Product ratings, stock Kanban |

---

## Other Useful Commands

```bash
# Typecheck the entire workspace
pnpm run typecheck

# Regenerate API client from OpenAPI spec (lib/api-spec/openapi.yaml)
pnpm --filter @workspace/api-spec run codegen

# Run the mockup sandbox (component preview)
pnpm --filter @workspace/mockup-sandbox run dev
```

---

## Troubleshooting

### Port already in use
```bash
# Find and kill process on port 8080
netstat -ano | findstr :8080
taskkill /PID <pid> /F

# Or for port 5173
netstat -ano | findstr :5173
taskkill /PID <pid> /F
```

### pnpm not found
```bash
npm install -g pnpm
```

### API server fails to start (Windows — `export` not found)
The `dev` script uses `export NODE_ENV=development` which is Linux syntax. On Windows PowerShell:
```bash
# Instead of: pnpm --filter @workspace/api-server run dev
# Use:
cd artifacts/api-server
pnpm run build
node --enable-source-maps ./dist/index.mjs
```

Or use Git Bash / WSL which supports the `export` command natively.

### Vite env variable issues
The frontend uses `import.meta.env.BASE_URL` for API base URL. If the API returns 404s, check:
```typescript
// artifacts/dynamic-views/vite.config.ts
// The proxy config should forward /api/* to http://localhost:8080
```
