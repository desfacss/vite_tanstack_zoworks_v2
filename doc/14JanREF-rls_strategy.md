# Architecture Blueprint: RLS & Partitioning Strategy

## 🏗️ The Three-Key Identity Architecture
For a scalable, multi-tenant "Workforce OS", we utilize three distinct keys on almost all operational tables (e.g., `timesheets`, `leaves`, `projects`).

| Key | Purpose | Scope |
| :--- | :--- | :--- |
| **`organization_id`** | **The Partition Key**. Essential for physical data isolation and database-level sharding. | Global Tenant |
| **`user_id`** | **The Ownership Key**. Links a record to a specific global human account. | Global Account |
| **`org_user_id`** | **The Context Key**. Links the record to a specific "Membership" (Role, Path, Team). | Tenant Context |

---

## 🗺️ Multi-Dimensional Access Logic
Your assumption is **correct**. In a modern workforce system, access is not a linear tree; it is a **union of intersecting sets**.

### 1. The Location Hierarchy (`ltree`)
Locations are branches. If a manager is assigned to `/HQ`, they should automatically access `/HQ/Branch-A` and `/HQ/Branch-B`.
- **Implementation**: RLS uses the `ltree` `<@` (descendant) operator.
- **Why `org_user_id`?**: We pull the manager's `path` from `identity.organization_users` using this key to check against the record's location path.

### 2. Geo-Spread Teams (Cross-Location Access)
A user might be a "Regional Finance Manager" on a team that spans 5 locations. 
- **The Rule**: If a user is on a Team, they inherit the access rights of that team's location, regardless of their own "Primary Location".
- **Implementation**: RLS uses an `EXISTS` check across `identity.user_teams` -> `identity.teams`.

### 3. Project-Based Access (Managerial Overlays)
A manager of a project needs to see all project records, even if the team members are in different branches or different countries.
- **Implementation**: RLS checks if `current_setting('request.jwt.claims.user_id')` matches the `project.manager_id`.

---

## ⚖️ Partitioning vs. RLS Efficiency

### The "Golden Rule" of Partitioning
**Always include `organization_id` in your WHERE clause (and your RLS).** 
PostgreSQL Partition Pruning is extremely efficient. If your table is partitioned by `organization_id`, the database skips 99.9% of the data before it even starts checking RLS policies.

### The "Golden Rule" of RLS
**Use `org_user_id` for complexity, but `user_id` for simplicity.**
- For "My Records": Use `user_id = auth.uid()`. (Fastest)
- For "My Team/Branch": Use `org_user_id` to join with the hierarchy engine. (Rich Access)

---

## 🛠️ Can RLS change per tenant?
**Yes, via "Data-Driven Policies".** 
Instead of writing different SQL for each tenant, we write **Configuration-Aware Policies**.

**Example Concept:**
```sql
CREATE POLICY multi_tenant_logic ON workforce.timesheets
USING (
  (SELECT config->>'auto_approve' FROM identity.organizations WHERE id = organization_id) = 'true'
  OR ... standard RLS ...
);
```
By referencing a `settings` or `config` JSONB column in the `organizations` table, you can make the RLS logic behave differently for "Tenant A" vs "Tenant B" without ever changing the SQL code.

---

## 🏁 Summary Recommendation
1. **Persistence**: Keep `organization_id` and `user_id` on all tables for partitioning and ownership.
2. **Context**: Pass `org_user_id` in the JWT (as we just implemented) to power the "Managerial/Hierarchy" RLS view.
3. **Hierarchy**: Use `ltree` for locations. It is the most efficient way to handle "Manager of Branch" access.
