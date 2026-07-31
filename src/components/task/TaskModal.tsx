// ── TaskModal — the canonical Add Task surface ──────────────────────
// Used by the global Tasks page, Client Detail header, and every
// list-level "Add task" control. Creation always routes through
// `createTask`, so no surface can produce an orphaned task.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useData } from '@/data/DataContext';
import { useAuth } from '@/data/AuthContext';
import { loadChecklists, type Checklist } from '@/data/checklistsApi';
import { createTask, type CreateTaskResult } from '@/data/taskCreation';
import { toast } from '@/lib/toast';
import TaskForm, { emptyTaskForm, type TaskFormValues } from './TaskForm';

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: 'create';
  defaultClientId?: string | null;
  defaultListId?: string | null;
  defaultProjectId?: string | null;
  /** Lock the client selector (used inside a client's workspace). */
  lockClient?: boolean;
  onCreated?: (result: CreateTaskResult) => void;
}

export default function TaskModal({
  open, onClose, defaultClientId, defaultListId, defaultProjectId, lockClient, onCreated,
}: Props) {
  const { workspaceId } = useAuth();
  const { clients, allProjects, loadAllProjects, workCategoryNames } = useData();

  const [values, setValues] = useState<TaskFormValues>(emptyTaskForm);
  const [lists, setLists] = useState<Checklist[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const patch = useCallback((p: Partial<TaskFormValues>) => {
    setValues(v => ({ ...v, ...p }));
  }, []);

  // Reset each time the modal opens, honouring contextual defaults.
  useEffect(() => {
    if (!open) return;
    setValues({
      ...emptyTaskForm,
      clientId: defaultClientId || '',
      checklistId: defaultListId || '',
      projectId: defaultProjectId || '',
    });
    setError(null);
    setConfirmDiscard(false);
    setSubmitting(false);
    loadAllProjects?.().catch(() => {});
    const t = setTimeout(() => titleRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, defaultClientId, defaultListId, defaultProjectId, loadAllProjects]);

  // Lists follow the selected client.
  useEffect(() => {
    let cancelled = false;
    if (!open || !values.clientId) { setLists([]); return; }
    setListsLoading(true);
    loadChecklists(values.clientId)
      .then(data => { if (!cancelled) setLists(data); })
      .catch(() => { if (!cancelled) setLists([]); })
      .finally(() => { if (!cancelled) setListsLoading(false); });
    return () => { cancelled = true; };
  }, [open, values.clientId]);

  // Body scroll lock.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const isDirty = useMemo(() => {
    return Boolean(
      values.text.trim() || values.description.trim() ||
      values.dueDate || values.followUpAt || values.estimatedHours ||
      values.workTags.length > 0 || values.priority || values.repeat ||
      values.assignedToClient || values.status !== 'to_do',
    );
  }, [values]);

  const attemptClose = useCallback(() => {
    if (submitting) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  }, [isDirty, submitting, onClose]);

  // Focus trap + Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Let popovers (date pickers, menus) handle their own Escape/Tab first.
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-radix-popper-content-wrapper]')) return;
      if (e.key === 'Escape') { e.stopPropagation(); attemptClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, attemptClose]);

  const submit = async () => {
    if (submitting) return;                       // double-submit guard
    setError(null);
    if (!values.text.trim()) { setError('Give the task a title.'); titleRef.current?.focus(); return; }
    if (!values.clientId) { setError('Pick a client for this task.'); return; }
    if (!workspaceId) { setError('No active workspace.'); return; }

    setSubmitting(true);
    try {
      const result = await createTask({
        workspaceId,
        clientId: values.clientId,
        checklistId: values.checklistId || null,
        projectId: values.projectId || null,
        text: values.text,
        description: values.description,
        status: values.status,
        priority: values.priority || null,
        dueDate: values.dueDate || null,
        followUpAt: values.followUpAt || null,
        estimatedHours: values.estimatedHours === '' ? null : Number(values.estimatedHours),
        workTags: values.workTags,
        repeat: values.repeat || null,
        assignedToClient: values.assignedToClient,
      });
      toast.success(`Task created in ${result.clientName} › ${result.checklistTitle}.`);
      onCreated?.(result);
      onClose();
    } catch (err: any) {
      // Modal stays open with all data intact.
      setError(err?.message || 'Couldn’t create the task. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onMouseDown={(e) => { if (e.target === e.currentTarget) attemptClose(); }}
      >
        <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" aria-hidden />
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="relative bg-card border border-border w-full max-w-[620px] my-4 sm:my-0 max-h-[92vh] flex flex-col"
          style={{ borderRadius: 4, boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div>
              <h2 id="task-modal-title" className="text-[15px]" style={{ fontWeight: 600 }}>New task</h2>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">Every task belongs to a client and a list.</p>
            </div>
            <button
              type="button"
              onClick={attemptClose}
              aria-label="Close"
              className="w-9 h-9 flex items-center justify-center hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              style={{ borderRadius: 4 }}
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          <div className="px-5 py-4 overflow-y-auto">
            <TaskForm
              values={values}
              onChange={patch}
              clients={clients as any}
              lists={lists}
              listsLoading={listsLoading}
              projects={(allProjects || []) as any}
              workCategoryNames={workCategoryNames}
              lockClient={lockClient}
              error={error}
              titleRef={titleRef}
            />
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-card sticky bottom-0">
            <button
              type="button"
              onClick={attemptClose}
              disabled={submitting}
              className="h-9 px-3.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer disabled:opacity-40"
              style={{ borderRadius: 4, fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !values.text.trim() || !values.clientId}
              aria-busy={submitting}
              className="h-9 px-4 text-[13px] bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              style={{ borderRadius: 4, fontWeight: 500 }}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
              {submitting ? 'Creating…' : 'Create task'}
            </button>
          </div>

          {confirmDiscard && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 backdrop-blur-[1px]" style={{ borderRadius: 4 }}>
              <div className="bg-card border border-border p-5 max-w-[300px] mx-4" style={{ borderRadius: 4 }}>
                <div className="w-9 h-9 bg-destructive/10 flex items-center justify-center mx-auto mb-3" style={{ borderRadius: 4 }}>
                  <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden />
                </div>
                <h3 className="text-[14px] text-center mb-1" style={{ fontWeight: 600 }}>Discard this task?</h3>
                <p className="text-[12px] text-muted-foreground text-center mb-4">Your entered details will be lost.</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { setConfirmDiscard(false); onClose(); }}
                    className="w-full h-9 text-[13px] bg-destructive text-destructive-foreground hover:opacity-90 cursor-pointer"
                    style={{ borderRadius: 4, fontWeight: 500 }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(false)}
                    className="w-full h-9 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/40 cursor-pointer"
                    style={{ borderRadius: 4, fontWeight: 500 }}
                  >
                    Keep editing
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
