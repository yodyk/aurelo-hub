import { motion, AnimatePresence } from "motion/react";
import { Trash2, Download, FileText, X } from "lucide-react";
import { toast } from "sonner";

interface BulkSessionActionsProps {
  selectedCount: number;
  selectedSessions: any[];
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onGenerateInvoice: () => void;
}

export default function BulkSessionActions({
  selectedCount,
  selectedSessions,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onGenerateInvoice,
}: BulkSessionActionsProps) {
  if (selectedCount === 0) return null;

  const totalHours = selectedSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalRevenue = selectedSessions.reduce((sum, s) => sum + s.revenue, 0);

  // Check if all selected sessions belong to the same client (required for invoice)
  const uniqueClients = new Set(selectedSessions.map((s) => s.clientId));
  const canInvoice = uniqueClients.size === 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div
          className="flex items-center gap-3 px-5 py-3 bg-card border border-border rounded-2xl"
          style={{
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {/* Selection info */}
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            <span
              className="text-[13px] text-foreground tabular-nums"
              style={{ fontWeight: 600 }}
            >
              {selectedCount} selected
            </span>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {totalHours}h · ${totalRevenue.toLocaleString()}
            </span>
          </div>

          {/* Actions */}
          <button
            onClick={onExportSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all"
            style={{ fontWeight: 500 }}
            title="Export selected as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          <button
            onClick={onGenerateInvoice}
            disabled={!canInvoice}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg hover:bg-primary/8 text-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontWeight: 500 }}
            title={
              canInvoice
                ? "Generate invoice from selected"
                : "Select sessions from only one client to generate an invoice"
            }
          >
            <FileText className="w-3.5 h-3.5" />
            Invoice
          </button>

          <button
            onClick={onDeleteSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] rounded-lg hover:bg-destructive/10 text-destructive transition-all"
            style={{ fontWeight: 500 }}
            title="Delete selected sessions"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          {/* Close */}
          <div className="pl-1 border-l border-border">
            <button
              onClick={onClearSelection}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-all"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
