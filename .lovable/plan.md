# Income vs Expenses: Shared-Scale Comparison Bar

## Goal

Replace the current split "Income bar + Gross expenses bar" strip at the bottom of the summary header in `src/pages/IncomeExpenses.tsx` (line 107) with a single shared-scale comparison that makes income vs expenses directly readable.

## Current problem

The two bars are sized independently (flex-1 vs fixed w-24) and each is normalized against `max(income, expenses)`, so their lengths are not visually comparable and the strip communicates almost nothing.

## Design: shared-scale comparison

- Both bars drawn against the same scale (the larger of income / gross expenses = 100%).
- Two stacked rows, hairline-quiet, matching Aurelo's visual language:
  - **Income** — primary (cobalt) fill, amount + label on the row.
  - **Gross expenses** — warning/amber fill, amount + label, plus "X% of income" ratio.
- Layout per row: fixed-width label (left), flexible bar track on `bg-[var(--surface-sunken)]` (right), amount right-aligned in tabular-nums.
- 4px radius cap respected; bars use `rounded-[2px]` or square to match the squared-off aesthetic.
- Expenses-over-income edge case: expense bar hits 100%, income bar shrinks proportionally, and a small "Expenses exceed income" warning note appears instead of clamping misleadingly.
- Zero-state: when both are 0, show track with no fill (no NaN widths).
- Percentages computed from existing `totals.incomeCents` / `totals.grossExpensesCents`; currency via existing `formatMoney` + `settings.currency`.
- Subtle Motion width animation on mount/value change (motion confirms, never entertains; no spring ease).

## Files

- `src/pages/IncomeExpenses.tsx` — replace the trailing comparison div in the summary block (line 107) with a small `ComparisonBar` component (defined in-file, consistent with the file's existing local-component pattern).

## Out of scope

- No changes to totals calculation, tables, or other pages.
- No new dependencies.

## Verification

- `bunx tsgo --noEmit -p tsconfig.app.json` passes; production build passes.
- Visual check in preview: bars comparable at a glance, correct with $0 income, and with expenses > income.
