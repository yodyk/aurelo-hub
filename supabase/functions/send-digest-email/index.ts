// ── Weekly Digest Email — triggered by pg_cron every Monday 8am UTC ──
// Iterates all workspaces, checks notification preferences & email quotas,
// then sends a branded digest email via Resend to opted-in recipients.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[WEEKLY-DIGEST] ${step}${d}`);
};

const WORDMARK_URL =
  "https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png";

// Plan email quotas — mirrors src/data/plans.ts
const PLAN_QUOTA: Record<string, number | null> = {
  starter: 0,
  pro: 50,
  studio: null,
  legacy: null,
};

// Plans that allow weekly_digest
const PLANS_WITH_DIGEST = new Set(["studio", "legacy"]);

interface DigestData {
  workspaceName: string;
  periodStart: string;
  periodEnd: string;
  totalSessions: number;
  totalHours: number;
  totalRevenue: number;
  activeClients: number;
  newInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  topClients: { name: string; hours: number; revenue: number }[];
  currency: string;
}

function fmtCurrency(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

function buildDigestHtml(d: DigestData): string {
  const topClientsHtml = d.topClients
    .map(
      (c) => `
    <tr>
      <td style="font-size:13px;color:#1a1a19;padding:6px 0;border-bottom:1px solid #f0f0ee">${c.name}</td>
      <td style="font-size:13px;color:#52524e;text-align:right;padding:6px 0;border-bottom:1px solid #f0f0ee">${c.hours.toFixed(1)}h</td>
      <td style="font-size:13px;font-weight:600;color:#1a1a19;text-align:right;padding:6px 0;border-bottom:1px solid #f0f0ee">${fmtCurrency(c.revenue, d.currency)}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;border:1px solid #e8e8e6;border-radius:12px;overflow:hidden">

      <!-- Header -->
      <tr><td style="background:#f8f8f7;padding:24px 32px;border-bottom:1px solid #e8e8e6">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle"><span style="font-size:16px;font-weight:700;color:#1a1a19">${d.workspaceName}</span></td>
          <td style="vertical-align:middle;text-align:right">
            <img src="${WORDMARK_URL}" alt="aurelo" height="18" style="display:inline-block;vertical-align:middle;opacity:0.9" />
          </td>
        </tr></table>
      </td></tr>

      <!-- Accent strip -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#5ea1bf 0%,#3b7a99 100%)"></td></tr>

      <!-- Content -->
      <tr><td style="padding:32px 32px 24px">
        <p style="font-size:11px;font-weight:600;color:#5ea1bf;letter-spacing:0.1em;margin:0 0 8px;text-transform:uppercase">Weekly Digest</p>
        <h1 style="font-size:22px;font-weight:700;color:#1a1a19;letter-spacing:-0.02em;margin:0 0 6px;line-height:1.2">
          Your week at a glance
        </h1>
        <p style="font-size:13px;color:#8a8a86;margin:0 0 28px">${d.periodStart} — ${d.periodEnd}</p>

        <!-- KPI grid -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
          <tr>
            <td style="width:33%;text-align:center;padding:16px 8px;background:#f9f9f8;border-radius:8px 0 0 8px;border-right:1px solid #e8e8e6">
              <p style="font-size:24px;font-weight:700;color:#1a1a19;margin:0">${d.totalSessions}</p>
              <p style="font-size:11px;color:#8a8a86;margin:4px 0 0;text-transform:uppercase">Sessions</p>
            </td>
            <td style="width:34%;text-align:center;padding:16px 8px;background:#f9f9f8;border-right:1px solid #e8e8e6">
              <p style="font-size:24px;font-weight:700;color:#1a1a19;margin:0">${d.totalHours.toFixed(1)}h</p>
              <p style="font-size:11px;color:#8a8a86;margin:4px 0 0;text-transform:uppercase">Hours</p>
            </td>
            <td style="width:33%;text-align:center;padding:16px 8px;background:#f9f9f8;border-radius:0 8px 8px 0">
              <p style="font-size:24px;font-weight:700;color:#5ea1bf;margin:0">${fmtCurrency(d.totalRevenue, d.currency)}</p>
              <p style="font-size:11px;color:#8a8a86;margin:4px 0 0;text-transform:uppercase">Revenue</p>
            </td>
          </tr>
        </table>

        <!-- Invoice summary -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px;margin:0 0 28px">
          <tr><td style="padding:16px 20px">
            <p style="font-size:12px;font-weight:600;color:#8a8a86;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 12px">Invoicing</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#52524e;padding:4px 0">New invoices</td>
                <td style="font-size:14px;font-weight:600;color:#1a1a19;text-align:right;padding:4px 0">${d.newInvoices}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#52524e;padding:4px 0">Paid</td>
                <td style="font-size:14px;font-weight:600;color:#3d8b5e;text-align:right;padding:4px 0">${d.paidInvoices}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#52524e;padding:4px 0">Overdue</td>
                <td style="font-size:14px;font-weight:600;color:${d.overdueInvoices > 0 ? "#c4783e" : "#1a1a19"};text-align:right;padding:4px 0">${d.overdueInvoices}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#52524e;padding:4px 0">Active clients</td>
                <td style="font-size:14px;font-weight:600;color:#1a1a19;text-align:right;padding:4px 0">${d.activeClients}</td>
              </tr>
            </table>
          </td></tr>
        </table>

        <!-- Top clients -->
        ${
          d.topClients.length > 0
            ? `
        <p style="font-size:12px;font-weight:600;color:#8a8a86;letter-spacing:0.05em;text-transform:uppercase;margin:0 0 12px">Top Clients</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
          <tr>
            <td style="font-size:11px;color:#8a8a86;text-transform:uppercase;padding:0 0 8px">Client</td>
            <td style="font-size:11px;color:#8a8a86;text-transform:uppercase;text-align:right;padding:0 0 8px">Hours</td>
            <td style="font-size:11px;color:#8a8a86;text-transform:uppercase;text-align:right;padding:0 0 8px">Revenue</td>
          </tr>
          ${topClientsHtml}
        </table>`
            : ""
        }
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e8e8e6;margin:0" /></td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px">
        <p style="font-size:12px;color:#a8a29e;margin:0 0 8px;line-height:1.5">
          This is your weekly summary from ${d.workspaceName}.
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

    // Calculate week range (previous Mon–Sun)
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // days since last Monday
    const periodEnd = new Date(now);
    periodEnd.setUTCDate(now.getUTCDate() - daysBack); // this Monday
    periodEnd.setUTCHours(0, 0, 0, 0);
    const periodEndStr = new Date(periodEnd.getTime() - 1).toISOString().split("T")[0]; // Sunday

    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodStart.getUTCDate() - 7); // previous Monday
    const periodStartStr = periodStart.toISOString().split("T")[0];

    log("Period", { start: periodStartStr, end: periodEndStr });

    // Get all workspaces on plans that support digest
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, name, plan_id, owner_email");

    if (!workspaces || workspaces.length === 0) {
      log("No workspaces found");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;

    for (const ws of workspaces) {
      const planId = ws.plan_id || "starter";

      // Check if plan supports weekly digest
      if (!PLANS_WITH_DIGEST.has(planId)) {
        log("Skipping workspace — plan doesn't support digest", { id: ws.id, plan: planId });
        continue;
      }

      // Check notification preferences for digest frequency
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id, frequency, email, in_app")
        .eq("workspace_id", ws.id)
        .eq("category", "session"); // digest is tied to session category

      // Only send to users who have email enabled AND frequency includes weekly
      const eligibleUserIds: string[] = [];
      if (prefs) {
        for (const p of prefs) {
          if (p.email && (p.frequency === "weekly" || p.frequency === "daily")) {
            eligibleUserIds.push(p.user_id);
          }
        }
      }

      // If no one opted in, also check recipients table
      const { data: recipients } = await supabase
        .from("notification_recipients")
        .select("member_id")
        .eq("workspace_id", ws.id)
        .eq("category", "session");

      // Get member emails for eligible recipients
      const memberIds = recipients?.map((r: any) => r.member_id) || [];
      // If recipients are configured, only send to those members who are also eligible
      const targetMemberIds = memberIds.length > 0
        ? memberIds
        : []; // If no recipients configured, we'll fall back to owner

      const { data: members } = await supabase
        .from("workspace_members")
        .select("id, email, user_id, name")
        .eq("workspace_id", ws.id)
        .eq("status", "active");

      // Determine recipients: either configured recipients or just the owner
      let recipientEmails: { email: string; name: string | null }[] = [];
      if (targetMemberIds.length > 0 && members) {
        recipientEmails = members
          .filter((m: any) => targetMemberIds.includes(m.id))
          .filter((m: any) => {
            // If we have eligible user IDs from prefs, filter by those
            if (eligibleUserIds.length > 0 && m.user_id) {
              return eligibleUserIds.includes(m.user_id);
            }
            return true; // No prefs set = default to sending
          })
          .map((m: any) => ({ email: m.email, name: m.name }));
      } else if (ws.owner_email) {
        // Check owner's preferences
        const ownerEligible = eligibleUserIds.length === 0 || prefs === null || prefs.length === 0;
        if (ownerEligible) {
          recipientEmails = [{ email: ws.owner_email, name: null }];
        }
      }

      if (recipientEmails.length === 0) {
        log("No recipients for workspace", { id: ws.id });
        continue;
      }

      // Check email quota
      const currentMonth = now.toISOString().slice(0, 7);
      const quota = PLAN_QUOTA[planId];
      if (quota !== null) {
        const { data: quotaRow } = await supabase
          .from("email_quotas")
          .select("emails_sent, month")
          .eq("workspace_id", ws.id)
          .maybeSingle();

        const sent = quotaRow?.month === currentMonth ? (quotaRow?.emails_sent || 0) : 0;
        if (sent + recipientEmails.length > quota) {
          log("Quota exceeded — skipping", { id: ws.id, sent, quota, needed: recipientEmails.length });
          continue;
        }
      }

      // Gather digest data
      const { data: sessions } = await supabase
        .from("sessions")
        .select("duration, revenue, client_id, billable")
        .eq("workspace_id", ws.id)
        .gte("date", periodStartStr)
        .lte("date", periodEndStr);

      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, status")
        .eq("workspace_id", ws.id);

      const { data: invoicesCreated } = await supabase
        .from("invoices")
        .select("id, status")
        .eq("workspace_id", ws.id)
        .gte("created_at", periodStart.toISOString())
        .lt("created_at", periodEnd.toISOString());

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));

      const totalSessions = sessions?.length || 0;
      const totalHours = (sessions || []).reduce((s: number, x: any) => s + (Number(x.duration) || 0), 0);
      const totalRevenue = (sessions || []).filter((x: any) => x.billable).reduce((s: number, x: any) => s + (Number(x.revenue) || 0), 0);
      const activeClients = (clients || []).filter((c: any) => c.status === "Active").length;

      // Top clients by hours this week
      const clientHours: Record<string, { name: string; hours: number; revenue: number }> = {};
      for (const s of sessions || []) {
        const c = clientMap.get(s.client_id);
        if (!c) continue;
        if (!clientHours[s.client_id]) clientHours[s.client_id] = { name: c.name, hours: 0, revenue: 0 };
        clientHours[s.client_id].hours += Number(s.duration) || 0;
        if (s.billable) clientHours[s.client_id].revenue += Number(s.revenue) || 0;
      }
      const topClients = Object.values(clientHours)
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      const invs = invoicesCreated || [];
      const newInvoices = invs.length;
      const paidInvoices = invs.filter((i: any) => i.status === "paid").length;
      const overdueInvoices = invs.filter((i: any) => i.status === "overdue").length;

      // Get workspace currency from settings
      const { data: invSetting } = await supabase
        .from("workspace_settings")
        .select("data")
        .eq("workspace_id", ws.id)
        .eq("section", "invoicing")
        .maybeSingle();
      const currency = (invSetting?.data as any)?.defaultCurrency || "USD";

      const digestData: DigestData = {
        workspaceName: ws.name,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        totalSessions,
        totalHours,
        totalRevenue,
        activeClients,
        newInvoices,
        paidInvoices,
        overdueInvoices,
        topClients,
        currency,
      };

      // Skip if nothing happened this week
      if (totalSessions === 0 && newInvoices === 0) {
        log("No activity — skipping digest", { id: ws.id });
        continue;
      }

      const html = buildDigestHtml(digestData);

      // Send to each recipient
      for (const recipient of recipientEmails) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${ws.name} <noreply@getaurelo.com>`,
              to: [recipient.email],
              subject: `Weekly Digest — ${periodStartStr} to ${periodEndStr}`,
              html,
            }),
          });

          const result = await res.json();
          if (!res.ok) {
            log("Resend error", { email: recipient.email, error: result });
            continue;
          }

          totalSent++;
          log("Digest sent", { workspace: ws.name, to: recipient.email, resendId: result.id });

          // Create in-app notification
          await supabase.from("notifications").insert({
            workspace_id: ws.id,
            category: "insight",
            event_type: "weekly_digest",
            title: "Weekly digest sent",
            body: `${totalHours.toFixed(1)}h logged, ${fmtCurrency(totalRevenue, currency)} earned`,
            email_sent: true,
            metadata: { resend_email_id: result.id, period: `${periodStartStr} to ${periodEndStr}` },
          });
        } catch (e) {
          log("Send error", { email: recipient.email, error: String(e) });
        }
      }

      // Update email quota
      await supabase
        .from("email_quotas")
        .upsert(
          {
            workspace_id: ws.id,
            month: currentMonth,
            emails_sent: recipientEmails.length,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" },
        );
    }

    log("Complete", { totalSent });
    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
