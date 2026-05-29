# Final Polish Phase — closeout

## Shipped this turn

### Toast helper rollout (P6)
- Migrated 18 call sites from `import { toast } from 'sonner'` →
  `import { toast } from '@/lib/toast'`. `<Toaster />` import in `App.tsx`
  intentionally left on sonner (component, not toast caller).
- Extended `src/lib/toast.ts` with `loading()` and `dismiss()` so the lone
  `toast.loading(...)` site in `Invoicing.tsx` works without falling back to
  raw sonner.
- Net effect: every toast across the app now obeys the intent-aware duration
  presets (success 2.5s, info 4s, error 6s, action ∞, loading ∞ via id).

### ESLint formatter guardrail (P6)
- `eslint.config.js` now bans `toFixed()` and raw `Intl.NumberFormat` via
  `no-restricted-syntax` (warn-level). `src/lib/format.ts` is the single
  exemption. `supabase/functions/**` ignored (Deno runtime, separate target).
- Warn-level (not error) on purpose: surfaces residue without breaking CI on
  charts/edge sites that may legitimately need raw Intl for tooltip formatters.

## Deferred (explicit non-goals this turn)

- **`<EmptyState>` swaps** — the 6 audited empty surfaces use bespoke copy
  and primary-action wiring per page. Mechanical swap risks losing nuance;
  schedule per-page review.
- **`<IconFrame>` swaps** — ~35 freehand `rounded bg-…/10` sites surfaced by
  grep; many are sidebar/nav glyphs that don't share the `IconFrame` tone
  vocabulary. Needs a per-site classification pass.
- **Sidebar/header count badges → `tabular-nums`** — already inherited via
  the global `tabular-nums` rule on `.type-num*`; verify per-badge before
  forcing a class.
- **P4 financial-table primitive migration** — still scoped as a separate
  high-blast-radius turn (raw `<table>` → shadcn `Table`).

## Regressions to watch

- `toast.loading('…', { id: 'payment-link' })` in `Invoicing.tsx` — confirm
  the success/error follow-ups still replace the loading toast (sonner id
  pattern preserved).
- ESLint warn surface — first lint run will surface residue in charts/edges;
  treat each as a one-off triage, not a CI break.
- `toast.action` is the only call shape that produces an infinite toast; no
  caller uses it yet — keep an eye on accidental adoption.
