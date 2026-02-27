import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  ArrowRight,
  Send,
  MoreHorizontal,
  X,
  Trash2,
  Eye,
  Receipt,
  Pencil,
  Copy,
  Ban,
  Import,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "../data/PlanContext";
import { PLANS } from "../data/plans";
import { useData } from "../data/DataContext";
import * as invoiceApi from "../data/invoiceApi";
import type { Invoice, LineItem, InvoiceStatus } from "../data/invoiceApi";

// ── Constants ──────────────────────────────────────────────────────

const BLUE = "#5ea1bf";
const GOLD = "#bfa044";
const RED = "#c27272";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: any }> = {
  draft: { label: "Draft", color: "#78716c", bg: "bg-stone-100 dark:bg-stone-800", icon: FileText },
  sent: { label: "Sent", color: GOLD, bg: "bg-[#bfa044]/10", icon: Send },
  paid: { label: "Paid", color: BLUE, bg: "bg-[#5ea1bf]/10", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: RED, bg: "bg-[#c27272]/10", icon: AlertCircle },
  voided: { label: "Voided", color: "#a8a29e", bg: "bg-stone-100 dark:bg-stone-800", icon: Ban },
  cancelled: { label: "Cancelled", color: "#a8a29e", bg: "bg-stone-100 dark:bg-stone-800", icon: X },
};

// ── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function shortDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Main Component ─────────────────────────────────────────────────

export default function Invoicing() {
  const { can } = usePlan();
  const hasInvoicing = can("clientInvoicing");
  const navigate = useNavigate();
  const { clients, sessions } = useData();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Load invoices
  useEffect(() => {
    if (!hasInvoicing) {
      setLoading(false);
      return;
    }
    invoiceApi
      .loadInvoices()
      .then(setInvoices)
      .catch((err) => console.error("Failed to load invoices:", err))
      .finally(() => setLoading(false));
  }, [hasInvoicing]);

  // ── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const outstanding = invoices.filter((i) => i.status === "sent").reduce((sum, i) => sum + i.total, 0);
    const overdue = invoices
      .filter((i) => i.status === "overdue" || (i.status === "sent" && i.dueDate && daysUntil(i.dueDate) < 0))
      .reduce((sum, i) => sum + i.total, 0);
    const paidLast30 = invoices
      .filter((i) => {
        if (i.status !== "paid" || !i.paidDate) return false;
        const d = new Date(i.paidDate);
        return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
      })
      .reduce((sum, i) => sum + i.total, 0);
    const draftCount = invoices.filter((i) => i.status === "draft").length;
    return { outstanding, overdue, paidLast30, draftCount };
  }, [invoices]);

  // ── Filtering ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "all") {
      list = list.filter((i) => i.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.number.toLowerCase().includes(q) ||
          i.clientName.toLowerCase().includes(q) ||
          (i.projectName || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [invoices, statusFilter, searchQuery]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleCreate = useCallback(async (data: Partial<Invoice>) => {
    try {
      const saved = await invoiceApi.createInvoice(data);
      setInvoices((prev) => [saved, ...prev]);
      setShowBuilder(false);
      toast.success(`Invoice ${saved.number} created`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    }
  }, []);

  const handleUpdate = useCallback(async (id: string, data: Partial<Invoice>) => {
    try {
      const saved = await invoiceApi.updateInvoice(id, data);
      setInvoices((prev) => prev.map((i) => (i.id === id ? saved : i)));
      setEditingInvoice(null);
      toast.success("Invoice updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update invoice");
    }
  }, []);

  const handleSend = useCallback(async (id: string) => {
    try {
      const saved = await invoiceApi.sendInvoice(id);
      setInvoices((prev) => prev.map((i) => (i.id === id ? saved : i)));
      toast.success("Invoice sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send invoice");
    }
  }, []);

  const handleMarkPaid = useCallback(async (id: string) => {
    try {
      const saved = await invoiceApi.markPaid(id);
      setInvoices((prev) => prev.map((i) => (i.id === id ? saved : i)));
      toast.success("Invoice marked as paid");
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as paid");
    }
  }, []);

  const handleVoid = useCallback(async (id: string) => {
    try {
      const saved = await invoiceApi.voidInvoice(id);
      setInvoices((prev) => prev.map((i) => (i.id === id ? saved : i)));
      toast.success("Invoice voided");
    } catch (err: any) {
      toast.error(err.message || "Failed to void invoice");
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await invoiceApi.deleteInvoice(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast.success("Invoice deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete invoice");
    }
  }, []);

  const handleDuplicate = useCallback(async (invoice: Invoice) => {
    const dupe: Partial<Invoice> = {
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      projectId: invoice.projectId,
      projectName: invoice.projectName,
      lineItems: invoice.lineItems.map((li) => ({
        ...li,
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      })),
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      currency: invoice.currency,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      issuedDate: new Date().toISOString(),
      notes: invoice.notes,
      paymentTerms: invoice.paymentTerms,
      fromName: invoice.fromName,
      fromEmail: invoice.fromEmail,
      fromAddress: invoice.fromAddress,
    };
    try {
      const saved = await invoiceApi.createInvoice(dupe);
      setInvoices((prev) => [saved, ...prev]);
      toast.success(`Duplicated as ${saved.number}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate");
    }
  }, []);

  // ── Not on Pro: show blurred preview ─────────────────────────

  if (!hasInvoicing) {
    return <LockedInvoicingPreview />;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] text-foreground" style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
              Invoicing
            </h1>
            <p className="text-[14px] text-muted-foreground mt-1">Create, send, and track invoices for your clients</p>
          </div>
          <button
            onClick={() => {
              setEditingInvoice(null);
              setShowBuilder(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-3.5 h-3.5" />
            New invoice
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Outstanding", value: formatCurrency(stats.outstanding), icon: Clock, color: GOLD },
            { label: "Paid (30d)", value: formatCurrency(stats.paidLast30), icon: CheckCircle2, color: BLUE },
            { label: "Overdue", value: formatCurrency(stats.overdue), icon: AlertCircle, color: RED },
            { label: "Drafts", value: String(stats.draftCount), icon: FileText, color: "#78716c" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-4"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  {stat.label}
                </span>
              </div>
              <div className="text-[20px] text-foreground tabular-nums" style={{ fontWeight: 600 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Stripe connection banner */}
        <motion.div variants={item} className="mb-6">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#5ea1bf]/15 bg-[#5ea1bf]/[0.03]">
            <div className="w-8 h-8 rounded-lg bg-[#5ea1bf]/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-[#5ea1bf]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>
                Connect Stripe for payment collection
              </div>
              <div className="text-[12px] text-muted-foreground">
                Invoices are tracked locally. Connect Stripe to enable payment links, auto-send, and status sync.
              </div>
            </div>
            <button
              className="px-3 py-1.5 text-[12px] text-[#5ea1bf] bg-[#5ea1bf]/8 rounded-lg hover:bg-[#5ea1bf]/14 transition-colors flex-shrink-0"
              style={{ fontWeight: 500 }}
            >
              Coming soon
            </button>
          </div>
        </motion.div>

        {/* Filter bar */}
        <motion.div variants={item} className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoices..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1.5 text-[12px] rounded-lg transition-all ${statusFilter === "all" ? "bg-foreground/8 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"}`}
              style={{ fontWeight: 500 }}
            >
              All
            </button>
            {(["draft", "sent", "paid", "overdue"] as InvoiceStatus[]).map((s) => {
              const conf = STATUS_CONFIG[s];
              const count = invoices.filter((i) => i.status === s).length;
              if (count === 0 && statusFilter !== s) return null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] rounded-lg transition-all ${statusFilter === s ? `${conf.bg}` : "text-muted-foreground hover:text-foreground hover:bg-accent/40"}`}
                  style={{ fontWeight: 500, color: statusFilter === s ? conf.color : undefined }}
                >
                  <conf.icon className="w-3 h-3" />
                  {conf.label}
                  <span className="text-[11px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Invoice table */}
        <motion.div variants={item}>
          <div
            className="bg-card border border-border rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-5 h-5 text-[#5ea1bf]" />
                </div>
                <h3 className="text-[15px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>
                  {invoices.length === 0 ? "No invoices yet" : "No matching invoices"}
                </h3>
                <p className="text-[13px] text-muted-foreground max-w-sm mx-auto mb-5 leading-relaxed">
                  {invoices.length === 0
                    ? "Create your first invoice from logged hours. Aurelo auto-populates line items from your time sessions."
                    : "Try adjusting your search or filter."}
                </p>
                {invoices.length === 0 && (
                  <button
                    onClick={() => {
                      setEditingInvoice(null);
                      setShowBuilder(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
                    style={{ fontWeight: 500 }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create first invoice
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Invoice
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Client
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Amount
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Status
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Due
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      invoice={inv}
                      onView={() => setViewingInvoice(inv)}
                      onEdit={() => {
                        setEditingInvoice(inv);
                        setShowBuilder(true);
                      }}
                      onSend={() => handleSend(inv.id)}
                      onMarkPaid={() => handleMarkPaid(inv.id)}
                      onVoid={() => handleVoid(inv.id)}
                      onDelete={() => handleDelete(inv.id)}
                      onDuplicate={() => handleDuplicate(inv)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Invoice Builder Modal */}
      <AnimatePresence>
        {showBuilder && (
          <InvoiceBuilder
            clients={clients}
            sessions={sessions}
            existingInvoice={editingInvoice}
            existingInvoices={invoices}
            onSave={editingInvoice ? (data) => handleUpdate(editingInvoice.id, data) : handleCreate}
            onClose={() => {
              setShowBuilder(false);
              setEditingInvoice(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {viewingInvoice && (
          <InvoiceDetail
            invoice={viewingInvoice}
            onClose={() => setViewingInvoice(null)}
            onSend={() => {
              handleSend(viewingInvoice.id);
              setViewingInvoice(null);
            }}
            onMarkPaid={() => {
              handleMarkPaid(viewingInvoice.id);
              setViewingInvoice(null);
            }}
            onVoid={() => {
              handleVoid(viewingInvoice.id);
              setViewingInvoice(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Invoice Row ────────────────────────────────────────────────────

function InvoiceRow({
  invoice,
  onView,
  onEdit,
  onSend,
  onMarkPaid,
  onVoid,
  onDelete,
  onDuplicate,
}: {
  invoice: Invoice;
  onView: () => void;
  onEdit: () => void;
  onSend: () => void;
  onMarkPaid: () => void;
  onVoid: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sc = STATUS_CONFIG[invoice.status];
  const StatusIcon = sc.icon;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const dueDays = invoice.dueDate ? daysUntil(invoice.dueDate) : null;

  return (
    <tr
      className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors group cursor-pointer"
      onClick={onView}
    >
      <td className="px-5 py-3.5 text-[13px] text-foreground" style={{ fontWeight: 500 }}>
        <span className="text-primary">#{invoice.number}</span>
      </td>
      <td className="px-5 py-3.5">
        <div className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>
          {invoice.clientName}
        </div>
        {invoice.projectName && <div className="text-[11px] text-muted-foreground">{invoice.projectName}</div>}
      </td>
      <td className="px-5 py-3.5 text-[13px] text-foreground tabular-nums" style={{ fontWeight: 500 }}>
        {formatCurrency(invoice.total, invoice.currency)}
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${sc.bg}`}
          style={{ fontWeight: 600, color: sc.color }}
        >
          <StatusIcon className="w-3 h-3" />
          {sc.label}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="text-[13px] text-muted-foreground">{invoice.dueDate ? shortDate(invoice.dueDate) : "—"}</div>
        {invoice.status === "sent" && dueDays !== null && dueDays < 0 && (
          <div className="text-[10px] text-[#c27272]" style={{ fontWeight: 500 }}>
            {Math.abs(dueDays)}d overdue
          </div>
        )}
      </td>
      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setMenuOpen((o) => !o);
              setConfirmDelete(false);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-accent/40 opacity-0 group-hover:opacity-100 transition-all"
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
                className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl overflow-hidden z-30"
                style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
              >
                <button
                  onClick={() => {
                    onView();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
                {invoice.status === "draft" && (
                  <button
                    onClick={() => {
                      onEdit();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {invoice.status === "draft" && (
                  <button
                    onClick={() => {
                      onSend();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#5ea1bf] hover:bg-[#5ea1bf]/8 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <Send className="w-3 h-3" />
                    Send invoice
                  </button>
                )}
                {invoice.status === "sent" && (
                  <button
                    onClick={() => {
                      onMarkPaid();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#5ea1bf] hover:bg-[#5ea1bf]/8 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Mark paid
                  </button>
                )}
                <button
                  onClick={() => {
                    onDuplicate();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
                {(invoice.status === "sent" || invoice.status === "draft") && (
                  <button
                    onClick={() => {
                      onVoid();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <Ban className="w-3 h-3" />
                    Void
                  </button>
                )}
                {invoice.status === "draft" &&
                  (!confirmDelete ? (
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
                      onClick={() => {
                        onDelete();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#c27272] bg-[#c27272]/5 hover:bg-[#c27272]/10 transition-colors"
                      style={{ fontWeight: 500 }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Confirm delete
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  );
}

// ── Invoice Builder ────────────────────────────────────────────────

function InvoiceBuilder({
  clients,
  sessions,
  existingInvoice,
  existingInvoices,
  onSave,
  onClose,
}: {
  clients: any[];
  sessions: any[];
  existingInvoice: Invoice | null;
  existingInvoices: Invoice[];
  onSave: (data: Partial<Invoice>) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState(existingInvoice?.clientId || "");
  const [projectId, setProjectId] = useState(existingInvoice?.projectId || "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingInvoice?.lineItems || [{ id: "1", description: "", quantity: 1, rate: 0, amount: 0 }],
  );
  const [taxRate, setTaxRate] = useState(existingInvoice?.taxRate || 0);
  const [dueDate, setDueDate] = useState(
    existingInvoice?.dueDate
      ? new Date(existingInvoice.dueDate).toISOString().split("T")[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState(existingInvoice?.notes || "");
  const [paymentTerms, setPaymentTerms] = useState(existingInvoice?.paymentTerms || "Net 30");
  const [showImport, setShowImport] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);

  // Unbilled sessions for import
  const invoicedSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const inv of existingInvoices) {
      if (inv.status !== "voided" && inv.status !== "cancelled") {
        for (const s of inv.createdFromSessions || []) {
          ids.add(s);
        }
        for (const li of inv.lineItems) {
          for (const sid of li.sessionIds || []) {
            ids.add(sid);
          }
        }
      }
    }
    return ids;
  }, [existingInvoices]);

  const clientSessions = useMemo(() => {
    if (!clientId) return [];
    return sessions
      .filter((s) => s.clientId === clientId && s.billable !== false && !invoicedSessionIds.has(String(s.id)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, clientId, invoicedSessionIds]);

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + taxAmount;

  const handleLineItemChange = (idx: number, field: keyof LineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((li, i) => {
        if (i !== idx) return li;
        const updated = { ...li, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = Math.round((updated.quantity || 0) * (updated.rate || 0) * 100) / 100;
        }
        return updated;
      }),
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: "",
        quantity: 1,
        rate: selectedClient?.rate || 0,
        amount: selectedClient?.rate || 0,
      },
    ]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const importSessions = (selected: any[]) => {
    const rate = selectedClient?.rate || 0;
    const newItems: LineItem[] = selected.map((s) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      description: `${s.task || s.description || "Work session"} — ${formatDate(s.date)}`,
      quantity: s.duration || 0,
      rate: rate,
      amount: Math.round((s.duration || 0) * rate * 100) / 100,
      sessionIds: [String(s.id)],
    }));
    setLineItems((prev) => [...prev.filter((li) => li.description.trim() !== "" || li.amount > 0), ...newItems]);
    setShowImport(false);
  };

  const handleSave = async () => {
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    if (lineItems.length === 0 || lineItems.every((li) => !li.description.trim())) {
      toast.error("Add at least one line item");
      return;
    }
    setSaving(true);
    try {
      const sessionIds = lineItems.flatMap((li) => li.sessionIds || []);
      await onSave({
        clientId,
        clientName: selectedClient?.name || "",
        clientEmail: selectedClient?.contactEmail || selectedClient?.email || "",
        projectId: projectId || undefined,
        projectName: projectId
          ? selectedClient?.projects?.find((p: any) => String(p.id) === projectId)?.name
          : undefined,
        lineItems: lineItems.filter((li) => li.description.trim()),
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: "USD",
        dueDate: new Date(dueDate).toISOString(),
        issuedDate: new Date().toISOString(),
        notes: notes.trim() || undefined,
        paymentTerms,
        createdFromSessions: sessionIds.length > 0 ? sessionIds : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

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
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-[16px]" style={{ fontWeight: 600 }}>
              {existingInvoice ? `Edit ${existingInvoice.number}` : "New invoice"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Client + Due Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId("");
                }}
                className="w-full text-[13px] px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select client...</option>
                {clients
                  .filter((c) => c.status !== "Archived")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-[13px] px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Payment terms */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                Line items
              </label>
              <div className="flex items-center gap-2">
                {clientId && clientSessions.length > 0 && (
                  <button
                    onClick={() => setShowImport(true)}
                    className="inline-flex items-center gap-1 text-[12px] text-[#5ea1bf] hover:text-[#5ea1bf]/80 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <Import className="w-3 h-3" />
                    Import sessions ({clientSessions.length})
                  </button>
                )}
                <button
                  onClick={addLineItem}
                  className="inline-flex items-center gap-1 text-[12px] text-primary hover:text-primary/80 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_72px_80px_80px_28px] gap-2 mb-2 px-1">
              <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>
                Description
              </span>
              <span className="text-[11px] text-muted-foreground text-right" style={{ fontWeight: 500 }}>
                Qty
              </span>
              <span className="text-[11px] text-muted-foreground text-right" style={{ fontWeight: 500 }}>
                Rate
              </span>
              <span className="text-[11px] text-muted-foreground text-right" style={{ fontWeight: 500 }}>
                Amount
              </span>
              <span />
            </div>

            {lineItems.map((li, idx) => (
              <div key={li.id} className="grid grid-cols-[1fr_72px_80px_80px_28px] gap-2 mb-2 items-center group">
                <input
                  value={li.description}
                  onChange={(e) => handleLineItemChange(idx, "description", e.target.value)}
                  placeholder="Description"
                  className="text-[13px] px-2.5 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={li.quantity}
                  onChange={(e) => handleLineItemChange(idx, "quantity", parseFloat(e.target.value || "0"))}
                  className="text-[13px] px-2.5 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-right tabular-nums"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={li.rate}
                  onChange={(e) => handleLineItemChange(idx, "rate", parseFloat(e.target.value || "0"))}
                  className="text-[13px] px-2.5 py-1.5 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-right tabular-nums"
                />
                <div className="text-[13px] text-right tabular-nums pr-1" style={{ fontWeight: 500 }}>
                  {formatCurrency(li.amount)}
                </div>
                <button
                  onClick={() => removeLineItem(idx)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-[#c27272] hover:bg-[#c27272]/8 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                    <span className="tabular-nums" style={{ fontWeight: 500 }}>
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[15px] pt-2 border-t border-border">
                  <span style={{ fontWeight: 600 }}>Total</span>
                  <span className="tabular-nums" style={{ fontWeight: 700, color: BLUE }}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions, thank you message, etc."
              rows={2}
              className="w-full text-[13px] px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-accent/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/40 transition-all"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !clientId}
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ fontWeight: 500 }}
            >
              {saving ? "Saving..." : existingInvoice ? "Update invoice" : "Save as draft"}
            </button>
          </div>
        </div>

        {/* Session Import Overlay */}
        <AnimatePresence>
          {showImport && (
            <SessionImportOverlay
              sessions={clientSessions}
              clientRate={selectedClient?.rate || 0}
              onImport={importSessions}
              onClose={() => setShowImport(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ── Session Import Overlay ─────────────────────────────────────────

function SessionImportOverlay({
  sessions,
  clientRate,
  onImport,
  onClose,
}: {
  sessions: any[];
  clientRate: number;
  onImport: (selected: any[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSession = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map((s) => String(s.id))));
    }
  };

  const selectedSessions = sessions.filter((s) => selected.has(String(s.id)));
  const totalHours = selectedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalAmount = Math.round(totalHours * clientRate * 100) / 100;

  return (
    <motion.div
      className="absolute inset-0 z-20 bg-card/95 backdrop-blur-sm flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h3 className="text-[15px]" style={{ fontWeight: 600 }}>
            Import from sessions
          </h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">Select unbilled sessions to add as line items</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3">
        {sessions.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-muted-foreground">No unbilled sessions for this client</div>
        ) : (
          <>
            <button
              onClick={toggleAll}
              className="text-[12px] text-primary hover:text-primary/80 mb-3"
              style={{ fontWeight: 500 }}
            >
              {selected.size === sessions.length ? "Deselect all" : "Select all"}
            </button>
            <div className="space-y-1">
              {sessions.map((s) => {
                const isSelected = selected.has(String(s.id));
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSession(String(s.id))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${isSelected ? "bg-primary/8 border border-primary/20" : "border border-transparent hover:bg-accent/40"}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "border-primary bg-primary" : "border-border"}`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                        {s.task || s.description || "Work session"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{formatDate(s.date)}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[13px] tabular-nums" style={{ fontWeight: 500 }}>
                        {s.duration}h
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {formatCurrency((s.duration || 0) * clientRate)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <div className="text-[13px] text-muted-foreground">
          {selected.size} session{selected.size !== 1 ? "s" : ""} ·{" "}
          <span className="tabular-nums" style={{ fontWeight: 500 }}>
            {totalHours}h
          </span>{" "}
          ·{" "}
          <span className="tabular-nums" style={{ fontWeight: 600, color: BLUE }}>
            {formatCurrency(totalAmount)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-muted-foreground rounded-lg hover:bg-accent/40"
            style={{ fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onImport(selectedSessions)}
            disabled={selected.size === 0}
            className="px-4 py-1.5 text-[13px] bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-all"
            style={{ fontWeight: 500 }}
          >
            Import {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Invoice Detail Modal ───────────────────────────────────────────

function InvoiceDetail({
  invoice,
  onClose,
  onSend,
  onMarkPaid,
  onVoid,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSend: () => void;
  onMarkPaid: () => void;
  onVoid: () => void;
}) {
  const sc = STATUS_CONFIG[invoice.status];
  const StatusIcon = sc.icon;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden"
        style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px]" style={{ fontWeight: 600 }}>
              #{invoice.number}
            </h2>
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${sc.bg}`}
              style={{ fontWeight: 600, color: sc.color }}
            >
              <StatusIcon className="w-3 h-3" />
              {sc.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Client info */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground mb-0.5" style={{ fontWeight: 500 }}>
                Bill to
              </div>
              <div className="text-[14px]" style={{ fontWeight: 600 }}>
                {invoice.clientName}
              </div>
              {invoice.clientEmail && <div className="text-[12px] text-muted-foreground">{invoice.clientEmail}</div>}
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground mb-0.5" style={{ fontWeight: 500 }}>
                Due date
              </div>
              <div className="text-[14px]" style={{ fontWeight: 500 }}>
                {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
              </div>
              {invoice.paymentTerms && <div className="text-[12px] text-muted-foreground">{invoice.paymentTerms}</div>}
            </div>
          </div>

          {/* Stripe integration status */}
          {invoice.stripeInvoiceId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#5ea1bf]/6 border border-[#5ea1bf]/12">
              <CreditCard className="w-3.5 h-3.5 text-[#5ea1bf]" />
              <span className="text-[12px] text-[#5ea1bf]" style={{ fontWeight: 500 }}>
                Connected to Stripe
              </span>
              <span className="text-[11px] text-muted-foreground ml-auto">{invoice.stripeInvoiceId}</span>
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="text-[12px] text-muted-foreground mb-2" style={{ fontWeight: 500 }}>
              Line items
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-accent/20">
                    <th className="text-left px-3 py-2 text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Description
                    </th>
                    <th
                      className="text-right px-3 py-2 text-[11px] text-muted-foreground w-16"
                      style={{ fontWeight: 500 }}
                    >
                      Qty
                    </th>
                    <th
                      className="text-right px-3 py-2 text-[11px] text-muted-foreground w-20"
                      style={{ fontWeight: 500 }}
                    >
                      Rate
                    </th>
                    <th
                      className="text-right px-3 py-2 text-[11px] text-muted-foreground w-24"
                      style={{ fontWeight: 500 }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((li) => (
                    <tr key={li.id} className="border-t border-border/50">
                      <td className="px-3 py-2 text-[13px]">{li.description}</td>
                      <td className="px-3 py-2 text-[13px] text-right tabular-nums">{li.quantity}</td>
                      <td className="px-3 py-2 text-[13px] text-right tabular-nums">{formatCurrency(li.rate)}</td>
                      <td className="px-3 py-2 text-[13px] text-right tabular-nums" style={{ fontWeight: 500 }}>
                        {formatCurrency(li.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums" style={{ fontWeight: 500 }}>
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Tax ({(invoice.taxRate * 100).toFixed(1)}%)</span>
                  <span className="tabular-nums" style={{ fontWeight: 500 }}>
                    {formatCurrency(invoice.taxAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[15px] pt-2 border-t border-border">
                <span style={{ fontWeight: 600 }}>Total</span>
                <span className="tabular-nums" style={{ fontWeight: 700, color: BLUE }}>
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <div className="text-[12px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
                Notes
              </div>
              <div className="text-[13px] text-muted-foreground leading-relaxed">{invoice.notes}</div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground pt-3 border-t border-border">
            <span>Created {formatDate(invoice.createdAt)}</span>
            {invoice.issuedDate && <span>Issued {formatDate(invoice.issuedDate)}</span>}
            {invoice.paidDate && <span>Paid {formatDate(invoice.paidDate)}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          {invoice.status === "draft" && (
            <button
              onClick={onSend}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] bg-[#5ea1bf] text-white rounded-lg hover:opacity-90 transition-all"
              style={{ fontWeight: 500 }}
            >
              <Send className="w-3.5 h-3.5" />
              Send invoice
            </button>
          )}
          {invoice.status === "sent" && (
            <button
              onClick={onMarkPaid}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] bg-[#5ea1bf] text-white rounded-lg hover:opacity-90 transition-all"
              style={{ fontWeight: 500 }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark as paid
            </button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <button
              onClick={onVoid}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] text-muted-foreground border border-border rounded-lg hover:bg-accent/40 transition-all"
              style={{ fontWeight: 500 }}
            >
              <Ban className="w-3 h-3" />
              Void
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Locked Preview (Starter users) ─────────────────────────────────

const sampleInvoices = [
  {
    id: "1",
    number: "1042",
    clientName: "Acme Studio",
    amount: 3200,
    status: "paid" as InvoiceStatus,
    dueDate: "Feb 15, 2026",
  },
  {
    id: "2",
    number: "1041",
    clientName: "Lunar Labs",
    amount: 1850,
    status: "sent" as InvoiceStatus,
    dueDate: "Feb 22, 2026",
  },
  { id: "3", number: "1040", clientName: "Thread Co.", amount: 4500, status: "draft" as InvoiceStatus, dueDate: "—" },
  {
    id: "4",
    number: "1039",
    clientName: "Neon Works",
    amount: 2100,
    status: "overdue" as InvoiceStatus,
    dueDate: "Feb 1, 2026",
  },
  {
    id: "5",
    number: "1038",
    clientName: "Bright Side",
    amount: 975,
    status: "paid" as InvoiceStatus,
    dueDate: "Jan 28, 2026",
  },
];

function LockedInvoicingPreview() {
  const navigate = useNavigate();
  const proPlan = PLANS.pro;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] text-foreground" style={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
              Invoicing
            </h1>
            <p className="text-[14px] text-muted-foreground mt-1">Create, send, and track invoices for your clients</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-foreground text-background opacity-50 cursor-not-allowed"
              style={{ fontWeight: 500 }}
            >
              <Plus className="w-3.5 h-3.5" />
              New invoice
            </button>
          </div>
        </motion.div>

        <motion.div variants={item} className="relative">
          {/* Blur overlay */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="absolute inset-0 backdrop-blur-[6px] bg-background/60 rounded-xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="relative bg-card border border-border rounded-2xl p-8 max-w-sm text-center"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-[#5ea1bf]" />
              </div>
              <h3 className="text-[16px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>
                Unlock invoicing
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                Create invoices from logged hours, track payments, and send reminders — all connected to your client and
                project data.
              </p>
              <button
                onClick={() => navigate("/settings?tab=billing")}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
                style={{ fontWeight: 500 }}
              >
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro — ${proPlan.price}/mo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <p className="text-[11px] text-muted-foreground mt-2">
                Includes unlimited clients, full insights, exports & more
              </p>
            </motion.div>
          </div>

          <div className="select-none pointer-events-none">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "Outstanding", value: "$5,950", icon: Clock, color: GOLD },
                { label: "Paid (30d)", value: "$8,175", icon: CheckCircle2, color: BLUE },
                { label: "Overdue", value: "$2,100", icon: AlertCircle, color: RED },
                { label: "Draft", value: "1", icon: FileText, color: "#78716c" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card border border-border rounded-xl p-4"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-[20px] text-foreground" style={{ fontWeight: 600 }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="bg-card border border-border rounded-xl overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Invoice
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Client
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Amount
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Status
                    </th>
                    <th className="text-left px-5 py-3 text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
                      Due Date
                    </th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {sampleInvoices.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status];
                    const SI = sc.icon;
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3.5 text-[13px] text-foreground" style={{ fontWeight: 500 }}>
                          #{inv.number}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{inv.clientName}</td>
                        <td
                          className="px-5 py-3.5 text-[13px] text-foreground tabular-nums"
                          style={{ fontWeight: 500 }}
                        >
                          ${inv.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${sc.bg}`}
                            style={{ fontWeight: 600, color: sc.color }}
                          >
                            <SI className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{inv.dueDate}</td>
                        <td className="px-3 py-3.5">
                          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground/50" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
