# Income & Expenses: Overview-first Restructure

The page currently stacks everything on one scroll: toolbar, 5 KPIs, comparison bar, disclaimer, W-2 panel, tab bar, and a 9–12 column table. This plan replaces that with an Overview landing surface plus focused sub-views, and makes the tables readable.

## New structure

```text
Income & Expenses
├─ Overview        (default)
├─ Income
├─ Expenses
└─ W-2 Context     (owner only)
```

A single segmented control under the page header switches views. Period, mode (Actual / Actual + Planned) and currency live in one compact toolbar that persists across views, so the numbers always agree. URL keeps `?view=&period=&mode=&q=`.

### Overview
- Three headline numbers only: **Income**, **Business-use expenses**, **Estimated profit**.
- One "Tax detail" disclosure below them, collapsed by default, revealing Estimated tax reserve, Available after reserve, tax rate/basis, and the "Set tax rate" action.
- The shared-scale income vs expenses comparison bar stays, directly under the three numbers.
- A quiet **Needs attention** strip: counts for Needs Review, Needs Amount, and Currency Mismatch, each a link that opens the relevant sub-view pre-filtered.
- Two small preview lists: latest 5 income rows and top 5 expenses by period total, each with "View all".
- Tax disclaimer stays dismissible, but only on Overview (not repeated on every view).

### Income / Expenses views
- Full-width table with its own toolbar row: search, status/inclusion filter, column chooser, Add, Export. No duplicate filter controls above and below the table.
- The current in-table footer total line stays as the sticky summary.

### W-2 Context
- The existing `EmploymentContextPanel` moves into its own view instead of sitting mid-page. Owner-only gating unchanged.

## Table readability

- **Column chooser**: a "Columns" popover per table with checkbox toggles, persisted per workspace in `localStorage` (`aurelo_finance_cols_income` / `_expenses`). Defaults show a lean set; everything else is opt-in.
  - Income default on: Date, Source, Client/Payer, Status, Amount. Off by default: Type, Tax reserve, Notes.
  - Expenses default on: Expense, Vendor, Category, Frequency, Instances, Business-use total. Off by default: Behavior, Business use %, Gross total, Reserve reduction, Notes.
- **No label wrapping**: every column gets a `min-width` derived from its header label (explicit per-column min widths + `whitespace-nowrap` on headers), so headers never break to two lines.
- **Visual rhythm** (breaking the uniform grey wall):
  - Money columns get a slightly sunken column tint and stay tabular/right-aligned; text columns stay flat.
  - Row identity column (Source / Expense name) gets a 2px left tone rail coloured by state: cobalt = planned, success = paid/confirmed, amber = needs review/needs amount, muted = everything else. Replaces reading the status word to know what a row is.
  - Status becomes a tone dot + label rather than plain text; planned rows lose the full-row tint (the rail carries it).
  - Category / type render as a quiet plain-text chip (hairline outline, no fill) so they read as metadata, not values.
  - Group separator: a subtle heavier hairline every time the month changes in Income, and between expense parents in Expenses.
  - Expanded expense instance rows sit on a sunken background so parent vs child is obvious.

## Technical notes

- All work is presentational; no changes to `src/lib/finance/*`, `financeApi`, `employmentApi`, recognition, or totals math.
- `src/pages/IncomeExpenses.tsx` is currently ~236 very long lines. Split into:
  - `src/components/finance/FinanceToolbar.tsx` — period, mode, currency, tax settings entry.
  - `src/components/finance/FinanceOverview.tsx` — three numbers, tax disclosure, comparison bar, attention strip, preview lists.
  - `src/components/finance/IncomeTable.tsx` and `ExpenseTable.tsx` — moved out of the page file, with column-chooser support.
  - `src/components/finance/ColumnChooser.tsx` + a `useColumnPrefs` hook.
  - `src/components/finance/FinanceTable.tsx` gains column-definition support (min widths, numeric tint, rail slot).
  - Page keeps state/loading and renders the active view.
- Colours use existing tokens only (`--primary`, `--success`, `--warning`, `--surface-sunken`, `--hairline`); 4px radius cap respected.

## Out of scope

- No changes to sync, recurrence, employment logic, or the add/edit modals' fields.
- No new dependencies.

## Verification

- `bunx tsgo --noEmit -p tsconfig.app.json` and production build pass.
- Finance + employment fixtures still pass.
- Preview check: Overview renders three numbers with tax detail collapsed; each sub-view loads; column toggles persist across reload; no header label wraps at 1280px.
