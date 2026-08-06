// ── AddDocumentModal — create/edit a document record ────────────────
// One form regardless of source: an uploaded file or an external link.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Link2, Loader2, Star } from 'lucide-react';
import {
  createDocument, updateDocument, detectProvider, providerLabel,
  type ClientDocument, type DocumentVisibility,
} from '@/data/documentsApi';
import { toast } from '@/lib/toast';

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  clientId: string;
  categories: string[];
  /** When provided, the modal edits this document instead of creating one. */
  editing?: ClientDocument | null;
  onSaved: (doc: ClientDocument | null) => void;
}

const inputCls =
  'w-full text-[13.5px] px-3 py-2 rounded border border-[var(--hairline)] bg-[var(--surface-1)] outline-none focus:border-primary/50 placeholder:text-muted-foreground/50';

export default function AddDocumentModal({
  open, onClose, workspaceId, clientId, categories, editing, onSaved,
}: Props) {
  const isEdit = !!editing;
  const [source, setSource] = useState<'file' | 'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>('internal');
  const [requestApproval, setRequestApproval] = useState(false);
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSource(editing.kind === 'file' ? 'file' : 'link');
      setFile(null);
      setUrl(editing.url || '');
      setTitle(editing.title);
      setDescription(editing.description || '');
      setNotes(editing.notes || '');
      setCategory(editing.category || '');
      setVisibility(editing.visibility);
      setRequestApproval(editing.approvalState === 'pending');
      setDocumentDate(editing.documentDate || new Date().toISOString().slice(0, 10));
      setPinned(editing.isPinned);
    } else {
      setSource('file'); setFile(null); setUrl(''); setTitle(''); setDescription('');
      setNotes(''); setCategory(''); setVisibility('internal'); setRequestApproval(false);
      setDocumentDate(new Date().toISOString().slice(0, 10)); setPinned(false);
    }
    setSaving(false);
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, saving, onClose]);

  const providerHint = useMemo(() => (url.trim() ? providerLabel(detectProvider(url.trim())) : null), [url]);

  const pickFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Give the document a name.'); return; }
    if (source === 'link') {
      if (!url.trim()) { toast.error('Add the document link.'); return; }
      try { new URL(url.trim()); } catch { toast.error('Enter a valid URL (including https://).'); return; }
    }
    if (source === 'file' && !isEdit && !file) { toast.error('Choose a file to upload.'); return; }

    setSaving(true);
    try {
      if (isEdit && editing) {
        await updateDocument(editing.id, {
          title: title.trim(),
          description: description.trim() || null,
          notes: notes.trim() || null,
          category: category || null,
          visibility,
          documentDate,
          isPinned: pinned,
          url: editing.kind === 'link' ? url.trim() : undefined,
          approvalState:
            visibility === 'shared'
              ? (requestApproval ? 'pending' : (editing.approvalState === 'pending' ? 'not_required' : editing.approvalState))
              : 'not_required',
        });
        onSaved(null);
        toast.success('Document updated.');
      } else {
        const doc = await createDocument(workspaceId, clientId, {
          title: title.trim(),
          description: description.trim() || null,
          notes: notes.trim() || null,
          category: category || null,
          visibility,
          requestApproval,
          documentDate,
          isPinned: pinned,
          url: source === 'link' ? url.trim() : null,
          file: source === 'file' ? file : null,
        });
        onSaved(doc);
        toast.success('Document added.');
      }
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => { if (!saving) onClose(); }}
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-[560px] bg-card border border-[var(--hairline)] rounded-lg my-auto"
            style={{ boxShadow: 'var(--elev-3)' }}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hairline)]">
              <h3 className="text-[14px] font-display" style={{ fontWeight: 600 }}>
                {isEdit ? 'Edit document' : 'Add document'}
              </h3>
              <button onClick={onClose} disabled={saving} className="p-1 rounded hover:bg-accent/60 cursor-pointer">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Source */}
              {!isEdit && (
                <div className="inline-flex rounded border border-[var(--hairline)] overflow-hidden">
                  {(['file', 'link'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSource(s)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] cursor-pointer transition-colors ${
                        source === s ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50'
                      }`}
                      style={{ fontWeight: 500 }}
                    >
                      {s === 'file' ? <Upload className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      {s === 'file' ? 'Upload file' : 'External link'}
                    </button>
                  ))}
                </div>
              )}

              {source === 'file' ? (
                isEdit ? (
                  <div className="text-[12.5px] text-muted-foreground">
                    File: <span className="text-foreground">{editing?.fileName || editing?.title}</span>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] || null); }}
                    onClick={() => fileRef.current?.click()}
                    className={`rounded border border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-[var(--hairline)] bg-[var(--surface-1)] hover:border-primary/40'
                    }`}
                  >
                    <Upload className="w-4 h-4 mx-auto text-muted-foreground mb-1.5" />
                    <p className="text-[12.5px]">
                      {file ? <span className="text-foreground" style={{ fontWeight: 500 }}>{file.name}</span>
                        : <span className="text-muted-foreground">Drop a file here or click to browse</span>}
                    </p>
                    <input
                      ref={fileRef} type="file" className="hidden"
                      onChange={(e) => { pickFile(e.target.files?.[0] || null); e.target.value = ''; }}
                    />
                  </div>
                )
              ) : (
                <div>
                  <label className="block text-[11.5px] text-muted-foreground mb-1">Link</label>
                  <input
                    type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://drive.google.com/…" className={inputCls}
                  />
                  {providerHint && (
                    <p className="text-[11px] text-muted-foreground mt-1">Detected: <span className="text-foreground">{providerHint}</span></p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11.5px] text-muted-foreground mb-1">Document name</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2026 Retainer Agreement" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] text-muted-foreground mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} cursor-pointer`}>
                    <option value="">Uncategorized</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] text-muted-foreground mb-1">Date</label>
                  <input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className={`${inputCls} cursor-pointer`} />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] text-muted-foreground mb-1">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  placeholder="What is this document?" className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className="block text-[11.5px] text-muted-foreground mb-1">Internal notes (optional)</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="Never shown to the client" className={`${inputCls} resize-none`}
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-[11.5px] text-muted-foreground">Visibility</label>
                <div className="inline-flex rounded border border-[var(--hairline)] overflow-hidden">
                  {(['internal', 'shared'] as const).map((v) => (
                    <button
                      key={v} type="button"
                      onClick={() => { setVisibility(v); if (v === 'internal') setRequestApproval(false); }}
                      className={`px-3 py-1.5 text-[12.5px] cursor-pointer transition-colors ${
                        visibility === v ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50'
                      }`}
                      style={{ fontWeight: 500 }}
                    >
                      {v === 'internal' ? 'Internal only' : 'Shared with client'}
                    </button>
                  ))}
                </div>
                {visibility === 'shared' && (
                  <label className="flex items-center gap-2 text-[12.5px] cursor-pointer select-none pt-1">
                    <input type="checkbox" checked={requestApproval} onChange={(e) => setRequestApproval(e.target.checked)} />
                    Request client approval
                  </label>
                )}
                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer select-none">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                  <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Pin to top</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[var(--hairline)]">
              <button onClick={onClose} disabled={saving} className="h-9 px-3 text-[13px] rounded text-muted-foreground hover:bg-accent/60 cursor-pointer" style={{ fontWeight: 500 }}>
                Cancel
              </button>
              <button
                onClick={handleSave} disabled={saving}
                className="h-9 px-4 text-[13px] rounded bg-primary text-primary-foreground inline-flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontWeight: 600 }}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEdit ? 'Save changes' : 'Add document'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
