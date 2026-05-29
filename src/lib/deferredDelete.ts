// ── deferredDelete — optimistic remove + 5s Undo toast ──────────────
// Use after the user has already confirmed the destructive action
// (e.g. via AlertDialog). The commit is deferred so the user can undo.
import { toast } from '@/lib/toast';

export interface DeferredDeleteOpts {
  /** Toast label, e.g. "Task deleted". */
  label: string;
  /** Window during which Undo is offered. Default 5000ms. */
  delayMs?: number;
  /** Remove the item from local state immediately. */
  onOptimisticRemove: () => void;
  /** Commit the deletion after the undo window expires. */
  onCommit: () => Promise<void>;
  /** Restore the item to local state if the user undoes or commit fails. */
  onUndo: () => void;
}

export function deferredDelete(opts: DeferredDeleteOpts) {
  const delay = opts.delayMs ?? 5000;
  let undone = false;

  opts.onOptimisticRemove();

  const id = toast.raw(opts.label, {
    duration: delay,
    action: {
      label: 'Undo',
      onClick: () => {
        undone = true;
        opts.onUndo();
        toast.dismiss(id);
      },
    },
  });

  window.setTimeout(async () => {
    if (undone) return;
    try {
      await opts.onCommit();
    } catch (err: any) {
      opts.onUndo();
      toast.error(err?.message || 'Delete failed');
    }
  }, delay + 50);
}
