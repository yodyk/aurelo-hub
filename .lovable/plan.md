# Tasks navigation: All Tasks → Client → List

Turn Tasks into a small two-pane workspace. A quiet navigation rail answers "where am I working?", the existing task table stays the content surface, and filters/search refine whatever the rail selected. The same primitives power the Client Detail Tasks tab.

## What changes for you

- **Global Tasks page** becomes sidebar + content. Sidebar: `All Tasks`, then a `Clients` section where each client expands to its lists. Clicking a client name selects the client view; clicking a list selects that list.
- **Client Detail → Tasks** uses the same rail, minus the client level: `All Tasks` (this client) plus a `Lists` section. The current "scroll through every list stacked down the page" rendering goes away — one context at a time.
- **Filters and search follow navigation.** Dataset = navigation context, then filter chips, then search. The active filter simply carries with you between contexts while it still makes sense; if it would produce an invalid/empty-by-construction state for the new context, that context falls back to All open. Nothing is persisted beyond the session, and search stays independent.
- **Counts** are quiet, muted, tabular open-task counts next to each client and list. No badges. Zero shows as a faint `0`.
- **Add Task** is deterministic: from a list it preselects client + that exact list; from a client it preselects client and preselects the list only when exactly one exists (otherwise you pick, with the private General fallback when none exist); from All Tasks you pick client then list. Always the canonical `TaskModal` → `createTask()`.
- **URL state**: `/tasks`, `/tasks?client=<id>`, `/tasks?client=<id>&list=<id>`. Refresh, back/forward and deep links all work. Client Detail keeps its existing tab param and adds `?list=<id>`.
- **Task Drawer** is the only editing surface. Every row on every surface (All Tasks, client, list, Client Detail) opens the canonical drawer — no inline expanded editing carried over from the old panel. The rail never resets behind it. If an edit moves a task out of the current list it disappears from the view with a calm toast: "Moved to DealerCX › General", counts update immediately, and you are not navigated to the destination.
- **Status stays restrained**: subtle dot plus plain text in the five approved statuses (To Do, On Hold, In Progress, In Review, Complete). Clicking the indicator always opens the deliberate status menu — never click-to-cycle, so an accidental click can't move In Review to Complete.
- **Deleting a list can never orphan a task.** An empty list deletes after a simple confirm. A list with tasks opens a short dialog: move its tasks to another list of the same client, move them to General, or cancel. The source list is deleted only after every task has been reassigned.
- **Empty states** are one-liners scoped to context ("No open tasks in Website Redesign.", "No In Review tasks in Website Redesign.", "No tasks match your search.").
- **Mobile**: no squeezed rail. The content pane gets a context selector button at the top (`Website Redesign ▾`) that opens the existing bottom sheet containing the same hierarchy. Desktop layout and hierarchy are untouched by this; both share the same navigation state and tree data.
- **Language**: "Lists" everywhere in the UI; "Checklist" wording retired from these surfaces. General appears as a normal list with no "system"/"default" label.


## Technical approach

New shared primitives under `src/components/tasks/`:

- `taskNavContext.ts` — canonical context type `{ kind: 'all' } | { kind: 'client', clientId } | { kind: 'list', clientId, listId }`, URL encode/decode helpers, and `useTaskNavigation(mode)` for `mode: 'global' | 'client'` (reads/writes `useSearchParams`).
- `useTaskNavigationTree.ts` — builds the tree from data already loaded: clients from `useData()`, lists from a new `loadChecklistsForWorkspace(workspaceId)` in `checklistsApi.ts` (single `checklists` select, mapped to include `isDefault`), tasks from `loadAllTasksForWorkspace`. Open counts are derived client-side from the task array (`status !== 'complete'`). In client mode the same hook is fed a single client id. Presentation components never touch the raw task array directly — all tree building, counts, scoping, filtering and search go through this hook, `useTaskPipeline`, and `matchesTaskSearch`, so a later move to server-side counts/search/pagination swaps the hook internals without rebuilding the UI.
- `TaskNavigation.tsx` / `TaskNavigationTree.tsx` / `TaskNavigationItem.tsx` — presentation only. Hairline right border, ~28px rows, indentation + type weight for hierarchy, active row = subtle sunken background plus a 2px cobalt left indicator. A client node has two hit targets: the disclosure arrow toggles its lists, the client name selects the client-level view. Includes an optional "Find client or list…" filter input at the top (global mode) and a `+ New list` action at the bottom of a client's lists.
- `TaskFilterBar.tsx` — the existing chip set extracted from `Tasks.tsx`, driven by counts computed over the navigation-scoped dataset.
- `TaskListView.tsx` — header (view title, `Client · N open`), filter bar, and the existing `Section`/`TaskRow` table lifted out of `Tasks.tsx` unchanged in visual language. Rows use `TaskStatusPopover` (deliberate menu, no cycling) and open the canonical drawer via `useTaskDrawer().open(id)`.
- `useTaskPipeline.ts` — one canonical pipeline: `workspace tasks → navigation scope → filter → search (matchesTaskSearch)`, plus bucketing. Both pages use it; no duplicate filtering code.

Refactors:

- `src/pages/Tasks.tsx` becomes layout + wiring: header (title, search, Add Task), `TaskNavigation`, `TaskListView`. Existing scope toggle, search-`/` shortcut and `TaskModal` wiring are preserved.
- `src/components/ChecklistPanel.tsx` is reduced to the client-mode composition of the same primitives; its per-list stacked card rendering, inline task editor and click-to-cycle status pill are removed rather than carried forward. Its list-management actions (rename, share/unshare, delete) move into a `•••` overflow menu on the sidebar list row and keep calling `updateChecklist` / `deleteChecklist`.
- Safe list deletion lives in the service layer, not the UI: a new `deleteListSafely(listId, { moveToListId })` in `taskCreation.ts` counts the list's items, resolves the destination (explicit list validated to the same client + workspace, or `getOrCreateGeneralTaskList`), reassigns `checklist_id` for every item, verifies zero remaining items, and only then deletes the list. It refuses to null a `checklist_id` and throws a user-presentable error if reassignment is incomplete.
- `TaskModal` already accepts `defaultClientId` / `defaultListId` / `lockClient`; callers pass values derived from the active navigation context, giving the locked destination rules (All Tasks → choose client then list; client → client locked, single list preselected, General fallback when none; list → both preselected). Every path stays on `TaskModal` → `TaskForm` → `createTask()`.
- Filter state is a single active `FilterKey` per page plus a validity check on context change — no per-context map.

Notes and scope guards:

- Archiving lists is **not** included: `checklists` has no archived column and adding one is out of scope for a navigation change. The overflow menu ships Rename / Share with client / Delete, plus New list.
- No schema changes. No folders, spaces, templates, list colors/icons, custom statuses, kanban, or hierarchy beyond Client → List → Task.


## Verification

Playwright pass over: All Tasks vs client vs list datasets, counts matching open tasks, filter isolation per context, search after filters, refresh and back/forward restoring context, all three Add Task entry points landing in the right list, drawer close preserving context, move-to-another-list toast, contextual empty states, 30+ clients and 10+ lists remaining navigable, and mobile bottom-sheet navigation with the desktop layout unchanged.
