# Final Polish Phase — closeout

## Shipped this turn — P4 table-primitive migration

Migrated every raw `<table>` on financial / data-dense surfaces to the
shadcn `Table` primitive (`@/components/ui/table`). Six tables in total:

- `src/pages/Invoicing.tsx`
  - Main invoices list (header + `InvoiceRow`)
  - Invoice preview line-items (modal)
  - Onboarding sample/preview invoices
- `src/pages/Insights.tsx`
  - Profitability heatmap (client × month)
  - Client rankings
- `src/components/TeamUtilization.tsx`
  - Member utilization table

### What the migration buys us
- **Editorial headers**: `TableHead` now provides the 10.5px uppercase
  eyebrow at letter-spacing 0.08em — replaced the ad-hoc 12px muted
  `<th>` styling that varied site-to-site.
- **Hairline rhythm**: `TableHeader` and `TableRow` use `var(--hairline)`
  dividers; dropped 6 different `border-b border-border` / `bg-accent/30`
  combos.
- **Hover & selection**: rows now inherit `bg-[var(--row-hover)]`
  uniformly; no more `hover:bg-accent/20` vs `/40` drift.
- **Numeric columns**: every right-aligned $/hr/qty/percent cell uses the
  `numeric` prop, which guarantees `text-right tabular-nums` without
  per-cell repetition.
- **Per-row stagger removed** on Insights rankings + TeamUtilization —
  parent `container`/`item` variants already stagger the section; per-row
  motion was creating jitter on long lists.

## Earlier this phase (still shipped)

- Toast helper rollout — 18 call sites on `@/lib/toast`; `loading()` and
  `dismiss()` added so `Invoicing.tsx` can keep its sonner-id pattern.
- ESLint formatter guardrail — `no-restricted-syntax` bans `toFixed()` and
  raw `Intl.NumberFormat` outside `src/lib/format.ts` (warn-level).

## Shipped this turn — `<EmptyState>` rollout

Swapped 5 internal surfaces to the `EmptyState` primitive:
`Clients.tsx`, `Projects.tsx`, `Invoicing.tsx`, `Tasks.tsx`, `TimeLog.tsx`.
Each now gets the standard glyph + title + body + optional primary action
via `IconFrame`-backed tile. Copy follows the primitive's guide
(name the absence, orient the next step, no exclamation marks).

`ClientPortal.tsx` keeps its local `EmptyState` — the portal is locked to
a hardcoded light-mode palette (`#e5e7eb`, `#1a1a2e`, `#6b7280`) and the
primitive uses semantic tokens that would inherit dark-mode styling.

## Deferred (explicit non-goals — not bugs)

- **`<IconFrame>` swaps** across ~35 freehand icon tiles — per-site tone
  classification needed.
- **Sidebar/header count badges → `tabular-nums`** — already inherited via
  the global `.type-num*` rule; spot-verify before forcing classes.

## Regressions to watch

- The Insights ranking row no longer fades-in per-row; if product wants
  that back, re-introduce via `motion(TableRow)` rather than raw `motion.tr`.
- Invoicing line-items table inside the invoice preview modal — the
  primitive's `h-[52px]` header is taller than the old 2-row header; if
  the modal feels heavy, switch that one back to a compact local header.
- `toast.action` is still the only call shape that produces an infinite
  toast; no caller uses it yet.
