// ── TaskForm — shared field system for create and edit ──────────────
// Field rendering, validation, dependency rules, rich-text normalization
// and accessibility live here so `mode="create"` and a future
// `mode="edit"` never fork.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Lock } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import RichEditor from '@/components/editor/RichEditor';
import { TASK_STATUSES } from '@/data/taskStatus';
import type { TaskStatus } from '@/data/taskStatus';
import type { TaskPriority, Checklist } from '@/data/checklistsApi';
import { DEFAULT_LIST_TITLE } from '@/data/taskCreation';

export interface TaskFormValues {
  text: string;
  description: string;
  clientId: string;
  checklistId: string;        // '' = default General list (created on submit)
  projectId: string;          // '' = none
  status: TaskStatus;
  priority: TaskPriority | '';
  dueDate: string;
  followUpAt: string;
  estimatedHours: string;
  workTags: string[];
  repeat: '' | 'weekly' | 'monthly' | 'quarterly';
  assignedToClient: boolean;
}

export const emptyTaskForm: TaskFormValues = {
  text: '', description: '', clientId: '', checklistId: '', projectId: '',
  status: 'to_do', priority: '', dueDate: '', followUpAt: '',
  estimatedHours: '', workTags: [], repeat: '', assignedToClient: false,
};

interface Props {
  values: TaskFormValues;
  onChange: (patch: Partial<TaskFormValues>) => void;
  clients: { id: string; name: string; status?: string }[];
  lists: Checklist[];
  listsLoading: boolean;
  projects: { id: string; name: string; clientId: string; status?: string }[];
  workCategoryNames: string[];
  lockClient?: boolean;
  lockList?: boolean;
  error?: string | null;
  titleRef?: React.RefObject<HTMLInputElement>;
}

function FieldLabel({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
      {children}
      {hint && <span className="ml-1.5 text-muted-foreground/70" style={{ fontWeight: 400 }}>{hint}</span>}
    </label>
  );
}

const controlClass =
  'w-full h-9 text-[13px] bg-[var(--input-background)] border border-transparent px-2.5 transition-colors hover:border-border focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/55';

export default function TaskForm({
  values, onChange, clients, lists, listsLoading, projects,
  workCategoryNames, lockClient, lockList, error, titleRef,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const internalTitleRef = useRef<HTMLInputElement>(null);
  const ref = titleRef || internalTitleRef;

  const selectedClient = clients.find(c => c.id === values.clientId);

  const clientProjects = useMemo(
    () => projects.filter(p => p.clientId === values.clientId && (p.status || '').toLowerCase() !== 'archived'),
    [projects, values.clientId],
  );

  // Dependency rule: clear now-invalid list/project when the client changes.
  useEffect(() => {
    if (values.checklistId && !lists.some(l => l.id === values.checklistId)) {
      onChange({ checklistId: '' });
    }
    if (values.projectId && !clientProjects.some(p => p.id === values.projectId)) {
      onChange({ projectId: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.clientId, lists, clientProjects]);

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" aria-live="assertive" className="text-[12.5px] text-destructive bg-destructive/8 border border-destructive/25 px-3 py-2" style={{ borderRadius: 4 }}>
          {error}
        </div>
      )}

      {/* 1 — Title */}
      <div>
        <FieldLabel htmlFor="task-title">Task title</FieldLabel>
        <input
          id="task-title"
          ref={ref}
          value={values.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="What needs to happen?"
          className={controlClass}
          style={{ borderRadius: 4, fontWeight: 500 }}
          autoComplete="off"
        />
      </div>

      {/* 2 — Client + List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="task-client">Client</FieldLabel>
          {lockClient ? (
            <div id="task-client" className="flex items-center gap-1.5 h-9 px-2.5 border border-border bg-accent/30 text-[13px] text-foreground" style={{ borderRadius: 4 }}>
              <Lock className="w-3 h-3 text-muted-foreground" aria-hidden />
              <span className="truncate">{selectedClient?.name || 'This client'}</span>
            </div>
          ) : (
            <select
              id="task-client"
              value={values.clientId}
              onChange={(e) => onChange({ clientId: e.target.value, checklistId: '', projectId: '' })}
              className={`${controlClass} cursor-pointer`}
              style={{ borderRadius: 4 }}
            >
              <option value="">Select a client…</option>
              {clients
                .filter(c => (c.status || '').toLowerCase() !== 'archived' || c.id === values.clientId)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="task-list" hint={!values.clientId ? '— choose a client first' : undefined}>List</FieldLabel>
          <div className="relative">
            <select
              id="task-list"
              value={values.checklistId}
              disabled={!values.clientId || listsLoading || lockList}
              onChange={(e) => onChange({ checklistId: e.target.value })}
              className={`${controlClass} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
              style={{ borderRadius: 4 }}
            >
              {lists.length === 0 && (
                <option value="">{DEFAULT_LIST_TITLE} (will be created)</option>
              )}
              {lists.map(l => (
                <option key={l.id} value={l.id}>{l.title}{l.projectId ? ' · project list' : ''}</option>
              ))}
            </select>
            {listsLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-7 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            )}
          </div>
          {values.clientId && lists.length === 0 && !listsLoading && (
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              No lists yet — a private “{DEFAULT_LIST_TITLE}” list is created automatically. No setup needed.
            </p>
          )}
        </div>
      </div>

      {/* 3 — Description */}
      <div>
        <FieldLabel htmlFor="task-description">Description <span style={{ fontWeight: 400 }}>(optional)</span></FieldLabel>
        <div id="task-description" className="border border-border px-2.5 py-1.5 min-h-[76px]" style={{ borderRadius: 4 }}>
          <RichEditor
            variant="task"
            value={values.description}
            placeholder="Add context, links, or a checklist…"
            onChange={(html) => onChange({ description: html ?? '' })}
          />
        </div>
      </div>

      {/* 4 — Status / Priority / Due date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <FieldLabel htmlFor="task-status">Status</FieldLabel>
          <select
            id="task-status"
            value={values.status}
            onChange={(e) => onChange({ status: e.target.value as TaskStatus })}
            className={`${controlClass} cursor-pointer`}
            style={{ borderRadius: 4 }}
          >
            {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
          <select
            id="task-priority"
            value={values.priority}
            onChange={(e) => onChange({ priority: e.target.value as TaskPriority | '' })}
            className={`${controlClass} cursor-pointer`}
            style={{ borderRadius: 4 }}
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="task-due">Due date</FieldLabel>
          <DatePicker value={values.dueDate} onChange={(v) => onChange({ dueDate: v })} placeholder="No due date" />
        </div>
      </div>

      {/* 5 — Project + estimate + tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="task-project">Project <span style={{ fontWeight: 400 }}>(optional)</span></FieldLabel>
          <select
            id="task-project"
            value={values.projectId}
            disabled={!values.clientId || clientProjects.length === 0}
            onChange={(e) => onChange({ projectId: e.target.value })}
            className={`${controlClass} cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
            style={{ borderRadius: 4 }}
          >
            <option value="">No project</option>
            {clientProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="task-hours">Estimated hours <span style={{ fontWeight: 400 }}>(optional)</span></FieldLabel>
          <input
            id="task-hours"
            type="number"
            min={0}
            step={0.25}
            value={values.estimatedHours}
            onChange={(e) => onChange({ estimatedHours: e.target.value })}
            placeholder="0"
            className={`${controlClass} tabular-nums`}
            style={{ borderRadius: 4 }}
          />
        </div>
      </div>

      {workCategoryNames.length > 0 && (
        <fieldset>
          <legend className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>Tags</legend>
          <div className="flex flex-wrap gap-1.5">
            {workCategoryNames.map(tag => {
              const active = values.workTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({
                    workTags: active ? values.workTags.filter(t => t !== tag) : [...values.workTags, tag],
                  })}
                  className={`text-[11.5px] px-2 py-1 border transition-colors cursor-pointer ${
                    active ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-accent/40'
                  }`}
                  style={{ borderRadius: 4, fontWeight: 500 }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* 6 — Advanced */}
      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          aria-expanded={showAdvanced}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          {showAdvanced ? <ChevronDown className="w-3.5 h-3.5" aria-hidden /> : <ChevronRight className="w-3.5 h-3.5" aria-hidden />}
          Advanced options
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="task-repeat">Repeat</FieldLabel>
                <select
                  id="task-repeat"
                  value={values.repeat}
                  onChange={(e) => onChange({ repeat: e.target.value as TaskFormValues['repeat'] })}
                  className={`${controlClass} cursor-pointer`}
                  style={{ borderRadius: 4 }}
                >
                  <option value="">Doesn’t repeat</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="task-followup">Follow up on</FieldLabel>
                <DatePicker value={values.followUpAt} onChange={(v) => onChange({ followUpAt: v })} placeholder="No follow-up" />
              </div>
            </div>

            <label className="flex items-start gap-2 text-[12.5px] text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={values.assignedToClient}
                onChange={(e) => onChange({ assignedToClient: e.target.checked })}
                className="mt-0.5 cursor-pointer"
              />
              <span>
                Assign to client
                <span className="block text-[11.5px] text-muted-foreground">
                  Only appears in their portal if the destination list is also shared with the client.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
