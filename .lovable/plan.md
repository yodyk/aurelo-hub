# Hide tasks from archived clients

Today the Tasks sidebar already omits archived clients from the client list, but their tasks still flow into "All tasks" — they inflate the open count and appear as rows with no way to reach or dismiss them.

## What changes

- Tasks belonging to archived clients are excluded everywhere by default: the "All tasks" count, the bucketed task list, and the filter counts.
- A quiet toggle at the bottom of the task navigation sidebar — "Show archived clients (N)" — brings them back when needed.
- When shown, archived clients appear in the sidebar grouped under a separate "Archived" eyebrow, with their name marked as archived, and their task rows carry a small muted "Archived" tag.
- The toggle is per-session UI state only (not persisted, not in the URL). Turning it off while an archived client/list is selected falls the view back to All tasks.
- Same behaviour on the global Tasks page. Client Detail is unaffected (a single client context is explicit).

## Technical notes

- `useTaskNavigationTree`: accept the full client list including archived ones plus a `showArchived` flag. Derive an archived-client id set, drop those clients/lists/tasks from the tree and from `totalOpen` unless `showArchived` is on; expose `archivedCount` and an `archived: boolean` on each client node.
- `useTaskPipeline` / `scopeTasks`: filter out tasks whose `clientId` is in the archived set for the `all` context (client/list contexts are already explicit). Pass the set down from `Tasks.tsx`.
- `Tasks.tsx`: own the `showArchived` state, pass it to the tree hook and `TaskListView`, and reset the context to `{ kind: 'all' }` when the toggle turns off with an archived client selected.
- `TaskNavigation.tsx`: render the archived group and the toggle row; `TaskNavigationItem` gets an optional muted/archived styling variant.
- No database or query changes — archived status already lives on `clients.status`.
