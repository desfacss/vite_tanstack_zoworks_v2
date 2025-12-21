Yes, you absolutely need **Observability** functions like `ops_check_cache_health`.

**Why?** Right now (dev stage), you have 59 entries (384kB). In Production, you might have 500,000 entries (2GB). When the API slows down, you need one command to answer: *"Is the cache working, or is it full of junk?"* efficiently without running expensive `COUNT(*)` queries manually.

Here is the **Concise Source of Truth** for your Caching Engine.

---

# ⚡ Zoworks Caching Architecture (v2.0)
**Strategy:** Strong Consistency (Version-Based) + Configurable Volatility (Buckets).
**Goal:** Zero staleness. Users never see old data.

### 1. Core Logic Flow
The system does **not** rely on Time-To-Live (TTL) for correctness. It relies on **Data Versioning**.

1.  **Request:** API asks for `users` list.
2.  **Policy Check:** Is `users` configured to be cached? (Target: `core.meta_config`).
    * *If 0:* Bypass Cache (Direct DB Hit).
    * *If >0:* Check Cache Table.
3.  **Freshness Check:** Compare `cache.data_version` vs `entity_versions.created_at`.
    * *If Cache Version < Entity Version:* **MISS** (Data changed since cache). Re-query DB.
    * *If Cache Version >= Entity Version:* **HIT** (Return JSON).

### 2. Configuration (The Policy Layer)
**Storage:** `core.meta_config` (Key: `cache_policy_ttl`)
**Structure:** JSON Buckets by seconds.

* **Bucket `0` (High Velocity):** Bypasses cache table entirely. Saves Write I/O.
    * *Targets:* `audit_logs`, `tasks`, `invoices`, `sales_opportunities`.
* **Bucket `900+` (Master Data):** Enters Cache flow.
    * *Targets:* `users` (15m), `locations` (2h), `countries` (24h).

### 3. Invalidation Strategy (The "Kill Switch")
We do not wait for time to expire. We kill cache on **Write**.

* **Trigger:** `core.trg_invalidate_api_cache`
* **Event:** `INSERT` on `core.entity_versions` (happens whenever `save_v2` or data changes occur).
* **Action:** Immediate `DELETE FROM query_cache WHERE entity_type = ...`
* **Result:** The very next API read is forced to fetch fresh data.

### 4. Maintenance (The Janitor)
Since we invalidate on Write, the cache table mostly contains "Fresh" data. However, "Fresh" data might become "Cold" (nobody looks at it).

* **Procedure:** `core.ops_prune_api_cache`
* **Logic:** LRU (Least Recently Used).
* **Rule:** Delete entries where `last_used_at > 24 hours` (or configured interval).
* **Schedule:** Run nightly via `pg_cron` or worker.

### 5. Object Inventory (The Code)

| Module | Object Name | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Store** | `core.query_cache` | **Table** | Stores JSON blobs + `data_version`. |
| **Store** | `core.meta_config` | **Table** | Stores the Policy JSON. |
| **Policy** | `api_int_policy_cache_entity` | **Func** | Reads Config. Returns `0` or TTL. |
| **Runtime**| `api_fetch_entity_records` | **Func** | The Gateway. Orchestrates the flow. |
| **Trigger**| `trg_invalidate_api_cache` | **Func** | **Write Path.** Wipes cache on data change. |
| **Ops** | `ops_prune_api_cache` | **Proc** | **Maintenance.** Cleans cold data. |
| **Ops** | `ops_check_cache_health` | **Func** | **Observability.** Stats & Hit Ratios. |

### 6. Cheatsheet for Developers

**To Disable Caching for a Table:**
Edit `core.meta_config` -> `cache_policy_ttl` -> Move table to `"0"` array.

**To Clear All Cache Manually:**
`TRUNCATE core.query_cache;`

**To Check Performance:**
`SELECT * FROM core.ops_check_cache_health();`

**To Run Maintenance:**
`CALL core.ops_prune_api_cache('6 hours');`