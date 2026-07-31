# Task creation overhaul — confirmed bug + canonical Add Task

## 1. Confirmed root cause (verified, not guessed)

Quick Add on the Tasks page calls `addLooseTask(...)`, which inserts a task with `checklist_id = null`. The Client Detail Tasks tab renders `ChecklistPanel`, which loads tasks via `loadChecklists(clientId)` — that query fetches the client's lists, then fetches only `checklist_items` whose `checklist_id` is in those lists. A task with no list can never match, so it is invisible on the client page.

Database confirms the shape exactly:

- 70 tasks total; 1 has `checklist_id = null` — "Testing Quick Add Task", created 2026-07-31, with a valid `client_id` and `workspace_id`. It exists, it has a client, it simply has no list.
- 36 tasks that DO belong to a list have `client_id = null` on the row itself (they inherit client through the parent list). So `client_id` on the item is not currently reliable as a filter.

So: not an RLS, insert, or invalidation problem. The task is created successfully but in a listless state that the client-side query cannot reach. The global Tasks page shows it (it does a second query for `checklist_id is null`), which is why it looks like the task "sometimes" exists.

Consequence for the fix: making every task belong to a list is the real repair. The UI overhaul rides on top of it.

## 2. Data repair (migration, before any constraint)

One migration, no deletes:

1. Backfill `client_id` / `workspace_id` / `project_id` on all list-attached items from their parent list (fixes the 36 rows so the item row alone is self-describing).
2. For each client owning a listless task, get-or-create a list titled **General** with `shared_with_client = false`, then attach the orphaned tasks to it.
3. Add a partial unique index on `(workspace_id, client_id, lower(title))` where `title = 'General'` and `project_id is null`, so concurrent requests cannot produce duplicate General lists.
4. Backfill trigger: on `checklist_items` insert, if `client_id`/`workspace_id` are null and `checklist_id` is set, derive them from the parent list. Keeps the item row consistent regardless of insert path.

No `NOT NULL` on `checklist_id` in this pass — it is applied only after the app has shipped with the new service and no new listless rows appear. Stated explicitly as a follow-up rather than done blind.

## 3. Canonical creation service

`src/data/taskCreation.ts`:

- `getOrCreateGeneralTaskList(workspaceId, clientId)` — select existing General list; if absent, insert; on unique-violation, re-select and return the winner. Idempotent and race-safe against the new index.
- `createTask(input)` — validates client, resolves list (explicit list, or General fallback), verifies the list and any project belong to that client, normalizes rich-text description via `toStorableEditorContent`, computes `sort_order`, inserts through `addChecklistItem`, and returns the created task plus its resolved `clientId`/`checklistId` for cache updates.

`addLooseTask` is retired from all UI paths (kept only if another caller still needs it; `FocusSections` quick add is migrated too). Every creation surface routes through `createTask`.

## 4. Canonical Add Task modal

New `src/components/TaskModal.tsx` — `<TaskModal mode="create" defaultClientId defaultListId lockClient />`.

Field set is a superset of what the client-level inline form offers today (title, description, due date, estimated hours, work tags, status, priority) plus client, list, project, repeat, follow-up, and assigned-to-client — nothing removed.

Hierarchy: Title → Client + List → Description (RichEditor) → Status / Priority / Due date → Project + estimated hours + tags → collapsed Advanced (repeat, follow-up, assign to client). Sticky footer with Cancel / Create Task.

Client → List dependency: list options are scoped to the selected client; changing client clears an invalid list and project while keeping title/description. When the client has no lists, the list selector shows "General (will be created)" and the list is materialized at submit time, not on selection.

Accessibility: focus starts on Title, focus trapped, Escape guarded when dirty, visible labels, keyboard-navigable selectors, errors announced, submit disabled while in flight to block double-create.

Failure keeps the modal open with all data intact and a specific error message.

## 5. Tasks page: search replaces Quick Add

The Quick Add bar is removed and replaced with a utility row: search field left, primary **Add Task** button right; stacked on mobile with full-width controls.

Search is client-side over already-loaded tasks (dataset is 70 rows — no server-side pagination need), lightly debounced, case-insensitive, matching task title, description text, client name, list name, and project name. It filters inside the active status/view context, has a clear button, clears on Escape, and shows "No active tasks match your search." with a clear-search action.

## 6. Client Detail

The Tasks tab header gets a primary **Add Task** button on the right, opening the same modal with the current client preselected and locked. Existing per-list Add Task footers stay as shortcuts but now open the same modal with client + originating list preselected — their inline creation logic is deleted.

## 7. After create

Refresh the workspace task list, the client's checklists, and Today/summary counts; new task is visible on the Tasks page, the client's Tasks tab, and its list without a reload. Filters are preserved; the created task is briefly highlighted.

## 8. Verification

Manual pass over the listed scenarios, plus a Playwright run for the critical path: create from Tasks page for a client with no lists → confirm exactly one General list exists → confirm the task appears on the client page → repeat and confirm no duplicate General list.

## Technical notes

- Files touched: `src/data/checklistsApi.ts`, new `src/data/taskCreation.ts`, new `src/components/TaskModal.tsx`, `src/pages/Tasks.tsx`, `src/components/ChecklistPanel.tsx`, `src/pages/ClientDetail.tsx`, `src/components/FocusSections.tsx`, one database migration.
- `parseQuickTask` is no longer used by the Tasks page; kept in place rather than deleted so its natural-language parsing can back the modal's title field later if wanted.
