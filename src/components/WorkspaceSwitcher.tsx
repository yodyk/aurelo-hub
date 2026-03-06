import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronDown, Plus, Pencil, X, Trash2 } from 'lucide-react';
import { useAuth, type WorkspaceInfo } from '../data/AuthContext';
import { usePlan } from '../data/PlanContext';
import { useData } from '../data/DataContext';
import { toast } from 'sonner';

interface Props {
  collapsed: boolean;
  wsName: string;
  wsLogoUrl: string | null;
  wsInitial: string;
  planId: string;
}

export function WorkspaceSwitcher({ collapsed, wsName, wsLogoUrl, wsInitial, planId }: Props) {
  const navigate = useNavigate();
  const { allWorkspaces, switchWorkspace, createWorkspace, renameWorkspace, deleteWorkspace, workspaceId } = useAuth();
  const { can } = usePlan();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const canMulti = can('multiWorkspace');
  const hasMultiple = allWorkspaces.length > 1;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenamingId(null);
        setDeletingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingId]);

  const handleSwitch = useCallback((ws: WorkspaceInfo) => {
    if (ws.id === workspaceId) {
      setOpen(false);
      return;
    }
    switchWorkspace(ws.id);
    setOpen(false);
    toast.success(`Switched to ${ws.name}`);
    // Force reload to re-fetch data for new workspace
    window.location.href = '/';
  }, [workspaceId, switchWorkspace]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createWorkspace(name);
      setCreating(false);
      setNewName('');
      setOpen(false);
      toast.success(`Created workspace "${name}"`);
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workspace');
    } finally {
      setBusy(false);
    }
  }, [newName, createWorkspace]);

  const handleRename = useCallback(async () => {
    if (!renamingId) return;
    const name = renameValue.trim();
    if (!name) return;
    setBusy(true);
    try {
      await renameWorkspace(renamingId, name);
      setRenamingId(null);
      setRenameValue('');
      toast.success('Workspace renamed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename');
    } finally {
      setBusy(false);
    }
  }, [renamingId, renameValue, renameWorkspace]);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    setBusy(true);
    try {
      await deleteWorkspace(deletingId);
      setDeletingId(null);
      setOpen(false);
      toast.success('Workspace deleted');
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workspace');
    } finally {
      setBusy(false);
    }
  }, [deletingId, deleteWorkspace]);

  // If user can't multi-workspace and has only 1, just navigate to billing
  const handleClick = () => {
    if (!canMulti && !hasMultiple) {
      navigate('/settings?tab=billing');
      return;
    }
    setOpen(o => !o);
  };

  return (
    <div className="px-3 pt-3 pb-3 border-b border-border relative" ref={ref}>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2.5 rounded-lg hover:bg-accent/50 transition-colors ${collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5'}`}
      >
        <div className="w-7 h-7 rounded-lg bg-accent/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {wsLogoUrl ? (
            <img src={wsLogoUrl} alt="" className="w-full h-full object-cover" />
          ) : null}
          <span className="text-[12px] text-foreground/70" style={{ fontWeight: 600, display: wsLogoUrl ? 'none' : undefined }}>{wsInitial}</span>
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[13px] text-foreground truncate" style={{ fontWeight: 500 }}>{wsName}</div>
              <div className="text-[10px] text-muted-foreground/70 tracking-wide" style={{ fontWeight: 600, letterSpacing: '0.04em' }}>
                {allWorkspaces.find(w => w.id === workspaceId)?.role === 'Owner' 
                  ? (planId === 'starter' ? 'FREE' : planId.toUpperCase()) + ' PLAN'
                  : 'MEMBER'}
              </div>
            </div>
            {(canMulti || hasMultiple) && (
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform ${open ? 'rotate-180' : ''}`} />
            )}
          </>
        )}
      </button>

      <AnimatePresence>
        {open && !collapsed && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-3 right-3 top-full mt-1 bg-card border border-border rounded-xl overflow-hidden z-50 overflow-x-hidden"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="p-1 max-h-60 overflow-y-auto">
              {allWorkspaces.map((ws) => (
                <div key={ws.id} className="group flex items-center">
                  {renamingId === ws.id ? (
                    <form
                      className="flex-1 flex items-center gap-1 px-2 py-1.5"
                      onSubmit={(e) => { e.preventDefault(); handleRename(); }}
                    >
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        className="flex-1 text-[13px] bg-accent/40 rounded px-2 py-1 outline-none border border-border focus:border-primary/40"
                        disabled={busy}
                      />
                      <button type="submit" disabled={busy} className="p-1 text-primary hover:bg-primary/10 rounded">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setRenamingId(null)} className="p-1 text-muted-foreground hover:bg-accent/40 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSwitch(ws)}
                        className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors text-left ${
                          ws.id === workspaceId ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-accent/40'
                        }`}
                        style={{ fontWeight: 500 }}
                      >
                        <div className="w-5 h-5 rounded bg-accent/60 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-foreground/70" style={{ fontWeight: 600 }}>
                            {ws.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="truncate flex-1">{ws.name}</span>
                        {ws.id === workspaceId && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      </button>
                      {ws.role === 'Owner' && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setRenamingId(ws.id); setRenameValue(ws.name); }}
                            className="p-1.5 text-muted-foreground/50 hover:text-foreground rounded hover:bg-accent/40"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {allWorkspaces.length > 1 && (
                            <button
                              onClick={() => setDeletingId(ws.id)}
                              className="p-1.5 mr-1 text-muted-foreground/50 hover:text-destructive rounded hover:bg-destructive/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Create new workspace */}
            {canMulti && (
              <div className="border-t border-border p-1">
                {creating ? (
                  <form
                    className="flex items-center gap-1 px-2 py-1.5"
                    onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
                  >
                    <input
                      ref={inputRef}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Workspace name…"
                      className="flex-1 text-[13px] bg-accent/40 rounded px-2 py-1 outline-none border border-border focus:border-primary/40"
                      disabled={busy}
                    />
                    <button type="submit" disabled={busy || !newName.trim()} className="p-1 text-primary hover:bg-primary/10 rounded disabled:opacity-40">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => { setCreating(false); setNewName(''); }} className="p-1 text-muted-foreground hover:bg-accent/40 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New workspace
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => !busy && setDeletingId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="relative bg-card border border-border rounded-xl p-5 w-[340px] shadow-xl"
            >
              <h3 className="text-[15px] font-semibold text-foreground mb-1.5">Delete workspace?</h3>
              <p className="text-[13px] text-muted-foreground mb-4 leading-relaxed">
                This will permanently delete <span className="font-medium text-foreground">{allWorkspaces.find(w => w.id === deletingId)?.name}</span> and all its data. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeletingId(null)}
                  disabled={busy}
                  className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="px-3 py-1.5 text-[13px] font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg transition-colors disabled:opacity-50"
                >
                  {busy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
