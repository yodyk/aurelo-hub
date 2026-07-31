// ── Canonical task search representation ────────────────────────────
// One place that decides what "searching tasks" means. Client-side today;
// the same semantics can back a server-side search later without changing
// any product-level call site.
import { editorHtmlToPlainText } from '@/lib/editorContent';

export interface SearchableTask {
  text: string;
  description?: string | null;
  clientId?: string;
  checklistTitle?: string;
  projectId?: string | null;
}

export interface TaskSearchContext {
  clientName?: (clientId?: string) => string | undefined;
  projectName?: (projectId?: string | null) => string | undefined;
}

/**
 * Flattened, lowercased haystack for a task: title, plain-text description,
 * client name, list name, project name. Rich text always goes through the
 * canonical plain-text utility — never raw HTML.
 */
export function getTaskSearchText(task: SearchableTask, ctx: TaskSearchContext = {}): string {
  const parts: (string | undefined)[] = [
    task.text,
    task.description ? editorHtmlToPlainText(task.description) : undefined,
    ctx.clientName?.(task.clientId),
    task.checklistTitle,
    ctx.projectName?.(task.projectId),
  ];
  return parts.filter(Boolean).join(' \u00b7 ').toLowerCase();
}

/** Case-insensitive, all-terms match. Empty query matches everything. */
export function matchesTaskSearch(
  task: SearchableTask,
  query: string,
  ctx: TaskSearchContext = {},
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = getTaskSearchText(task, ctx);
  return q.split(/\s+/).every((term) => haystack.includes(term));
}
