
# Refinement Pass — Tasks & Timer Recovery

All approved decisions stand. This pass refines six points. Decisions only — no alternatives unless required.

---

## PART A — Refined Task System Specification

### Statuses (5, fixed)

`to_do · on_hold · in_progress · in_review · complete`

Stored as a Postgres enum `task_status`. No user-defined statuses, ever. The existing `checklist_items.status` text column is migrated: `todo→to_do`, `blocked|on_hold→on_hold`, `doing|in_progress→in_progress`, `done→complete`. A new `in_review` value is added.

### Status semantics (one-line definitions, exposed in UI tooltip)

| Status | Meaning | Counts as "open"? | Counts in Today? |
|---|---|---|---|
| **To Do** | Not started | Yes | If due ≤ today or high priority |
| **In Progress** | Actively being worked | Yes | Always (top of list) |
| **In Review** | With client or reviewer | Yes | Surfaces in "Awaiting" section, not main focus |
| **On Hold** | Paused by you or by circumstance | Yes (muted) | Excluded from focus; visible in "On Hold" filter only |
| **Complete** | Done | No | Hidden unless filter on |

### Status surfacing per scope

- **Today / My Focus** — only `to_do` + `in_progress` in the primary list; `in_review` shown in a small "Awaiting" strip; `on_hold` hidden by default.
- **Global Tasks** — all five visible, default filter excludes `complete` and `on_hold`; status chip in the row.
- **Client Workspace → Tasks tab** — grouped by status in this exact order: In Progress → To Do → In Review → On Hold → Complete (collapsed). Empty status groups hide themselves.
- **Project Detail → Tasks** — same grouping as Client Workspace but scoped.
- **Checklists** (inside a client or project) — flat list, status shown as a leading chip, no grouping (a checklist already implies sequence).

### Visual treatment

Status chips use the existing badge primitive (8% HSL background, 12px). Colors:
`to_do` — muted graphite · `in_progress` — cobalt · `in_review` — amber · `on_hold` — slate (40% opacity row) · `complete` — success green, strikethrough title.

Row dimming: `on_hold` rows render at 60% opacity; `complete` rows at 50% with strikethrough. No other ornament.

### Deletion (explicit add)

- Per-row trash affordance on hover in every Task surface (Today, Tasks, Client, Project, Checklist).
- Bulk delete in Global Tasks via existing multi-select pattern.
- Confirms via the existing `AlertDialog` primitive with **"Delete task?"** — destructive, irreversible.
- Soft-delete is **not** added. A 5-second `toast.action` undo replaces it: `"Task deleted. Undo."` using the existing `toast.action` API.

### Other task fields (final)

```
Task {
  id, workspace_id, client_id (req), project_id?, checklist_id?,
  title, notes_md?,
  status: task_status,
  priority?: low | normal | high,
  due_date?, waiting_on?, follow_up_at?, waiting_note?,   // see PART D
  estimated_hours?, completed_at?, sort_order,
  recurrence_id?,                                         // see PART C
  source: manual | recurring | note | session | invoice | portal
}
```

---

## PART B — Refined Checklist Architecture

### Model — one table, two presentations

Keep both `checklists` and `checklist_items`. **Rename nothing in the DB.** In the UI, items are called **Tasks** and lists are called **Checklists**. A task either belongs to a checklist or stands alone.

Schema change: `checklist_items.checklist_id` becomes **nullable**, and `checklist_items.project_id` is added directly. A task without a `checklist_id` is a "loose task". A task with one is a "checklist task". Both render identically in Today / Tasks / Client tabs.

### Where each appears

- **Checklists** appear only inside **Client Workspace** ("Checklists" sub-tab) and **Project Detail** ("Checklists" section). They are a structural container for *groupings* the user names: "Website Launch", "Onboarding".
- **Tasks** (the verb) appear everywhere: Today, Global Tasks, Client Tasks tab, Project Tasks section, Checklist body.
- Inside a Checklist, items render as tasks with full status / due / priority — they are not a stripped-down format.

### Creation UX

- **Quick-add task** (⌘K or `T`): scope inferred (client / project), defaults to loose. Optional "Add to checklist…" picker at the bottom of the popover.
- **New checklist**: a button in the Checklists sub-tab. Asks only for a title. Empty state suggests "Start with: Onboarding · Launch · Handoff" presets but doesn't force them.
- **Convert / move**: any task can be dragged into a checklist or out of it from the Client or Project Tasks view.

### Why this works

Architecturally there is one model. Terminologically the user sees the two words they already use. The decision the previous plan tried to eliminate — *"is this a task or a checklist?"* — is now answered by intent: if you're naming a set ("Website Launch Checklist") you create a checklist; if you're capturing an action ("Send revisions") you create a task. Both end up in the same inbox.

---

## PART C — Recurring Tasks

### Model

A new `task_recurrences` table:

```
task_recurrence {
  id, workspace_id, client_id, project_id?, checklist_id?,
  title, notes_md?, priority?, estimated_hours?,
  frequency: daily | weekly | monthly | quarterly | custom_days,
  day_of_week?, day_of_month?, every_n_days?,        // depending on frequency
  lead_days: int default 2,                          // see "Today integration"
  active: bool, last_generated_on: date?, next_due_on: date
}
```

A daily cron (reuses the existing `run-recurring-sessions` infra pattern as `run-recurring-tasks`) materializes the **next instance** as a real row in `checklist_items` with `source='recurring'`, `due_date=next_due_on`, and `recurrence_id=<id>`. **Only one open instance per recurrence exists at a time** — the next is generated only after the current one is marked complete or its due date passes.

### Frequencies (fixed set)

Daily · Weekly (pick day) · Monthly (pick day-of-month, "last day" supported) · Quarterly · Every N days. No custom RRULE strings. No "first Tuesday of the month" — explicit non-goal to prevent Asana drift.

### UX

- **Where created**: from any task creation point, a "Repeat…" toggle in the quick-add popover. Or from a dedicated "Recurring" sub-tab inside Client Workspace.
- **Visibility as first-class**:
  - **Global Tasks** has a "Recurring" filter chip showing all active recurrences (the templates, not instances).
  - **Client Workspace → Tasks tab** shows an "Active Recurrences" rail at the top (collapsible, default open). Each row: title · cadence · next date · pause/edit.
  - **Today** shows the *materialized instance* — never the template. A small ↻ glyph on the row indicates "this is recurring".
- **Pause / Edit / Delete**: editing a recurrence only affects future instances. Open instances are untouched. Deleting a recurrence offers "Also delete the current open instance?" via AlertDialog.
- **Skip an instance**: on a recurring task row, an overflow action "Skip this one" — marks the open instance discarded and schedules the next.

### Today integration

`lead_days` (default 2) controls when a generated instance becomes visible in Today: the row appears `lead_days` before its due date. Default behavior: a monthly recurrence due on the 1st appears in Today on the 28th–1st. Tunable per recurrence, capped at 7 days.

---

## PART D — Waiting / Follow-Up

### Decision: no separate "Waiting" status. Two new fields + one workflow.

```
waiting_on?: string          // free text, max 60 chars: "Acme creative team"
follow_up_at?: date          // when to be reminded
waiting_note?: string        // optional one-line context
```

Any task in any status (most commonly `in_review` or `to_do`) can have these set. They are independent of status.

### UX

- A small **"⏳ Waiting on…"** affordance appears on the task row's hover actions. Opening it reveals a 3-field popover: `Who/what`, `Follow up on`, `Note`. Saving stamps the row.
- The row then shows a discrete amber pill: `⏳ Acme · follow up Mon`. The pill is the only ornament — no row recolor.
- Setting `follow_up_at` puts the task back into **Today** on that date in the **"Follow up"** strip (see PART E), regardless of `due_date`.
- Clearing the waiting fields removes the pill and the follow-up entry.

### Reminders

- Daily digest email already exists; add a "Follow-ups due today" section.
- In-app: appears in Today's "Follow up" strip and at the top of the Tasks page when the chip is selected.
- No separate notification system. No push. The freelancer's daily Today visit is the surface.

---

## PART E — Refined Today ("My Focus")

The page title in copy becomes **"Focus"** (route stays `/today`). Layout reuses the approved Home composition — sections, no cards-everywhere.

### Sections, in fixed vertical order

1. **Now** — if a timer is running: live row with elapsed, client, task link, stop button. Hidden otherwise.
2. **Today** — tasks where `due_date ≤ today` AND status ∈ {`to_do`, `in_progress`}. Sorted: in-progress → overdue (oldest first) → due today (priority high→low). Hard cap at 8 visible, "+N more" link to Global Tasks pre-filtered. This is the only section the user is expected to clear.
3. **Follow up** — tasks where `follow_up_at ≤ today`. Each row shows `Waiting on …` inline. Marking the row "Followed up" clears `follow_up_at` (does not change status).
4. **Awaiting** — tasks with `status = in_review`. Read-only feel; tap to open. Capped at 5, then "+N more".
5. **Recurring up next** — materialized recurring instances entering their `lead_days` window but not yet due. Capped at 3.
6. **Quick add** strip pinned to the bottom of the column: "Capture a task…" inline input, scoped to no client (user can chip-pick one).

`on_hold` and `complete` never appear in Focus. Filters do not appear here — Focus is opinionated; Global Tasks is the power view.

### Tone

Section headers use the eyebrow style. Empty Focus reads: **"Nothing urgent. Time to make something."** (single line, muted, centered — the only sentimental copy in the app, used as the calm reward.)

---

## PART F — Enhanced Timer Recovery

The Stage 3 Recovery dialog from the approved spec becomes **suggestion-first**, not menu-first. The user lands on a pre-computed recommendation and confirms or overrides.

### Recommendation engine

Inputs (already captured by `useTimerAwareness`):
- `elapsed_seconds`
- `inactivity_ranges: [{start, end, reason}]` where `reason ∈ visibility_hidden | idle | sleep_wake | midnight_crossed`
- `task.estimated_hours` if linked

Decision rules (first match wins):

| Condition | Suggestion | Default selection |
|---|---|---|
| Single contiguous gap ≥ 30 min from `sleep_wake` or `visibility_hidden` near the end | **Trim** — log up to the start of that gap | Trim |
| Two or more clear activity bands separated by ≥ 45 min idle | **Split** — log first band, discard second, restart timer at "now" | Split |
| Total inactivity ≥ 50% of elapsed AND elapsed > 4h | **Trim aggressively** — log `elapsed − Σinactivity` | Trim |
| Crossed midnight, activity continued past midnight | **Split at midnight** — log yesterday's portion, restart today | Split at midnight |
| All inactivity < 20 min and elapsed ≤ estimate × 1.5 | **Keep all** | Keep |
| Inactivity ambiguous, elapsed within estimate × 2 | **Keep, with a soft note** | Keep |

### Dialog UX

- Headline: **"Welcome back."**
- Subhead (one line): plain English: *"You were away from 2:14 PM to 4:01 PM — about 1h 47m of inactivity."*
- **Inactivity timeline**: the horizontal bar from the approved spec; the **suggested trim/split boundary is drawn as a draggable cobalt handle** the user can nudge ±15 min increments. Numbers update live.
- **Suggested action**, pre-selected, with the resulting logged duration shown large (`logging 2h 25m`). The other three options (`Keep all` / `Trim` / `Split` / `Discard`) appear beneath as radios; switching one moves the handle.
- Primary button: **"Log 2h 25m"** (text updates with selection). Secondary: **"Keep timer running"** (Esc-equivalent; non-destructive).
- A single inline secondary line: *"Suggestion based on detected inactivity. You're always in control."* — shown once per user, then suppressed.

### What we do *not* do

- Never auto-log without user confirmation.
- Never delete or modify already-saved sessions.
- Never email about timer state.
- Never block work — the dialog is dismissable; timer continues running.

---

## Scope of Implementation (when approved)

Phase 1 — Schema + statuses:
- Migration: enum `task_status`, value remap, add `in_review`; nullable `checklist_id`; add `project_id`, `waiting_on`, `follow_up_at`, `waiting_note`, `recurrence_id`, `source` columns; new `task_recurrences` table with RLS + grants.
- Update `checklistsApi` (kept name internally; UI strings change to Task/Checklist split).

Phase 2 — UI:
- Status chips + row treatments (on_hold/complete styling).
- Hover-delete + AlertDialog + undo toast on every task surface.
- Client Workspace: split into Tasks tab (grouped by status) and Checklists tab (named groupings).
- Project Detail: matching split.
- Global Tasks page: filter chips include Recurring; full status filter.
- Quick-add overlay with Repeat toggle + Checklist picker.
- Promote-to-task command in NoteEditor toolbar.

Phase 3 — Today refactor as Focus:
- Section reorder, Follow up + Awaiting + Recurring up next strips, inline quick-add, calm empty state.

Phase 4 — Recurring runtime:
- Edge function `run-recurring-tasks` on daily cron mirroring `run-recurring-sessions`.
- Recurring management UI (Client Workspace sub-tab; Global Tasks filter).

Phase 5 — Timer Recovery v2:
- `useTimerAwareness` already planned; add recommendation engine module.
- `TimerRecoveryDialog`: inactivity timeline with draggable handle, suggestion-first layout, dynamic primary CTA.

No changes to navigation, color, type, surface, or motion systems. No new modal patterns beyond the existing AlertDialog.
