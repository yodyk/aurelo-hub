
# Aurelo — Task System Refinement (Final)

Approved direction unchanged. Locks in eight refinements before implementation.

---

## Part A — Navigation

Sidebar order: `Today · Clients · Tasks · Time · Invoices · Insights`.

- `src/pages/Root.tsx` `navItems`: insert `{ to: '/tasks', icon: CheckSquare, label: 'Tasks' }` between Clients and Time.
- `src/routes.tsx`: replace the `/tasks → /time` redirect with a real route mounting `pages/Tasks.tsx` (lazy).

---

## Part B — Today Tasks Module

Replace `FocusSections` on `/` with a compact `TodayTasksModule` occupying roughly the previous Active Work footprint. Pulse / Earnings / Recent Activity return above the fold. The `Now` timer strip is extracted from `FocusSections` and renders above the module.

Shape:
```text
Tasks                                          View all tasks →
───────────────────────────────────────────────────────────────
[3 Overdue]   [5 Due Today]   [2 In Review]      ← interactive
───────────────────────────────────────────────────────────────
●  Website revisions for DealerCX          Today
●  Follow up with Impact Power Tech        2d overdue
●  Review proposal draft                   In review
… max 5 rows
```

**Adjustment 2 — Interactive counts.** Each count chip is a button:
- `3 Overdue` → `/tasks?filter=overdue`
- `5 Due Today` → `/tasks?filter=today`
- `2 In Review` → `/tasks?filter=in_review`
- Also: `Waiting` and `Follow-up due` chips appear when non-zero.

Row selection (max 5, in order): overdue → due today → in progress → follow-ups due today.

Row click opens the Task Detail Drawer. No inline editing. No status cycling. Empty state: `"Nothing on your plate. Open Tasks →"`.

Files:
- New `src/components/TodayTasksModule.tsx` + extracted `src/components/NowStrip.tsx`.
- `src/pages/Home.tsx`: swap `<FocusSections />` for `<NowStrip />` + `<TodayTasksModule />`.
- Delete `src/components/FocusSections.tsx` after extraction.

---

## Part C — Tasks Page

Full rewrite of `src/pages/Tasks.tsx` around the visual constitution (hairlines, no card soup, subtle dots + text, no badge pills).

```text
┌────────────────────────────────────────────────────────────────┐
│ Tasks                                          [+ Quick add ⌘K]│
│ 12 open · 3 overdue · 5 due today · 2 in review                │
├────────────────────────────────────────────────────────────────┤
│ [ My Tasks | All Tasks ]   ← Adjustment 3 (segmented control)  │
├────────────────────────────────────────────────────────────────┤
│ Filter chips: Open · Overdue · Today · This week · Waiting     │
│               · In review · On hold · Complete · All           │
│ Right:        [Client ▾] [Focus ▾] [Search]                    │
├────────────────────────────────────────────────────────────────┤
│ ▸ Overdue (3)   ▸ Today (5)   ▸ This week (4)                  │
│ ▸ Waiting (2)   ▸ No date (n)   ▸ Complete (collapsed)         │
└────────────────────────────────────────────────────────────────┘
```

Row design:
- Left: 8px **status dot button** → opens **Status Popover** (Adjustment 1). No cycle.
- Center: title (medium) over `client · project` meta line.
- Right: due date (tabular nums) + small status word.
- Row click → Drawer. Hover: `--surface-sunken`. No card chrome.

**Adjustment 3 — My/All segmented control.** State stored in `localStorage.aurelo_tasks_scope`. For solo users both views return identical results today. Filter: `My Tasks` shows tasks whose `added_by='owner'` AND assignee resolves to current user (assignee field not yet stored — for now `My = All` for solo, but the segmented control and filter plumbing land now).

URL params drive deep links from Today counts: `?filter=overdue|today|in_review|waiting`.

Delete: existing `deferredDelete` + `AlertDialog` flow carries over.

---

## Part D — Status Popover (Adjustment 1)

New `src/components/TaskStatusPopover.tsx` built on `@/components/ui/popover`.

```text
┌──────────────────┐
│ ○ To Do          │
│ ● In Progress    │
│ ○ In Review      │
│ ○ On Hold        │
│ ○ Complete       │
└──────────────────┘
```

- Trigger: the status dot in row, the status field in drawer header, and "Mark complete" in drawer footer (footer also keeps a one-tap shortcut).
- Selection writes via `updateChecklistItem({ status })` optimistically; existing `sync_checklist_item_status` trigger handles `completed` + `completed_at`.
- Reused by Tasks rows, TodayTasksModule (no — Today rows are read-only and open drawer), Drawer header, ChecklistPanel rows.
- Replaces `cycleStatus` / `nextStatus` everywhere. The `STATUS_CYCLE` export in `src/data/taskStatus.ts` is removed; `nextStatus` deleted; `STATUS_GROUP_ORDER` kept.

---

## Part E — Task Detail Drawer

Slide-over, right side, 480–560px wide, hairline divider, no rounded sheet. `transitions.emphasized`.

Component: `src/components/TaskDrawer.tsx`. Opened via `useTaskDrawer()` (lightweight `src/data/TaskDrawerContext.tsx`). Mounted once in `Root.tsx` so any surface (Today, Tasks, ChecklistPanel, ClientPortal-admin view) can open it.

**Adjustment 5 — Progressive disclosure.** Default sections collapsed except the always-visible core.

```text
Always visible
  Title                    (inline edit)
  Status · Client · Project · Due · Priority   (each click-to-edit)
  Description              (Tiptap via NoteEditor)

Collapsible (default collapsed)
  ▸ Waiting / Follow-up
  ▸ Linked files
  ▸ Linked sessions
  ▸ Activity history

Footer (sticky, in order of prominence)
  [▶ Start timer]          ← primary, full-width on mobile (Adjustment 7)
  [Mark complete]  [Edit ▾]  [Delete]
```

**Adjustment 7 — Start Timer prominence.** Primary cobalt button. On click:
- Write `localStorage.aurelo_timer_start = Date.now()`.
- Write `localStorage.aurelo_timer_context = { clientId, projectId, taskId, taskTitle }`.
- Close drawer; `NowStrip` reflects running timer.
- When user stops the timer, `Root.tsx`'s `LogSessionModal` reads `aurelo_timer_context` to prefill client, project, task name (session.task = taskTitle). Context is cleared after the session saves. Future schema field `sessions.task_id` is noted but not added in this pass.

Linked sessions: read-only v1 — query `sessions` by `client_id` + `task ILIKE title`.

---

## Part F — Waiting / Follow-Up

No schema change — fields exist on `checklist_items` (`waiting_on`, `waiting_note`, `follow_up_at`).

Inside the drawer's collapsible "Waiting / Follow-up":
```text
Waiting on ▾  [ Client feedback ▾ ]
Follow up on  [ Pick a date     ]
Note          [ free text       ]
[ Mark followed up ]
```

Enum (UI text, stored as text): Client feedback · Assets · Approval · Payment · Internal review · Other.

Behavior:
- `follow_up_at ≤ today` and open status → surfaces in Today module ranking (counts toward 5-cap, marked with `Hourglass`).
- Tasks page `Waiting` filter chip: `status='on_hold' OR waiting_on IS NOT NULL`.

---

## Part G — Quick Add

Global command palette. Trigger: `⌘K` / `Ctrl+K`, or `[+ Quick add]` button in Tasks page header.

Component: `src/components/QuickAddCommand.tsx` (mounted once in `Root.tsx`).
Parser: `src/lib/parseQuickTask.ts` (pure, testable).

Tokens:
| Token | Effect |
|---|---|
| `@<client>` | fuzzy match → `client_id` |
| `#<project>` | fuzzy match within client → `project_id` |
| `today` / `tomorrow` / `next <weekday>` / `in N days` / `MMM d` / `M/D` | `due_date` |
| `review` / `hold` | `status` |
| `!high` / `!low` | `priority` |
| `every week` / `every month` / `every quarter` | `recurrence` (Part H) |

Live parse preview rendered as muted chips beneath the input. Enter creates via `addLooseTask`; input stays open. Shift+Enter creates and closes. Toast `Task captured · Undo` (5s).

Unmatched `@token` → preview shows `No client match — pick one`; if none picked, last-used client is used.

---

## Part H — Lightweight Recurrence (Adjustment 4)

Things-3-simple. No engine.

Schema (single column add, no new table needed — `task_recurrences` table is left for the future enterprise engine and **not used in this pass**):

```sql
ALTER TABLE public.checklist_items
  ADD COLUMN repeat TEXT
    CHECK (repeat IN ('weekly','monthly','quarterly'));
```

UI: in the drawer's always-visible cluster, a `Repeat ▾` selector next to Due Date:
```text
Repeat:  [ Never | Weekly | Monthly | Quarterly ]
```

Generation logic (no cron, no edge function — runs client-side on completion):
- When a task with `repeat ≠ null` transitions to `complete`, immediately insert a clone via `addLooseTask` / `addChecklistItem` with:
  - same `client_id`, `project_id`, `checklist_id`, `text`, `description`, `priority`, `estimated_hours`, `work_tags`, `repeat`
  - `status = 'to_do'`, `completed = false`, `completed_at = null`
  - `due_date = previous due_date + interval` (Weekly = +7d, Monthly = +1 month, Quarterly = +3 months). If previous had no due_date, base on `today`.
  - `source = 'recurring'`
- Idempotency: the clone insert is only triggered by the explicit complete action in UI (drawer footer, status popover, or Tasks page status popover). Trigger-side guard: skip if a sibling with same `text` + `repeat` + same upcoming `due_date` already exists.

This is intentionally narrower than the `task_recurrences` table that already exists in schema. We keep that table dormant; nothing in v1 reads from or writes to it.

---

## Part I — Session → Follow-Up Task (Adjustment 6)

After saving a session via `LogSessionModal` (and on Time page session edit save), inspect `session.notes`. If it contains any of the action triggers (case-insensitive substring on word boundaries):

```
need approval · follow up · need to · waiting for · send · review ·
approve · revise · respond · schedule · confirm · check in · ping
```

Show a non-blocking inline prompt under the session row (or as a follow-up toast for the modal path):

```text
This session mentions follow-up work.
[ Create follow-up task ]   Dismiss
```

Click:
- `addLooseTask(workspaceId, session.clientId, { text: <first sentence of notes, truncated 80 chars>, description: session.notes, priority: 'normal' }, { projectId: session.projectId, source: 'session' })`
- Open the new task in the Drawer for optional due date / repeat assignment.
- Dismiss state stored per session in `localStorage` keyed by session id so the prompt does not re-appear.

No new edge function. No schema change.

---

## Part J — Boundaries (Adjustment 8)

Explicitly out of scope, now and later in this initiative:
- Kanban / swimlanes / drag-and-drop boards
- Dependencies / blocking relationships
- Epics / sub-tasks / parent-child task trees
- Story points / effort tokens beyond existing `estimated_hours`
- Custom workflow states beyond the five approved statuses
- Team-management terminology (assignees stay invisible until Studio team work lands)
- Comments backend (placeholder slot in drawer is acceptable; no surface yet)

When a choice tilts toward ClickUp/Jira/Asana, pick the simpler path.

---

## Part K — Implementation Sequence

1. **Migration** — add `checklist_items.repeat` column with CHECK constraint. No grants needed (existing table). No backfill.
2. **Routing + nav** — real `/tasks` route + sidebar item. (`Root.tsx`, `routes.tsx`)
3. **TaskStatusPopover** — build, swap into existing `Tasks.tsx`, `ChecklistPanel.tsx`, `FocusSections.tsx` rows to remove cycling. Delete `nextStatus` / `STATUS_CYCLE`.
4. **TaskDrawer + TaskDrawerContext** — scaffold drawer, mount in `Root.tsx`. Read-only first.
5. **TodayTasksModule + NowStrip** — extract `Now` strip, build module with interactive count chips, swap into `Home.tsx`. Delete `FocusSections.tsx`.
6. **Tasks page rewrite** — segmented My/All control, time-bucket grouping, filter chips, URL param sync, drawer trigger.
7. **Drawer editing** — inline title, status (via popover), due, priority, description; collapsible sections (Waiting, Files, Sessions, Activity).
8. **Start Timer from drawer** — `aurelo_timer_context` plumbing + `LogSessionModal` prefill.
9. **Repeat field + completion clone logic** — drawer selector + on-complete clone with idempotency guard.
10. **Quick Add (`⌘K`)** — parser + popover + global listener.
11. **Session follow-up prompt** — `LogSessionModal` post-save + Time page session edit hook.
12. **Polish** — empty states, drawer keyboard nav, focus rings, motion timings, mobile drawer sizing.

Each step lands green build before the next.
