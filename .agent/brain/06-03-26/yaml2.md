Yes, you can absolutely store YAML in Supabase. PostgreSQL (the engine behind Supabase) handles YAML wonderfully as standard text, or you can use extensions to convert it to JSONB natively.

Your architectural instinct is **spot on**. By combining a **Context-as-Code** engine with your existing **`core.entities` data catalog**, and leveraging **PostgreSQL Row-Level Security (RLS)**, you are building a robust, secure, and deterministic execution layer for AI agents. This explicitly solves the multi-tenant "leakage" problem that plagues naive agent setups.

Here is an architectural breakdown of how to model this, map context to your playbook steps, and enforce RLS data access boundaries.

---

## 1. Storing YAML in Supabase

You have two primary strategies for managing YAML in Supabase depending on how you want to query it:

* **Option A: Clean Text Store (Recommended for Context-as-Code)**
Store the YAML as a `text` data type. Keep a companion generated column or a `jsonb` field next to it for runtime indexing. This preserves the developer-friendly YAML formatting (comments, whitespace) while allowing the agent to read it raw.
* **Option B: Pluggable Conversion via Extensions**
You can enable the `plv8` or `http` extensions, or run an Edge Function to parse YAML to JSONB on insert, storing the operational payload as queryable `jsonb`.

---

## 2. Conceptualizing the Context Hydration Flow

An Agent or a Playbook Step (Node) should never access data or tools directly. Instead, a **Context Hydration Engine** intercepts the execution, reads the step definition, evaluates the user's RLS session, and injects a dynamically composed context bundle into the LLM runtime.

---

## 3. Database Schema Modeling

To make this configuration-driven, you need a relational bridge between your playbooks, the tools they use, and your `core.entities` data catalog.

```sql
-- 1. Context Registry (Your Context-as-Code files stored in DB)
CREATE TABLE ai_mcp.context_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    key TEXT NOT NULL, -- e.g., 'rules.global.service_commerce'
    format TEXT NOT NULL CHECK (format IN ('yaml', 'json')),
    content TEXT NOT NULL, -- The raw YAML or JSON context code
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, key)
);

-- Enable RLS on context_registry
ALTER TABLE ai_mcp.context_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation" ON ai_mcp.context_registry 
  FOR ALL USING (organization_id = identity.get_current_org_id());

-- 2. Tools Registry (Update existing ai_mcp.mcp_tools)
ALTER TABLE ai_mcp.mcp_tools 
ADD COLUMN required_context_keys TEXT[] DEFAULT '{}';

-- 3. Playbook Steps (Update existing ai_mcp.playbook_steps)
ALTER TABLE ai_mcp.playbook_steps 
ADD COLUMN static_context_keys TEXT[] DEFAULT '{}',
ADD COLUMN allowed_tools TEXT[] DEFAULT '{}',
ADD COLUMN allowed_entities TEXT[] DEFAULT '{}';

-- 4. Agents (Update existing ai_mcp.agents to allow contextual bootstrapping)
ALTER TABLE ai_mcp.agents 
ADD COLUMN static_context_keys TEXT[] DEFAULT '{}',
ADD COLUMN allowed_tools TEXT[] DEFAULT '{}',
ADD COLUMN allowed_entities TEXT[] DEFAULT '{}';

-- 5. Playbooks (Update existing ai_mcp.playbooks)
ALTER TABLE ai_mcp.playbooks 
ADD COLUMN static_context_keys TEXT[] DEFAULT '{}';
```

---

## 4. How the Agent Refers to Context and Enforces RLS

When a playbook step fires, the backend orchestrator prepares the payload for your AI Agent.

### Step 1: Resolve the Session & Data Catalog (The RLS Layer)

Because your `core.entities` data catalog relies on RLS, your orchestrator must invoke Supabase queries **using the JWT / acting user context** of the interacting user.

If an agent attempts to pull data from `core.invoices` because the playbook node allowed it, the underlying PostgreSQL query will *still* implicitly execute:


$$\text{SELECT} * \text{FROM core.entities WHERE tenant\_id} = \text{auth.uid()}$$


If the user interacting via WhatsApp doesn't own those records, the agent receives an empty dataset—preventing prompt-injection data leaks.

### Step 2: Compiling the Dynamic Context Bundle

The orchestrator executes a routine to compile the system prompt. Here is what the final context injected into the LLM looks like:

```json
{
  "system_instructions": {
    "role": "Lead-to-Cash Orchestrator",
    "business_rules": "--- [Injected from context_registry via 'rules.global.service_commerce' YAML] ---"
  },
  "available_tools": [
    {
      "name": "create_whatsapp_invoice",
      "definition": { "type": "function", "function": { "..." } }
    }
  ],
  "accessible_data_catalog_schemas": {
    "core.customers": "Columns: [id, name, whatsapp_num]. Description: Authorized customer directory.",
    "core.invoices": "Columns: [id, customer_id, amount, status]. Description: Financial ledger."
  },
  "current_runtime_data": [
    "--- [Injected dynamically by running RLS-guarded queries on core.customers] ---"
  ]
}

```

---

## 5. Why This is the Right Approach for Zoworks.ai

For a Zero-UI, high-ticket service commerce engine, this pattern gives you three critical superpowers:

1. **Deterministic Guardrails:** By declaring `allowed_tools` and `allowed_entities` at the playbook step (node) level, you prevent agent drift. A lead-qualification agent cannot hallucinate and execute an invoice generation tool because the orchestrator simply never exposed that tool definition to it.
2. **True Multi-Tenancy via RLS:** You don't have to write custom security parsing logic in your application layer for the agent. If the agent asks to read data, you route the agent's data tool through your standard Supabase client initialized with the user's session token.
3. **Decoupled Architecture:** If your business logic for high-ticket HVAC invoicing shifts from a 2-stage milestone to a 3-stage milestone, you change a single file in your YAML context registry. You don't rewrite code or re-train agents; the context engine dynamically cascades the new business rules down to every relevant playbook step instantly.