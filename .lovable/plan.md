# Final Polish Phase — Execution

## Status: Foundations shipped (P1, P2, P3, P7 audit deliverable)

### Shipped this turn
- **P1 Formatters** — `src/lib/format.ts` with `formatMoney/Percent/Date/Duration/Bytes/Relative/Count` + `EMPTY_CELL`. Three precision tiers (exact/display/compact). Currency derived from workspace `financialDefaults.currency`.
- **P2 Tokens** — `--control-sm/--control/--control-lg/--control-xl`, `--focus-ring`, `--row-hover` added to `index.css` (light + dark).
- **P2 Components** — `Button` size variants → control tokens, focus ring → `--focus-ring`. `Input` height → `--control`, focus ring → token. `DatePicker` trigger → `--control` height + token focus ring + input-background surface. `Calendar` nav → `--control-sm`. `Table` → header height `52px`, `numeric` prop on `TableHead`/`TableCell` (right-align + tabular-nums), row hover → `--row-hover` token.
- **P3 Primitives** — `IconFrame` (3 sizes × 6 tones), `EmptyState` (inline + page variants, primary/secondary actions), `NumericCell` (right-aligned, tabular-nums, em-dash for null).
- **P3 Toast helper** — `src/lib/toast.ts` wraps sonner with intent durations (success 2500 / info 4000 / error 6000 / action ∞).
- **Sweep sample** — `BulkSessionActions.tsx` migrated to `formatMoney`/`formatDuration` + `useData` currency + toast helper.
- **P7 Density Audit** — `.lovable/density-audit.md` covering Clients, Client Workspace, Projects, Time, Invoices, Insights, Today.

### Remaining (subsequent turns)
- **P4 Table numeric sweep** — apply `<TableCell numeric>` + `NumericCell` across Invoicing, Projects, TimeLog, Clients, Insights, BatchInvoiceBuilder.
- **P5 Surface sweep** — replace inline `formatDate`/`formatCurrency` in Invoicing & ProjectDetail; remove raw `toLocaleString`/`toFixed`/`` `$${}` `` across all pages; swap empty surfaces to `<EmptyState>`; freehand icon frames to `<IconFrame>`; auth pages `h-10` → `h-[var(--control-lg)]`.
- **P6 Minor + Micro** — disabled opacity lock, em-dash empty cells, tabular-nums on count badges, segmented-control inner shadow, keyboard hints in modals, table right-edge bleed, badge variant audit per Adj.5.
- **Lint guardrail** — `no-restricted-syntax` ban on `toFixed`/`Intl.NumberFormat`/`$${` outside `src/lib/format.ts`.
- **P7 trim PRs** — enact density-audit recommendations per surface.

### Regressions to watch
- Workspace currency now drives the bulk-bar — verify non-USD workspaces.
- Table header now 52px (was 40px) — sticky offsets in Invoicing/Insights may shift.
- Row hover token softer (3.5% vs 55% accent) — verify selected-state still distinguishable.
- DatePicker height standardized to 32px (was freehand) — verify alignment beside Inputs.
