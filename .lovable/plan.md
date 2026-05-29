# Final Polish Phase — P4 + P5 Execution

Continuing from the shipped foundations (formatters, tokens, primitives). This pass enforces them across every surface.

## P4 — Table Numeric Sweep

Apply `<TableCell numeric>` + `<TableHead numeric>` (and `NumericCell` where a hint line is useful) to every column that renders money, percent, duration, hours, or counts.

Files:
- `src/pages/Invoicing.tsx` — Total, Balance Due, Issue/Due dates stay text-aligned, status stays badge.
- `src/pages/Projects.tsx` — Budget, Spent, Effective rate, Hours.
- `src/pages/TimeLog.tsx` — Duration, Revenue. Notes preview column removed per density audit.
- `src/pages/Clients.tsx` — MRR, Lifetime, Dependency %.
- `src/pages/Insights.tsx` — All chart-adjacent tables; KPI deltas via `formatPercent`.
- `src/components/BatchInvoiceBuilder.tsx` — Hours and amount columns.

Watch: sticky-header offsets (header is now 52px); verify scroll containers in Invoicing and Insights still align.

## P5 — Page-by-Page Formatter Sweep

Replace every inline `formatCurrency`, inline `formatDate`, `toLocaleString`, `toFixed`, and `` `$${…}` `` template with the central helpers from `src/lib/format.ts`. Pull `currency` from `useData().workspace.financialDefaults.currency`.

Targets (full file scan, edits only where matches exist):
- `src/pages/Invoicing.tsx` — drop local `formatDate`/`formatCurrency`; tax line via `formatPercent`.
- `src/pages/ProjectDetail.tsx` — drop local formatters; profitability % via `formatPercent`; budget/spent via `formatMoney({ precision: 'exact' })`.
- `src/pages/Projects.tsx`, `src/pages/Clients.tsx`, `src/pages/ClientDetail.tsx`, `src/pages/ClientEdit.tsx`, `src/pages/TimeLog.tsx`, `src/pages/Insights.tsx`, `src/pages/Home.tsx`, `src/pages/Tasks.tsx`, `src/pages/Team.tsx`.
- `src/components/BatchInvoiceBuilder.tsx`, `src/components/BillingTab.tsx`, `src/components/TeamUtilization.tsx`, `src/components/SetupChecklist.tsx`, `src/components/TrialBanner.tsx`, `src/components/NotificationCenter.tsx`, `src/components/RecurringSessionsManager.tsx`, `src/components/EmailActivityLog.tsx`.

KPI surfaces (Home, Insights tiles, sidebar counters) → `precision: 'compact'`.
Charts (Insights bars, Home performance bar) → `precision: 'display'`.
Tables, invoices, detail screens → `precision: 'exact'`.

## P6 — Minor + Micro (bundled here, low-risk passes)

- Auth pages (`Login`, `Signup`, `ResetPassword`, `AcceptInvite`, `Onboarding`) — replace `h-10` inputs/buttons with `h-[var(--control-lg)]`.
- Disabled state lock — audit Button/Input/Switch usages where `disabled:opacity-*` is hand-set; standardize to 40% via component default.
- Empty surfaces — swap freehand "No X yet" blocks for `<EmptyState>` in Invoicing, Projects, Clients, Team, TimeLog, RecurringSessionsManager, WebhooksSection, NotificationCenter.
- Freehand icon containers — replace ad-hoc `rounded bg-* p-*` icon frames with `<IconFrame>` in Home, Insights tiles, SetupChecklist, TrialBanner, SidebarUpgradeCTA.
- Tabular-nums on count badges — sidebar item counts, notification badge, tab counts.
- Toast call sites — replace direct `sonner` imports with `src/lib/toast.ts` helper where surfaced.

## Lint Guardrail

Add to `eslint.config.js`:
- `no-restricted-syntax` ban on `CallExpression[callee.property.name="toFixed"]`, `NewExpression[callee.object.name="Intl"][callee.property.name="NumberFormat"]`, and template literals beginning with `$${`.
- Override allows `src/lib/format.ts` only.

## P7 — Density Audit Enactment (deferred)

Density-audit trims (tag-chip removal, hover-only metadata, tone-dot status, combined client·project column in TimeLog) will land in dedicated per-surface PRs after the formatter sweep is verified. Not in this batch.

## Shared Utilities Used

`formatMoney`, `formatPercent`, `formatDate`, `formatDuration`, `formatCount`, `EMPTY_CELL`, `IconFrame`, `EmptyState`, `NumericCell`, `toast` helper, `--control*` tokens, `--focus-ring`, `--row-hover`.

## Design System Updates

None new. This pass is consumption-only of the system shipped last turn.

## Regressions to Watch

- Non-USD workspaces — every `formatMoney` call now reads workspace currency; verify symbol placement (€, £, A$) in tables.
- Table header height 52px — re-check sticky offsets in Invoicing and Insights scroll containers.
- Numeric right-alignment — verify icon-bearing cells (recurring glyph in TimeLog) don't collide with right edge; switch to two-cell layout if needed.
- Auth control height bump (40 → 36) — confirm the `AuthVisualPanel` split layout still vertically centers the form.
- EmptyState swap — confirm primary-action handlers carry over (create-invoice, add-client, start-timer).
- Lint guardrail may flag legitimate one-offs in edge functions; restrict scope to `src/**` only.

## Order of Execution

1. P4 table sweep (one PR per page; lowest blast radius first: TimeLog → Projects → Invoicing → Clients → Insights → BatchInvoiceBuilder).
2. P5 formatter sweep alongside each table file, plus standalone pages (Home, ClientDetail, ProjectDetail, Team, Tasks).
3. P6 component-level polish (auth heights, EmptyState/IconFrame swaps, count badges).
4. Lint guardrail last — once raw calls are gone, the rule will pass on first run.

Ready to start with **TimeLog** (P4 + P5 + density-aligned column trim) on approval.