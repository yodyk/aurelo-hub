# Phase 1 — Financial Foundation (Approved with Refinements)

## Architectural principles (locked)

1. **Billing model belongs to the engagement.** Phase 1 stores it on `projects` (the closest thing Aurelo has to an "engagement") and on `clients` as a **default fallback** only. The RevenueRecognition service resolves billing model as `project.billing_model ?? client.billing_model`. When a true Engagement entity is introduced later, only the resolver changes — no surface needs a rewrite.
2. **RevenueRecognition is stateless and pure.** It accepts `(entity, ctx)` and returns numbers. It never writes to the DB, never calls Supabase, never throws on missing inputs (returns 0 with a reason code).
3. **No new stored aggregates.** Existing aggregate columns (`lifetime_revenue`, `monthly_earnings`, `true_hourly_rate`, `hours_logged`) remain as performance caches and are recomputed by the existing trigger using the new service's logic. We do **not** add `labor_value_total` or any other aggregate column. Canonical data: billing model, contract values, sessions, project completion, retainer cycles.
4. **`labor_value` is engine-only vocabulary.** Internal column name; never appears in UI copy. Users see Hours, Effective Rate, Profitability, Margin, Variance.
5. **Profitability is designed for richness.** Phase 1 returns a structured object (`{ marginAbs, marginPct, tone, drivers[] }`) even though Phase 1 only renders tone + margin. Phase 2 layers in trend, variance weighting, budget performance without touching consumers' call sites.

## Schema migration (single file)

**`clients`**
- `billing_model text NOT NULL DEFAULT 'Hourly'` — default for child engagements. CHECK: `Hourly | Retainer | FixedFee`. Backfilled from existing `model` (`Project` → `FixedFee`).
- `monthly_contract_value numeric(10,2) DEFAULT 0` — agreed monthly retainer fee. Separate from `rate × retainer_total` so revenue is independent of hours math.
- Keep `model` column untouched for now (Phase 2 drops it).

**`projects`**
- `billing_model text` — nullable; null means "inherit from client". CHECK: `Hourly | Retainer | FixedFee`.
- `contract_value numeric(10,2) DEFAULT 0` — fixed-fee amount. New code reads `contract_value`, falls back to legacy `total_value`. Backfill: `contract_value = COALESCE(total_value, 0)`.
- `completed_at date` — set automatically when status flips to `Complete` (trigger). Drives Fixed-Fee recognition timing.

**`sessions`**
- Add `labor_value numeric(10,2) DEFAULT 0`. Backfill `labor_value = revenue`. Existing `revenue` column stays during Phase 1; writes mirror to both. Phase 2 migration drops `revenue`.

Triggers:
- `set_project_completed_at` — BEFORE UPDATE on `projects`: set `completed_at = CURRENT_DATE` when status transitions to `Complete`; clear when transitioning away.
- `recalculate_client_aggregates(p_client_id)` updated to use the new recognition logic (Hourly = sum labor_value of billable sessions; Retainer = completed cycles × monthly_contract_value; FixedFee = sum of completed projects' contract_value). Same column outputs (`lifetime_revenue`, `monthly_earnings`, `true_hourly_rate`).

No new tables, so no new GRANTs needed.

## RevenueRecognition service (`src/lib/revenue.ts`)

Pure TS module. Zero side effects. No React, no Supabase.

```text
type BillingModel = 'Hourly' | 'Retainer' | 'FixedFee' | 'Milestone' | 'Subscription'
type Period       = { start: Date; end: Date }
type Reason       = 'ok' | 'no_period' | 'no_contract' | 'not_completed' | 'unknown_model'

resolveBillingModel(project, client) → BillingModel
  // single resolver — future Engagement entity slots in here

recognizeRevenue({ entity, sessions, period, client }) → { amount: number, reason: Reason }
  switch resolveBillingModel(entity, client)
    Hourly      → sumBillableLaborValue(sessions ∈ period)
    Retainer    → cyclesEndingIn(period) × monthlyContractValue
    FixedFee    → entity.completed_at ∈ period ? contract_value : 0
    Milestone   → { 0, 'unknown_model' }  (reserved)
    Subscription→ { 0, 'unknown_model' }  (reserved)

effectiveRate(revenue, hours)            → number | null
profitability({ revenue, laborValue, hours, estimatedHours }) →
  { marginAbs, marginPct, tone: 'excellent'|'on_track'|'attention'|'unprofitable',
    drivers: Array<{ kind, label, value }> }
hoursVariance(actual, estimated)         → { delta, pct, tone }
```

Aggregators (also pure):
```text
recognizeClientRevenue(client, projects, sessions, period) → number
recognizeWorkspaceRevenue(clients, projects, sessions, period) → number
```

The DB trigger calls equivalent SQL logic; the TS service is the single source on the client. Both follow the same rules, validated by the verification suite.

## UI — Phase 1 surfaces (only)

- **ClientDetail header + Billing tab** — Billing Model chip, default contract amount where applicable, Effective Rate, Profitability tone. Retainer Usage block: the $ figure now comes from `monthlyContractValue`, hours block unchanged.
- **Project cards (ClientDetail Work tab, Projects list, ProjectDetail header)** — replace "Revenue" with:
  - Project Value
  - Estimated vs Worked + **Hours Variance chip** (`−10h` / `+25h`)
  - Effective Rate
  - Profitability tone chip (Excellent / On track / Needs attention)
- **Retainer cycle card (ClientDetail + Portal Retainer tab)** — header reads "Monthly value · $X". Carryover/usage breakdown unchanged.
- **Client list (`Clients.tsx`)** — `Lifetime` column reflects new recognition for retainer/fixed-fee clients (driven by recomputed aggregate).
- **Client/Project edit forms (`ClientEdit.tsx`, `Modals.tsx`)** — Billing Model selector + Monthly Contract Value / Contract Value inputs (conditional). Project form shows "Inherit from client" option.

**Out of scope (Phase 2):** Home dashboard, Insights, Forecast, Invoicing summaries, Notifications, Webhooks payloads, Forward Signals.

## Coexistence

Phase 2 surfaces continue reading `lifetime_revenue` / `monthly_earnings`. Because the trigger now computes those via recognition logic, those screens display correct numbers automatically — only their copy and visualization remain wrong until Phase 2.

## Verification suite (`src/lib/__tests__/revenue.fixtures.ts`)

Manual fixtures + assertions for:

1. Hourly client, mixed billable/non-billable sessions.
2. Retainer client **under** allotted hours — revenue = monthly value, effective rate > nominal rate.
3. Retainer client **over** allotted hours (14.2h on $800/10h) — revenue = $800, effective rate $56.34/hr.
4. Fixed Fee project completed **under** estimate (90h of 100h, $10k) — revenue $10k, rate $111.11/hr, variance −10h, tone Excellent.
5. Fixed Fee project completed **over** estimate (125h of 100h, $10k) — revenue $10k, rate $80/hr, variance +25h, tone Needs attention.
6. **Mixed client** — one Retainer project + one FixedFee project + one Hourly project; per-engagement revenue resolved independently, summed correctly.
7. **Zero-hour project** — no division by zero, effective rate returns null, profitability tone defaults to On track.
8. **Archived projects** — excluded from active aggregates but included in lifetime revenue if completed.
9. **Carryover retainer hours** — carryover consumed first; recognized revenue still = monthly value (independent of carryover).
10. DB parity: `sum(labor_value) = sum(revenue)` post-backfill (psql spot-check).

## Files

**New**
- `supabase/migrations/<ts>_financial_foundation.sql`
- `src/lib/revenue.ts`
- `src/lib/__tests__/revenue.fixtures.ts`

**Modified**
- `src/data/dataApi.ts` — snake/camel maps for `billing_model`, `contract_value`, `monthly_contract_value`, `completed_at`, `labor_value`; session writes mirror `revenue` ↔ `labor_value`.
- `src/integrations/supabase/types.ts` — regenerated post-migration.
- `src/pages/ClientDetail.tsx`, `ClientEdit.tsx`, `Clients.tsx`, `Projects.tsx`, `ProjectDetail.tsx`, `ClientPortal.tsx`.
- `src/components/Modals.tsx`.
- `supabase/functions/portal-view/index.ts` — emits `monthlyContractValue`, `billingModel`, `contractValue`.
- `supabase/functions/run-recurring-sessions/index.ts` — writes `labor_value` alongside `revenue`.

## What this phase does NOT do

- Touch Insights, Home, Forecast, Invoice totals, Forward Signals, or notification copy.
- Drop `revenue` or `model` columns.
- Change invoice math (already line-item based).
- Introduce Milestone/Subscription beyond reserving enum slots.
- Expose "Labor Value" anywhere in the UI.

After approval of the migration, I'll land the service + UI in a single follow-up batch.
