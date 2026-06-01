// ── Shared Resources Panel (Phase 4) ────────────────────────────────
// Freelancer-side manager for the link-first resources shown in the Client Portal.
import { useEffect, useState } from "react";
import { Link2, Plus, Trash2, ExternalLink, Eye, Check, X, Loader2 } from "lucide-react";
import {
  loadResources,
  createResource,
  updateResource,
  deleteResource,
  providerLabel,
  detectProvider,
  type SharedResource,
  type ResourceStatus,
} from "@/data/sharedResourcesApi";
import { toast } from "@/lib/toast";

interface Props {
  workspaceId: string;
  clientId: string;
}

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: 'shared', label: 'Shared' },
  { value: 'for_review', label: 'For review' },
  { value: 'approved', label: 'Approved' },
  { value: 'final', label: 'Final' },
];

export default function SharedResourcesPanel({ workspaceId, clientId }: Props) {
  const [items, setItems] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspaceId || !clientId) return;
    let mounted = true;
    setLoading(true);
    loadResources(workspaceId, clientId)
      .then((rows) => { if (mounted) setItems(rows); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [workspaceId, clientId]);

  const reset = () => {
    setTitle(''); setUrl(''); setDescription(''); setNeedsApproval(false); setAdding(false);
  };

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL are required.');
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      toast.error('Enter a valid URL (including https://).');
      return;
    }
    setBusy(true);
    try {
      const created = await createResource(workspaceId, clientId, {
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || null,
        needsApproval,
      });
      setItems((prev) => [created, ...prev]);
      reset();
      toast.success('Resource shared with client.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (id: string, status: ResourceStatus) => {
    const prev = items;
    setItems((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await updateResource(id, { status });
    } catch (e) {
      setItems(prev);
      toast.error((e as Error).message);
    }
  };

  const handleToggleApproval = async (r: SharedResource) => {
    const next = !r.needsApproval;
    const prev = items;
    setItems((p) => p.map((x) => (x.id === r.id ? { ...x, needsApproval: next, status: next ? 'for_review' : x.status } : x)));
    try {
      await updateResource(r.id, { needsApproval: next, status: next ? 'for_review' : r.status });
    } catch (e) {
      setItems(prev);
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this resource from the client portal?')) return;
    const prev = items;
    setItems((p) => p.filter((r) => r.id !== id));
    try {
      await deleteResource(id);
    } catch (e) {
      setItems(prev);
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="border border-[var(--hairline)] rounded-md bg-[var(--surface-raised)]">
      <div className="flex items-center justify-between p-3 border-b border-[var(--hairline)]">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-[13.5px] font-display font-semibold">Shared resources</h4>
          {items.length > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums">· {items.length}</span>
          )}
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add resource
          </button>
        )}
      </div>

      {adding && (
        <div className="p-3 border-b border-[var(--hairline)] space-y-2 bg-[var(--surface-1)]">
          <input
            type="text"
            placeholder="Title (e.g. Brand guidelines)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-[13px] px-2.5 py-1.5 rounded border border-[var(--hairline)] bg-[var(--input-background)] outline-none focus:border-primary/40"
          />
          <input
            type="url"
            placeholder="https://drive.google.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full text-[13px] px-2.5 py-1.5 rounded border border-[var(--hairline)] bg-[var(--input-background)] outline-none focus:border-primary/40"
          />
          {url && (
            <p className="text-[11px] text-muted-foreground">
              Detected: <span className="font-medium text-foreground">{providerLabel(detectProvider(url))}</span>
            </p>
          )}
          <textarea
            placeholder="Optional description for the client"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-[13px] px-2.5 py-1.5 rounded border border-[var(--hairline)] bg-[var(--input-background)] outline-none focus:border-primary/40 resize-none"
          />
          <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={needsApproval}
              onChange={(e) => setNeedsApproval(e.target.checked)}
            />
            Request client approval
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy}
              className="text-[12px] font-semibold px-3 py-1.5 rounded bg-primary text-primary-foreground cursor-pointer disabled:opacity-60"
            >
              {busy ? 'Adding…' : 'Share'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="text-[12px] font-semibold px-3 py-1.5 rounded text-muted-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-6 text-center text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
        </div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center text-[12.5px] text-muted-foreground">
          No resources shared yet. Add Drive folders, Figma files, Loom walkthroughs, Notion docs — anything that lives outside Aurelo.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--hairline)]">
          {items.map((r) => (
            <li key={r.id} className="p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-display font-semibold truncate">{r.title}</span>
                  <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--surface-1)] text-muted-foreground">
                    {providerLabel(r.provider)}
                  </span>
                  {r.needsApproval && (
                    <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                      Awaiting approval
                    </span>
                  )}
                </div>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11.5px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{r.url}</span>
                  </a>
                )}
                {r.description && (
                  <p className="text-[12px] text-muted-foreground mt-1">{r.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <select
                  value={r.status}
                  onChange={(e) => handleStatusChange(r.id, e.target.value as ResourceStatus)}
                  className="text-[11.5px] px-1.5 py-1 rounded border border-[var(--hairline)] bg-[var(--input-background)] outline-none cursor-pointer"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleToggleApproval(r)}
                  title={r.needsApproval ? 'Stop requesting approval' : 'Request approval'}
                  className="p-1.5 rounded hover:bg-[var(--surface-1)] cursor-pointer"
                >
                  {r.needsApproval ? (
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  title="Remove"
                  className="p-1.5 rounded hover:bg-[var(--surface-1)] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
