# Final Polish Phase — P4/P5 Sweep (in progress)

## Shipped this turn (P5 surface sweep — first pass)

Formatter helpers now drive these surfaces:

- **`src/pages/Invoicing.tsx`** — local `formatCurrency`/`formatDate`/`shortDate` delegate to `formatMoney`/`formatDate`; tax-rate lines via `formatPercent`; outstanding-invoice row via `formatMoney`.
- **`src/pages/ProjectDetail.tsx`** — local `formatDate` delegates to `formatDateFn`; budget/spent and session revenue via `formatMoney`; file size via `formatBytes`.
- **`src/components/BatchInvoiceBuilder.tsx`** — local helpers delegate to lib/format.
- **`src/pages/Clients.tsx`** — monthly subtitle (compact) + per-row earnings via `formatMoney`.
- **`src/pages/TimeLog.tsx`** — week-accrued (compact) + per-group revenue via `formatMoney`.
- **`src/pages/Home.tsx`** — overdue-invoice detail, scope-creep detail, month delta (`formatPercent`), projected total, revenue-by-client rail.
- **`src/pages/Insights.tsx`** — chart tooltip ($, Gross/Net/Collected), Y-axis tick formatters (compact), forecast tiles, heatmap revenue cells, client-ranking earnings.
- **`src/pages/ClientDetail.tsx`** — masthead effective rate + lifetime; identity card base/effective rate; KPI block (monthly/effective/lifetime); pacing chip; project table value + effective rate; session revenue cell; retainer MetricCards; retainer history avg/total revenue + per-cycle revenue; file size helper.
- **`src/pages/ClientEdit.tsx`** — retainer monthly-value chip.
- **`src/pages/ClientPortal.tsx`** — `fmt$`/`fmtHours`/`fmtDate` delegate to lib/format.
- **`src/pages/Projects.tsx`** — active/total value stat tiles + per-row totalValue, effective rate, earned line.
- **`src/components/TeamUtilization.tsx`** — team-revenue KPI tile + per-row revenue cell.

## Remaining (next turn — finish P5, then P4 numeric prop, then P6)

- **Modals.tsx** — 7 remaining `${...toLocaleString()}` and `.toFixed(1)` spots (retainer chips, session totals, project budget bar, weekly hours, status meta).
- **Settings.tsx** — 2 `.toFixed(1)` spots (processing-fee state, tax-rate label) → `formatPercent`.
- **ClientDetail.tsx:1127** — `.toFixed(1)` 7-day hours total → `formatDuration` or local rounding.
- **Home.tsx:67** — `AnimatedNumber` uses `display.toLocaleString()`; replace with `formatCount` (or whitelist; it's a tween primitive).
- **P4 numeric prop** — apply `<TableCell numeric>` / `<TableHead numeric>` across Invoicing / Projects / TimeLog / Clients / Insights / BatchInvoiceBuilder tables.
- **P6 polish** — auth-page control heights, `<EmptyState>`/`<IconFrame>` swaps, count-badge tabular-nums, segmented-control inner shadow, kbd hints, toast helper rollout.
- **Lint guardrail** — once Modals/Settings/ClientDetail residue is gone, add `no-restricted-syntax` ban.

## Regressions to watch

- Compact precision is now used in subtitle / KPI / projection chips — verify symbol+suffix combos (`$1.2M`, `$12k`) read cleanly with the workspace currency.
- All `formatMoney` calls still default to USD; workspace currency threading is the next pass (single source: `useData().financialDefaults.currency`).
- Y-axis tickFormatters in Insights now use `formatMoney(v, { precision: 'compact' })` — check axis width still 52/60px is enough.
- Tooltips in Insights area chart now show 2-decimal exact dollars (was rounded); verify spacing.
- `fmtHours` in ClientPortal now derived from `formatDuration` and trimmed; double-check no portal place shows literal " hrs".
