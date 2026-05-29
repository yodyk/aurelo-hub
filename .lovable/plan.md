# Final Polish Phase — wrap-up turn

## Shipped this turn

### P5 residue closed
- **`src/components/Modals.tsx`** — retainer monthly-value chips (×2), revenue-estimate chips (×2), retainer-impact remaining/overage hours, project-impact effective-rate chips, after-session hours, over-scope hours, revenue-of-totalValue line, project footer status line all routed through `formatMoney` / `formatDuration`.
- **`src/pages/Settings.tsx`** — preset tax-rate label uses `formatPercent`. Imported `formatPercent`. (Input state values like `processingFee` left as raw strings — they back form inputs, not display surfaces.)
- **`src/pages/ClientDetail.tsx`** — 7-day cadence total now derived from `formatDuration` (display variant, suffix trimmed for the big-number treatment).
- **`src/pages/Home.tsx`** — `AnimatedNumber` primitive now uses `formatCount` (was raw `toLocaleString`).

### P6 — auth surface polish
- `Login.tsx`, `Signup.tsx`, `ResetPassword.tsx`, `AcceptInvite.tsx`: every `h-10` button/input migrated to `h-[var(--control-xl)]` (40px from the control ladder). Visual size preserved; tokens now in charge.
- Disabled CTA opacity standardized 60% → 40% across the same four files.

## P4 — re-scoped

The financial pages (`Invoicing`, `Projects`, `TimeLog`, `Clients`, `Insights`, `BatchInvoiceBuilder`) render with **raw `<table>` markup**, not the shadcn `Table` primitive. The `numeric` prop added to `TableHead`/`TableCell` therefore has no surface to attach to in these pages. `tabular-nums` + right-alignment is already applied at the call site in 68 spots across these files, so the visual alignment goal is met today.

Path forward (separate turn, larger blast radius): migrate one financial page at a time to the shadcn `Table` primitive so the `numeric` prop, sticky-header rhythm, and `--row-hover` token become uniform. Not landing this turn.

## Remaining P6 / guardrail (next turn)

- `<EmptyState>` swaps across the 6 audited empty surfaces.
- `<IconFrame>` swaps across the ~5 audited freehand icon tiles.
- `tabular-nums` on sidebar/header count badges.
- Toast call-site rollout to `src/lib/toast.ts` helper.
- ESLint `no-restricted-syntax` ban on `toFixed` / `Intl.NumberFormat` / `` `$${…}` `` once the remaining display-only sites in `Modals.tsx` (timeline weekly hours preview) and a handful of edge files are cleaned.

## Regressions to watch

- Auth CTAs and inputs now bound to `--control-xl` — confirm vertical centering of Google/Apple icon rows didn't shift after the swap.
- `formatMoney(value, { showZeroDecimals: false })` used in inline Modal previews — verify whole-dollar effective rates still read as `$95/hr` (no decimals).
- `formatDuration` in retainer/project previews strips trailing zeros (`6.5 hrs`, `12 hrs`) — confirm copy reads naturally next to surrounding helper text.
- `formatCount` on `AnimatedNumber` uses locale grouping; verify KPI tweens still feel smooth (no layout shift from comma insertion).
