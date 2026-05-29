# Final Polish Phase — Execution Plan

Treats the Fine-Tooth Audit + Executive Adjustments as approved. No re-auditing. Sequenced so foundational systems land before consumers depend on them.

---

## Sequence Overview

```text
P1  Formatter system           (Adj.1 — highest priority, unblocks everything)
P2  Design system foundations  (C5 heights, I1 radius, I6 focus, I8 toast timing)
P3  Shared primitives          (I2 IconFrame, I7 EmptyState, NumericCell)
P4  Table density + numeric    (I3, I4, Adj.2 — critical)
P5  Surface sweep              (apply P1–P4 across all pages)
P6  Minor + Micro details      (excluding Adj.5 tags, Adj.6 destructive icons)
P7  Information Density Audit  (read-only audit deliverable, then trim PRs)
```

Each phase is one PR-sized unit, mergeable independently.

---

## P1 — Formatter System (Adjustment 1)

**New file:** `src/lib/format.ts`

Single source of truth. Every numeric/temporal value in the UI flows through it.

```ts
formatMoney(value, { currency, precision: 'exact' | 'display' | 'compact' })
formatPercent(value, { maxFractionDigits, stripTrailingZeros })
formatDate(value, variant: 'short' | 'medium' | 'long' | 'relative')
formatDuration(hours, variant: 'exact' | 'display' | 'compact')
formatBytes(bytes)                       // binary base, dynamic unit
formatRelative(date)                     // "2h ago", "in 3 days"
formatCount(n, variant: 'exact' | 'compact')
```

**Adjustment 3 — context-aware precision baked in via `precision`/`variant`:**
- Tables → `exact` (`$1,245,382`, `124.75 hrs`)
- KPIs → `compact` (`$1.25M`, `1.2k hrs`)
- Charts → `display` (`$1.2M`, `12.5 hrs`)

**Codebase sweep — remove:**
- raw `toLocaleString()` (numbers/dates)
- raw `toFixed()`
- template literals `` `$${…}` ``
- inline `formatDate`/`formatMoney` (e.g. `Invoicing.tsx`, `ProjectDetail.tsx`)
- duplicate `Intl.NumberFormat` instances

**Currency source:** workspace currency from `DataContext`, never hardcoded `$`.

**Lint guardrail:** add `no-restricted-syntax` rules in `eslint.config.js` banning `toFixed`, `Intl.NumberFormat` outside `src/lib/format.ts`, and template literals matching `$${`.

---

## P2 — Design System Foundations

### C5 — Control heights
`src/index.css` adds height tokens:
```css
--control-sm: 28px;  --control: 32px;  --control-lg: 36px;  --control-xl: 40px;
```
- `Button` size variants → `default=h-control`, `sm=h-control-sm`, `lg=h-control-lg`, add `xl=h-control-xl`.
- `Input` default → `h-control`.
- `DatePicker` trigger → `h-control` (currently freehand `py-2`).
- Calendar nav buttons → `h-control-sm` (was `h-7`).
- Audit `AcceptInvite`, `Login`, `Signup`, `ResetPassword`, `Onboarding` for `h-10` literals → `h-control-lg`.

### I1 — Radius cleanup
Add semantic Tailwind utilities in `tailwind.config.ts`:
```ts
borderRadius: { control: '4px', surface: '4px', pill: '999px' }
```
Sweep `rounded-lg|xl|2xl` literals → `rounded-control` / `rounded-surface`. Keep `.rounded-circle` carve-out. Global 4px cap stays.

### I6 — Focus ring
Single token `--focus-ring` in `index.css` (3px halo, `--primary` @ 30%). Apply identically to `Button`, `Input`, `DatePicker`, `Select`, `Switch`, `Checkbox`, custom triggers.

### I8 — Toast timing
`App.tsx` Toaster default → 3800ms stays as baseline. Update `src/lib/toast.ts` (new helper) exporting `toast.success` (2500), `toast.info` (4000), `toast.error` (6000), `toast.action` (persistent w/ action button). Sweep call sites.

---

## P3 — Shared Primitives

### I2 — `<IconFrame>`
`src/components/primitives/IconFrame.tsx`
Props: `size: 'sm'|'md'|'lg'`, `tone: 'primary'|'accent'|'neutral'|'success'|'warning'|'destructive'`, `glyph: LucideIcon`.
Replaces every freehand `w-8 h-8 rounded bg-…/10` in `Root.tsx`, `Home.tsx`, `Settings.tsx`, `Onboarding.tsx`, `SetupChecklist.tsx`.

### I7 — `<EmptyState>` (Adjustment 4 — elevated)
`src/components/primitives/EmptyState.tsx`
```tsx
<EmptyState
  glyph={Inbox}
  title="No invoices yet"
  body="Send your first invoice and track it from draft to paid."
  primaryAction={{ label: 'New invoice', onClick }}
  secondaryAction={{ label: 'Import', onClick }}
/>
```
Tone: confident, calm, operational. No "Nothing here". Copy guide co-located.
Sweep: `Clients`, `Projects`, `Invoicing`, `TimeLog`, `Tasks`, `Insights`, `Team`, `ProjectDetail`, `ClientDetail`.

### `<NumericCell>` (supports P4)
Renders a value via `formatMoney`/`formatDuration`/etc, right-aligned, `tabular-nums`, fixed currency-symbol column for decimal alignment.

---

## P4 — Tables: Density + Numeric Alignment (Adjustment 2 — Critical)

**`src/components/ui/table.tsx`:**
- `TableHead` → match body height (`h-[52px]` → unify with body) or shrink body to `py-3` for `48px` row. Pick `52px` to preserve the editorial feel.
- Header divider: first body row gets `-mt-px` collapse so the hairline is single-weight.
- `TableRow` hover: `var(--accent) 30%` (was 55%) OR introduce `--row-hover` token.
- New `<TableHead numeric>` and `<TableCell numeric>` props → `text-right tabular-nums`, currency symbol kerned to decimal stack.

**Surface sweep — numeric columns right-align with NumericCell:**
- `Invoicing.tsx` (Amount, Tax, Total, Balance)
- `Projects.tsx` (Budget, Spent, Effective rate, Hours)
- `TimeLog.tsx` (Duration, Revenue)
- `Clients.tsx` (MRR, Lifetime revenue, Dependency %)
- `ProjectDetail.tsx`, `ClientDetail.tsx` financial sections
- `Insights.tsx` data tables
- `BatchInvoiceBuilder.tsx`

---

## P5 — Application Sweep

Apply P1–P4 across all pages. One commit per surface for review:

| Surface | Key updates |
|---|---|
| `Home.tsx` | KPI compact formatting, IconFrame, EmptyState, focus ring |
| `Clients.tsx` | NumericCell, EmptyState, row hover, formatter sweep |
| `ClientDetail.tsx` / `ClientEdit.tsx` | Date/money sweep, control heights |
| `Projects.tsx` / `ProjectDetail.tsx` | Effective rate via formatPercent, NumericCell |
| `TimeLog.tsx` | formatDuration sweep, NumericCell, bulk-bar `$${}` removal |
| `Invoicing.tsx` | Drop inline `formatDate`/`formatCurrency`, tax precision via formatPercent, NumericCell |
| `Insights.tsx` | Compact KPI, chart formatter wiring (Recharts tick formatters) |
| `Tasks.tsx`, `Team.tsx` | EmptyState, IconFrame |
| `Settings.tsx` | formatBytes for storage, control heights for forms |
| `BulkSessionActions.tsx` | `${totalRevenue.toLocaleString()}` → formatMoney compact |

---

## P6 — Minor + Micro Details

Implement all approved minor/micro items **except**:
- **Adj.5:** Do NOT replace tags with `#tag`. Instead: reduce badge count, reserve color for state, demote decorative chips to plain text. Audit `Badge` usages and reclassify.
- **Adj.6:** Defer filled destructive icons.

Included: tabular-nums everywhere numeric, `"%"` binding (`12%` not `12 %`), `·` separator consistency, avatar initials uppercase, spinner size token, disabled opacity locked at 40%, truncation gets title tooltip, em dash for empty cells (`—`), Inter Tight baseline trim, hover transition 150ms, skeleton tokens, optimistic mutation rollback toast pattern, segmented-control active inner shadow, count badges tabular-nums, keyboard shortcut hints in modals, right-edge bleed fix on tables.

---

## P7 — Information Density Audit (Deliverable, then trim)

Read-only audit document `.lovable/density-audit.md` covering Clients, Client Workspace, Projects, Time, Invoices, Insights, Today. For each surface produces:
- **Hide** (remove from list, available on detail)
- **Contextual** (show on hover/expand)
- **Secondary** (de-emphasized, kept)
- **Remove** (not earning its place anywhere)

Then a follow-up PR enacts the trims. Pure information-hierarchy work; ignores color/type/spacing/motion/formatting (assumed final).

---

## Shared Utilities Required

- `src/lib/format.ts` — formatter system
- `src/lib/toast.ts` — toast timing presets
- `src/components/primitives/IconFrame.tsx`
- `src/components/primitives/EmptyState.tsx`
- `src/components/primitives/NumericCell.tsx`
- `eslint.config.js` — lint guardrails for formatter discipline

## Design System Updates Required

- `src/index.css`: `--control-*` height tokens, `--focus-ring` token, `--row-hover` token
- `tailwind.config.ts`: `rounded-control|surface|pill`, `h-control*` height utilities
- `src/components/ui/button.tsx`: size variants → tokens, focus ring → token
- `src/components/ui/input.tsx`: height → token, focus ring → token
- `src/components/ui/table.tsx`: header/body height unify, hover token, `numeric` prop
- `src/components/ui/badge.tsx`: variant audit (Adj.5)
- `src/components/ui/calendar.tsx`, `date-picker.tsx`: height token alignment

## Potential Regressions To Watch

- **Currency:** workspace currency now drives everything — verify non-USD workspaces render correctly (symbol position, decimal separator).
- **Compact KPI math:** rounding boundaries (`$999,500` → `$1.00M` vs `$999k`) — snapshot-test thresholds.
- **Table hover at 30%:** verify selected-state still distinguishable from hover.
- **Header height change:** sticky table headers in `Invoicing`, `Insights` may need recalculated offsets.
- **Right-aligned numerics:** column widths may shift; re-check `min-width` on currency columns to prevent jitter on data changes.
- **Focus ring token:** any component bypassing `Button`/`Input` (custom `<button>` in `BulkSessionActions`, `DatePicker` trigger) needs explicit `focus-visible:ring` migration.
- **Toast timings:** error toasts now persist longer — verify e2e flows that auto-dismiss.
- **Lint rules:** existing edge functions and Stripe code use `toFixed` legitimately — scope lint to `src/**`.
- **EmptyState rollout:** existing empty surfaces may have custom CTAs hooked to context — preserve handlers.

---

Ready to execute P1 on approval.