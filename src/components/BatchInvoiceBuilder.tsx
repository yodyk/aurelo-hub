import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import * as invoiceApi from "../data/invoiceApi";
import type { Invoice, LineItem } from "../data/invoiceApi";

interface BatchInvoiceBuilderProps {
  clients: any[];
  sessions: any[];
  existingInvoices: Invoice[];
  onComplete: (newInvoices: Invoice[]) => void;
  onClose: () => void;
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function BatchInvoiceBuilder({
  clients,
  sessions,
  existingInvoices,
  onComplete,
  onClose,
}: BatchInvoiceBuilderProps) {
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [taxRate, setTaxRate] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<
    { clientName: string; success: boolean; invoiceNumber?: string; error?: string }[] | null
  >(null);

  // Find already-invoiced session IDs
  const invoicedSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const inv of existingInvoices) {
      if (inv.status !== "voided" && inv.status !== "cancelled") {
        for (const s of inv.createdFromSessions || []) ids.add(s);
        for (const li of inv.lineItems) {
          for (const sid of li.sessionIds || []) ids.add(sid);
        }
      }
    }
    return ids;
  }, [existingInvoices]);

  // Clients with unbilled sessions
  const eligibleClients = useMemo(() => {
    const activeClients = clients.filter((c) => c.status !== "Archived");
    return activeClients
      .map((client) => {
        const unbilled = sessions.filter(
          (s: any) =>
            s.clientId === client.id &&
            s.billable !== false &&
            !invoicedSessionIds.has(String(s.id))
        );
        const totalHours = unbilled.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
        const totalRevenue = unbilled.reduce(
          (sum: number, s: any) => sum + (s.duration || 0) * (client.rate || 0),
          0
        );
        return { ...client, unbilledSessions: unbilled, totalHours, totalRevenue };
      })
      .filter((c) => c.unbilledSessions.length > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [clients, sessions, invoicedSessionIds]);

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedClientIds.size === eligibleClients.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(eligibleClients.map((c) => c.id)));
    }
  };

  const selectedClients = eligibleClients.filter((c) => selectedClientIds.has(c.id));
  const totalAmount = selectedClients.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalTax = Math.round(totalAmount * taxRate * 100) / 100;
  const grandTotal = totalAmount + totalTax;

  const handleGenerate = useCallback(async () => {
    if (selectedClients.length === 0) return;
    setGenerating(true);
    const outcomes: { clientName: string; success: boolean; invoiceNumber?: string; error?: string }[] = [];
    const created: Invoice[] = [];

    for (const client of selectedClients) {
      try {
        const rate = client.rate || 0;
        const lineItems: LineItem[] = client.unbilledSessions.map((s: any) => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          description: `${s.task || "Work session"} — ${formatDate(s.date)}`,
          quantity: s.duration || 0,
          rate,
          amount: Math.round((s.duration || 0) * rate * 100) / 100,
          sessionIds: [String(s.id)],
        }));

        const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
        const taxAmount = Math.round(subtotal * taxRate * 100) / 100;

        const saved = await invoiceApi.createInvoice({
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.contactEmail || client.email || "",
          lineItems,
          subtotal,
          taxRate,
          taxAmount,
          total: subtotal + taxAmount,
          currency: "USD",
          dueDate: new Date(
            Date.now() +
              (paymentTerms === "Due on receipt"
                ? 0
                : parseInt(paymentTerms.replace("Net ", "")) * 24 * 60 * 60 * 1000)
          ).toISOString(),
          issuedDate: new Date().toISOString(),
          paymentTerms,
          createdFromSessions: client.unbilledSessions.map((s: any) => String(s.id)),
        });
        created.push(saved);
        outcomes.push({ clientName: client.name, success: true, invoiceNumber: saved.number });
      } catch (err: any) {
        outcomes.push({ clientName: client.name, success: false, error: err.message || "Failed" });
      }
    }

    setResults(outcomes);
    setGenerating(false);

    const successCount = outcomes.filter((o) => o.success).length;
    if (successCount > 0) {
      toast.success(`${successCount} invoice${successCount > 1 ? "s" : ""} created`);
      onComplete(created);
    }
    if (outcomes.some((o) => !o.success)) {
      toast.error(`${outcomes.filter((o) => !o.success).length} invoice(s) failed`);
    }
  }, [selectedClients, taxRate, paymentTerms, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-2xl mx-4 overflow-hidden"
        style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-[16px]" style={{ fontWeight: 600 }}>
              Batch invoicing
            </h2>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[#bfa044]/10 text-[#bfa044]" style={{ fontWeight: 600 }}>
              STUDIO
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results view */}
        {results ? (
          <div className="px-6 py-5">
            <div className="text-[14px] text-foreground mb-4" style={{ fontWeight: 600 }}>
              Batch complete
            </div>
            <div className="space-y-2 mb-5">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border"
                >
                  {r.success ? (
                    <CheckCircle2 className="w-4 h-4 text-[#5ea1bf] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#c27272] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>
                      {r.clientName}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.success ? `Created ${r.invoiceNumber}` : r.error}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
              style={{ fontWeight: 500 }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {/* Description */}
            <p className="text-[13px] text-muted-foreground mb-5 leading-relaxed">
              Generate draft invoices for multiple clients at once from their unbilled sessions.
              Each client gets a separate invoice with all their unbilled work.
            </p>

            {eligibleClients.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-accent/40 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-[15px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  No unbilled sessions
                </h3>
                <p className="text-[13px] text-muted-foreground max-w-sm mx-auto">
                  All billable sessions have already been invoiced. Log more time to generate new invoices.
                </p>
              </div>
            ) : (
              <>
                {/* Select all */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={selectAll}
                    className="text-[12px] text-primary hover:text-primary/80 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    {selectedClientIds.size === eligibleClients.length
                      ? "Deselect all"
                      : `Select all (${eligibleClients.length})`}
                  </button>
                  <span className="text-[12px] text-muted-foreground">
                    {selectedClientIds.size} selected
                  </span>
                </div>

                {/* Client list */}
                <div className="space-y-1.5 mb-5">
                  {eligibleClients.map((client) => {
                    const isSelected = selectedClientIds.has(client.id);
                    return (
                      <button
                        key={client.id}
                        onClick={() => toggleClient(client.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "border-primary/30 bg-primary/[0.04]"
                            : "border-border hover:border-border hover:bg-accent/20"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>
                            {client.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            {client.unbilledSessions.length} session{client.unbilledSessions.length !== 1 ? "s" : ""} · {client.totalHours}h
                          </div>
                        </div>
                        <div className="text-[14px] text-foreground tabular-nums" style={{ fontWeight: 600 }}>
                          {formatCurrency(client.totalRevenue)}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
                      Payment terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full text-[13px] px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option>Due on receipt</option>
                      <option>Net 15</option>
                      <option>Net 30</option>
                      <option>Net 45</option>
                      <option>Net 60</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
                      Tax rate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.1}
                      value={taxRate * 100}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value || "0") / 100)}
                      className="w-full text-[13px] px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 tabular-nums"
                    />
                  </div>
                </div>

                {/* Summary + Generate */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                        {selectedClients.length} invoice{selectedClients.length !== 1 ? "s" : ""} to generate
                      </div>
                      {selectedClients.length > 0 && (
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                          Subtotal {formatCurrency(totalAmount)}
                          {taxRate > 0 && ` + ${formatCurrency(totalTax)} tax`}
                        </div>
                      )}
                    </div>
                    {selectedClients.length > 0 && (
                      <div className="text-[18px] text-foreground tabular-nums" style={{ fontWeight: 600 }}>
                        {formatCurrency(grandTotal)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={selectedClients.length === 0 || generating}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontWeight: 500 }}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating {selectedClients.length} invoice{selectedClients.length !== 1 ? "s" : ""}...
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        Generate {selectedClients.length} draft invoice{selectedClients.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
