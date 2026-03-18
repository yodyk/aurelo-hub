import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, CheckSquare, Square, GripVertical, Pencil, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  loadChecklists,
  createChecklist,
  deleteChecklist,
  updateChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  type Checklist,
  type ChecklistItem,
} from '@/data/checklistsApi';

interface ChecklistPanelProps {
  clientId: string;
  projectId?: string;
  workspaceId: string;
}

export default function ChecklistPanel({ clientId, projectId, workspaceId }: ChecklistPanelProps) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTitle, setCreatingTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    const data = await loadChecklists(clientId, projectId);
    setChecklists(data);
    setLoading(false);
  }, [clientId, projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!creatingTitle.trim()) return;
    try {
      await createChecklist(workspaceId, clientId, creatingTitle.trim(), projectId);
      setCreatingTitle('');
      setShowCreate(false);
      await refresh();
      toast.success('Checklist created');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChecklist(id);
      setChecklists(prev => prev.filter(c => c.id !== id));
      toast.success('Checklist deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading checklists…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => (
        <ChecklistCard
          key={checklist.id}
          checklist={checklist}
          onDelete={() => handleDelete(checklist.id)}
          onRefresh={refresh}
        />
      ))}

      {showCreate ? (
        <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl">
          <input
            autoFocus
            value={creatingTitle}
            onChange={(e) => setCreatingTitle(e.target.value)}
            placeholder="Checklist title…"
            className="flex-1 text-[13px] px-3 py-1.5 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowCreate(false); setCreatingTitle(''); } }}
          />
          <button onClick={handleCreate} disabled={!creatingTitle.trim()} className="p-1.5 rounded-lg hover:bg-accent/60 text-primary disabled:opacity-40">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowCreate(false); setCreatingTitle(''); }} className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors"
          style={{ fontWeight: 500 }}
        >
          <Plus className="w-3 h-3" /> New checklist
        </button>
      )}
    </div>
  );
}

// ── Individual checklist card ──────────────────────────────────────

function ChecklistCard({ checklist, onDelete, onRefresh }: { checklist: Checklist; onDelete: () => void; onRefresh: () => void }) {
  const [items, setItems] = useState<ChecklistItem[]>(checklist.items);
  const [newItemText, setNewItemText] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(checklist.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggle = async (item: ChecklistItem) => {
    const updated = !item.completed;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: updated } : i));
    try {
      await updateChecklistItem(item.id, { completed: updated });
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !updated } : i));
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;
    try {
      const item = await addChecklistItem(checklist.id, newItemText.trim(), items.length);
      setItems(prev => [...prev, item]);
      setNewItemText('');
      inputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    try {
      await deleteChecklistItem(itemId);
    } catch {
      onRefresh();
    }
  };

  const handleSaveTitle = async () => {
    if (!titleValue.trim()) { setTitleValue(checklist.title); setEditingTitle(false); return; }
    try {
      await updateChecklist(checklist.id, { title: titleValue.trim() });
      setEditingTitle(false);
    } catch {
      setTitleValue(checklist.title);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
      {/* Progress bar */}
      <div className="h-1 bg-accent/40">
        <div className="h-full bg-primary/60 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="flex-1 text-[14px] px-2 py-1 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') { setTitleValue(checklist.title); setEditingTitle(false); } }}
                style={{ fontWeight: 600 }}
              />
              <button onClick={handleSaveTitle} className="p-1 rounded hover:bg-accent/60 text-primary"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setTitleValue(checklist.title); setEditingTitle(false); }} className="p-1 rounded hover:bg-accent/60 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setEditingTitle(true)} className="text-[14px] text-foreground hover:text-primary transition-colors group flex items-center gap-1.5" style={{ fontWeight: 600 }}>
              {checklist.title}
              <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{completedCount}/{totalCount}</span>
            <button onClick={onDelete} className="p-1 rounded hover:bg-accent/60 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <ChecklistItemRow key={item.id} item={item} onToggle={() => handleToggle(item)} onDelete={() => handleDeleteItem(item.id)} onRefresh={onRefresh} />
            ))}
          </AnimatePresence>
        </div>

        {/* Add item */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-5 h-5 flex items-center justify-center text-muted-foreground/40">
            <Plus className="w-3 h-3" />
          </div>
          <input
            ref={inputRef}
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add an item…"
            className="flex-1 text-[13px] bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(); }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Individual item row ────────────────────────────────────────────

function ChecklistItemRow({ item, onToggle, onDelete, onRefresh }: {
  item: ChecklistItem;
  onToggle: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleSave = async () => {
    if (!editText.trim()) { setEditText(item.text); setEditing(false); return; }
    try {
      await updateChecklistItem(item.id, { text: editText.trim() });
      setEditing(false);
    } catch {
      setEditText(item.text);
      onRefresh();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex items-center gap-2 py-1 px-1 -mx-1 rounded-md hover:bg-accent/30 transition-colors"
    >
      <button onClick={onToggle} className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {item.completed ? (
          <CheckSquare className="w-4 h-4 text-primary" />
        ) : (
          <Square className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground" />
        )}
      </button>

      {editing ? (
        <div className="flex items-center gap-1.5 flex-1">
          <input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 text-[13px] bg-transparent border-b border-border focus:outline-none focus:border-primary"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditText(item.text); setEditing(false); } }}
          />
          <button onClick={handleSave} className="p-0.5 text-primary"><Check className="w-3 h-3" /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className={`flex-1 text-left text-[13px] transition-all ${item.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
          {item.text}
        </button>
      )}

      {item.addedBy === 'client' && (
        <span className="text-[10px] text-muted-foreground/60 bg-accent/60 px-1.5 py-0.5 rounded" style={{ fontWeight: 500 }}>Client</span>
      )}

      <button onClick={onDelete} className="p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
