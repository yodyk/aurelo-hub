# Income & Expenses Workspace

A new financial workspace in Aurelo for tracking income, business expenses, estimated profit, and a planning-only tax reserve. Estimation and recordkeeping only — never presented as an official tax calculation.

## What exists today (verified)

- Sidebar nav is a static list in `src/pages/Root.tsx`; financial destinations (`/invoicing`, `/insights`) are gated by `requiresFinancials` and plan features.
- Income-bearing entities today: `invoices` (with `status`, `paid_date`, `total`, `currency`), `clients` (retainer fields: `monthly_contract_value`, `retainer_cycle_start/days`), `projects` (`contract_value`, `completed_at`), `sessions` (hourly labor). There is **no separate payments table** — a paid invoice is the payment record.
- `src/lib/revenue.ts` is the existing recognition engine (Hourly / Retainer / FixedFee) and stays the source of truth for projected/recognized amounts.
- Existing primitives to reuse: `ui/table`, `ui/date-picker`, `ui/popover`, `ui/badge`, `ui/switch`, `NumericCell`, `EmptyState`, `formatMoney/formatPercent/formatDate`, workspace settings via `workspace_settings` (section + jsonb).

## Income source-of-truth hierarchy (no double counting)

Deterministic precedence per underlying income event:

1. Paid invoice → canonical actual income (Aurelo has no separate payment entity; partial payments are not modeled today, so each invoice yields one row; the schema keeps room for per-payment rows later).
2. Unpaid/sent invoice → the same event as Projected/Invoiced, never additionally counted from its project or retainer.
3. Retainer period for a client with no invoice covering that period → recognized retainer income.
4. Project contract value with no invoice → projected income only.
5. Manual income → always independent.

Suppression keys link source rows (project id, client + retainer period, invoice id) so a project covered by an invoice is displayed as a relationship (`Project Name · Invoice #1042`) rather than a second amount.

## Data model (new tables, workspace-scoped, RLS + GRANTs)

- `finance_settings` — one row per workspace: estimated tax rate, tax year, currency, recognition method (cash/accrual), optional jurisdiction label.
- `income_entries` — `source_type` (project | retainer | invoice | manual), `source_id`, `source_key` (unique per workspace, drives idempotent upsert), `source_amount`, `override_amount`, `included`, `status`, recognition date, client/payer, description, notes.
- `expense_categories` — workspace-configurable; Schedule C-style seed list when jurisdiction is US.
- `expenses` — name, vendor, category, recurrence, amount behavior (fixed | variable | base_plus), default business-use %, inclusion state (included/excluded/needs_review), start/end date, active flag, notes.
- `expense_instances` — date, status (scheduled | needs_amount | confirmed | ignored), base amount, business-use % override, notes, `series_key` unique per expense+date for idempotent generation.
- `expense_instance_additions` — named top-ups (label + amount).

All money columns are `numeric(14,2)`; all tables carry `workspace_id`, timestamps, indexes on `(workspace_id, date)`, and RLS scoped through `get_user_workspace_ids()`.

## Page structure

Route `/income-expenses`, sidebar entry "Income & Expenses" (`Receipt` icon from lucide), placed after Invoices, gated by `requiresFinancials`.

- Header: period selector (This Year, Q1–Q4, Custom), Actual / Actual + Planned toggle, workspace currency, Tax Estimate Settings, Export CSV, last-synced text. Tab, period, and filters live in the URL query string.
- Overview band (one compact hairline band, not floating cards): Recognized Income, Business-Use Expenses, Estimated Profit, Estimated Tax Reserve (`~$4,280`, never negative), Estimated Available. Small income-vs-gross-expense comparison bar, secondary to numbers.
- Persistent subtle disclaimer: "This is a planning estimate based on the rate and records you provide. It is not tax advice or a tax return calculation."
- No tax rate is assumed: with no rate set, reserve cells show a setup prompt.

### Income tab

Columns: Recognition Date, Source (links to project/invoice/client), Client/Payer, Type, Description, Status (Projected / Invoiced / Partially Paid / Paid / Excluded), Amount, Tax Reserve at current rate, Notes, actions. Amount cell supports inline override with "Overridden" marker, original amount beneath, and "Reset to source amount". Exclusion toggles inclusion without deleting the source. Sticky footer: visible count, effective total, projected total, gross reserve; labelled "Filtered Total" when filters are active.

### Expenses tab

Parent rows expand to instances. Parent columns: Expense, Vendor, Category, Amount Behavior, Frequency, Business Use, Instances, Gross Total, Business-Use Total, Estimated Reserve Reduction, inline-editable Notes, actions. Instance rows: Date, Status, Base Amount, Additions, Instance Total, Business-Use %, Business-Use Amount, Notes, actions — with per-instance business-use override that leaves the expense default untouched.

Recurrence generation is idempotent (unique series key per expense+date), never rewrites confirmed history, offers "This instance only" / "This and future" when editing a series, preserves history on pause, and confirms deletes with an undo toast. Variable expenses generate `needs_amount` instances rather than assuming last amount. Manual instances can be added for irregular charges.

Sticky footer: expense count, instance count, gross spend, business-use amount, estimated reserve reduction.

## Formulas

```text
Recognized Income      = Σ effective income amounts (included, in period)
Business-Use Expenses  = Σ instance total × business-use %   (included, confirmed)
Estimated Profit       = Recognized Income − Business-Use Expenses
Estimated Tax Reserve  = max(0, Estimated Profit) × tax rate
Estimated Available    = Recognized Income − gross confirmed expenses − Reserve
Row Tax Reserve        = effective income amount × tax rate
Instance Total         = base + Σ additions
Reserve Reduction      = business-use total × tax rate
```

## Table behavior

Shared table shell used by both tabs: search, header sorting, tab-relevant filters, Clear All Filters, column visibility, sticky header, sticky footer, horizontal scroll with left-pinned identity column and right-pinned amount/actions, empty / loading / saving / sync-error / no-results states, CSV export of the active tab and period. Click-and-drag panning on non-interactive header space (`grab`/`grabbing`, selection suppressed, interactive controls unaffected, native touch scrolling preserved). Inline editing: click or Enter to edit, Enter commits, Escape cancels, notes multiline saving on blur or Cmd/Ctrl+Enter, Saving/Saved/Error feedback, currency and 0–100 percent validation with corrective messages.

## Edge cases covered

Negative income/refunds, expense credits, missing tax rate, zero income, expenses exceeding income, archived or deleted sources, source amount changing under an active override, mid-year recurrence start/end, several recurring items per vendor, empty periods, projected items with no confirmed amount, and empty filter results. Reserve never renders negative. Totals use the workspace base currency; incompatible currencies are never summed silently.

## Technical notes

- Migrations add the six tables with foreign keys, indexes, `ENABLE ROW LEVEL SECURITY`, workspace-scoped policies, and explicit GRANTs to `authenticated` / `service_role`.
- New `src/data/financeApi.ts` follows the existing snake_case↔camelCase mapping and `workspace_id` scoping conventions; income sync composes `src/lib/revenue.ts` rather than re-deriving revenue.
- Money handled as integer-cent-safe decimals in the client, persisted as `numeric`.
- Vitest coverage for the formulas, override behavior, recurrence generation idempotency, and income deduplication.
- Scope excludes filing, bank connections, deductibility claims, tax forms, and receipt uploads (model left extensible).

## Files

New: `src/pages/IncomeExpenses.tsx`, `src/data/financeApi.ts`, `src/lib/finance/{recognition,recurrence,formulas}.ts`, `src/components/finance/*` (overview band, income table, expense table, instance rows, add/edit panels, tax settings panel, shared data-table shell), tests under `src/lib/__tests__/`.
Edited: `src/routes.tsx` (route), `src/pages/Root.tsx` (nav item), migration files.
