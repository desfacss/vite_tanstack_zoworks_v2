## 1. The 4 Tiers (Structural Hierarchy)

The Tiers define **where** data physically lives and how tables are related.

| Tier | Name | Purpose | Example |
| :--- | :--- | :--- | :--- |
| **Tier 0** | **Universal services** | Central registry & shared tools (Comments, Tags). | `core.unified_objects` |
| **Tier 1** | **Core Registries** | Definitive storage for common entity types. | `unified.tasks`, `unified.contacts` |
| **Tier 2** | **Domain Extensions** | Typed vertical-specific fields (Optional). | `esm.tickets`, `crm.leads` |
| **Tier 3** | **Execution Instances** | Dynamic tracking of runtime processes. | `automation.bp_instances` |

---

## 2. Approach C: The Shared ID Philosophy

**Approach C** is the "Golden Rule" of our architecture. 

- **The Rule**: Every record representing the *same physical object* (e.g., a specific Task) must use the **EXACT SAME UUID** across all Tiers.
- **The Benefit**: We never need complex mapping tables. A simple `JOIN` on `id` connects the central object, its registry entry, its vertical extension, and its automation state.
- **Implementation**: 
    - Tier 0 generates the ID. 
    - Tier 1/2/3 tables use that ID as their **Primary Key** and a **Foreign Key** to Tier 0.

---

## 3. The 5 Layers (Data & Access Patterns)

The Layers define **what** data is captured and **how** it is accessed.

| Layer | Name | Scope | Strategy |
| :--- | :--- | :--- | :--- |
| **L1** | **Universal Core** | Identity & Audit (id, org_id, status). | Static columns in Base tables. |
| **L2** | **Horizontal Module** | Patterns across types (module, raci, pert). | Static columns in Unified tables. |
| **L3** | **Vertical Industry** | Industry data (patient_id, site_id). | `vertical_payload` JSONB or Tier 2. |
| **L4** | **Tenant Custom** | Org-specific fields (x_custom). | `details` JSONB column. |
| **L5** | **Logical Views** | Read/Write access patterns. | `core.entities` + Dynamic Views. |

---

## 4. Why This Matters for Schema Evolution

By evolving toward this model, we move away from "Siloed Tables" (where HR workers and CRM leads are disconnected) to a "Universal Catalog." 

1.  **AI Readiness**: AI agents (via MCP) can query `unified_objects` to find *anything* regardless of its domain.
2.  **Cross-Module Reporting**: You can run one SQL query to see "All tasks assigned to User X" whether they are CRM leads or ESM tickets.
3.  **Low-Code Provisioning**: Adding a new vertical field doesn't require a database migration (L3/L4 handle it via JSONB).