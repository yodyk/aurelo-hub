# Tasks: fix the drawer ↔ list sync gap

Removing a tag in the edit drawer saves correctly (the database rows are fine, and a hard refresh shows the right tags), but the task rows in a client's Tasks tab can keep showing the old tag. The problem is in how the drawer and the lists share state in the browser, not in saving.

## What the code review found

Three real weaknesses, all in the shared task state layer:

1. **No request sequencing on the task loader.** `useTasksData` fires a fresh full reload on every drawer save, with no guard against out-of-order responses. Toggling two or three tags quickly starts several overlapping loads; whichever one finishes last wins, so an older snapshot can overwrite a newer one and leave a removed tag on screen until the next manual refresh. This matches the symptom exactly.

2. **Drawer edits reach the list only through a full refetch.** The drawer's only signal to the rest of the app is a "something changed" counter — it never says *which* task changed or *what* changed. So the rows have nothing to show until the round trip completes, and if that round trip loses the race (point 1), nothing corrects it.

3. **The list's optimistic-echo cache can get stuck.** `TaskListView` keeps local overrides for in-flight edits and clears them by comparing each patched value to the server value with `===`. Any array or object value (tags are an array) can never compare equal, so such an override would pin stale values on that row indefinitely. Nothing else clears overrides either — no timeout, no clear on context change.

## The fix

**One source of truth, one ordered stream of updates.**

- Add a request-generation guard to `useTasksData` so only the newest load may write to state; older in-flight responses are discarded. Coalesce refreshes that arrive while one is already running into a single trailing reload.
- Extend `TaskDrawerContext` from a bare counter to a small change channel: `notifyChanged(taskId, patch)`. The drawer publishes the fields it just saved, and the deletion path publishes a removal.
- Have `TaskListView` subscribe to that channel and merge the patch into its overrides immediately, so the row updates the instant the drawer saves — tags included — regardless of refetch timing.
- Replace the override settle check with a value-aware comparison that handles arrays and null/undefined, add a safety timeout so an override can never outlive its refetch, and clear overrides when the navigation context changes or the task disappears.
- Make the drawer's error rollback restore the exact pre-edit snapshot (currently a stale closure can restore a half-updated task) and roll the same failure back in the list.

**Drawer interaction tightening (same pass, low risk):**

- Batch rapid tag toggles into a single save instead of one write per click, so the list never sees a burst of competing reloads.
- Keep the drawer's own copy of the task in step with the refreshed list data, so reopening a task never shows a value the list already corrected.

## Scope

Touched: `src/data/TaskDrawerContext.tsx`, `src/components/tasks/useTaskNavigationTree.ts`, `src/components/tasks/TaskListView.tsx`, `src/components/TaskDrawer.tsx`, and the two `changeCounter` consumers (`src/pages/Tasks.tsx`, `src/pages/ClientDetail.tsx`) plus `TodayTasksModule` for the new signature.

No database changes, no changes to task creation, filtering, or the navigation tree logic.

## Verification

Drive the running app: open a client's Tasks tab, remove a tag in the drawer, confirm the row loses the chip immediately and stays correct without a refresh; repeat with three fast toggles; confirm status changes, due date, and delete/undo still behave.
