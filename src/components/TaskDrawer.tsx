/**
 * TaskDrawer — slide-over for task details.
 *
 * v1 in this pass: progressive disclosure shell with read-mostly view +
 * inline title edit, status popover, due / priority / description edits,
 * and a primary "Start timer" action. Waiting / files / sessions / activity
 * sections render collapsed by default (Adjustment 5) and can be expanded
 * in follow-up passes for full editing.
 */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  X, Calendar, Hourglass, Paperclip, History, Clock, Trash2, Play,
  ChevronDown, ChevronRight, Repeat,
} from 'lucide-react';

import { useTaskDrawer } from '@/data/TaskDrawerContext';
import { useAuth } from '@/data/AuthContext';
import { useData } from '@/data/DataContext';
import { TaskStatusPopover } from './TaskStatusPopover';
import { STATUS_BY_VALUE } from '@/data/taskStatus';
import {
  loadTaskById, updateChecklistItem, deleteChecklistItem,
  materializeRecurrence, type ChecklistItem,
} from '@/data/checklistsApi';
import { DatePicker } from '@/components/ui/date-picker';
import RichDescriptionEditor from '@/components/RichDescriptionEditor';
import { toast } from '@/lib/toast';
import { deferredDelete } from '@/lib/deferredDelete';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const REPEAT_OPTIONS: { value: ChecklistItem['repeat']; label: string }[] = [
  { value: null,        label: 'Never' },
  { value: 'weekly',    label: 'Weekly' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

export function TaskDrawer() {
  const { taskId, close, notifyChanged } = useTaskDrawer();
  const navigate = useNavigate();
  const { clients, getProjects, loadProjectsForClient } = useData();
  const { workspaceId } = useAuth();
  const [task, setTask] = useState<ChecklistItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  // Load task whenever taskId changes
  useEffect(() => {
    if (!taskId) { setTask(null); return; }
    setLoading(true);
    loadTaskById(taskId).then(t => { setTask(t); setLoading(false); });
  }, [taskId]);

  // Load projects for client (for project name display)
  useEffect(() => {
    if (!task?.clientId) { setProjects([]); return; }
    const cached = getProjects(task.clientId);
    setProjects(cached);
    loadProjectsForClient(task.clientId).then(setProjects).catch(() => {});
  }, [task?.clientId, getProjects, loadProjectsForClient]);

  // Esc to close
  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [taskId, close]);

  const patch = useCallback(async (updates: Partial<ChecklistItem>, dbPatch: any) => {
    if (!task) return;
    const optimistic = { ...task, ...updates };
    setTask(optimistic);
    try {
      await updateChecklistItem(task.id, dbPatch);
      // Trigger recurrence clone on transition to complete
      if (updates.status === 'complete' && task.status !== 'complete' && optimistic.repeat) {
        const newId = await materializeRecurrence(optimistic);
        if (newId) toast.success('Next occurrence scheduled');
      }
      notifyChanged();
    } catch (err: any) {
      toast.error(err.message);
      setTask(task);
    }
  }, [task, notifyChanged]);

  const client = task ? clients.find((c: any) => c.id === task.clientId) : null;
  const project = task?.projectId ? projects.find((p: any) => p.id === task.projectId) : null;

  const handleStartTimer = () => {
    if (!task) return;
    if (localStorage.getItem('aurelo_timer_start')) {
      toast.error('A timer is already running. Stop it first.');
      return;
    }
    localStorage.setItem('aurelo_timer_start', String(Date.now()));
    localStorage.setItem('aurelo_timer_context', JSON.stringify({
      clientId: task.clientId,
      clientName: client?.name,
      projectId: task.projectId,
      projectName: project?.name,
      taskId: task.id,
      taskTitle: task.text,
    }));
    toast.success('Timer started');
    close();
    // Soft refresh of Now strip
    window.dispatchEvent(new Event('aurelo:timer-changed'));
  };

  const handleDelete = () => {
    if (!task) return;
    const snapshot = task;
    close();
    deferredDelete({
      label: `Task deleted — "${snapshot.text.slice(0, 40)}${snapshot.text.length > 40 ? '…' : ''}"`,
      onOptimisticRemove: () => { notifyChanged(); },
      onUndo: () => { notifyChanged(); },
      onCommit: async () => { await deleteChecklistItem(snapshot.id); notifyChanged(); },
    });
  };

  return (
    <AnimatePresence>
      {taskId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={close}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[520px] bg-background border-l border-border flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-[var(--hairline)] flex-shrink-0">
              <div className="type-eyebrow">Task</div>
              <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded hover:bg-accent/60 cursor-pointer">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {loading || !task ? (
                <div className="text-muted-foreground type-meta">Loading…</div>
              ) : (
                <>
                  {/* Always visible: title + status + client/project + due + priority + description + repeat */}
                  <TitleField task={task} onSave={(text) => patch({ text }, { text })} />

                  <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                    <FieldRow label="Status">
                      <TaskStatusPopover
                        status={task.status}
                        onChange={(s) => patch({ status: s, completed: s === 'complete' }, { status: s })}
                        trigger={
                          <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ fontWeight: 500 }}>
                            <span className={`block w-2 h-2 rounded-circle ${STATUS_BY_VALUE[task.status].dotClass}`} />
                            {STATUS_BY_VALUE[task.status].label}
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          </span>
                        }
                      />
                    </FieldRow>

                    <FieldRow label="Client">
                      <div className="text-[12.5px]" style={{ fontWeight: 500 }}>
                        {client ? (
                          <button onClick={() => { close(); navigate(`/clients/${client.id}`); }} className="hover:text-primary cursor-pointer">
                            {client.name}
                          </button>
                        ) : <span className="text-muted-foreground">—</span>}
                      </div>
                    </FieldRow>

                    <FieldRow label="Project">
                      <div className="text-[12.5px]" style={{ fontWeight: 500 }}>
                        {project?.name || <span className="text-muted-foreground">—</span>}
                      </div>
                    </FieldRow>

                    <FieldRow label="Due date">
                      <DatePicker
                        value={task.dueDate || ''}
                        onChange={(v) => patch({ dueDate: v || null }, { dueDate: v || null })}
                        placeholder="No due date"
                      />
                    </FieldRow>

                    <FieldRow label="Priority">
                      <select
                        value={task.priority || ''}
                        onChange={(e) => patch({ priority: (e.target.value || null) as any }, { priority: e.target.value || null })}
                        className="text-[12.5px] bg-transparent border border-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="">Normal</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                      </select>
                    </FieldRow>

                    <FieldRow label="Repeat">
                      <select
                        value={task.repeat || ''}
                        onChange={(e) => {
                          const v = (e.target.value || null) as ChecklistItem['repeat'];
                          patch({ repeat: v }, { repeat: v });
                        }}
                        className="text-[12.5px] bg-transparent border border-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        {REPEAT_OPTIONS.map(o => (
                          <option key={o.value ?? 'never'} value={o.value ?? ''}>{o.label}</option>
                        ))}
                      </select>
                    </FieldRow>
                  </div>

                  <DescriptionField task={task} onSave={(d) => patch({ description: d }, { description: d })} />

                  {/* Collapsible: Waiting / Follow-up */}
                  <Collapsible label="Waiting / Follow-up" icon={Hourglass} defaultOpen={!!(task.waitingOn || task.followUpAt)}>
                    <div className="space-y-3 pt-2">
                      <FieldRow label="Waiting on">
                        <select
                          value={task.waitingOn || ''}
                          onChange={(e) => patch({ waitingOn: e.target.value || null }, { waitingOn: e.target.value || null })}
                          className="text-[12.5px] bg-transparent border border-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30 w-full"
                        >
                          <option value="">—</option>
                          {['Client feedback', 'Assets', 'Approval', 'Payment', 'Internal review', 'Other'].map(o => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </FieldRow>
                      <FieldRow label="Follow up on">
                        <DatePicker
                          value={task.followUpAt || ''}
                          onChange={(v) => patch({ followUpAt: v || null }, { followUpAt: v || null })}
                          placeholder="Pick a date"
                        />
                      </FieldRow>
                      <FieldRow label="Note">
                        <input
                          type="text"
                          defaultValue={task.waitingNote || ''}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== (task.waitingNote || null)) patch({ waitingNote: v }, { waitingNote: v });
                          }}
                          placeholder="Optional"
                          className="w-full text-[12.5px] bg-transparent border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </FieldRow>
                      {task.followUpAt && (
                        <button
                          onClick={() => patch({ followUpAt: null }, { followUpAt: null })}
                          className="text-[12px] px-2.5 py-1 border border-border hover:bg-accent/40 transition-colors cursor-pointer"
                          style={{ fontWeight: 500, borderRadius: 4 }}
                        >
                          Mark followed up
                        </button>
                      )}
                    </div>
                  </Collapsible>

                  <Collapsible label="Linked files" icon={Paperclip}>
                    <div className="type-meta py-3">No files linked yet.</div>
                  </Collapsible>
                  <Collapsible label="Linked sessions" icon={Clock}>
                    <div className="type-meta py-3">Sessions logged against this task will appear here.</div>
                  </Collapsible>
                  <Collapsible label="Activity" icon={History}>
                    <div className="type-meta py-3">Activity history will appear here.</div>
                  </Collapsible>
                </>
              )}
            </div>

            {/* Footer */}
            {task && (
              <div className="border-t border-[var(--hairline)] px-5 py-3 flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleStartTimer}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 text-[13px] transition-opacity cursor-pointer"
                  style={{ fontWeight: 500, borderRadius: 4 }}
                >
                  <Play className="w-3.5 h-3.5" /> Start timer
                </button>
                {task.status !== 'complete' && (
                  <button
                    onClick={() => patch({ status: 'complete', completed: true }, { status: 'complete' })}
                    className="px-3 py-2 border border-border text-[13px] hover:bg-accent/40 transition-colors cursor-pointer"
                    style={{ fontWeight: 500, borderRadius: 4 }}
                  >
                    Mark complete
                  </button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="w-9 h-9 inline-flex items-center justify-center border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
                      title="Delete task"
                      style={{ borderRadius: 4 }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll have 5 seconds to undo from the toast.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="type-eyebrow">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function TitleField({ task, onSave }: { task: ChecklistItem; onSave: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.text);
  useEffect(() => setValue(task.text), [task.id, task.text]);
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-left w-full type-section text-foreground hover:opacity-80 transition-opacity cursor-text"
        style={{ fontWeight: 600 }}
      >
        {task.text || <span className="text-muted-foreground italic">Untitled</span>}
      </button>
    );
  }
  const commit = () => {
    const v = value.trim();
    setEditing(false);
    if (v && v !== task.text) onSave(v);
    else setValue(task.text);
  };
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(task.text); setEditing(false); } }}
      className="w-full bg-transparent border-b border-border focus:outline-none focus:border-primary text-[18px]"
      style={{ fontWeight: 600 }}
    />
  );
}

function DescriptionField({ task, onSave }: { task: ChecklistItem; onSave: (text: string | null) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="type-eyebrow">Description</div>
      <RichDescriptionEditor
        taskId={task.id}
        value={task.description || ''}
        onSave={onSave}
        placeholder="Add a description…"
      />
    </div>
  );
}

function Collapsible({
  label, icon: Icon, defaultOpen = false, children,
}: { label: string; icon: any; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--hairline)] pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer hover:opacity-70 transition-opacity"
      >
        <span className="inline-flex items-center gap-2 type-eyebrow">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}
