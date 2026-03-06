// ── Invoice Reminder Emails — triggered daily by pg_cron ────────────
// Sends staggered reminder emails at 7, 14, and 30 days overdue.
// Respects plan gating, notification preferences, and email quotas.
// Tracks which reminders have been sent via invoice metadata to avoid duplicates.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[INVOICE-REMINDER] ${step}${d}`);
};

const WORDMARK_URL =
  "https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png";

// Plans that allow invoice_reminder emails
const PLANS_WITH_REMINDERS = new Set(["pro", "studio", "legacy"]);

const PLAN_QUOTA: Record<string, number | null> = {
  starter: 0, pro: 50, studio: null, legacy: null,
};

const REMINDER_DAYS = [7, 14, 30] as const;

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(d: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return d;
  }
}

function buildReminderHtml(opts: {
  invoiceNumber: string;
  clientName: string;
  total: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  paymentUrl?: string;
  workspaceName: string;
  workspaceLogoUrl?: string;
  reminderLevel: number; // 1, 2, or 3
}): string {
  const {
    invoiceNumber, clientName, total, currency, dueDate,
    daysOverdue, paymentUrl, workspaceName, workspaceLogoUrl, reminderLevel,
  } = opts;

  const urgencyColor = reminderLevel === 3 ? "#c4783e" : reminderLevel === 2 ? "#bfa044" : "#5ea1bf";
  const urgencyLabel = reminderLevel === 3 ? "Final Reminder" : reminderLevel === 2 ? "Second Reminder" : "Payment Reminder";
  const urgencyMessage = reminderLevel === 3
    ? `This is the final reminder for invoice <strong>${invoiceNumber}</strong>, which is now <strong>${daysOverdue} days overdue</strong>. Please arrange payment at your earliest convenience to avoid any disruption.`
    : reminderLevel === 2
    ? `This is a follow-up reminder that invoice <strong>${invoiceNumber}</strong> is now <strong>${daysOverdue} days past due</strong>. We'd appreciate your prompt attention.`
    : `Just a friendly reminder that invoice <strong>${invoiceNumber}</strong> was due on <strong>${fmtDate(dueDate)}</strong> and is now <strong>${daysOverdue} days overdue</strong>.`;

  const logoHtml = workspaceLogoUrl
    ? `<td style="vertical-align:middle"><img src="${workspaceLogoUrl}" alt="${workspaceName}" height="28" style="display:inline-block;vertical-align:middle" /></td>`
    : `<td style="vertical-align:middle"><span style="font-size:16px;font-weight:700;color:#1a1a19">${workspaceName}</span></td>`;

  const payBtnHtml = paymentUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0">
        <tr><td align="center">
          <a href="${paymentUrl}" target="_blank" style="display:inline-block;padding:14px 40px;background:${urgencyColor};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.02em">
            Pay Invoice
          </a>
        </td></tr>
       </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;border:1px solid #e8e8e6;border-radius:12px;overflow:hidden">

      <!-- Header -->
      <tr><td style="background:#f8f8f7;padding:24px 32px;border-bottom:1px solid #e8e8e6">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          ${logoHtml}
          <td style="vertical-align:middle;text-align:right">
            <img src="${WORDMARK_URL}" alt="aurelo" height="18" style="display:inline-block;vertical-align:middle;opacity:0.9" />
          </td>
        </tr></table>
      </td></tr>

      <!-- Accent strip — color shifts with urgency -->
      <tr><td style="height:3px;background:linear-gradient(90deg,${urgencyColor} 0%,${urgencyColor}99 100%)"></td></tr>

      <!-- Content -->
      <tr><td style="padding:32px 32px 24px">
        <p style="font-size:11px;font-weight:600;color:${urgencyColor};letter-spacing:0.1em;margin:0 0 8px;text-transform:uppercase">${urgencyLabel}</p>
        <h1 style="font-size:22px;font-weight:700;color:#1a1a19;letter-spacing:-0.02em;margin:0 0 16px;line-height:1.2">
          Invoice ${invoiceNumber}
        </h1>
        <p style="font-size:14px;color:#52524e;line-height:1.7;margin:0 0 28px">
          Hi <strong>${clientName}</strong>, ${urgencyMessage}
        </p>

        <!-- Invoice summary card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px;margin:0 0 8px">
          <tr><td style="padding:20px 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#8a8a86;padding:5px 0">Invoice</td>
                <td style="font-size:14px;font-weight:600;color:#1a1a19;text-align:right;padding:5px 0">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#8a8a86;padding:5px 0">Amount due</td>
                <td style="font-size:14px;font-weight:700;color:${urgencyColor};text-align:right;padding:5px 0">${formatCurrency(total, currency)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#8a8a86;padding:5px 0">Due date</td>
                <td style="font-size:14px;font-weight:500;color:#1a1a19;text-align:right;padding:5px 0">${fmtDate(dueDate)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#8a8a86;padding:5px 0">Days overdue</td>
                <td style="font-size:14px;font-weight:600;color:${urgencyColor};text-align:right;padding:5px 0">${daysOverdue} days</td>
              </tr>
            </table>
          </td></tr>
        </table>

        ${payBtnHtml}
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e8e8e6;margin:0" /></td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px">
        <p style="font-size:12px;color:#a8a29e;margin:0 0 8px;line-height:1.5">
          If you've already made this payment, please disregard this reminder.
        </p>
        <p style="font-size:11px;color:#c4c4c0;margin:0">
          Sent with <a href="https://getaurelo.com" style="color:#5ea1bf;text-decoration:none">Aurelo</a>
        </p>
      </td></tr>

    </table>
  </td></tr></table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    log("ERROR", { message: "RESEND_API_KEY not configured" });
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const currentMonth = today.toISOString().slice(0, 7);
    log("Running reminder check", { today: todayStr });

    // Fetch all overdue or sent invoices with past due dates
    const { data: overdueInvoices, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, number, client_name, client_email, client_id, total, currency, due_date, workspace_id, metadata, status, stripe_payment_url, from_name")
      .in("status", ["sent", "overdue"])
      .lt("due_date", todayStr)
      .not("client_email", "is", null);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!overdueInvoices || overdueInvoices.length === 0) {
      log("No overdue invoices needing reminders");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Found overdue invoices", { count: overdueInvoices.length });

    // Cache workspace data
    const wsCache: Record<string, {
      name: string;
      planId: string;
      logoUrl?: string;
      reminderEnabled: boolean;
      quotaOk: boolean;
      emailsSentThisRun: number;
    }> = {};

    let totalSent = 0;

    for (const inv of overdueInvoices) {
      const wsId = inv.workspace_id;

      // Load workspace data if not cached
      if (!wsCache[wsId]) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("name, plan_id")
          .eq("id", wsId)
          .maybeSingle();

        const planId = ws?.plan_id || "starter";

        if (!PLANS_WITH_REMINDERS.has(planId)) {
          wsCache[wsId] = { name: ws?.name || "", planId, reminderEnabled: false, quotaOk: false, emailsSentThisRun: 0 };
          continue;
        }

        // Check notification preferences for invoice category
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("email")
          .eq("workspace_id", wsId)
          .eq("category", "invoice")
          .limit(1)
          .maybeSingle();

        // Default to enabled if no preference exists
        const emailEnabled = prefs?.email !== false;

        // Check workspace setting for auto reminders
        const { data: notifSettings } = await supabase
          .from("workspace_settings")
          .select("data")
          .eq("workspace_id", wsId)
          .eq("section", "notifications")
          .maybeSingle();

        const autoReminders = (notifSettings?.data as any)?.autoInvoiceReminders !== false; // default true

        // Check quota
        let quotaOk = true;
        const quota = PLAN_QUOTA[planId];
        if (quota !== null) {
          const { data: quotaRow } = await supabase
            .from("email_quotas")
            .select("emails_sent, month")
            .eq("workspace_id", wsId)
            .maybeSingle();
          const sent = quotaRow?.month === currentMonth ? (quotaRow?.emails_sent || 0) : 0;
          quotaOk = sent < quota;
        }

        // Get logo
        let logoUrl: string | undefined;
        const { data: logoFiles } = await supabase.storage
          .from("logos")
          .list(wsId, { limit: 1 });
        if (logoFiles && logoFiles.length > 0) {
          const { data: urlData } = supabase.storage
            .from("logos")
            .getPublicUrl(`${wsId}/${logoFiles[0].name}`);
          logoUrl = urlData?.publicUrl;
        }

        wsCache[wsId] = {
          name: ws?.name || "Aurelo",
          planId,
          logoUrl,
          reminderEnabled: emailEnabled && autoReminders,
          quotaOk,
          emailsSentThisRun: 0,
        };
      }

      const wsData = wsCache[wsId];
      if (!wsData.reminderEnabled || !wsData.quotaOk) continue;

      // Calculate days overdue
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);

      // Determine which reminder level applies
      let reminderLevel: number | null = null;
      if (daysOverdue >= 30) reminderLevel = 3;
      else if (daysOverdue >= 14) reminderLevel = 2;
      else if (daysOverdue >= 7) reminderLevel = 1;
      else continue; // Less than 7 days, skip

      // Check if this reminder was already sent (via metadata)
      const meta = (inv.metadata || {}) as Record<string, any>;
      const sentReminders: number[] = meta.reminders_sent || [];
      if (sentReminders.includes(reminderLevel)) {
        continue; // Already sent this level
      }

      // Re-check quota per email
      const quota = PLAN_QUOTA[wsData.planId];
      if (quota !== null) {
        const { data: quotaRow } = await supabase
          .from("email_quotas")
          .select("emails_sent, month")
          .eq("workspace_id", wsId)
          .maybeSingle();
        const sent = (quotaRow?.month === currentMonth ? (quotaRow?.emails_sent || 0) : 0) + wsData.emailsSentThisRun;
        if (sent >= quota) {
          wsData.quotaOk = false;
          continue;
        }
      }

      // Build and send email
      const html = buildReminderHtml({
        invoiceNumber: inv.number,
        clientName: inv.client_name || "there",
        total: Number(inv.total) || 0,
        currency: inv.currency || "USD",
        dueDate: inv.due_date,
        daysOverdue,
        paymentUrl: inv.stripe_payment_url || undefined,
        workspaceName: wsData.name,
        workspaceLogoUrl: wsData.logoUrl,
        reminderLevel,
      });

      const senderName = inv.from_name || wsData.name;
      const subject = reminderLevel === 3
        ? `Final Reminder: Invoice ${inv.number} — ${formatCurrency(Number(inv.total), inv.currency || "USD")}`
        : reminderLevel === 2
        ? `Reminder: Invoice ${inv.number} is ${daysOverdue} days overdue`
        : `Payment Reminder: Invoice ${inv.number}`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${senderName} <noreply@getaurelo.com>`,
            to: [inv.client_email],
            subject,
            html,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          log("Resend error", { invoiceId: inv.id, error: result });
          continue;
        }

        totalSent++;
        wsData.emailsSentThisRun++;
        log("Reminder sent", {
          invoice: inv.number,
          to: inv.client_email,
          level: reminderLevel,
          daysOverdue,
        });

        // Update invoice metadata to track sent reminders
        const updatedReminders = [...sentReminders, reminderLevel];
        const updatedMeta = {
          ...meta,
          reminders_sent: updatedReminders,
          [`reminder_${reminderLevel}_sent_at`]: new Date().toISOString(),
          [`reminder_${reminderLevel}_resend_id`]: result.id,
        };
        await supabase
          .from("invoices")
          .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
          .eq("id", inv.id);

        // Create in-app notification for workspace
        await supabase.from("notifications").insert({
          workspace_id: wsId,
          category: "invoice",
          event_type: "invoice_reminder_sent",
          title: `Reminder sent for ${inv.number}`,
          body: `${reminderLevel === 3 ? "Final" : reminderLevel === 2 ? "Second" : "First"} reminder sent to ${inv.client_name || inv.client_email} (${daysOverdue} days overdue)`,
          email_sent: true,
          metadata: {
            invoiceId: inv.id,
            clientId: inv.client_id,
            reminderLevel,
            daysOverdue,
            resend_email_id: result.id,
          },
        });
      } catch (e) {
        log("Send error", { invoiceId: inv.id, error: String(e) });
      }
    }

    // Batch update email quotas for all workspaces that sent emails
    for (const [wsId, wsData] of Object.entries(wsCache)) {
      if (wsData.emailsSentThisRun > 0) {
        // Get current count and add
        const { data: quotaRow } = await supabase
          .from("email_quotas")
          .select("emails_sent, month")
          .eq("workspace_id", wsId)
          .maybeSingle();

        const currentSent = quotaRow?.month === currentMonth ? (quotaRow?.emails_sent || 0) : 0;
        await supabase
          .from("email_quotas")
          .upsert({
            workspace_id: wsId,
            month: currentMonth,
            emails_sent: currentSent + wsData.emailsSentThisRun,
            updated_at: new Date().toISOString(),
          }, { onConflict: "workspace_id" });
      }
    }

    log("Complete", { totalSent });
    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
