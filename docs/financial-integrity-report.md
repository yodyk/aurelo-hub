# Aurelo — Financial Integrity Report

**Audit date:** 2026-08-04 (workspace clock date confirmed via `SELECT CURRENT_DATE` → `2026-08-04`)
**Mode:** Read-only. No production data was modified. No schema, trigger, function, or row was changed during this audit.
**Scope:** Every revenue-bearing calculation, aggregate, forecast, invoice figure, and financial UI surface in the application, plus the database objects that persist financial state.

---

## 1. Executive Summary

Aurelo currently maintains **three independent, mutually inconsistent notions of "revenue"**, none of which is authoritative in practice:

| Notion | Where it lives | Value for the current month | Value all-time |
| --- | --- | --- | --- |
| **A. Engine-recognized revenue** | `src/lib/revenue.ts` → `recognizeWorkspaceRevenue()` | **$6,624.00** | n/a (period-scoped) |
| **B. Stored session labor value** | `sessions.revenue` / `sessions.labor_value` | **$655.40** | **$50,399.80** |
| **C. Stored client aggregates** | `clients.monthly_earnings` / `clients.lifetime_revenue` | **$915.40** | **$50,399.80** |

For the current month these three answers differ by **more than 10x** ($655.40 vs $6,624.00). All three are displayed to the user simultaneously on different screens, with no labelling that distinguishes them. The Home dashboard shows A, the Clients list shows C, and Insights shows B — all under headings the user reads as "revenue" or "earnings".

The single largest driver is a **conceptual conflation**: `sessions.revenue` stores the *labor value of time* (hours × rate), which for a Retainer or Fixed-Fee engagement is **not revenue at all**. The recognition engine correctly recognizes retainer contract value ($5,824 + $800 = $6,624/month), while the stored aggregates recognize only the hourly-equivalent value of hours logged ($582.40 + $73.00 = $655.40). Both numbers are "correct" for their own definition; neither is labelled, and they are freely mixed inside the same screens.

Beyond that structural issue, the audit confirms **19 findings**, including:

- Stale monthly aggregates that never reset at month rollover (two clients currently display prior-month earnings as current).
- A hard `.limit(500)` on the session loader that will silently truncate every financial total in the app once a workspace exceeds 500 sessions.
- A non-atomic invoice-number allocator that has **already produced a duplicate invoice number in production data** (two live invoices both numbered `INV-1003`).
- **20 sessions currently billed on three separate invoices simultaneously**, with no guard preventing re-invoicing.
- Project `hours` / `revenue` columns that are incremented on session create and never corrected on edit or delete, already drifted (one project stores $10,400 / 160h against **zero** linked sessions).
- A fabricated trend value (`lastMonthEarnings = monthlyEarnings × 0.88`) presented to users as a real month-over-month comparison.
- Invoice line items priced from the client's *current* rate while the session stores a *historical* value — an existing $140 discrepancy on a single DealerCX session.

**Overall determination:** the financial layer is **not currently trustworthy for reporting, forecasting, or billing decisions**. Hours tracking is sound; monetary output is not. Section 10 gives the full determination.

---

## 2. Concept Model — Definitions in Use

The audit separates the financial concepts the system conflates. The right-hand columns record what Aurelo *actually* computes today.

| Concept | Correct definition | Where Aurelo computes it | Correct today? |
| --- | --- | --- | --- |
| **Labor value** | Monetary value of time invested = hours × applicable rate. Internal only; never revenue. | `sessions.labor_value`, mirrored to `sessions.revenue`. `sumLaborValue()` in `src/lib/revenue.ts:465`. | Computed, but stored under the name `revenue` and consumed as revenue by three surfaces. |
| **Earned / recognized revenue** | Revenue the business has a right to, per the engagement's billing model and the period covered. | `recognizeRevenue()` / `recognizeClientRevenue()` / `recognizeWorkspaceRevenue()` in `src/lib/revenue.ts:223-365`. | Engine logic is coherent. Only `src/pages/Home.tsx` and parts of `src/pages/ClientDetail.tsx` use it. |
| **Invoiced** | Total of issued invoices (`status <> 'draft'`). | Derived inline in `src/pages/Invoicing.tsx:142-145` and `src/data/insightsMetrics.ts:212`. | No — `insightsMetrics.ts:212` includes drafts in "total invoiced", inflating the collection-rate denominator. |
| **Collected** | Total of invoices with `status = 'paid'`, keyed on `paid_date`. | `src/data/insightsMetrics.ts:213`; `src/pages/Invoicing.tsx:146-152` (30-day window only). | Definition is correct; the 30-day framing on the Invoicing header is not labelled as a window in the KPI value itself. |
| **Outstanding / AR** | Total of issued, unpaid invoices — `sent` **and** `overdue`. | `src/pages/Invoicing.tsx:142`. | No — filters `status === "sent"` only, so any invoice auto-marked `overdue` silently leaves the outstanding total. |
| **Projected / forecast** | Extrapolation of the variable portion of revenue to period end. | `src/pages/Home.tsx:255-268`; `src/data/insightsMetrics.ts:247-270`. | Two different, unreconciled algorithms (run-rate vs. MoM growth). |
| **Effective rate** | Revenue ÷ hours. | Four different formulas — see Finding F-12. | No. |
| **Margin / profitability** | Recognized revenue − labor value. | `profitability()` in `src/lib/revenue.ts:394`. | Formula correct; the `laborValue` input on Home is computed over an unbounded date window (F-08). |
| **Net** | Gross less tax and processing fees. | `netMultiplier` in `src/data/DataContext.tsx:122-172`. | Multiplier is applied to *unpaid* revenue and, in one place, to an hourly rate (F-13). |

---

## 3. Data Lineage — Where Money Comes From

```text
 SESSION CREATE (UI)                        SESSION CREATE (cron)
 src/components/Modals.tsx:898              supabase/functions/run-recurring-sessions:96
 revenue = Math.round(duration * rate)      revenue = rate * duration   (unrounded)
        |                                            |
        +---------------------+----------------------+
                              v
                 dataApi.addSession()  src/data/dataApi.ts:276
                 writes sessions.revenue AND sessions.labor_value
                              |
        +---------------------+----------------------------------+
        v                                                        v
 TRIGGER (x2, duplicated)                          DataContext.tsx:292
 recalculate_client_on_session_change              projects.hours += duration
 trg_recalculate_client_on_session                 projects.revenue += revenue
        -> recalculate_client_aggregates()         (create path ONLY — never
           clients.hours_logged                     decremented or corrected)
           clients.lifetime_revenue
           clients.monthly_earnings
           clients.last_session_date
           clients.true_hourly_rate
        |
        v
 READ SURFACES
   Home.tsx ............ recognizeWorkspaceRevenue()   -> concept A
   Clients.tsx ......... clients.monthly_earnings      -> concept C
   ClientDetail.tsx .... BOTH A and C on the same page
   Insights.tsx ........ sum(sessions.revenue)         -> concept B
   TimeLog.tsx ......... sum(sessions.revenue)         -> concept B
   TeamUtilization ..... sum(sessions.revenue)         -> concept B
   ProjectDetail.tsx ... projects.revenue (stored)     -> concept D (drifted)
   Invoicing.tsx ....... duration * clients.rate (live rate, not stored value)
```

The critical structural observation: **the recognition engine is bypassed by every write path and by the majority of read paths.** It is an advisory calculator layered on top of a system that persists a different number.

---

## 4. Reconciliation by Financial Concept

All figures produced by independent SQL against production data on 2026-08-04. Queries were `SELECT`-only.

### 4.1 All-time labor value vs. stored client aggregates

```sql
select (select coalesce(sum(revenue),0) from sessions where billable) as sum_billable_rev,
       (select coalesce(sum(lifetime_revenue),0) from clients)        as clients_lifetime_sum,
       (select coalesce(sum(duration),0) from sessions)               as sessions_hours_sum,
       (select coalesce(sum(hours_logged),0) from clients)            as clients_hours_sum;
```

| Measure | Sessions (live) | Clients (stored) | Delta |
| --- | --- | --- | --- |
| Lifetime billable value | $50,399.80 | $50,399.80 | **$0.00 — reconciles** |
| Total hours | 1,171.03 | 1,171.03 | **0.00 — reconciles** |

**Determination:** lifetime aggregates and hours are currently in sync. The trigger works when it fires.

### 4.2 Current-month revenue — three answers

| Source | Method | Value |
| --- | --- | --- |
| Engine (A) | `recognizeWorkspaceRevenue()` — retainer contract values | **$6,624.00** |
| Sessions (B) | `sum(revenue) where billable and date >= date_trunc('month', CURRENT_DATE)` | **$655.40** |
| Client aggregates (C) | `sum(clients.monthly_earnings)` | **$915.40** |

**Delta A − B = $5,968.60. Delta C − B = $260.00.**

The A/B gap is the retainer-recognition conflation (Finding F-01). The C/B gap is stale aggregates (Finding F-02).

### 4.3 Per-client month reconciliation (stored vs. live)

```sql
select c.name, c.monthly_earnings, s.live_month
from clients c left join lateral (
  select coalesce(sum(revenue) filter (where billable and date >= date_trunc('month', CURRENT_DATE)::date),0) live_month
  from sessions where client_id = c.id) s on true;
```

| Client | `clients.monthly_earnings` | Live month value | Delta |
| --- | --- | --- | --- |
| PCG Companies | $582.40 | $582.40 | $0.00 |
| DealerCX | $73.00 | $73.00 | $0.00 |
| **Quiet Storm** | **$60.00** | **$0.00** | **+$60.00 (stale)** |
| **St. Pete 420** | **$200.00** | **$0.00** | **+$200.00 (stale)** |
| All others | $0.00 | $0.00 | $0.00 |

### 4.4 Invoiced and collected

```sql
select number, status, total, issued_date, due_date, paid_date from invoices;
```

| Number | Status | Total | Issued | Due | Paid |
| --- | --- | --- | --- | --- | --- |
| INV-1003 | draft | $185.25 | 2026-04-16 | 2026-05-16 | — |
| INV-1001 | sent | $1,320.00 | 2026-05-06 | 2026-06-05 | — |
| INV-1002 | draft | $3,090.00 | 2026-06-29 | 2026-07-29 | — |
| **INV-1003** (duplicate number) | draft | $3,090.00 | 2026-06-29 | 2026-07-29 | — |

- **Total invoiced (issued only, `status <> 'draft'`):** $1,320.00
- **Total invoiced as Insights computes it (includes drafts):** $7,685.25
- **Total collected:** $0.00
- **Collection rate as displayed:** 0% (denominator inflated 5.8x by drafts)
- **Outstanding as Invoicing displays it:** $1,320.00 — correct today only because no invoice has been auto-marked `overdue` yet.

Line-item arithmetic reconciles on every invoice: `sum(line_items[].amount) = subtotal` for all four rows, and `subtotal + tax_amount = total` with `tax_rate = 0` throughout.

### 4.5 Project stored totals vs. live sessions

| Project | Stored hours | Live hours | Stored revenue | Live revenue | Delta |
| --- | --- | --- | --- | --- | --- |
| **JPC Website Design & Development** | 160.00 | **0.00** | **$10,400.00** | **$0.00** | **$10,400.00** |
| DealerCX Website Build | 140.00 | 140.00 | $9,100.00 | $9,100.00 | $0.00 |
| **Logo & Identity Creation** | 3.20 | **3.85** | $0.00 | $0.00 | 0.65h |
| Knaggs Guitars Website Redesign | 4.50 | 4.50 | $0.00 | $0.00 | $0.00 |
| Portfolio Redesign | 0.00 | 0.00 | $0.00 | $0.00 | $0.00 |
| Identity Package Builder Calculator | 0.00 | 0.00 | $0.00 | $0.00 | $0.00 |

### 4.6 Stored session value vs. hours × current client rate

```sql
select c.name, s.date, s.duration, s.revenue, round(s.duration*c.rate,2) as exact_value
from sessions s join clients c on c.id = s.client_id
where s.billable and abs(s.revenue - round(s.duration*c.rate,2)) > 0.004;
```

| Client | Date | Hours | Stored `revenue` | Hours × current rate | Delta |
| --- | --- | --- | --- | --- | --- |
| DealerCX | 2026-02-03 | 140.00 | $9,100.00 | $9,240.00 | **−$140.00** |
| PCG Companies | 2026-03-10 | 40.00 | $1,500.00 | $1,456.00 | +$44.00 |
| PCG Companies | 2026-03-19 | 40.00 | $1,500.00 | $1,456.00 | +$44.00 |
| PCG Companies | 2026-03-23 | 40.00 | $1,500.00 | $1,456.00 | +$44.00 |
| PCG Companies | 2026-04-03 | 24.00 | $900.00 | $873.60 | +$26.40 |
| *(6 further PCG rows, $8.80–$17.60 each)* | | | | | |

These sessions are invoiceable. The invoice builder would price them at the right-hand column; every other surface reports the left-hand column.

---

## 5. Findings Register

Classification key: **Confirmed defect** (produces a wrong number), **Confirmed inconsistency** (two correct-in-isolation answers that disagree), **Confirmed intentional difference** (divergence that is deliberate and defensible but undocumented), **Unsupported scenario** (a case the system does not handle at all).

---

### F-01 — `sessions.revenue` stores labor value but is consumed as revenue
**Classification:** Confirmed defect
**Severity:** Critical
**Evidence:**
- Write: `src/components/Modals.tsx:898` — `const revenue = billable && selectedClient ? Math.round(durationNum * selectedClient.rate) : 0;`
- Persist: `src/data/dataApi.ts:279-287` — writes the same value to both `revenue` and `labor_value`.
- Consume as revenue: `src/data/insightsMetrics.ts:125` (`totalRevenue`), `src/pages/TimeLog.tsx:86`, `src/components/TeamUtilization.tsx:74`.
- Engine's own comment contradicts this: `src/lib/revenue.ts:21-23` — *"internally we use `laborValue` … This term must NEVER appear in user-facing copy."*

**Impact:** For the two Retainer clients (PCG Companies, DealerCX — 87% of lifetime value), hours × rate is a *usage* metric, not revenue. Insights reports $655.40 of "revenue" this month against $6,624.00 actually contracted.

---

### F-02 — `clients.monthly_earnings` never resets at month rollover
**Classification:** Confirmed defect
**Severity:** High
**Evidence:** `recalculate_client_aggregates(p_client_id uuid)` recomputes `monthly_earnings` with `date >= date_trunc('month', CURRENT_DATE)`, but it is only invoked by `trigger_recalculate_client()`, which fires exclusively on INSERT/UPDATE/DELETE of `sessions`. No scheduled job recomputes it. Live proof (§4.3): Quiet Storm shows $60.00 and St. Pete 420 shows $200.00 as *this month's* earnings, while both have logged **zero** sessions since 2026-07-01 and 2026-06-02 respectively.

**Impact:** `src/pages/Clients.tsx:92` sums this column for the workspace "this month" total; `src/pages/ClientDetail.tsx:389-390` derives revenue share from it. Both are currently overstated by $260.00.

---

### F-03 — Session loader caps at 500 rows, silently truncating all financial totals
**Classification:** Confirmed defect
**Severity:** High (latent — currently 201 sessions)
**Evidence:** `src/data/dataApi.ts:253-259` —
```ts
.from('sessions').select('*, clients!inner(name)')
.eq('workspace_id', workspaceId).order('date', { ascending: false }).limit(500);
```
Every client-side financial figure — Home gross/net/projection/margin, all of Insights, TimeLog totals, TeamUtilization, the batch invoice builder — derives from this array. There is no pagination and no warning when the cap is hit.

**Impact:** At 501 sessions the oldest session silently vanishes from lifetime revenue, monthly charts, and effective-rate math, with no error. The database aggregates would then diverge permanently from the UI.

---

### F-04 — Invoice number allocation is non-atomic; a duplicate number already exists
**Classification:** Confirmed defect
**Severity:** High
**Evidence:** `src/data/invoiceApi.ts:258-279` performs a read (`select next_number`) followed by a separate write (`update next_number = num + 1`) with no transaction, no `RETURNING`, and no unique constraint on `invoices(workspace_id, number)`. Live proof: `SELECT number, total FROM invoices` returns `INV-1003 / $185.25` **and** `INV-1003 / $3,090.00` — two distinct invoices sharing one number.

**Impact:** Duplicate invoice numbers break client-side reconciliation, accounting export, and any payment matching keyed on invoice number.

---

### F-05 — Sessions can be invoiced repeatedly with no guard
**Classification:** Confirmed defect
**Severity:** High
**Evidence:** `invoices.created_from_sessions` is recorded but never checked. Session `a82db422-fa8f-4b00-9aa4-bcba5beb80f1` appears in `created_from_sessions` on **INV-1001, INV-1002, and both INV-1003 rows**. Nineteen further sessions appear on three invoices each. `src/components/BatchInvoiceBuilder.tsx:196-221` builds line items from the selected session set without consulting prior invoices.

**Impact:** $3,090.00 of the same work is presently represented on two draft invoices plus a sent invoice. Sending them would double- and triple-bill the client.

---

### F-06 — Project `hours` and `revenue` accumulate on create only, never corrected
**Classification:** Confirmed defect
**Severity:** High
**Evidence:** `src/data/DataContext.tsx:292-295` —
```ts
{ ...p, hours: (p.hours || 0) + (session.duration || 0), revenue: (p.revenue || 0) + (session.revenue || 0) }
await api.updateProject(wsId, cid, pid, { hours: ..., revenue: ... });
```
This is the only write path. No decrement on session delete, no delta on session edit, no reassignment when `project_id` changes, and no database trigger equivalent to `recalculate_client_aggregates`. Live proof (§4.5): *JPC Website Design & Development* stores 160.00h / $10,400.00 with **zero** sessions linked; *Logo & Identity Creation* stores 3.20h against 3.85h live.

**Impact:** `src/pages/ProjectDetail.tsx:265` reads `project.revenue` directly as labor value for budget burn, effective rate, and profitability. Those figures are wrong for any project whose sessions were ever edited, deleted, or re-pointed.

---

### F-07 — Fabricated month-over-month trend on the client page
**Classification:** Confirmed defect
**Severity:** High
**Evidence:** `src/pages/ClientDetail.tsx:391-392` —
```ts
const lastMonthEarnings = Math.round((client.monthlyEarnings || 0) * 0.88);
const revenueTrend = (client.monthlyEarnings || 0) > lastMonthEarnings ? "up" : ...;
```
Last month's earnings are invented as 88% of this month's. The comparison is therefore **always** "up" whenever current earnings are positive, and always "flat" at zero.

**Impact:** A directional financial indicator that is structurally incapable of showing a decline. This is not an approximation — it contains no historical data at all.

---

### F-08 — Home margin uses an unbounded labor window
**Classification:** Confirmed defect
**Severity:** Medium
**Evidence:** `src/pages/Home.tsx:236-247`. `gross` is bounded by `{ start: monthStart, end: monthEnd }`, but `monthLabor` filters with a lower bound only:
```ts
return r >= `${monthStart.getFullYear()}-${String(monthStart.getMonth()+1).padStart(2,'0')}-01`;
```
No upper bound. Any session dated after the current month is included in labor but excluded from revenue.

**Impact:** `marginAbs = current − monthLabor` understates margin whenever future-dated sessions exist. The workspace already contains sessions dated to the end of the current month; a single forward-dated entry corrupts the displayed margin percentage.

---

### F-09 — Tax rate of 0% silently falls back to the 25% default
**Classification:** Confirmed defect
**Severity:** Medium
**Evidence:** `src/data/DataContext.tsx:165-166` —
```ts
taxRate: raw.taxRate ? parseFloat(raw.taxRate) / 100 : DEFAULT_FINANCIALS.taxRate,
processingFeeRate: raw.processingFee ? parseFloat(raw.processingFee) / 100 : DEFAULT_FINANCIALS.processingFeeRate,
```
`"0"` and `0` are both falsy, so a user who deliberately sets tax to 0% receives the 25% default instead.

**Impact:** Net revenue understated by 25% for any user in a zero-tax situation, with no way to correct it through the UI.

---

### F-10 — "Outstanding" excludes invoices marked overdue
**Classification:** Confirmed defect
**Severity:** Medium
**Evidence:** `src/pages/Invoicing.tsx:142` — `active.filter((i) => i.status === "sent")`. The `overdue` status is treated as a peer of `sent` (line 143-145) rather than a substate of it.

**Impact:** Once `check-overdue-invoices` flips an invoice to `overdue`, its amount disappears from the outstanding KPI and appears only in the separate overdue chip. Total accounts receivable is never shown as one number. Not yet visible in production only because no workspace has enabled `autoMarkOverdue` (`supabase/functions/check-overdue-invoices/index.ts:44-55`).

---

### F-11 — Collection rate counts draft invoices as invoiced
**Classification:** Confirmed defect
**Severity:** Medium
**Evidence:** `src/data/insightsMetrics.ts:212` — `(invoices || []).reduce((s, i) => s + (i.total || 0), 0)` with no status filter, used as the denominator at line 214.
**Impact:** Denominator is $7,685.25 instead of $1,320.00 — a 5.8x inflation that permanently depresses the displayed collection rate.

---

### F-12 — Four incompatible definitions of "effective rate"
**Classification:** Confirmed inconsistency
**Severity:** Medium
**Evidence:**

| Location | Formula | Numerator | Denominator |
| --- | --- | --- | --- |
| `src/pages/Home.tsx:233` | `calcEffectiveRate(current, totalHours)` | recognized revenue (incl. retainer contract value) | **all** hours |
| `src/data/insightsMetrics.ts:128` | `totalRevenue / billableHours` | session labor value | billable hours only |
| `src/pages/ClientDetail.tsx:396-397` | `lifetimeRevenue / billableHours` | stored lifetime aggregate | billable hours only |
| `recalculate_client_aggregates` (DB) | `lifetime_revenue / hours_logged` | billable labor value | **all** hours incl. non-billable |
| `src/pages/ProjectDetail.tsx:272` | `revenueEarned / hoursLogged` | contract value *or* stored project revenue | project hours |

**Impact:** The same client shows different effective rates on the Clients list, the client detail page, and Insights. For DealerCX, `true_hourly_rate` is stored as $63.46 while the nominal rate is $66.00 and Insights computes a third figure.

---

### F-13 — Net multiplier applied to an hourly rate
**Classification:** Confirmed defect
**Severity:** Medium
**Evidence:** `src/pages/Insights.tsx:726` — `${applyViewMode(ranking.trueHourlyRate)}` where `applyViewMode` is `value * netMultiplier` (line 207).
**Impact:** In Net view the effective-rate column shows a rate reduced by tax + processing fees, which is not a meaningful quantity and is not labelled as such. Line 270 applies the same transform in the signal copy.

---

### F-14 — Two different forecasting algorithms, neither reconciled
**Classification:** Confirmed inconsistency
**Severity:** Medium
**Evidence:**
- `src/pages/Home.tsx:255-268`: day-of-month run-rate applied only to the hourly portion — `fixedGross + variableGross * (daysInMonth / dayOfMonth)`.
- `src/data/insightsMetrics.ts:248-261`: trailing-3-month MoM growth applied to last month's session labor value — `lastMonthRev * (1 + growthRate)`, then `projectedAnnual = projectedMonthly * 12`.

The Insights forecast inherits F-01 (labor value as revenue) and ignores retainer contract value entirely. `projectedAnnual` is a naive 12x of a single month with no seasonality or contract-term awareness.

---

### F-15 — Session value is a rate snapshot; invoicing uses the live rate
**Classification:** Confirmed inconsistency
**Severity:** Medium
**Evidence:**
- Stored: `src/components/Modals.tsx:898` — `Math.round(durationNum * selectedClient.rate)` at time of entry, whole dollars.
- Invoiced: `src/components/BatchInvoiceBuilder.tsx:205-211` and `src/pages/Invoicing.tsx:1512` — `Math.round((s.duration || 0) * rate * 100) / 100` using the client's **current** rate, two decimals.

Live proof (§4.6): the DealerCX 2026-02-03 session stores $9,100.00 but would invoice at $9,240.00 (a $140.00 gap from a rate change); ten PCG sessions differ by $8.80–$44.00 each in the other direction from whole-dollar rounding.

**Impact:** Invoice totals will never tie to reported revenue for any client whose rate has changed, and are systematically off by up to $0.99 per session otherwise.

---

### F-16 — Two rounding conventions for session value
**Classification:** Confirmed inconsistency
**Severity:** Low
**Evidence:** UI path rounds to whole dollars (`Math.round(durationNum * rate)`, `src/components/Modals.tsx:898` and `:1657`). The recurring-session cron does not round at all (`const revenue = rule.billable ? rate * Number(rule.duration) : 0;`, `supabase/functions/run-recurring-sessions/index.ts:96`).
**Impact:** Two sessions with identical hours and rate store different values depending on origin.

---

### F-17 — Insights parses a localized display string to derive month buckets
**Classification:** Confirmed defect
**Severity:** Medium
**Evidence:** `src/data/dataApi.ts:271` overwrites `s.date` with `dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` — e.g. `"Aug 4, 2026"`. The canonical ISO value survives only as `s.rawDate`. `src/data/insightsMetrics.ts:95-98` then does `new Date(dateStr)` on that display string to build `monthKey`, and `:156` and `:222` bucket monthly revenue and the profitability heatmap from it.
**Impact:** Month bucketing depends on `Date`'s tolerance for a locale-formatted string. Any change to the display format, or a non-`en-US` formatting path, silently mis-buckets or NaNs every month in the revenue trend chart and heatmap. The project memory rule *"`rawDate` is the source of truth"* is violated here.

---

### F-18 — Invoice aging uses UTC-parsed dates against a local clock
**Classification:** Confirmed defect
**Severity:** Low
**Evidence:** `src/data/insightsMetrics.ts:106-108` — `daysBetween(a, b)` uses `new Date(dateStr)`. A bare `YYYY-MM-DD` is parsed as **UTC midnight**, while `now.toISOString()` (line 206) reflects the actual instant. `src/lib/revenue.ts:163-166` gets this right with an explicit `parseLocalDate`; `insightsMetrics.ts` does not.
**Impact:** Invoices land in the adjacent aging bucket on the boundary day for users west of UTC, and `avgDaysToPay` / `medianDaysToPay` can be off by one day.

---

### F-19 — Duplicate triggers run the same aggregate recalculation twice
**Classification:** Confirmed inconsistency
**Severity:** Low
**Evidence:** `pg_trigger` lists both `recalculate_client_on_session_change` and `trg_recalculate_client_on_session` on `public.sessions`, each AFTER INSERT/UPDATE/DELETE FOR EACH ROW, both `EXECUTE FUNCTION trigger_recalculate_client()`.
**Impact:** Every session write performs the full per-client aggregate recomputation twice. Not incorrect, but doubles write cost and doubles the window for lock contention on `clients`.

---

## 6. Unsupported Scenarios

These are cases the system does not model at all. They are not defects in existing code; they are gaps that will produce silently wrong numbers if a user enters them.

| Scenario | Why unsupported | Evidence |
| --- | --- | --- |
| **Milestone billing** | Enum slot exists; recognition returns 0 with `reason: 'unknown_model'`. | `src/lib/revenue.ts:274-276` |
| **Subscription billing** | Same — returns 0. | `src/lib/revenue.ts:274-276` |
| **Partial invoice payment** | `invoices.status` is a single enum with no `amount_paid` column; an invoice is entirely paid or entirely unpaid. | Schema: `invoices` has `total`, `paid_date`, no partial-payment field |
| **Credit notes / refunds** | No negative-amount invoice type and no refund record. `stripe--create_refund` exists at the platform level but writes nothing back to `invoices`. | No `credit_note` or refund table in schema |
| **Multi-currency reporting** | `invoices.currency` is per-invoice, but every aggregate sums `total` across rows with no FX conversion. | `src/data/insightsMetrics.ts:212`, `src/pages/Invoicing.tsx:142` |
| **Rate history** | `clients.rate` is a single mutable scalar. Changing it silently re-prices every un-invoiced historical session (F-15). | Schema: `clients.rate numeric`, no history table |
| **Retainer overage billing** | `retainer_remaining` can go negative but no surface converts overage hours into billable revenue. | `supabase/functions/reset-retainers/index.ts:73-131` |
| **Mid-month retainer start or termination** | `recognizeRevenue` for Retainer recognizes the full `monthlyContractValue` for every calendar month touched by the period, with no proration. | `src/lib/revenue.ts:249-260` |
| **Fixed-fee revenue before completion** | Engine recognizes 0 until `completedAt` falls in the period, so a 6-month fixed-fee project reports zero revenue for 5 months and then the entire amount. | `src/lib/revenue.ts:262-272` |

---

## 7. Mutation Failure Modes

What happens to financial state when the underlying records change.

| Mutation | Client aggregates | Project totals | Invoices | Verdict |
| --- | --- | --- | --- | --- |
| **Create session** | Recalculated correctly (twice — F-19). | Incremented client-side (`DataContext.tsx:292`). | Unaffected. | OK |
| **Edit session hours/value** | Recalculated correctly. | **Not adjusted** — the delta is lost. | If already invoiced, the invoice still shows the old amount and is never flagged. | **Broken** (F-06) |
| **Delete session** | Recalculated correctly (`trigger_recalculate_client` handles `TG_OP = 'DELETE'`). | **Not decremented** — hours and revenue remain. | `created_from_sessions` retains a dangling ID; the line item persists. | **Broken** (F-06) |
| **Move session to another project** | Recalculated (client unchanged). | **Neither** project adjusted — origin keeps the value, destination never receives it. | Unaffected. | **Broken** (F-06) |
| **Move session to another client** | Both old and new client recalculated — `trigger_recalculate_client()` explicitly handles `OLD.client_id IS DISTINCT FROM NEW.client_id`. | Not adjusted. | Unaffected. | Partially OK |
| **Change client rate** | `lifetime_revenue` unchanged (stored snapshots), so the aggregate stays historically correct. | Unchanged. | **Future invoices re-price all historical sessions at the new rate.** | **Broken** (F-15) |
| **Delete invoice** | Unaffected. | Unaffected. | Sessions become silently re-invoiceable with no record that they were previously billed. | Gap (F-05) |
| **Void invoice** | Unaffected. | Unaffected. | Status set to `voided`; excluded from `active` filters in `Invoicing.tsx` but **still counted** in `insightsMetrics.ts:212` total invoiced. | **Broken** (F-11) |
| **Delete client** | CASCADE removes sessions and invoices. | CASCADE. | CASCADE. | OK |
| **Month rollover** | `monthly_earnings` **not** recomputed until the next session write. | n/a | n/a | **Broken** (F-02) |
| **Retainer cycle reset** | `reset-retainers` writes `retainer_history` with `revenue = hoursUsed * rate` — labor value again, not contract value. | n/a | n/a | Inconsistent (F-01) |

---

## 8. Date and Timezone Semantics

| Location | Parsing method | Timezone behaviour | Correct? |
| --- | --- | --- | --- |
| `src/lib/revenue.ts:163-166` | `parseLocalDate` — explicit `new Date(y, m-1, d)` | Local midnight | **Correct** |
| `src/data/dataApi.ts:266` | `parseLocalDate` | Local midnight | **Correct** |
| `src/data/insightsMetrics.ts:96` | `new Date(displayString)` | Depends on locale format string | **Fragile** (F-17) |
| `src/data/insightsMetrics.ts:107` | `new Date('YYYY-MM-DD')` | **UTC** midnight, compared against a local `now` | **Incorrect** (F-18) |
| `recalculate_client_aggregates` | `date_trunc('month', CURRENT_DATE)` | Database session timezone | Correct within the DB, but the DB timezone is not the user's |
| `check-overdue-invoices/index.ts:31` | `new Date().toISOString().split("T")[0]` | **UTC** date | Off by up to a day for non-UTC users |
| `run-recurring-sessions/index.ts` | Local date construction (fixed in a prior turn) | Local | Correct |
| `src/pages/Home.tsx:204-208` | `new Date()` + `setDate(1)` / `setHours(0,0,0,0)` | Local | **Correct** |

**Determination:** the recognition engine and the dashboard use consistent local-date semantics. Insights and the invoice cron do not. A user in UTC−5 logging a session at 8 PM on the last day of the month can see it counted in the following month by the overdue cron and the aging buckets, while the dashboard counts it correctly.

---

## 9. Regression Fixtures

These are the cases a future test suite must cover. Each is defined by inputs and the expected output under the corrected model. **No test code was written as part of this audit.**

**Recognition engine**

| # | Setup | Expected |
| --- | --- | --- |
| R-1 | Hourly client, rate 100, two 2h billable sessions in period, one 2h non-billable | 400.00, `reason: 'ok'` |
| R-2 | Retainer client, `monthlyContractValue` 5000, period = one calendar month, zero sessions | 5000.00, `reason: 'ok'` |
| R-3 | Retainer client, `monthlyContractValue` 5000, period = Jan 1 – Mar 31 | 15000.00 |
| R-4 | Retainer client, `monthlyContractValue` 0 | 0.00, `reason: 'no_contract'` |
| R-5 | FixedFee project, `contractValue` 8000, `completedAt` inside period | 8000.00, `reason: 'ok'` |
| R-6 | FixedFee project, `contractValue` 8000, `completedAt` null | 0.00, `reason: 'not_completed'` |
| R-7 | FixedFee project, `completedAt` outside period | 0.00, `reason: 'not_completed'` |
| R-8 | Retainer client with one Retainer project — verify no double count | contract value counted **once** |
| R-9 | Milestone / Subscription model | 0.00, `reason: 'unknown_model'` |
| R-10 | Session dated the last day of the period at 23:59 local | included |
| R-11 | Session dated one day after `period.end` | excluded |

**Aggregate consistency**

| # | Setup | Expected |
| --- | --- | --- |
| A-1 | Create session → read `clients.lifetime_revenue` | equals `sum(sessions.revenue where billable)` |
| A-2 | Delete session → read `clients.lifetime_revenue` | decremented to match live sum |
| A-3 | Edit session duration → read `projects.hours` | equals `sum(duration)` for the project |
| A-4 | Delete session → read `projects.revenue` | equals live sum, not the pre-delete value |
| A-5 | Move session between projects | origin decremented, destination incremented |
| A-6 | Advance clock past month boundary with no writes | `clients.monthly_earnings` reads 0 |

**Invoicing**

| # | Setup | Expected |
| --- | --- | --- |
| I-1 | Two concurrent `getNextInvoiceNumber()` calls | two distinct numbers |
| I-2 | Invoice a session already on another invoice | rejected or explicitly flagged |
| I-3 | `taxInclusive = true`, line total 1200, rate 0.20 | subtotal 1000.00, tax 200.00, total 1200.00 |
| I-4 | `taxInclusive = false`, line total 1000, rate 0.20 | subtotal 1000.00, tax 200.00, total 1200.00 |
| I-5 | Invoice status `overdue` | included in the outstanding total |
| I-6 | Invoice status `draft` or `voided` | excluded from total invoiced |
| I-7 | Client rate changed after session logged | line item priced at the session's stored value |

**Presentation**

| # | Setup | Expected |
| --- | --- | --- |
| P-1 | `taxRate` setting = 0 | `netMultiplier = 1 − 0 − processingFee` |
| P-2 | Net view on an effective-rate column | rate shown gross, or the transform removed |
| P-3 | Client with no prior-month sessions | trend renders "—", not "up" |
| P-4 | 501+ sessions in a workspace | all sessions included in totals |

---

## 10. Determination

**Can the financial figures Aurelo currently displays be relied upon?**

**No — not for reporting, forecasting, or billing.** Specifically:

| Domain | Determination | Basis |
| --- | --- | --- |
| **Hours tracking** | **Reliable.** | Sessions and client `hours_logged` reconcile exactly (1,171.03 = 1,171.03). Project hours do not (F-06). |
| **Lifetime revenue** | **Reliable as labor value; unreliable as revenue.** | Reconciles to the cent against sessions, but measures the wrong concept for retainer and fixed-fee engagements (F-01). |
| **Current-month revenue** | **Unreliable.** | Three answers spanning $655.40 to $6,624.00, all displayed concurrently (§4.2), with $260.00 of confirmed staleness (F-02). |
| **Project financials** | **Unreliable.** | Confirmed $10,400.00 of stored revenue against zero sessions (§4.5); no correction path on edit or delete (F-06). |
| **Invoicing** | **Unreliable and actively risky.** | A duplicate invoice number and $3,090.00 of triple-billed sessions exist in live data right now (F-04, F-05). |
| **Forecasting** | **Unreliable.** | Two unreconciled algorithms, one built on the wrong revenue concept (F-14). |
| **Effective rate** | **Unreliable.** | Four incompatible formulas across five surfaces (F-12). |
| **Trend indicators** | **Not real data.** | The client-page month-over-month trend is a hardcoded 0.88 multiplier (F-07). |
| **Net figures** | **Unreliable at the boundary.** | A 0% tax setting silently becomes 25% (F-09); the multiplier is misapplied to rates (F-13). |
| **Date semantics** | **Correct in the engine and dashboard; incorrect in Insights and the invoice cron.** | §8. |

**Root structural cause.** `src/lib/revenue.ts` was built as the single source of financial truth, and its internal logic is sound. But it was layered on top of a system that already persisted a different number under the same name, and it was never made the write path or the sole read path. The result is an advisory calculator that four of seven financial surfaces ignore. Until `sessions.revenue` is retired in favour of `labor_value`, and every read surface routes through the engine, any individual fix will only shift which of the three answers a given screen shows.

**Highest-leverage remediation order** (for the follow-up phase — nothing below was executed):

1. Remove the 500-row session cap (F-03) — currently latent, becomes catastrophic and irreversible in reporting terms once crossed.
2. Add a unique constraint on `invoices(workspace_id, number)` and make number allocation atomic; block re-invoicing of already-billed sessions (F-04, F-05).
3. Move project `hours` / `revenue` to a database trigger mirroring `recalculate_client_aggregates` (F-06).
4. Recompute `monthly_earnings` on a schedule, or derive it on read instead of storing it (F-02).
5. Route Insights, TimeLog, and TeamUtilization through the recognition engine and rename the labor-value concept in the UI (F-01, F-12).
6. Remove the fabricated trend (F-07) and the remaining arithmetic defects (F-08 through F-19).

---

*Read-only audit. No production data, schema object, or application file other than this report was modified.*
