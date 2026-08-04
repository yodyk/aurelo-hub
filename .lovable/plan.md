# Financial Integrity Audit — Phase 1 (Report First)

Goal: produce a complete, evidence-backed Financial Integrity Report for Aurelo, plus an owner-only diagnostics page that keeps checking the numbers after the audit. No financial logic gets rewritten in this pass — every finding lands in the report with a severity and a proposed fix for you to approve.

## What I already confirmed

A canonical revenue engine exists at `src/lib/revenue.ts` (`recognizeRevenue`, `profitability`, `sumLaborValue`, `resolveBillingModel`, `hoursVariance`) and is used by Insights, Client Detail, and the Client Portal.

Alongside it, several screens compute financial values with their own inline math rather than the engine:

- `src/pages/Invoicing.tsx` — outstanding/paid/overdue derived by filtering invoice `status` inline (lines ~142-152)
- `src/pages/Clients.tsx` and `src/pages/ClientDetail.tsx` — workspace revenue summed from the stored `clients.monthly_earnings` aggregate
- `src/data/insightsMetrics.ts` — revenue/hours/effective rate summed straight from `sessions.revenue`
- `src/pages/ProjectDetail.tsx` — its own effective-rate and average-rate math
- `src/components/TeamUtilization.tsx`, `src/pages/TimeLog.tsx` — session revenue sums

So there are at least three parallel notions of "revenue": the recognition engine, the `sessions.revenue` column, and the `clients` aggregate columns maintained by the `recalculate_client_aggregates` trigger. Whether these agree on real data is exactly what the audit measures — I am not assuming any of them is wrong yet.

## Audit work

1. **Inventory + dependency map.** Enumerate every financial value rendered anywhere (dashboard, Insights, Clients, Client Detail, Project Detail, Invoicing, Time Log, Portal, exports, notification emails, edge functions) and map each one back through component → hook → utility → query → table/column. Delivered as a table plus an ASCII dependency graph.

2. **Duplicate-logic register.** For each metric, list every distinct implementation, compare their rules side by side, and name the one that should become canonical.

3. **Canonical definitions.** Write the explicit business rule for each KPI: gross revenue, recognized revenue, collected/paid, outstanding, overdue, draft, projected/forecast, monthly and annual revenue, lifetime value, effective hourly rate, billable vs non-billable hours, utilization, retainer consumption and carryover, project profitability. Each definition states which records count, which status values, which date field, and how nulls and rounding behave.

4. **Query audit.** Review every financial query for workspace scoping, archived/inactive client handling, status filters, date-field choice (`created_at` vs `issued_date` vs `paid_date` vs session `date`), timezone boundaries on month/year cutoffs, null coalescing, and rounding.

5. **Reconciliation against live data.** For each major KPI, recompute the value with independent read-only SQL over your real workspace and diff it against what the app renders. Every discrepancy is reported with its size, the two computations, and the suspected cause.

6. **Cross-page consistency.** Take the same metric on every screen that shows it and compare rendered values, using Playwright against the running app where a screen-level read is needed.

7. **Edge-case validation.** Walk the list you gave (partial payments, refunds, voids, deletes, archived clients, invoice edits after payment, taxes and discounts, cross-month/cross-year invoices, retainer cycle boundaries, duplicate or orphaned records, missing Stripe IDs, failed syncs) against both the schema and real rows, and record which cases the current model cannot represent correctly.

## Owner-only diagnostics page

A new route (owner role only, not in main navigation) that runs the reconciliation checks live:

- revenue, invoice, client-total, outstanding, payment and profitability reconciliation, each showing engine value vs independent value vs delta
- forecast validation against realised results
- orphan invoice / orphan session / duplicate invoice-number detection
- invalid totals (line items not summing to `subtotal`, tax mismatches, negative balances)
- last successful reconciliation timestamp and an overall financial health score

Checks run through a single edge function using validated read-only aggregate queries, so the page reflects server truth rather than client state.

## Deliverable

A written report covering all thirteen items you listed — inventory, dependency graph, duplicate list, inconsistent rules, query issues, UI inconsistencies, cross-page disagreements, reconciliation results, edge-case failures, architectural recommendations, the list of centralized utilities that should exist, a confidence score, and a severity-ranked remediation plan. Saved into the repo as `docs/financial-integrity-report.md` so it stays reviewable, and summarised in chat.

## Technical notes

- Read-only throughout: `supabase--read_query` and psql SELECTs for reconciliation, no migrations, no data writes, no refactors.
- The diagnostics page is the only shipped code in this pass: one route, one edge function, one results component.
- Skipping the automated test suite (Phase 9) for now, per your answer. The report will still specify the fixture datasets so it can be added later without re-deriving the expectations.
- Rounding and currency handling will be assessed but not changed until you approve the remediation plan.
