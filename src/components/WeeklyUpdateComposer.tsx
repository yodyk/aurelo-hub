// ── Weekly portal update composer ───────────────────────────────────
// Freelancer-facing editor for the "This week / Next week / Waiting on you"
// card surfaced on the Client Portal home.
import { useEffect, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  loadLatestPortalUpdate,
  postPortalUpdate,
  type PortalUpdate,
} from '@/data/portalContentApi';
import { useAuth } from '@/data/AuthContext';

interface Props {
  workspaceId: string;
  clientId: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export default function WeeklyUpdateComposer({ workspaceId, clientId }: Props) {
  const { user } = useAuth();
  const [latest, setLatest] = useState<PortalUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [thisWeek, setThisWeek] = useState('');
  const [nextWeek, setNextWeek] = useState('');
  const [waitingOnYou, setWaitingOnYou] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    loadLatestPortalUpdate(clientId)
      .then((u) => setLatest(u))
      .finally(() => setLoading(false));
  }, [clientId]);

  const startFromLatest = () => {
    setThisWeek(latest?.thisWeek || '');
    setNextWeek(latest?.nextWeek || '');
    setWaitingOnYou(latest?.waitingOnYou || '');
  };

  const handlePost = async () => {
    if (!workspaceId || !clientId) return;
    const hasContent = [thisWeek, nextWeek, waitingOnYou].some((s) => s.trim().length > 0);
    if (!hasContent) {
      toast.error('Add at least one section before posting');
      return;
    }
    setPosting(true);
    try {
      const posted = await postPortalUpdate(
        workspaceId,
        clientId,
        {
          thisWeek: thisWeek.trim() || null,
          nextWeek: nextWeek.trim() || null,
          waitingOnYou: waitingOnYou.trim() || null,
        },
        user?.id ?? null,
      );
      setLatest(posted);
      setThisWeek('');
      setNextWeek('');
      setWaitingOnYou('');
      toast.success('Weekly update posted to client portal');
    } catch (err: any) {
      toast.error(err.message || 'Failed to post update');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span
            className="text-[12px] uppercase tracking-wider text-primary"
            style={{ fontWeight: 600, letterSpacing: '0.08em' }}
          >
            Weekly update
          </span>
        </div>
        {loading ? (
          <span className="text-[11px] text-muted-foreground">Loading…</span>
        ) : latest ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Last posted {timeAgo(latest.postedAt)}
            </span>
            <button
              onClick={startFromLatest}
              className="text-[11px] text-primary hover:underline cursor-pointer"
              style={{ fontWeight: 500 }}
            >
              Reuse
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">No updates posted yet</span>
        )}
      </div>

      <div className="text-[12px] text-muted-foreground">
        Posts a short status card on the client portal home. Replaces any previous update.
      </div>

      <Field
        label="This week"
        placeholder="Wrapped the homepage redesign. Started on the pricing page wireframes."
        value={thisWeek}
        onChange={setThisWeek}
      />
      <Field
        label="Next week"
        placeholder="Build out the pricing page in code. Begin onboarding flow."
        value={nextWeek}
        onChange={setNextWeek}
      />
      <Field
        label="Waiting on you"
        placeholder="Approval on the pricing copy. Final brand colors for the CTA."
        value={waitingOnYou}
        onChange={setWaitingOnYou}
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={handlePost}
          disabled={posting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
          style={{
            fontWeight: 600,
            opacity: posting ? 0.4 : 1,
            cursor: posting ? 'not-allowed' : 'pointer',
          }}
        >
          {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {posting ? 'Posting…' : 'Post update'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 1000))}
        rows={2}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
      />
    </div>
  );
}
