// ── TaskListMenu — lightweight list management from the rail ────────
//
// Rename · Share with client / Make private · Delete.
// Deletion never orphans tasks: a non-empty list must first have its tasks
// reassigned, and the actual guarantee lives in `deleteListSafely`.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { updateChecklist } from '@/data/checklistsApi';
import { countTasksInList, deleteListSafely } from '@/data/taskCreation';
import { toast } from '@/lib/toast';
import type { TaskNavListNode } from './useTaskNavigationTree';

function ModalShell({
  title, description, onClose, children, footer,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md bg-card border border-border shadow-lg p-4"
        style={{ borderRadius: 4 }}
      >
        <h2 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>{title}</h2>
        {description && (
          <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-4 flex items-center justify-end gap-2">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

export function TaskListMenu({
  list, siblings, onChanged, onDeleted,
}: {
  list: TaskNavListNode;
  siblings: TaskNavListNode[];
  onChanged: () => void;
  onDeleted: (listId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const others = siblings.filter(s => s.id !== list.id);

  useEffect(() => { setTitle(list.title); }, [list.title]);

  const openDelete = async () => {
    setMenuOpen(false);
    setDeleteOpen(true);
    setTaskCount(null);
    setDestination('');
    try { setTaskCount(await countTasksInList(list.id)); }
    catch (err: any) { toast.error(err.message); setDeleteOpen(false); }
  };

  const handleRename = async () => {
    const next = title.trim();
    if (!next || next === list.title) { setRenaming(false); return; }
    try {
      await updateChecklist(list.id, { title: next });
      setRenaming(false);
      onChanged();
      toast.success('List renamed');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleShare = async () => {
    setMenuOpen(false);
    try {
      await updateChecklist(list.id, { sharedWithClient: !list.sharedWithClient });
      onChanged();
      toast.success(list.sharedWithClient ? 'List is now private' : 'List shared with client');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const res = await deleteListSafely(list.id, { moveToListId: destination || null });
      onDeleted(list.id);
      onChanged();
      toast.success(
        res.movedCount > 0
          ? `List deleted — ${res.movedCount} task${res.movedCount === 1 ? '' : 's'} moved to ${res.destinationTitle}`
          : 'List deleted',
      );
      setDeleteOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`List options for ${list.title}`}
            className="w-5 h-5 inline-flex items-center justify-center text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 cursor-pointer"
          >
            <MoreHorizontal className="w-3.5 h-3.5" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={4} className="w-48 p-1">
          <MenuButton onClick={() => { setMenuOpen(false); setRenaming(true); }}>Rename</MenuButton>
          <MenuButton onClick={handleShare}>
            {list.sharedWithClient ? 'Make private' : 'Share with client'}
          </MenuButton>
          <MenuButton onClick={openDelete} destructive>Delete</MenuButton>
        </PopoverContent>
      </Popover>

      {renaming && (
        <ModalShell
          title="Rename list"
          onClose={() => setRenaming(false)}
          footer={<>
            <GhostButton onClick={() => setRenaming(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleRename}>Save</PrimaryButton>
          </>}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            aria-label="List name"
            className="w-full h-9 bg-[color:var(--surface-sunken)] border border-border px-2.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40"
            style={{ borderRadius: 4 }}
          />
        </ModalShell>
      )}

      {deleteOpen && (
        <ModalShell
          title={`Delete “${list.title}”?`}
          onClose={() => { if (!busy) setDeleteOpen(false); }}
          description={
            taskCount === null
              ? 'Checking this list…'
              : taskCount === 0
                ? 'This list is empty. Deleting it removes nothing else.'
                : `This list holds ${taskCount} task${taskCount === 1 ? '' : 's'}. Choose where they should live — tasks are never deleted with a list.`
          }
          footer={<>
            <GhostButton onClick={() => setDeleteOpen(false)} disabled={busy}>Cancel</GhostButton>
            <button
              onClick={handleDelete}
              disabled={busy || taskCount === null}
              className="h-8 px-3 text-[12px] bg-destructive text-destructive-foreground inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderRadius: 4, fontWeight: 500 }}
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
              {taskCount && taskCount > 0 ? 'Move tasks & delete list' : 'Delete list'}
            </button>
          </>}
        >
          {taskCount !== null && taskCount > 0 && (
            <div>
              <label className="type-eyebrow block mb-1.5" htmlFor={`dest-${list.id}`}>Move tasks to</label>
              <select
                id={`dest-${list.id}`}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-9 bg-[color:var(--surface-sunken)] border border-border px-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                style={{ borderRadius: 4 }}
              >
                <option value="">General (default list)</option>
                {others.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
          )}
        </ModalShell>
      )}
    </>
  );
}

function MenuButton({
  children, onClick, destructive,
}: { children: ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left text-[12.5px] px-2.5 py-1.5 hover:bg-accent/60 cursor-pointer ${
        destructive ? 'text-destructive' : 'text-foreground'
      }`}
      style={{ borderRadius: 3 }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-8 px-3 text-[12px] border border-border text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderRadius: 4 }}
    >{children}</button>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-8 px-3 text-[12px] bg-primary text-primary-foreground cursor-pointer"
      style={{ borderRadius: 4, fontWeight: 500 }}
    >{children}</button>
  );
}
