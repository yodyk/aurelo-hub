## Goal

Replace the plain "Retainer" / "Project name" inline text on each Time Log row with a small, styled **tag** that shows the session's allocation type — **General**, **Project**, or **Retainer** — and, on hover, reveals a tooltip with contextual detail (project name, or retainer cycle like "July 2026 Cycle").

## What changes (all UI-only)

**Only touched file:** `src/pages/TimeLog.tsx` (with one small helper added inline or in `src/lib/format.ts` for the cycle label).

### 1. Add a `SessionAllocationTag` component (local to `TimeLog.tsx`)

A single small pill rendered per row:

- **General** — neutral tone, `Circle` glyph, no tooltip (or minimal "Not linked").
- **Project** — accent tone, `FolderKanban` glyph, tooltip = full project name (useful when name is truncated).
- **Retainer** — primary tone, `Repeat` glyph, tooltip = the retainer cycle label (e.g. `July 2026 Cycle`).

Visual language matches existing hairline/muted style used elsewhere in the row (11px text, subtle background via `color-mix`, 4px radius, `IconFrame` conventions kept lightweight — this is a tag, not a frame). Uses Radix `Tooltip` (already used elsewhere in the app) so it portals and won't clip.

Show the tag for **all three types** including General, since the user's use case (batch invoicing past sessions) benefits from seeing "this is unaligned" at a glance. If that feels too busy in practice, we can hide General later — trivial one-line change.

### 2. Derive the retainer cycle label

Add a small helper `getRetainerCycleLabel(session, client, retainerHistory)`:

- If `session.date` falls within `[client.retainerCycleStart, client.retainerCycleStart + retainerCycleDays)` → label from that start date (e.g. `"July 2026 Cycle"` via `date-fns` `format(start, "MMMM yyyy")` + `" Cycle"`).
- Otherwise, look up the matching row in `retainer_history` where `cycle_start <= session.date < cycle_end` and label from that `cycle_start`.
- Fallback: `"Retainer"` (no cycle found).

`retainer_history` isn't currently fetched by `DataContext`, so we add a lightweight fetch (scoped by `workspaceId`, one-time on Time Log mount) and pass the rows into the tag. Kept local to Time Log to avoid touching the global data layer.

### 3. Replace lines 514–522 in `TimeLog.tsx`

The current inline `<Repeat/> Retainer` / `<FolderKanban/> ProjectName` block is swapped for `<SessionAllocationTag session={session} .../>`. Mobile visibility rules preserved (`hidden md:inline-flex`).

## Out of scope

- No database changes.
- No changes to session creation, editing, or the retainer engine.
- No changes to other tables that list sessions (ClientDetail, Portal) — can follow in a later pass if you like the pattern.

## Technical notes

- Radix Tooltip import via existing shadcn wrapper (`@/components/ui/tooltip`) — confirmed available.
- Cycle label uses local-date parsing (`parseLocalDate` from `src/lib/format.ts`) to avoid the timezone off-by-one we fixed previously.
- `retainer_history` fetch is `SELECT client_id, cycle_start, cycle_end` only, no PII, already RLS-protected.
