# PERT Time Estimates in Process Blueprints
## Concept → Implementation → Measurement → Operational Improvement

**Date**: 2026-04-01
**Scope**: All 4 blueprint types — lifecycle, approval, orchestration, agentic

---

## 1. What PERT Time Estimation Is

PERT (Program Evaluation and Review Technique) is a statistical method for estimating task duration under uncertainty. Unlike a single-point estimate ("this takes 2 hours"), PERT uses three scenarios to produce a probability-weighted expected duration.

### The Formula

```
E = (O + 4M + P) / 6
```

Where:
- **O** — Optimistic: best case if everything goes right (shortest plausible time)
- **M** — Most Likely: what actually happens the majority of the time
- **P** — Pessimistic: worst case under realistic (not catastrophic) conditions
- **E** — Expected: the PERT-weighted average, biased toward the most likely outcome

The 4× weight on M reflects that the most likely outcome dominates but the tails matter. PERT expected is not the average of O and P — it accounts for the shape of the distribution.

### Standard Deviation (for range planning)

```
σ = (P - O) / 6
```

A tight σ means high confidence. A wide σ means high variability — that stage needs process attention.

### Example: Leave Approval Stage

| Input | Value |
|:--|:--|
| Optimistic (O) | 1 hour (manager acts immediately) |
| Most Likely (M) | 24 hours (normal workday cycle) |
| Pessimistic (P) | 72 hours (manager away, escalation needed) |
| **PERT Expected (E)** | **(1 + 4×24 + 72) / 6 = 28.17 hours** |
| Standard Deviation | (72 - 1) / 6 = 11.83 hours |

This tells you: plan for ~28 hours, but the stage can swing by ±12 hours depending on approver availability.

---

## 2. Time Estimates in the Blueprint Schema

```json
{
  "id": "Submitted",
  "name": "Submitted (Pending Approval)",
  "time_estimates": {
    "optimistic_hours": 1,
    "most_likely_hours": 24,
    "pessimistic_hours": 72,
    "pert_expected_hours": 28.17,
    "aspirational_hours": 4
  }
}
```

### Fields

| Field | Purpose | How to Set |
|:--|:--|:--|
| `optimistic_hours` | O — fastest realistic completion | Historical P5 or anecdotal best-case |
| `most_likely_hours` | M — median / modal outcome | Historical P50 (median dwell time) |
| `pessimistic_hours` | P — worst-case without extraordinary events | Historical P95 or known worst-case scenario |
| `pert_expected_hours` | E = (O + 4M + P) / 6 | Calculate, do not guess |
| `aspirational_hours` | Stretch goal — what lean operations could achieve | Leadership target, not a statistical estimate |

**`pert_expected_hours` should always be calculated, not estimated.** If you set O=1, M=4, P=10, then PERT = (1 + 16 + 10)/6 = 4.5. Do not write 4.0 because it "feels right."

---

## 3. PERT Time by Blueprint Type

### 3.1 Lifecycle Blueprint

**Nature of time**: Stage dwell time = how long an entity sits in a stage before transitioning. This is a direct observable — `esm_logs` tracks every entry and exit.

**What drives dwell time in a lifecycle:**
- Human action required (scheduling, physical work, approval)
- External dependencies (parts delivery, customer response)
- Queue depth (how many other entities compete for the same resource)

**Example — ESM Tickets (Service Operations)**

```json
{
  "id": "New",
  "time_estimates": {
    "optimistic_hours": 0.01,
    "most_likely_hours": 0.05,
    "pessimistic_hours": 0.25,
    "pert_expected_hours": 0.07,
    "aspirational_hours": 0.02
  }
}
```
→ New ticket acknowledgement is system-automated. Dwell should be near-instant (4 minutes expected).

```json
{
  "id": "Parts Pending",
  "time_estimates": {
    "optimistic_hours": 24,
    "most_likely_hours": 72,
    "pessimistic_hours": 336,
    "pert_expected_hours": 96,
    "aspirational_hours": 48
  }
}
```
→ Parts ordering is externally constrained. High variance is expected and acceptable — the blueprint documents that.

**Lifecycle PERT calibration rules:**
1. Automated stages (SYSTEM transitions): O and M should be sub-hour. Pessimistic captures stuck-queue scenarios.
2. Human-action stages: M should reflect real observed behavior, not aspirational speed.
3. External-dependency stages: P should be 5–10× M, reflecting supply chain / customer variability.
4. Terminal stages (COMPLETED, CANCELLED): Set all values to 0. No dwell expected.

---

### 3.2 Approval Blueprint

**Nature of time**: Approval stages are almost entirely about human decision latency — how long does the approver take to act? The stage structure is usually: Draft → Submitted (awaiting approval) → Approved/Rejected.

**Key insight**: In approval blueprints, the most impactful PERT estimate is the **Submitted** stage. This is where SLA breaches happen and where your escalation design lives.

```json
{
  "id": "Draft",
  "time_estimates": {
    "optimistic_hours": 0.1,
    "most_likely_hours": 1,
    "pessimistic_hours": 24,
    "pert_expected_hours": 4.18,
    "aspirational_hours": 0.5
  }
}
```
→ Drafting: employee fills in the form. Wide variance because some people submit in 5 minutes, others deliberate for a day.

```json
{
  "id": "Submitted",
  "time_estimates": {
    "optimistic_hours": 1,
    "most_likely_hours": 24,
    "pessimistic_hours": 72,
    "pert_expected_hours": 28.17,
    "aspirational_hours": 4
  }
}
```
→ Pending approval: the 72-hour P is what drives the 48-hour SLA (breach *before* P, triggering escalation).

**Approval PERT calibration rules:**
1. The SLA `time_threshold_hours` should be < `pessimistic_hours` and close to `most_likely_hours`. This means SLA fires before worst-case, giving escalation time to recover.
2. Multi-phase approvals: estimate per phase, not per combined stage. Phase 1 = L1 manager window. Phase 2 = full pool window.
3. `aspirational_hours` drives process redesign targets: if you want same-day approvals, set aspirational = 4h and measure gap from actual.

**Connecting PERT to escalation design:**
```
pert_expected = 28.17h → SLA breach at 48h → escalation fires before P (72h)
aspirational  =  4.0h → target for future process improvement
```

The gap between `pert_expected_hours` and `aspirational_hours` is your **improvement headroom** — what lean operations could save.

---

### 3.3 Orchestration Blueprint

**Nature of time**: Orchestration stages represent **milestones across child processes**. The dwell time at each stage is dominated by the slowest child entity completing its own lifecycle.

**This means orchestration PERT estimates are inherently derived:**

```
orchestration_stage_pert ≈ child_lifecycle_pert + coordination_overhead
```

You cannot set orchestration PERT estimates in isolation — they must be grounded in the child blueprints' actual performance.

```json
{
  "id": "work_order_dispatched",
  "time_estimates": {
    "optimistic_hours": 1,
    "most_likely_hours": 24,
    "pessimistic_hours": 72,
    "pert_expected_hours": 24.17,
    "aspirational_hours": 8
  }
}
```
→ This milestone completes when the work order moves to "In Progress." Dwell is: time from ticket reaching "Scheduled" to work order being created + technician starting.

```json
{
  "id": "invoicing",
  "time_estimates": {
    "optimistic_hours": 24,
    "most_likely_hours": 120,
    "pessimistic_hours": 336,
    "pert_expected_hours": 132,
    "aspirational_hours": 72
  }
}
```
→ Invoice stage: finance processes service report → generates invoice → sends to customer. Dominated by finance team's weekly batching.

**Orchestration PERT calibration rules:**
1. Start from child lifecycle actuals: pull `pm_vw_pert_vs_actual` for each child entity type. Use actual_avg_hours as your M for the orchestration stage.
2. Add coordination overhead: typically +20–30% for cross-team handoffs.
3. Milestone SLAs should be set against the orchestration PERT: `orch_check_milestone_sla` uses these values to detect when child progression is stalling.
4. The CPM scheduler (`pm_forward_schedule`) reads `pert_expected_hours` from orchestration stages to compute the end-to-end schedule. Accurate PERT → accurate project completion estimates.

**CPM output example (from actual system test):**
```
Service-to-Resolution Ticket Orchestration:
  Total PERT hours: 197.83 (24.7 working days)
  Critical stage: invoicing (168h / 21 working days)
  → Invoicing drives 85% of total cycle time
  → Reducing invoicing from 168h to 72h = 12 working days saved
```

This is only visible because PERT estimates are in the blueprint.

---

### 3.4 Agentic Blueprint

**Nature of time**: AI agent stages have two distinct time components:
1. **Compute latency**: how long the AI takes to execute (milliseconds to seconds)
2. **Human review latency**: how long the human takes to review/accept the AI output (minutes to days)

These need separate PERT estimates because they have completely different variance profiles.

```json
{
  "id": "ai_enrichment",
  "name": "AI Data Enrichment",
  "time_estimates": {
    "optimistic_hours": 0.003,
    "most_likely_hours": 0.005,
    "pessimistic_hours": 0.05,
    "pert_expected_hours": 0.006,
    "aspirational_hours": 0.003
  }
}
```
→ AI execution: sub-minute. Pessimistic captures API timeout / retry scenarios.

```json
{
  "id": "human_review",
  "name": "Human Review of AI Output",
  "time_estimates": {
    "optimistic_hours": 0.1,
    "most_likely_hours": 4,
    "pessimistic_hours": 48,
    "pert_expected_hours": 8.35,
    "aspirational_hours": 1
  }
}
```
→ Human review: dominated by reviewer's workload and context-switching. Wide variance is normal.

**Agentic PERT calibration rules:**
1. Keep AI compute stages separate from human review stages. Never merge them — the variance profiles are incompatible.
2. For AI stages: P should capture API failures and retry cycles, not just slow inference.
3. For human review: M should be measured from actual user behavior, not assumed. People review AI output faster when the AI confidence is displayed alongside the output.
4. The ratio `ai_compute_pert / human_review_pert` measures your **automation leverage** — how much time AI saves versus the review overhead it creates.

---

## 4. How PERT Time Is Measured

### 4.1 The Views

```sql
-- Live PERT vs actual comparison
SELECT * FROM automation.pm_vw_pert_vs_actual
WHERE blueprint_name = 'ESM Tickets'
ORDER BY deviation_percent DESC NULLS LAST;
```

Returns columns:
```
stage_id | stage_name | pert_expected_hours | actual_avg_hours | deviation_percent | performance_rating | sample_count
```

**Performance ratings:**

| Rating | Condition |
|:--|:--|
| `on_track` | deviation ≤ ±10% |
| `fast` | actual < PERT by > 10% (better than expected) |
| `slow` | actual > PERT by 10–25% (slightly behind) |
| `bottleneck` | actual > PERT by > 25% (significant delay) |
| `no_data` | No transitions in the analysis window |
| `no_estimate` | No `pert_expected_hours` in blueprint |

### 4.2 The Function

```sql
SELECT automation.pm_compare_pert_estimates(
    p_blueprint_id := '6dea58b9-8e69-4f8b-8245-ab715512f73b',
    p_days := 30
);
```

Returns structured JSON with per-stage breakdown including:
- `pert_expected_hours`: blueprint estimate
- `actual_avg_hours`: observed average dwell
- `actual_median_hours`: median (less sensitive to outliers)
- `deviation_percent`: signed percentage deviation
- `sample_count`: number of observations

### 4.3 Dwell Time Calculation

Actual dwell time is calculated as the gap between consecutive `esm_logs` entries for the same entity:

```
dwell = next_transition.created_at - this_transition.created_at
```

For the last stage (no next transition), `now()` is used — meaning in-flight entities appear as still accumulating time. This is intentional: it catches entities stuck in terminal stages.

---

## 5. Using PERT Time for Operational Improvement

### Step 1: Identify Bottlenecks

```sql
SELECT stage_id, performance_rating, deviation_percent, sample_count
FROM automation.pm_vw_pert_vs_actual
WHERE blueprint_name = 'ESM Tickets'
  AND performance_rating = 'bottleneck'
ORDER BY deviation_percent DESC;
```

Stages rated `bottleneck` are the primary targets for intervention.

### Step 2: Distinguish Type of Bottleneck

Not all bottlenecks have the same root cause:

| Pattern | What It Means | Fix |
|:--|:--|:--|
| High avg, low median | Outlier cases skewing the average | Review P95 cases — are they a specific ticket type? |
| High avg, high median | Systemic slowness — all entities slow | Process redesign or resource addition |
| Bottleneck on entry stage | Backlog building at intake | Queue management, additional intake staff |
| Bottleneck on handoff stage | Coordination friction between teams | Automate the handoff notification + add guard_rules |
| Bottleneck on external stage | External dependency (parts, approvals) | SLA with external party, parallel processing |

### Step 3: Use Standard Deviation to Assess Predictability

Even if avg dwell equals PERT expected, high variance is operationally damaging — customers experience wildly different service times for the same ticket type.

```
σ = (pessimistic - optimistic) / 6

If actual std_dev >> σ from blueprint:
→ Your pessimistic estimate was too optimistic
→ Something unexpected regularly happens in this stage
```

Look for: inconsistent assignee availability, unclear stage exit criteria, or undefined ownership (RACI gap).

### Step 4: Calibrate SLA Thresholds from PERT

Use PERT expected to set SLA thresholds scientifically:

```
Good SLA = pert_expected × 1.5  (fires at 50% above expected — gives recovery time)
Escalation L1 = pert_expected × 2.0
Escalation L2 = pessimistic × 0.9  (fires just before true worst-case)
```

This approach means your SLA fires predictably — not too early (false alarms) and not too late (no time to recover).

### Step 5: Update PERT Estimates When Actuals Diverge

`pm_suggest_blueprint_update()` automatically flags stages where `|deviation_percent| > 25%` with at least 5 samples:

```json
{
  "change_type": "update_pert_estimate",
  "stage_id": "Parts Pending",
  "current_pert_hours": 96,
  "recommended_pert_hours": 142.5,
  "deviation_percent": 48.4,
  "sample_count": 23,
  "confidence": "medium"
}
```

**This is the feedback loop**: Operations → Actual data → PERT deviation → Blueprint v(N+1) suggestion → Human review → Updated blueprint → Better SLAs and CPM schedules.

### Step 6: CPM Forward Scheduling for Capacity Planning

Once PERT estimates are calibrated, `pm_forward_schedule()` becomes a capacity planning tool:

```sql
SELECT automation.pm_forward_schedule(
    p_blueprint_id := '<orchestration_blueprint_id>',
    p_start_date   := '2026-04-07 09:00:00+05:30'
);
```

Output shows:
- Expected completion date for a new entity starting today
- Which stage drives the critical path
- Where to focus reduction effort for maximum schedule compression

```
Current: Total = 197.83h (24.7 days)
         Critical: invoicing (168h)

If invoicing → 72h (achievable with weekly→daily processing):
New total = 197.83 - 168 + 72 = 101.83h (12.7 days)
= 12 working days saved per entity
```

### Improvement Cadence

| Cadence | Action |
|:--|:--|
| **Daily** | Monitor bottleneck count — is it growing or shrinking? |
| **Weekly** | Pull deviation report. Flag any new `bottleneck` ratings. |
| **Monthly** | Review `pm_suggest_blueprint_update()` output. Accept or reject PERT updates. |
| **Quarterly** | Full CPM re-run on updated blueprints. Revise capacity plan. |
| **After major process change** | Immediately re-measure for 2 weeks to confirm improvement |

---

## 6. PERT Calibration Workshop (How to Set Initial Values)

When there's no historical data, use this workshop process:

### For each stage, ask three questions:

1. **"If the stars align — assignee ready, no queue, all info available — how fast?"**
   → Set as `optimistic_hours`

2. **"On a normal day, with normal interruptions and normal queue — how long does this actually take?"**
   → Set as `most_likely_hours` (get this from whoever does the work, not management)

3. **"When things go wrong — approver is out, parts are delayed, customer doesn't respond — what's the worst you've seen without it being a catastrophe?"**
   → Set as `pessimistic_hours` (exclude extraordinary events like system outages)

4. **Calculate**: `pert_expected = (O + 4M + P) / 6` — this is not negotiable, it's math

5. **Set aspirational**: what would lean operations, better tooling, or additional staff achieve? This is your improvement North Star.

### Validation rule:
```
O < aspirational ≤ M ≤ pert_expected < P
```

If this inequality is violated, your estimates are inconsistent.

---

## 7. Quick Reference — PERT Formulas

```
Expected (E) = (O + 4M + P) / 6

Standard Deviation (σ) = (P - O) / 6

Variance (V) = σ²

90% confidence range = E ± 1.65σ
95% confidence range = E ± 1.96σ

SLA threshold suggestion:
  Warning   = E × 1.5
  Critical  = E × 2.0
  Escalate  = P × 0.9
```

| Stage Type | Typical O:M:P ratio |
|:--|:--|
| Automated (SYSTEM) | 1 : 1 : 5 — tight range, P for queue backup |
| Human action, simple | 1 : 4 : 10 — moderate variance |
| Human action, complex | 1 : 5 : 20 — wide variance, context-dependent |
| External dependency | 1 : 3 : 14 — high P, driven by third-party |
| AI compute | 1 : 1.5 : 10 — tight M, P for API failures |
| Human review of AI | 1 : 8 : 100 — extreme variance |
