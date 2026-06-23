import { useEffect, useState } from "react";
import { MessageCircle, Send, Trash2, Check } from "lucide-react";
import {
  PortalQuestion,
  loadPortalQuestions,
  askPortalQuestion,
  answerPortalQuestion,
  closePortalQuestion,
  deletePortalQuestion,
} from "@/data/portalQuestionsApi";
import { toast } from "@/lib/toast";
import { fmtH } from '@/lib/format';
const showError = (m: string) => toast.error(m);

function relTime(iso: string) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${fmtH(Math.floor(diff / 3600))}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return ""; }
}

export default function PortalQuestionsPanel({
  workspaceId,
  clientId,
}: {
  workspaceId: string;
  clientId: string;
}) {
  const [list, setList] = useState<PortalQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQ, setNewQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId || !clientId) return;
    let mounted = true;
    setLoading(true);
    loadPortalQuestions(clientId)
      .then((rows) => { if (mounted) setList(rows); })
      .catch((e) => showError(e?.message || "Failed to load questions"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [workspaceId, clientId]);

  async function handleAsk() {
    const q = newQ.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const row = await askPortalQuestion({ workspaceId, clientId, question: q });
      setList((prev) => [row, ...prev]);
      setNewQ("");
    } catch (e: any) {
      showError(e?.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  async function handleAnswer(id: string) {
    const a = (answer[id] || "").trim();
    if (!a || busyId) return;
    setBusyId(id);
    try {
      const row = await answerPortalQuestion(id, a);
      setList((prev) => prev.map((q) => (q.id === id ? row : q)));
      setAnswer((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e: any) {
      showError(e?.message || "Failed to send");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClose(id: string) {
    try {
      await closePortalQuestion(id);
      setList((prev) => prev.map((q) => (q.id === id ? { ...q, status: "closed" } : q)));
    } catch (e: any) {
      showError(e?.message || "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question thread?")) return;
    try {
      await deletePortalQuestion(id);
      setList((prev) => prev.filter((q) => q.id !== id));
    } catch (e: any) {
      showError(e?.message || "Failed");
    }
  }

  const open = list.filter((q) => q.status === "open");
  const recent = list.filter((q) => q.status !== "open").slice(0, 5);

  return (
    <section className="rounded border border-[var(--hairline)] bg-[var(--surface-raised)] p-5">
      <header className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="font-display text-[13.5px] font-semibold tracking-tight">
          Questions
        </h3>
        {open.length > 0 && (
          <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-muted-foreground tabular-nums">
            {open.length} open
          </span>
        )}
      </header>

      {/* Ask new */}
      <div className="mb-4">
        <div className="flex items-end gap-2">
          <textarea
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            rows={2}
            placeholder="Ask the client a question…"
            className="flex-1 text-[13px] px-3 py-2 rounded border border-[var(--hairline)] bg-[var(--input-background)] resize-none focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          />
          <button
            onClick={handleAsk}
            disabled={busy || !newQ.trim()}
            className="text-[12px] font-semibold px-3 py-2 rounded bg-primary text-primary-foreground inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" /> Ask
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-[12px] text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-[12px] text-muted-foreground">
          No questions yet. Use the box above to ask the client something, or
          they can ask from their portal.
        </div>
      ) : (
        <div className="space-y-3">
          {open.map((q) => (
            <div
              key={q.id}
              className="rounded border border-[var(--hairline)] p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10.5px] uppercase tracking-wide font-semibold text-primary"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {q.askedBy === "owner" ? "You asked" : "Client asked"} · {relTime(q.askedAt)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleClose(q.id)}
                    title="Mark closed"
                    className="p-1 rounded hover:bg-[var(--surface-sunken)] text-muted-foreground cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    title="Delete"
                    className="p-1 rounded hover:bg-[var(--surface-sunken)] text-muted-foreground cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap">
                {q.question}
              </div>
              {q.askedBy === "client" && (
                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    value={answer[q.id] || ""}
                    onChange={(e) =>
                      setAnswer((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Type your reply…"
                    className="flex-1 text-[13px] px-3 py-2 rounded border border-[var(--hairline)] bg-[var(--input-background)] resize-none focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  />
                  <button
                    onClick={() => handleAnswer(q.id)}
                    disabled={busyId === q.id || !(answer[q.id] || "").trim()}
                    className="text-[12px] font-semibold px-3 py-2 rounded bg-primary text-primary-foreground inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5" /> Reply
                  </button>
                </div>
              )}
              {q.askedBy === "owner" && (
                <div className="mt-2 text-[11.5px] text-muted-foreground">
                  Waiting for the client to answer
                </div>
              )}
            </div>
          ))}
          {recent.length > 0 && (
            <div className="pt-2">
              <div className="text-[10.5px] uppercase tracking-wide font-semibold text-muted-foreground mb-1.5" style={{ letterSpacing: "0.08em" }}>
                Recently closed
              </div>
              <div className="space-y-2">
                {recent.map((q) => (
                  <div key={q.id} className="rounded border border-[var(--hairline)] p-3 bg-[var(--surface-sunken)]/40">
                    <div className="text-[10.5px] uppercase tracking-wide font-semibold text-muted-foreground mb-1" style={{ letterSpacing: "0.08em" }}>
                      {q.askedBy === "owner" ? "You asked" : "Client asked"} · {relTime(q.askedAt)}
                    </div>
                    <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{q.question}</div>
                    {q.answer && (
                      <div className="mt-2 pl-3 border-l-2 border-primary/60">
                        <div className="text-[10.5px] uppercase tracking-wide font-semibold text-primary mb-0.5" style={{ letterSpacing: "0.08em" }}>
                          {q.answeredBy === "client" ? "Client replied" : "You replied"}
                        </div>
                        <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{q.answer}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
