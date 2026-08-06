// ── DocumentsPanel — canonical client document manager ──────────────
import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Star, MoreHorizontal, ExternalLink, Download, Pencil,
  Archive, Trash2, Eye, EyeOff, Loader2, CheckCircle2, Clock, XCircle,
} from 'lucide-react';
import {
  loadDocuments, loadDocumentCategories, findOrphanFiles, adoptOrphanFiles,
  updateDocument, archiveDocument, deleteDocument, getSignedUrl, providerLabel,
  type ClientDocument, type DocumentVisibility, type ApprovalState,
} from '@/data/documentsApi';
import DocumentIcon from './DocumentIcon';
import AddDocumentModal from './AddDocumentModal';
import { toast } from '@/lib/toast';

interface Props {
  workspaceId: string;
  clientId: string;
}

const APPROVAL_META: Record<ApprovalState, { label: string; tint: string; Icon: any } | null> = {
  not_required: null,
  pending: { label: 'Pending approval', tint: '#B45309', Icon: Clock },
  approved: { label: 'Approved', tint: '#15803D', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', tint: '#B91C1C', Icon: XCircle },
};

function formatBytes(n: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DocumentsPanel({ workspaceId, clientId }: Props) {
  const [docs, setDocs] = useState<ClientDocument[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<'' | DocumentVisibility>('');
  const [approval, setApproval] = useState<'' | ApprovalState>('');
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientDocument | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ClientDocument | null>(null);

  useEffect(() => {
    if (!workspaceId || !clientId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      const [rows, cats] = await Promise.all([
        loadDocuments(workspaceId, clientId),
        loadDocumentCategories(workspaceId),
      ]);
      if (!mounted) return;
      setCategories(cats);
      // Adopt any legacy storage uploads that have no document row yet.
      const orphans = await findOrphanFiles(workspaceId, clientId, rows);
      let all = rows;
      if (orphans.length > 0) {
        const adopted = await adoptOrphanFiles(workspaceId, clientId, orphans);
        all = [...adopted, ...rows];
      }
      if (mounted) { setDocs(all); setLoading(false); }
    })().catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [workspaceId, clientId]);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (showArchived ? d.lifecycleState !== 'archived' : d.lifecycleState !== 'active') return false;
      if (category && (d.category || '') !== category) return false;
      if (visibility && d.visibility !== visibility) return false;
      if (approval && d.approvalState !== approval) return false;
      if (q) {
        const hay = `${d.title} ${d.description || ''} ${d.category || ''} ${d.fileName || ''} ${d.url || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [docs, query, category, visibility, approval, showArchived]);

  const pinned = filtered.filter((d) => d.isPinned);
  const rest = filtered.filter((d) => !d.isPinned);
  const pendingCount = docs.filter((d) => d.lifecycleState === 'active' && d.approvalState === 'pending').length;
  const usedCategories = useMemo(
    () => Array.from(new Set(docs.map((d) => d.category).filter(Boolean) as string[])).sort(),
    [docs],
  );

  const patchDoc = (id: string, patch: Partial<ClientDocument>) =>
    setDocs((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const openDoc = async (d: ClientDocument) => {
    if (d.url) { window.open(d.url, '_blank', 'noopener,noreferrer'); return; }
    if (d.filePath) {
      const signed = await getSignedUrl(d.filePath);
      if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
      else toast.error('Could not open this file.');
    }
  };

  const togglePin = async (d: ClientDocument) => {
    patchDoc(d.id, { isPinned: !d.isPinned });
    try { await updateDocument(d.id, { isPinned: !d.isPinned }); }
    catch (e) { patchDoc(d.id, { isPinned: d.isPinned }); toast.error((e as Error).message); }
  };

  const toggleVisibility = async (d: ClientDocument) => {
    const next: DocumentVisibility = d.visibility === 'shared' ? 'internal' : 'shared';
    const nextApproval: ApprovalState = next === 'internal' ? 'not_required' : d.approvalState;
    patchDoc(d.id, { visibility: next, approvalState: nextApproval });
    try { await updateDocument(d.id, { visibility: next, approvalState: nextApproval }); }
    catch (e) { patchDoc(d.id, { visibility: d.visibility, approvalState: d.approvalState }); toast.error((e as Error).message); }
  };

  const requestApproval = async (d: ClientDocument) => {
    patchDoc(d.id, { visibility: 'shared', approvalState: 'pending' });
    try { await updateDocument(d.id, { visibility: 'shared', approvalState: 'pending' }); toast.success('Approval requested.'); }
    catch (e) { patchDoc(d.id, { visibility: d.visibility, approvalState: d.approvalState }); toast.error((e as Error).message); }
  };

  const toggleArchive = async (d: ClientDocument) => {
    const next = d.lifecycleState === 'archived' ? 'active' : 'archived';
    patchDoc(d.id, { lifecycleState: next });
    try { await archiveDocument(d.id, next === 'archived'); }
    catch (e) { patchDoc(d.id, { lifecycleState: d.lifecycleState }); toast.error((e as Error).message); }
  };

  const doDelete = async (d: ClientDocument) => {
    const prev = docs;
    setDocs((p) => p.filter((x) => x.id !== d.id));
    setConfirmDelete(null);
    try { await deleteDocument(d); toast.success('Document deleted.'); }
    catch (e) { setDocs(prev); toast.error((e as Error).message); }
  };

  const refreshAfterEdit = async () => {
    const rows = await loadDocuments(workspaceId, clientId);
    setDocs(rows);
  };

  const selectCls = 'text-[12px] h-8 px-2 rounded border border-[var(--hairline)] bg-[var(--surface-1)] outline-none cursor-pointer';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents"
              className="h-8 w-[200px] text-[12.5px] pl-8 pr-2.5 rounded border border-[var(--hairline)] bg-[var(--surface-1)] outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
            <option value="">All categories</option>
            {usedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} className={selectCls}>
            <option value="">All visibility</option>
            <option value="internal">Internal only</option>
            <option value="shared">Shared</option>
          </select>
          <select value={approval} onChange={(e) => setApproval(e.target.value as any)} className={selectCls}>
            <option value="">Any approval</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="not_required">Not required</option>
          </select>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={`h-8 px-2.5 text-[12px] rounded border border-[var(--hairline)] cursor-pointer transition-colors ${
              showArchived ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground hover:bg-accent/50'
            }`}
          >
            {showArchived ? 'Archived' : 'Active'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[11.5px] px-2 py-1 rounded" style={{ backgroundColor: 'color-mix(in srgb, #B45309 10%, transparent)', color: '#B45309' }}>
              {pendingCount} pending approval
            </span>
          )}
          <button
            type="button"
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded bg-primary text-primary-foreground text-[12.5px] cursor-pointer"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-3.5 h-3.5" /> Add document
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-[var(--hairline)] rounded-md py-12 text-center">
          <p className="text-[13.5px]" style={{ fontWeight: 500 }}>
            {showArchived ? 'No archived documents' : 'No documents yet'}
          </p>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            Contracts, proposals, brand assets, Figma files, Drive folders — everything for this client lives here.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--hairline)] rounded-md overflow-hidden">
          {pinned.length > 0 && (
            <div className="px-3 py-1.5 bg-[var(--surface-1)] border-b border-[var(--hairline)] text-[10.5px] uppercase tracking-wide text-muted-foreground">
              Pinned
            </div>
          )}
          {[...pinned, ...rest].map((d, i) => {
            const meta = APPROVAL_META[d.approvalState];
            const isFirstUnpinned = pinned.length > 0 && i === pinned.length;
            return (
              <div key={d.id}>
                {isFirstUnpinned && (
                  <div className="px-3 py-1.5 bg-[var(--surface-1)] border-y border-[var(--hairline)] text-[10.5px] uppercase tracking-wide text-muted-foreground">
                    All documents
                  </div>
                )}
                <div className="group flex items-center gap-3 px-3 py-2.5 border-b border-[var(--hairline)] last:border-b-0 hover:bg-accent/40 transition-colors">
                  <DocumentIcon doc={d} />
                  <button
                    type="button"
                    onClick={() => openDoc(d)}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      {d.isPinned && <Star className="w-3 h-3 flex-shrink-0" style={{ fill: 'currentColor' }} />}
                      <span className="text-[13.5px] truncate" style={{ fontWeight: 500 }}>{d.title}</span>
                      {d.kind === 'link' && (
                        <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-muted-foreground flex-shrink-0">
                          {providerLabel(d.provider)}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground truncate">
                      {d.description || d.fileName || d.url || '—'}
                      {d.fileSize ? ` · ${formatBytes(d.fileSize)}` : ''}
                    </div>
                  </button>

                  <div className="hidden md:block w-[130px] text-[12px] text-muted-foreground truncate">
                    {d.category || 'Uncategorized'}
                  </div>
                  <div className="hidden lg:flex w-[110px] items-center gap-1 text-[12px] text-muted-foreground">
                    {d.visibility === 'shared'
                      ? <><Eye className="w-3.5 h-3.5" /> Shared</>
                      : <><EyeOff className="w-3.5 h-3.5" /> Internal</>}
                  </div>
                  <div className="hidden lg:block w-[130px] text-[11.5px]">
                    {meta ? (
                      <span className="inline-flex items-center gap-1" style={{ color: meta.tint }}>
                        <meta.Icon className="w-3.5 h-3.5" /> {meta.label}
                      </span>
                    ) : <span className="text-muted-foreground/60">—</span>}
                  </div>
                  <div className="hidden xl:block w-[100px] text-[12px] text-muted-foreground tabular-nums">
                    {formatDate(d.documentDate || d.createdAt)}
                  </div>

                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setMenuId(menuId === d.id ? null : d.id); }}
                      className="p-1.5 rounded hover:bg-accent cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {menuId === d.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 z-30 w-[190px] bg-card border border-[var(--hairline)] rounded-md py-1"
                        style={{ boxShadow: 'var(--elev-2)' }}
                      >
                        <MenuItem icon={d.kind === 'link' ? ExternalLink : Download} label={d.kind === 'link' ? 'Open link' : 'Download'} onClick={() => { setMenuId(null); openDoc(d); }} />
                        <MenuItem icon={Pencil} label="Edit details" onClick={() => { setMenuId(null); setEditing(d); setModalOpen(true); }} />
                        <MenuItem icon={Star} label={d.isPinned ? 'Unpin' : 'Pin to top'} onClick={() => { setMenuId(null); togglePin(d); }} />
                        <MenuItem
                          icon={d.visibility === 'shared' ? EyeOff : Eye}
                          label={d.visibility === 'shared' ? 'Make internal' : 'Share with client'}
                          onClick={() => { setMenuId(null); toggleVisibility(d); }}
                        />
                        {d.approvalState !== 'pending' && (
                          <MenuItem icon={Clock} label="Request approval" onClick={() => { setMenuId(null); requestApproval(d); }} />
                        )}
                        <MenuItem icon={Archive} label={d.lifecycleState === 'archived' ? 'Restore' : 'Archive'} onClick={() => { setMenuId(null); toggleArchive(d); }} />
                        <MenuItem icon={Trash2} label="Delete" destructive onClick={() => { setMenuId(null); setConfirmDelete(d); }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddDocumentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        workspaceId={workspaceId}
        clientId={clientId}
        categories={categories}
        editing={editing}
        onSaved={(doc) => { if (doc) setDocs((p) => [doc, ...p]); else void refreshAfterEdit(); }}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-[380px] bg-card border border-[var(--hairline)] rounded-lg p-5" style={{ boxShadow: 'var(--elev-3)' }}>
            <h4 className="text-[14px] font-display mb-1.5" style={{ fontWeight: 600 }}>Delete document?</h4>
            <p className="text-[12.5px] text-muted-foreground mb-4">
              “{confirmDelete.title}” and any uploaded file will be permanently removed. Archiving keeps it out of the way without losing it.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="h-8 px-3 text-[12.5px] rounded text-muted-foreground hover:bg-accent/60 cursor-pointer">Cancel</button>
              <button onClick={() => doDelete(confirmDelete)} className="h-8 px-3 text-[12.5px] rounded bg-destructive text-destructive-foreground cursor-pointer" style={{ fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, destructive }: { icon: any; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-left cursor-pointer hover:bg-accent/60 ${destructive ? 'text-destructive' : ''}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
