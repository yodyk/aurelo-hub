// ── Send invoice email to client via Resend ────────────────────────
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-INVOICE-EMAIL] ${step}${d}`);
};

const WORDMARK_URL =
  "https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoicePayload {
  invoiceId: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function buildHtml(opts: {
  invoiceNumber: string;
  clientName: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  dueDate: string;
  issuedDate: string;
  notes?: string;
  paymentUrl?: string;
  fromName?: string;
  workspaceName: string;
  workspaceLogoUrl?: string;
}): string {
  const {
    invoiceNumber, clientName, lineItems, subtotal, taxRate,
    taxAmount, total, currency, dueDate, issuedDate, notes,
    paymentUrl, fromName, workspaceName, workspaceLogoUrl,
  } = opts;

  const fc = (n: number) => formatCurrency(n, currency);
  const fmtDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  const logoHtml = workspaceLogoUrl
    ? `<td style="vertical-align:middle"><img src="${workspaceLogoUrl}" alt="${workspaceName}" height="28" style="display:inline-block;vertical-align:middle" /></td>`
    : `<td style="vertical-align:middle"><span style="font-size:16px;font-weight:700;color:#1a1a19">${workspaceName}</span></td>`;

  const lineItemRows = lineItems.map((li) => `
    <tr>
      <td style="font-size:13px;color:#1a1a19;padding:10px 0;border-bottom:1px solid #f0f0ee">${li.description || "—"}</td>
      <td style="font-size:13px;color:#52524e;padding:10px 0;border-bottom:1px solid #f0f0ee;text-align:center">${li.quantity}</td>
      <td style="font-size:13px;color:#52524e;padding:10px 0;border-bottom:1px solid #f0f0ee;text-align:right">${fc(li.rate)}</td>
      <td style="font-size:13px;font-weight:600;color:#1a1a19;padding:10px 0;border-bottom:1px solid #f0f0ee;text-align:right">${fc(li.amount)}</td>
    </tr>`).join("");

  const payBtnHtml = paymentUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0">
        <tr><td align="center">
          <a href="${paymentUrl}" target="_blank" style="display:inline-block;padding:14px 40px;background:#2e7d9a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.02em">
            Pay Invoice
          </a>
        </td></tr>
       </table>`
    : "";

  const notesHtml = notes
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:#f9f9f8;border-radius:8px">
        <tr><td style="padding:16px 20px">
          <p style="font-size:11px;font-weight:600;color:#8a8a86;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">Notes</p>
          <p style="font-size:13px;color:#52524e;line-height:1.6;margin:0">${notes}</p>
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
    <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;border:1px solid #e8e8e6;border-radius:12px;overflow:hidden">

      <!-- Header -->
      <tr><td style="background:#f8f8f7;padding:24px 32px;border-bottom:1px solid #e8e8e6">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          ${logoHtml}
          <td style="vertical-align:middle;text-align:right">
            <img src="${WORDMARK_URL}" alt="aurelo" height="18" style="display:inline-block;vertical-align:middle;opacity:0.9" />
          </td>
        </tr></table>
      </td></tr>

      <!-- Accent strip -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#2e7d9a 0%,#1e5f75 100%)"></td></tr>

      <!-- Content -->
      <tr><td style="padding:32px 32px 24px">
        <p style="font-size:11px;font-weight:600;color:#2e7d9a;letter-spacing:0.1em;margin:0 0 8px;text-transform:uppercase">Invoice</p>
        <h1 style="font-size:24px;font-weight:700;color:#1a1a19;letter-spacing:-0.02em;margin:0 0 4px;line-height:1.2">
          ${invoiceNumber}
        </h1>
        <p style="font-size:14px;color:#52524e;line-height:1.7;margin:0 0 24px">
          Hi <strong>${clientName}</strong>, here's an invoice from <strong>${fromName || workspaceName}</strong>.
        </p>

        <!-- Invoice meta -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px;margin:0 0 24px">
          <tr><td style="padding:16px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#8a8a86;padding:4px 0">Issued</td>
                <td style="font-size:14px;font-weight:500;color:#1a1a19;text-align:right;padding:4px 0">${fmtDate(issuedDate)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#8a8a86;padding:4px 0">Due</td>
                <td style="font-size:14px;font-weight:500;color:#1a1a19;text-align:right;padding:4px 0">${fmtDate(dueDate)}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- Line items -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
          <tr>
            <td style="font-size:11px;font-weight:600;color:#8a8a86;text-transform:uppercase;letter-spacing:0.08em;padding:0 0 8px;border-bottom:2px solid #e8e8e6">Description</td>
            <td style="font-size:11px;font-weight:600;color:#8a8a86;text-transform:uppercase;letter-spacing:0.08em;padding:0 0 8px;border-bottom:2px solid #e8e8e6;text-align:center">Qty</td>
            <td style="font-size:11px;font-weight:600;color:#8a8a86;text-transform:uppercase;letter-spacing:0.08em;padding:0 0 8px;border-bottom:2px solid #e8e8e6;text-align:right">Rate</td>
            <td style="font-size:11px;font-weight:600;color:#8a8a86;text-transform:uppercase;letter-spacing:0.08em;padding:0 0 8px;border-bottom:2px solid #e8e8e6;text-align:right">Amount</td>
          </tr>
          ${lineItemRows}
        </table>

        <!-- Totals -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
          <tr>
            <td style="font-size:13px;color:#8a8a86;padding:6px 0">Subtotal</td>
            <td style="font-size:14px;font-weight:500;color:#1a1a19;text-align:right;padding:6px 0">${fc(subtotal)}</td>
          </tr>
          ${taxAmount > 0 ? `<tr>
            <td style="font-size:13px;color:#8a8a86;padding:6px 0">Tax (${(taxRate * 100).toFixed(1)}%)</td>
            <td style="font-size:14px;font-weight:500;color:#1a1a19;text-align:right;padding:6px 0">${fc(taxAmount)}</td>
          </tr>` : ""}
          <tr>
            <td style="font-size:15px;font-weight:700;color:#1a1a19;padding:12px 0;border-top:2px solid #1a1a19">Total</td>
            <td style="font-size:15px;font-weight:700;color:#1a1a19;text-align:right;padding:12px 0;border-top:2px solid #1a1a19">${fc(total)}</td>
          </tr>
        </table>

        ${notesHtml}
        ${payBtnHtml}
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e8e8e6;margin:0" /></td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px">
        <p style="font-size:12px;color:#a8a29e;margin:0 0 8px;line-height:1.5">
          This invoice was sent by ${fromName || workspaceName}.
        </p>
        <p style="font-size:11px;color:#c4c4c0;margin:0">
          Sent with <a href="https://getaurelo.com" style="color:#2e7d9a;text-decoration:none">Aurelo</a>
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    log("User authenticated", { userId: userData.user.id });

    const { invoiceId } = (await req.json()) as InvoicePayload;
    if (!invoiceId) throw new Error("invoiceId is required");

    // Get workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!member) throw new Error("No workspace found");
    const workspaceId = member.workspace_id;

    // Get invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (invErr || !invoice) throw new Error("Invoice not found");
    log("Invoice loaded", { number: invoice.number, clientEmail: invoice.client_email });

    if (!invoice.client_email) {
      throw new Error("No client email on this invoice. Add a client email to send.");
    }

    // Get workspace settings for branding
    const { data: wsSetting } = await supabase
      .from("workspace_settings")
      .select("data")
      .eq("workspace_id", workspaceId)
      .eq("section", "workspace")
      .maybeSingle();

    const wsData = (wsSetting?.data as Record<string, string>) || {};
    const workspaceName = wsData.name || "Aurelo";

    // Get workspace logo
    const { data: logoFiles } = await supabase.storage
      .from("logos")
      .list(workspaceId, { limit: 1 });
    let workspaceLogoUrl: string | undefined;
    if (logoFiles && logoFiles.length > 0) {
      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(`${workspaceId}/${logoFiles[0].name}`);
      workspaceLogoUrl = urlData?.publicUrl;
    }

    const lineItems = (Array.isArray(invoice.line_items) ? invoice.line_items : []) as InvoiceLineItem[];

    const html = buildHtml({
      invoiceNumber: invoice.number,
      clientName: invoice.client_name || "there",
      lineItems,
      subtotal: Number(invoice.subtotal) || 0,
      taxRate: Number(invoice.tax_rate) || 0,
      taxAmount: Number(invoice.tax_amount) || 0,
      total: Number(invoice.total) || 0,
      currency: invoice.currency || "USD",
      dueDate: invoice.due_date || "",
      issuedDate: invoice.issued_date || new Date().toISOString(),
      notes: invoice.notes || undefined,
      paymentUrl: invoice.stripe_payment_url || undefined,
      fromName: invoice.from_name || undefined,
      workspaceName,
      workspaceLogoUrl,
    });

    const senderName = invoice.from_name || workspaceName;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <noreply@getaurelo.com>`,
        to: [invoice.client_email],
        subject: `Invoice ${invoice.number} from ${senderName} — ${formatCurrency(Number(invoice.total) || 0, invoice.currency || "USD")}`,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      log("Resend API error", result);
      throw new Error(`Failed to send email: ${result?.message || res.statusText}`);
    }

    log("Email sent successfully", { resendId: result.id, to: invoice.client_email });

    return new Response(
      JSON.stringify({ success: true, resendEmailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
