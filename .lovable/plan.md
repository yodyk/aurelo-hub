# Financial Integrity Audit — Report Only (No Implementation)

Deliverable: a written, evidence-backed audit at `docs/financial-integrity-report.md`. No financial logic is rewritten, no data is touched, and the diagnostics page is specified but not built. Implementation waits for your review of the findings and canonical definitions.

## What I already confirmed

A recognition engine exists at `src/lib/revenue.ts` (`recognizeRevenue`, `recognizeClientRevenue`, `recognizeWorkspaceRevenue`, `profitability`, `sumLaborValue`, `resolveBillingModel`, `hoursVariance`, `effectiveRate`), and it already separates `laborValue` from recognized revenue.

Several screens compute financial values without it: `src/pages/Invoicing.tsx` filters invoice `status` inline for outstanding/paid/overdue; `src/pages/Clients.tsx` and `src/pages/ClientDetail.tsx` sum the stored `clients.monthly_earnings` aggregate; `src/data/insightsMetrics.ts` sums `sessions.revenue` directly for revenue, hours, and effective rate; `src/pages/ProjectDetail.tsx`, `src/components/TeamUtilization.tsx` and `src/pages/TimeLog.tsx` each carry their own inline math.

That gives at least three parallel notions of "revenue" — the engine, the `sessions.revenue` column, and the `clients` aggregate columns maintained by `recalculate_client_aggregates` — plus invoice totals and Stripe-derived payment state. Whether they agree, and whether disagreement is intentional, is what the audit determines. Nothing is assumed wrong yet.

## Primary investigation: the revenue sources

For each of `src/lib/revenue.ts`, `sessions.revenue`, `clients.monthly_earnings` and sibling aggregates, `recalculate_client_aggregates`, invoice records, and Stripe-derived payment state, the report documents: the business event it represents; when it is computed; stored vs derived; what triggers updates; whether historical values can go stale; the date field controlling period attribution; whether it is earned, recognized, invoiced, or collected; supported billing models; excluded statuses and records; and which screens consume it. Differences are classified as intentional or defective — not assumed identical.

## Concept separation

Before any two numbers are compared, each is assigned a concept: labor value, earned, recognized, invoiced, collected, outstanding receivables, overdue receivables, draft value, contracted future revenue, forecast, recurring expected revenue, client lifetime revenue, MRR (if applicable), cash received, profit, effective hourly rate. Values are only reconciled against values of the same concept. Ambiguous UI labels are flagged separately.

## Evidence standard

Every finding carries exact references — never "lines ~142-152". Each entry states: UI label, route, component file and exact symbol (function, hook, selector, or the specific inline expression), the exact query or RPC, tables and columns, status filters, date fields, formula, currency and rounding behaviour, workspace scoping, a live-data example result, the expected result, the delta, severity, and the proposed correction.

## Audit work

1. **Inventory and lineage.** Every financial value rendered anywhere — Home, Insights, Clients, Client Detail, Project Detail, Projects, Invoicing, Time Log, Team, Client Portal, exports, notification and invoice emails, edge functions — traced component to hook to utility to query to table and column, with an ASCII dependency graph.
2. **Duplicate-logic register.** Every distinct implementation of each metric, compared rule by rule, with the one that should become canonical named.
3. **Canonical definitions.** Explicit business rules per concept: which records count, which statuses, which date field, null handling, rounding.
4. **Query audit.** Workspace scoping, archived and deleted record handling, status filters, joins, aggregation, null coalescing, and rounding across every financial query, including edge functions.
5. **Stored-aggregate staleness audit.** For `sessions.revenue`, `clients.monthly_earnings`, lifetime and true-rate columns, invoice totals, and any cached values: authoritative source, update trigger, whether every relevant mutation fires it, whether edits/deletes/imports/rate changes/billing-model changes/date changes can strand them, whether rows predate the current trigger logic, whether recalculation is deterministic, and whether prior backfills occurred. Includes read-only queries that count how many current rows disagree with their underlying data.
6. **Date and timezone audit.** For every period metric, the controlling date is named — session date, invoice issued/due/paid date, payment date, `created_at`, retainer cycle date, project `completed_at` — with day, month, year, DST, cross-midnight, and user-vs-UTC boundary behaviour verified. Any metric with no defined date basis is marked unreliable.
7. **Live-data reconciliation.** Per concept, one independent read-only SQL computation compared against the app result, with both sides' exact rules stated and every delta reported regardless of size.
8. **Cross-page consistency.** Same concept, every screen that shows it, rendered values compared using Playwright where a screen-level read is needed.
9. **Mutation and historical failure modes.** Assess downstream correctness after: session duration change, session moved across months, client rate change, project billing-model change, invoice edited after payment, partial refund, sent to void, client archived, session deleted, invoice deleted, recurring schedule change, retainer rollover, and a delayed, duplicated, or missed Stripe webhook.
10. **Regression fixtures.** Deterministic datasets and expected values defined in the report now, even though the suite itself is a later phase. The remediation plan carries the rule that every confirmed financial defect gets a regression test before or alongside its fix, and no fix counts as complete without one.

## Report structure

`docs/financial-integrity-report.md`, in this order: Executive Summary; Overall Financial Confidence Score; Critical Findings; Financial Metric Inventory; Financial Concept Definitions; Data Lineage and Dependency Map; Revenue Source Comparison; Duplicate Calculation Register; Stored Aggregate and Trigger Audit; Database Query Audit; Date and Timezone Audit; Live-Data Reconciliation Results; Cross-Page Consistency Results; UI Label and Terminology Issues; Edge-Case and Mutation Analysis; Unsupported Financial Scenarios; Severity-Ranked Defect Register; Canonical Architecture Recommendation; Required Centralized Utilities; Regression Fixture Definitions; Data Migration or Backfill Requirements; Diagnostics Page Specification; Prioritized Remediation Plan.

The Diagnostics Page section is a specification only — it derives from the approved definitions and reconciliation methodology, and is proposed as a separate later phase so unverified assumptions do not get frozen into permanent monitoring logic.

Any required data correction is documented, not executed: impacted rows, proposed migration, rollback approach, validation query, and expected before-and-after values.

## Closing summary in chat

The five highest-risk defects; the screen most likely to be showing misleading information; the most and least reliable revenue source; whether stored aggregates can be trusted; whether historical data needs recalculation; whether any user-facing metric should be temporarily hidden; and the recommended remediation order.

## Constraints

Read-only for the entire pass: `supabase--read_query` and psql SELECTs only. No logic rewrites, no backfills, no trigger or schema changes, no aggregate updates, no invoice or payment edits, no rounding changes, no deployments. The only file written is the report.

## Execution directive (approved additions)

This pass executes the audit itself — no further proposals. Approving this plan starts the read-only investigation and produces `docs/financial-integrity-report.md` as its only written output.

Additional requirements folded in:

- Every finding uses the fixed format: ID and Title; Severity (Critical/High/Medium/Low); Status (Confirmed defect / Confirmed inconsistency / Confirmed intentional difference / Unsupported scenario / Potential risk not reproducible / Unable to verify — with the exact access limitation named); financial concept; affected UI; affected files and exact symbols; database objects; current calculation; expected calculation; live-data evidence; affected record count; financial delta; root cause; user impact; recommended correction; required regression test; migration or backfill required (Yes/No/Unknown).
- Speculative phrasing ("could become stale", "may disagree") is replaced with a classification plus evidence wherever accessible code or data can settle the question.
- Reconciliation tables are mandatory for: Recognized Revenue, Session Revenue, Client Aggregates, Invoiced Revenue, Collected Revenue, Outstanding Receivables, Effective Hourly Rate, and Profitability — each with app result, independently recomputed result, delta, and affected/stale record counts. No invented numbers; where a computation cannot complete, the exact missing table, column, permission, auth context, or external dependency is named.
- Explicit inspection of `recalculate_client_aggregates`, every trigger invoking it, every stored client aggregate column, `sessions.revenue` create/update paths, invoice subtotal/tax/discount/total/balance/payment/refund/status logic, and Stripe webhook handling plus its idempotency behaviour.
- Historical integrity checks run as read-only SQL: rows predating current logic, null or inconsistent legacy session revenue, aggregate-vs-source disagreement, deleted/archived rows still counted, retroactive vs prospective rate changes, post-report invoice edits, duplicate Stripe events or payment records, orphaned financial rows, workspace-scoping failures, duplicate invoice numbers per workspace, and line-item-to-total reconciliation.
- Final determinations answer directly: production reliability; which metrics are correct, which are semantically misleading, which are incorrect; which screens disagree; the most reliable source for earned / recognized / invoiced / collected / outstanding; whether `sessions.revenue` can be trusted; whether client aggregate columns can be trusted; whether invoice status alone can drive paid and outstanding; whether a backfill or recomputation is required; whether any indicator should be temporarily hidden; and the correct remediation sequence.
- Closing chat summary includes the overall confidence score, counts of Critical/High/Medium/Low findings, the five highest-risk confirmed defects, the largest measured discrepancy, the most misleading screen, the most and least reliable sources, aggregate trustworthiness, whether historical recalculation is needed, any metrics to hide, the recommended first remediation phase, and confirmation the report file was created.

No fixes, migrations, backfills, tests, or diagnostics page are implemented in this pass.
