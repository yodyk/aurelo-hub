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
  ChevronDown,
  ChevronRight,
  Receipt,
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
  // Selected session IDs per client
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [taxRate, setTaxRate] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
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

  // Map invoiced session IDs to invoice numbers for display
  const sessionInvoiceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of existingInvoices) {
      if (inv.status !== "voided" && inv.status !== "cancelled") {
        for (const s of inv.createdFromSessions || []) map.set(s, inv.number);
        for (const li of inv.lineItems) {
          for (const sid of li.sessionIds || []) map.set(sid, inv.number);
        }
      }
    }
    return map;
  }, [existingInvoices]);

  // Clients with billable sessions (include already-invoiced ones for visibility)
  const clientsWithSessions = useMemo(() => {
    const activeClients = clients.filter((c) => c.status !== "Archived");
    return activeClients
      .map((client) => {
        const billableSessions = sessions.filter(
          (s: any) => s.clientId === client.id && s.billable !== false
        );
        const unbilled = billableSessions.filter(
          (s: any) => !invoicedSessionIds.has(String(s.id))
        );
        const invoiced = billableSessions.filter(
          (s: any) => invoicedSessionIds.has(String(s.id))
        );
        return { ...client, allBillable: billableSessions, unbilled, invoiced };
      })
      .filter((c) => c.allBillable.length > 0)
      .sort((a, b) => b.unbilled.length - a.unbilled.length);
  }, [clients, sessions, invoicedSessionIds]);

  const toggleExpanded = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const selectAllForClient = (client: any) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      const unbilledIds = client.unbilled.map((s: any) => String(s.id));
      const allSelected = unbilledIds.every((id: string) => next.has(id));
      if (allSelected) {
        unbilledIds.forEach((id: string) => next.delete(id));
      } else {
        unbilledIds.forEach((id: string) => next.add(id));
      }
      return next;
    });
  };

  const selectAllUnbilled = () => {
    const allUnbilledIds = clientsWithSessions.flatMap((c) =>
      c.unbilled.map((s: any) => String(s.id))
    );
    setSelectedSessionIds((prev) => {
      const allSelected = allUnbilledIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allUnbilledIds);
    });
  };

  // Group selected sessions by client
  const selectedByClient = useMemo(() => {
    const map = new Map<string, { client: any; sessions: any[] }>();
    for (const client of clientsWithSessions) {
      const selected = client.unbilled.filter((s: any) =>
        selectedSessionIds.has(String(s.id))
      );
      if (selected.length > 0) {
        map.set(client.id, { client, sessions: selected });
      }
    }
    return map;
  }, [clientsWithSessions, selectedSessionIds]);

  const totalSelectedSessions = selectedSessionIds.size;
  const invoiceCount = selectedByClient.size;
  const totalAmount = Array.from(selectedByClient.values()).reduce(
    (sum, { client, sessions: sess }) =>
      sum + sess.reduce((s: number, se: any) => s + (se.duration || 0) * (client.rate || 0), 0),
    0
  );
  const totalTax = taxInclusive && taxRate > 0
    ? Math.round((totalAmount - totalAmount / (1 + taxRate)) * 100) / 100
    : Math.round(totalAmount * taxRate * 100) / 100;
  const grandTotal = taxInclusive ? totalAmount : totalAmount + totalTax;

  const handleGenerate = useCallback(async () => {
    if (selectedByClient.size === 0) return;
    setGenerating(true);
    const outcomes: { clientName: string; success: boolean; invoiceNumber?: string; error?: string }[] = [];
    const created: Invoice[] = [];

    for (const [, { client, sessions: sess }] of selectedByClient) {
      try {
        const invoiceNumber = await invoiceApi.getNextInvoiceNumber();
        const rate = client.rate || 0;
        const lineItems: LineItem[] = sess.map((s: any) => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          description: `${s.task || "Work session"} — ${formatDate(s.date)}`,
          quantity: s.duration || 0,
          rate,
          amount: Math.round((s.duration || 0) * rate * 100) / 100,
          sessionIds: [String(s.id)],
        }));

        const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
        const invoiceSubtotal = taxInclusive && taxRate > 0
          ? Math.round((lineItemsTotal / (1 + taxRate)) * 100) / 100
          : lineItemsTotal;
        const taxAmount = taxInclusive && taxRate > 0
          ? Math.round((lineItemsTotal - invoiceSubtotal) * 100) / 100
          : Math.round(lineItemsTotal * taxRate * 100) / 100;
        const invoiceTotal = taxInclusive ? lineItemsTotal : lineItemsTotal + taxAmount;

        const saved = await invoiceApi.createInvoice({
          number: invoiceNumber,
          clientId: client.id,
          clientName: client.name,
          clientEmail: client.contactEmail || client.email || "",
          lineItems,
          subtotal: invoiceSubtotal,
          taxRate,
          taxAmount,
          total: invoiceTotal,
          currency: "USD",
          dueDate: new Date(
            Date.now() +
              (paymentTerms === "Due on receipt"
                ? 0
                : parseInt(paymentTerms.replace("Net ", "")) * 24 * 60 * 60 * 1000)
          ).toISOString(),
          issuedDate: new Date().toISOString(),
          paymentTerms,
          createdFromSessions: sess.map((s: any) => String(s.id)),
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
  }, [selectedByClient, taxRate, taxInclusive, paymentTerms, onComplete]);

  const allUnbilledIds = clientsWithSessions.flatMap((c) =>
    c.unbilled.map((s: any) => String(s.id))
  );
  const allUnbilledSelected =
    allUnbilledIds.length > 0 && allUnbilledIds.every((id) => selectedSessionIds.has(id));

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
        className="relative bg-card border border-border rounded-2xl w-full max-w-3xl mx-4 overflow-hidden"
        style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-[16px]" style={{ fontWeight: 600 }}>
              Batch invoicing
            </h2>
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[hsl(var(--accent))]/40 text-muted-foreground" style={{ fontWeight: 600 }}>
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
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
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
              Select individual sessions to include in batch invoices. Each client with selected sessions gets a separate invoice.
            </p>

            {clientsWithSessions.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-accent/40 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-[15px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  No billable sessions
                </h3>
                <p className="text-[13px] text-muted-foreground max-w-sm mx-auto">
                  Log billable time to generate invoices.
                </p>
              </div>
            ) : (
              <>
                {/* Select all unbilled */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={selectAllUnbilled}
                    className="text-[12px] text-primary hover:text-primary/80 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    {allUnbilledSelected
                      ? "Deselect all"
                      : `Select all unbilled (${allUnbilledIds.length})`}
                  </button>
                  <span className="text-[12px] text-muted-foreground">
                    {totalSelectedSessions} session{totalSelectedSessions !== 1 ? "s" : ""} selected
                  </span>
                </div>

                {/* Client groups */}
                <div className="space-y-2 mb-5">
                  {clientsWithSessions.map((client) => {
                    const isExpanded = expandedClients.has(client.id);
                    const selectedCount = client.unbilled.filter((s: any) =>
                      selectedSessionIds.has(String(s.id))
                    ).length;
                    const allClientSelected =
                      client.unbilled.length > 0 &&
                      client.unbilled.every((s: any) => selectedSessionIds.has(String(s.id)));
                    const someClientSelected = selectedCount > 0;
                    const clientTotal = client.unbilled
                      .filter((s: any) => selectedSessionIds.has(String(s.id)))
                      .reduce((sum: number, s: any) => sum + (s.duration || 0) * (client.rate || 0), 0);

                    return (
                      <div
                        key={client.id}
                        className="border border-border rounded-xl overflow-hidden"
                      >
                        {/* Client header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
                          onClick={() => toggleExpanded(client.id)}
                        >
                          {/* Expand icon */}
                          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Select all for client */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllForClient(client);
                            }}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              allClientSelected
                                ? "border-primary bg-primary"
                                : someClientSelected
                                ? "border-primary/50 bg-primary/20"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {(allClientSelected || someClientSelected) && (
                              <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                                {allClientSelected ? (
                                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                ) : (
                                  <path d="M3 6H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                )}
                              </svg>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>
                                {client.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {client.unbilled.length} unbilled
                              </span>
                              {client.invoiced.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/60 text-muted-foreground tabular-nums">
                                  {client.invoiced.length} invoiced
                                </span>
                              )}
                            </div>
                            {selectedCount > 0 && (
                              <div className="text-[11px] text-primary tabular-nums">
                                {selectedCount} selected · {formatCurrency(clientTotal)}
                              </div>
                            )}
                          </div>

                          <div className="text-[12px] text-muted-foreground tabular-nums flex-shrink-0">
                            ${client.rate}/h
                          </div>
                        </div>

                        {/* Expanded session list */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border">
                                {/* Unbilled sessions */}
                                {client.unbilled.map((session: any) => {
                                  const isSelected = selectedSessionIds.has(String(session.id));
                                  return (
                                    <button
                                      key={session.id}
                                      onClick={() => toggleSession(String(session.id))}
                                      className={`w-full flex items-center gap-3 px-4 pl-12 py-2.5 text-left transition-colors ${
                                        isSelected
                                          ? "bg-primary/[0.04]"
                                          : "hover:bg-accent/10"
                                      }`}
                                    >
                                      <div
                                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                          isSelected
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground/30"
                                        }`}
                                      >
                                        {isSelected && (
                                          <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                                            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[12px] text-foreground truncate" style={{ fontWeight: 500 }}>
                                          {session.task || "Work session"}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground tabular-nums">
                                          {formatDate(session.date)} · {session.duration}h
                                        </div>
                                      </div>
                                      <div className="text-[12px] text-foreground tabular-nums flex-shrink-0" style={{ fontWeight: 500 }}>
                                        {formatCurrency((session.duration || 0) * (client.rate || 0))}
                                      </div>
                                    </button>
                                  );
                                })}

                                {/* Already invoiced sessions */}
                                {client.invoiced.length > 0 && (
                                  <>
                                    <div className="px-4 pl-12 py-2 border-t border-border">
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600 }}>
                                        Already invoiced
                                      </span>
                                    </div>
                                    {client.invoiced.map((session: any) => {
                                      const invNum = sessionInvoiceMap.get(String(session.id));
                                      return (
                                        <div
                                          key={session.id}
                                          className="flex items-center gap-3 px-4 pl-12 py-2.5 opacity-50"
                                        >
                                          <Receipt className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[12px] text-muted-foreground truncate">
                                              {session.task || "Work session"}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground tabular-nums">
                                              {formatDate(session.date)} · {session.duration}h
                                            </div>
                                          </div>
                                          {invNum && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/60 text-muted-foreground flex-shrink-0" style={{ fontWeight: 500 }}>
                                              #{invNum}
                                            </span>
                                          )}
                                          <div className="text-[12px] text-muted-foreground tabular-nums flex-shrink-0">
                                            {formatCurrency((session.duration || 0) * (client.rate || 0))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
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

                {/* Tax inclusive toggle */}
                {taxRate > 0 && (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-accent/10 mb-5">
                    <div>
                      <div className="text-[12px] text-foreground" style={{ fontWeight: 500 }}>
                        Tax included in prices
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {taxInclusive
                          ? "Session rates already include tax"
                          : "Tax will be added on top of session totals"}
                      </div>
                    </div>
                    <button
                      onClick={() => setTaxInclusive((v) => !v)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        taxInclusive ? "bg-primary" : "bg-muted-foreground/25"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          taxInclusive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[12px] text-foreground" style={{ fontWeight: 500 }}>
                        {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""} from {totalSelectedSessions} session{totalSelectedSessions !== 1 ? "s" : ""}
                      </div>
                      {totalSelectedSessions > 0 && (
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                          {taxInclusive && taxRate > 0
                            ? `Incl. ${formatCurrency(totalTax)} tax`
                            : `Subtotal ${formatCurrency(totalAmount)}${taxRate > 0 ? ` + ${formatCurrency(totalTax)} tax` : ""}`}
                        </div>
                      )}
                    </div>
                    {totalSelectedSessions > 0 && (
                      <div className="text-[18px] text-foreground tabular-nums" style={{ fontWeight: 600 }}>
                        {formatCurrency(grandTotal)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={totalSelectedSessions === 0 || generating}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ fontWeight: 500 }}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""}...
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        Generate {invoiceCount} draft invoice{invoiceCount !== 1 ? "s" : ""}
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
