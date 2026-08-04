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
