import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Pin, PinOff, Check, CheckCircle2, Circle, Trash2, X,
  MessageSquare, Gavel, CircleCheckBig, MessageCircle, StickyNote,
  Tag, FolderKanban, Search, ChevronDown, MoreHorizontal, Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import * as notesApi from '../data/notesApi';
import type { ClientNote, NoteType } from '../data/notesApi';
import { usePlan } from '../data/PlanContext';

// ── Note type config ───────────────────────────────────────────────

const NOTE_TYPES: { value: NoteType; label: string; icon: any; color: string; bg: string }[] = [
  { value: 'general', label: 'General', icon: StickyNote, color: 'text-stone-500', bg: 'bg-stone-100' },
  { value: 'meeting', label: 'Meeting', icon: MessageSquare, color: 'text-[#5ea1bf]', bg: 'bg-[#5ea1bf]/10' },
  { value: 'decision', label: 'Decision', icon: Gavel, color: 'text-[#7b68a8]', bg: 'bg-[#7b68a8]/10' },
  { value: 'action-item', label: 'Action item', icon: CircleCheckBig, color: 'text-[#c77a4e]', bg: 'bg-[#c77a4e]/10' },
  { value: 'feedback', label: 'Feedback', icon: MessageCircle, color: 'text-[#6b8f71]', bg: 'bg-[#6b8f71]/10' },
];

function getNoteTypeConfig(type: NoteType) {
  return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0];
}

// ── Suggested tags ─────────────────────────────────────────────────

const SUGGESTED_TAGS = [
  'billing', 'scope', 'deadline', 'deliverable', 'revision', 'approval',
  'follow-up', 'blocker', 'idea', 'priority', 'contract', 'onboarding',
];

// ── Time helpers ───────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// ── Main component ─────────────────────────────────────────────────

interface ClientNotesProps {
  clientId: string;
  projects: any[];
  filterProjectId?: string;
  filterProjectName?: string;
}

export default function ClientNotes({ clientId, projects, filterProjectId, filterProjectName }: ClientNotesProps) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load notes
  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    notesApi.loadNotes(clientId)
      .then(setNotes)
      .catch(err => console.error('Failed to load notes:', err))
      .finally(() => setLoading(false));
  }, [clientId]);

  // ── CRUD handlers ──────────────────────────────────────────────

  const handleAddNote = useCallback(async (note: Partial<ClientNote>) => {
    try {
      const saved = await notesApi.addNote(clientId, note);
      setNotes(prev => [saved, ...prev]);
      setComposerOpen(false);
      toast.success('Note added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add note');
    }
  }, [clientId]);

  const handleUpdateNote = useCallback(async (noteId: string, updates: Partial<ClientNote>) => {
    try {
      const updated = await notesApi.updateNote(clientId, noteId, updates);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updated } : n));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update note');
    }
  }, [clientId]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await notesApi.deleteNote(clientId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete note');
    }
  }, [clientId]);

  const handleTogglePin = useCallback(async (noteId: string, current: boolean) => {
    await handleUpdateNote(noteId, { isPinned: !current });
  }, [handleUpdateNote]);

  const handleToggleResolved = useCallback(async (noteId: string, current: boolean) => {
    await handleUpdateNote(noteId, { isResolved: !current });
    toast.success(current ? 'Reopened' : 'Resolved');
  }, [handleUpdateNote]);

  // ── Filtering & sorting ────────────────────────────────────────

  // First apply project scope — all counts/stats should respect this
  const scopedNotes = filterProjectId
    ? notes.filter(n => n.projectId === filterProjectId)
    : notes;

  const filtered = scopedNotes
    .filter(n => filterType === 'all' || n.type === filterType)
    .filter(n => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        (n.projectName || '').toLowerCase().includes(q)
      );
    });

  // Pinned first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Stats for filter badges — scoped to project when applicable
  const typeCount = (type: NoteType) => scopedNotes.filter(n => n.type === type).length;
  const openActionItems = scopedNotes.filter(n => n.type === 'action-item' && !n.isResolved).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Filter pills */}
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 text-[12px] rounded-md transition-all ${
              filterType === 'all'
                ? 'bg-foreground/8 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
            style={{ fontWeight: 500 }}
          >
            All
            <span className="ml-1 text-[11px] opacity-60">{scopedNotes.length}</span>
          </button>
          {NOTE_TYPES.map(t => {
            const count = typeCount(t.value);
            if (count === 0 && filterType !== t.value) return null;
            return (
              <button
                key={t.value}
                onClick={() => setFilterType(filterType === t.value ? 'all' : t.value)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-md transition-all ${
                  filterType === t.value
                    ? `${t.bg} ${t.color}`
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
                style={{ fontWeight: 500 }}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
                <span className="text-[11px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Search toggle */}
          <button
            onClick={() => { setShowSearch(s => !s); if (showSearch) setSearchQuery(''); }}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              showSearch ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Add note button */}
          <button
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] bg-primary/8 text-primary rounded-md hover:bg-primary/12 transition-all"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add note
          </button>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes, tags, projects..."
                className="w-full h-9 pl-9 pr-3 text-[13px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action items summary bar */}
      {openActionItems > 0 && filterType === 'all' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#c77a4e]/6 border border-[#c77a4e]/12">
          <CircleCheckBig className="w-3.5 h-3.5 text-[#c77a4e]" />
          <span className="text-[12px] text-[#c77a4e]" style={{ fontWeight: 500 }}>
            {openActionItems} open action item{openActionItems !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setFilterType('action-item')}
            className="text-[11px] text-[#c77a4e]/70 hover:text-[#c77a4e] ml-auto transition-colors"
            style={{ fontWeight: 500 }}
          >
            View all
          </button>
        </div>
      )}

      {/* Composer */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <NoteComposer
              projects={projects}
              onSave={handleAddNote}
              onCancel={() => setComposerOpen(false)}
              presetProjectId={filterProjectId}
              presetProjectName={filterProjectName}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8">
          <StickyNote className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
            {searchQuery ? 'No matching notes' : scopedNotes.length === 0 ? 'No notes yet' : `No ${filterType} notes`}
          </div>
          {scopedNotes.length === 0 && (
            <div className="text-[12px] text-muted-foreground/60 mt-1">
              Add a note to start tracking decisions, action items, and meeting notes
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {sorted.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                projects={projects}
                isEditing={editingId === note.id}
                onStartEdit={() => setEditingId(note.id)}
                onStopEdit={() => setEditingId(null)}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                onTogglePin={handleTogglePin}
                onToggleResolved={handleToggleResolved}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Note Composer ──────────────────────────────────────────────────

function NoteComposer({
  projects,
  onSave,
  onCancel,
  initialNote,
  presetProjectId,
  presetProjectName,
}: {
  projects: any[];
  onSave: (note: Partial<ClientNote>) => Promise<void>;
  onCancel: () => void;
  initialNote?: ClientNote;
  presetProjectId?: string;
  presetProjectName?: string;
}) {
  const { can } = usePlan();
  const hasRichNotes = can('richNotes');
  const availableTypes = hasRichNotes ? NOTE_TYPES : NOTE_TYPES.filter(t => t.value === 'general');
  const [content, setContent] = useState(initialNote?.content || '');
  const [type, setType] = useState<NoteType>(initialNote?.type || 'general');
  const [tags, setTags] = useState<string[]>(initialNote?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [projectId, setProjectId] = useState(initialNote?.projectId || presetProjectId || '');
  const [saving, setSaving] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.max(72, ta.scrollHeight) + 'px';
    }
  }, [content]);

  const handleAddTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    const selectedProject = projects.find(p => p.id?.toString() === projectId);
    try {
      await onSave({
        content: content.trim(),
        type,
        tags,
        projectId: projectId || undefined,
        projectName: selectedProject?.name || presetProjectName || undefined,
        isPinned: initialNote?.isPinned || false,
        isResolved: initialNote?.isResolved || false,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredSuggestions = SUGGESTED_TAGS.filter(
    t => !tags.includes(t) && t.includes(tagInput.toLowerCase())
  );

  const typeConfig = getNoteTypeConfig(type);

  return (
    <div
      className="border border-border rounded-xl bg-card overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      {/* Type selector */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2">
        {availableTypes.map(t => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-md transition-all ${
              type === t.value ? `${t.bg} ${t.color}` : 'text-muted-foreground hover:bg-accent/40'
            }`}
            style={{ fontWeight: 500 }}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
        {!hasRichNotes && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-[#5ea1bf] bg-[#5ea1bf]/8 rounded-md ml-1" style={{ fontWeight: 600 }}>
            PRO for more types
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={
            type === 'meeting' ? 'Meeting notes — what was discussed?' :
            type === 'decision' ? 'What was decided and why?' :
            type === 'action-item' ? 'What needs to be done?' :
            type === 'feedback' ? 'What feedback was received?' :
            'Write a note...'
          }
          className="w-full text-[14px] bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50 leading-relaxed"
          style={{ minHeight: '72px' }}
        />
      </div>

      {/* Tags */}
      {hasRichNotes && (
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/80 text-[11px] rounded-md text-muted-foreground"
              style={{ fontWeight: 500 }}
            >
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:text-foreground transition-colors">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <div className="relative">
            <input
              ref={tagInputRef}
              value={tagInput}
              onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? 'Add tags...' : '+'}
              className="w-20 text-[12px] bg-transparent focus:outline-none text-muted-foreground placeholder:text-muted-foreground/40 py-0.5"
            />
            <AnimatePresence>
              {showTagSuggestions && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute left-0 top-full mt-1 w-40 bg-card border border-border rounded-lg overflow-hidden z-20"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                >
                  {filteredSuggestions.slice(0, 6).map(s => (
                    <button
                      key={s}
                      onMouseDown={e => { e.preventDefault(); handleAddTag(s); }}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-accent/15">
        <div className="flex items-center gap-2">
          {/* Project link — locked when preset from project page */}
          {presetProjectId ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/60 rounded-md text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
              <FolderKanban className="w-3 h-3" />
              {presetProjectName || 'This project'}
            </div>
          ) : (
            <div className="relative">
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="appearance-none text-[12px] bg-accent/40 border border-border/60 rounded-md pl-6 pr-6 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer hover:bg-accent/60 transition-colors"
              >
                <option value="">No project</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id?.toString()}>{p.name}</option>
                ))}
              </select>
              <FolderKanban className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/40 transition-all"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="px-3.5 py-1.5 text-[12px] bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ fontWeight: 500 }}
          >
            {saving ? 'Saving...' : initialNote ? 'Update' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Note Card ──────────────────────────────────────────────────────

function NoteCard({
  note,
  projects,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onDelete,
  onTogglePin,
  onToggleResolved,
}: {
  note: ClientNote;
  projects: any[];
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (noteId: string, updates: Partial<ClientNote>) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  onTogglePin: (noteId: string, current: boolean) => Promise<void>;
  onToggleResolved: (noteId: string, current: boolean) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const typeConfig = getNoteTypeConfig(note.type);
  const TypeIcon = typeConfig.icon;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (isEditing) {
    return (
      <NoteComposer
        projects={projects}
        initialNote={note}
        onSave={async (updates) => {
          await onUpdate(note.id, updates);
          onStopEdit();
          toast.success('Note updated');
        }}
        onCancel={onStopEdit}
      />
    );
  }

  const isActionItem = note.type === 'action-item';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      className={`group relative border rounded-xl transition-all ${
        note.isPinned
          ? 'border-primary/20 bg-primary/[0.02]'
          : 'border-border bg-card hover:border-border/80'
      } ${note.isResolved ? 'opacity-60' : ''}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
    >
      <div className="px-4 py-3">
        {/* Top row: type badge + meta */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${typeConfig.bg} ${typeConfig.color} text-[11px] rounded-md`} style={{ fontWeight: 500 }}>
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>

            {/* Pinned indicator */}
            {note.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-primary" style={{ fontWeight: 500 }}>
                <Pin className="w-3 h-3" />
                Pinned
              </span>
            )}

            {/* Project link */}
            {note.projectName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/60 text-[11px] rounded-md text-muted-foreground" style={{ fontWeight: 500 }}>
                <FolderKanban className="w-3 h-3" />
                {note.projectName}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {isActionItem && (
              <button
                onClick={() => onToggleResolved(note.id, note.isResolved)}
                className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                  note.isResolved
                    ? 'text-[#6b8f71] hover:bg-[#6b8f71]/10'
                    : 'text-muted-foreground hover:bg-accent/40'
                }`}
                title={note.isResolved ? 'Reopen' : 'Resolve'}
              >
                {note.isResolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={() => onTogglePin(note.id, note.isPinned)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 transition-colors"
              title={note.isPinned ? 'Unpin' : 'Pin'}
            >
              {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>

            {/* More menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setMenuOpen(o => !o); setConfirmDelete(false); }}
                className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent/40 transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg overflow-hidden z-30"
                    style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  >
                    <button
                      onClick={() => { onStartEdit(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit note
                    </button>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-400 hover:text-stone-600 hover:bg-accent/40 transition-colors"
                        style={{ fontWeight: 500 }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => { onDelete(note.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-stone-500 bg-stone-50 hover:bg-stone-100 transition-colors"
                        style={{ fontWeight: 500 }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Confirm delete
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`text-[13px] leading-relaxed whitespace-pre-wrap ${note.isResolved ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {note.content}
        </div>

        {/* Tags + timestamp */}
        <div className="flex items-center justify-between mt-2.5 gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.tags.map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-accent/70 text-[10px] rounded text-muted-foreground"
                style={{ fontWeight: 500 }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex-shrink-0 text-[11px] text-muted-foreground/60" title={formatDate(note.createdAt)}>
            {timeAgo(note.createdAt)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
