// ── Monthly Insight Alert — triggered by pg_cron on 1st of each month 8am UTC ──
// Computes month-over-month performance trends and sends branded insight emails
// via Resend to opted-in Studio/Legacy recipients.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MONTHLY-INSIGHT] ${step}${d}`);
};

const WORDMARK_URL =
  "https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png";

const PLAN_QUOTA: Record<string, number | null> = {
  starter: 0, pro: 50, studio: null, legacy: null,
};
const PLANS_WITH_INSIGHTS = new Set(["studio", "legacy"]);

interface MonthStats {
  hours: number;
  revenue: number;
  sessions: number;
  billableHours: number;
  clients: Set<string>;
}

interface InsightData {
  workspaceName: string;
  month: string;        // "March 2026"
  prevMonth: string;    // "February 2026"
  // Current month
  totalHours: number;
  totalRevenue: number;
  totalSessions: number;
  effectiveRate: number;
  billableRatio: number;
  activeClients: number;
  // Deltas vs previous month
  hoursDelta: number;       // percentage
  revenueDelta: number;     // percentage
  rateDelta: number;        // percentage
  billableDelta: number;    // percentage points
  // Top clients
  topClients: { name: string; hours: number; revenue: number; pctRevenue: number }[];
  // Client dependency
  topClientPct: number;
  topClientName: string;
  // Currency
  currency: string;
}

function fmtCurrency(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function deltaColor(n: number, invert = false): string {
  const positive = invert ? n < 0 : n > 0;
  if (Math.abs(n) < 0.5) return "#8a8a86";
  return positive ? "#3d8b5e" : "#c4783e";
}

function deltaArrow(n: number): string {
  if (Math.abs(n) < 0.5) return "→";
  return n > 0 ? "↑" : "↓";
}

function buildInsightHtml(d: InsightData): string {
  const topClientsHtml = d.topClients
    .map(
      (c) => `
    <tr>
      <td style="font-size:13px;color:#1a1a19;padding:6px 0;border-bottom:1px solid #f0f0ee">${c.name}</td>
      <td style="font-size:13px;color:#52524e;text-align:right;padding:6px 0;border-bottom:1px solid #f0f0ee">${c.hours.toFixed(1)}h</td>
      <td style="font-size:13px;font-weight:600;color:#1a1a19;text-align:right;padding:6px 0;border-bottom:1px solid #f0f0ee">${fmtCurrency(c.revenue, d.currency)}</td>
      <td style="font-size:12px;color:#8a8a86;text-align:right;padding:6px 0;border-bottom:1px solid #f0f0ee">${c.pctRevenue.toFixed(0)}%</td>
    </tr>`,
    )
    .join("");

  const dependencyWarning =
    d.topClientPct > 50
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef7ed;border:1px solid #f5d6a8;border-radius:8px;margin:0 0 28px">
          <tr><td style="padding:14px 20px">
            <p style="font-size:13px;color:#92600a;margin:0"><strong>⚠ Client dependency:</strong> ${d.topClientName} accounts for ${d.topClientPct.toFixed(0)}% of your revenue. Consider diversifying.</p>
          </td></tr>
        </table>`
      : "";

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
    <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;border:1px solid #e8e8e6;border-radius:12px;overflow:hidden">

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
        <p style="font-size:11px;font-weight:600;color:#5ea1bf;letter-spacing:0.1em;margin:0 0 8px;text-transform:uppercase">Monthly Insights</p>
        <h1 style="font-size:22px;font-weight:700;color:#1a1a19;letter-spacing:-0.02em;margin:0 0 6px;line-height:1.2">
          ${d.month} Performance
        </h1>
        <p style="font-size:13px;color:#8a8a86;margin:0 0 28px">Compared to ${d.prevMonth}</p>

        <!-- KPI cards -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">
          <tr>
            <td style="width:50%;padding:0 6px 12px 0">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px">
                <tr><td style="padding:16px 20px">
                  <p style="font-size:11px;color:#8a8a86;text-transform:uppercase;margin:0 0 6px">Revenue</p>
                  <p style="font-size:22px;font-weight:700;color:#1a1a19;margin:0">${fmtCurrency(d.totalRevenue, d.currency)}</p>
                  <p style="font-size:12px;font-weight:600;color:${deltaColor(d.revenueDelta)};margin:4px 0 0">${deltaArrow(d.revenueDelta)} ${fmtPct(d.revenueDelta)}</p>
                </td></tr>
              </table>
            </td>
            <td style="width:50%;padding:0 0 12px 6px">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px">
                <tr><td style="padding:16px 20px">
                  <p style="font-size:11px;color:#8a8a86;text-transform:uppercase;margin:0 0 6px">Hours Logged</p>
                  <p style="font-size:22px;font-weight:700;color:#1a1a19;margin:0">${d.totalHours.toFixed(1)}h</p>
                  <p style="font-size:12px;font-weight:600;color:${deltaColor(d.hoursDelta)};margin:4px 0 0">${deltaArrow(d.hoursDelta)} ${fmtPct(d.hoursDelta)}</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="width:50%;padding:0 6px 0 0">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px">
                <tr><td style="padding:16px 20px">
                  <p style="font-size:11px;color:#8a8a86;text-transform:uppercase;margin:0 0 6px">Effective Rate</p>
                  <p style="font-size:22px;font-weight:700;color:#5ea1bf;margin:0">${fmtCurrency(d.effectiveRate, d.currency)}/h</p>
                  <p style="font-size:12px;font-weight:600;color:${deltaColor(d.rateDelta)};margin:4px 0 0">${deltaArrow(d.rateDelta)} ${fmtPct(d.rateDelta)}</p>
                </td></tr>
              </table>
            </td>
            <td style="width:50%;padding:0 0 0 6px">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px">
                <tr><td style="padding:16px 20px">
                  <p style="font-size:11px;color:#8a8a86;text-transform:uppercase;margin:0 0 6px">Billable Time</p>
                  <p style="font-size:22px;font-weight:700;color:#1a1a19;margin:0">${d.billableRatio.toFixed(0)}%</p>
                  <p style="font-size:12px;font-weight:600;color:${deltaColor(d.billableDelta)};margin:4px 0 0">${deltaArrow(d.billableDelta)} ${fmtPct(d.billableDelta)} pts</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="height:28px"></div>

        ${dependencyWarning}

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
            <td style="font-size:11px;color:#8a8a86;text-transform:uppercase;text-align:right;padding:0 0 8px">Share</td>
          </tr>
          ${topClientsHtml}
        </table>`
            : ""
        }

        <!-- Summary line -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f8;border-radius:8px;margin:0 0 8px">
          <tr><td style="padding:14px 20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#52524e;padding:3px 0">Active clients</td>
                <td style="font-size:14px;font-weight:600;color:#1a1a19;text-align:right;padding:3px 0">${d.activeClients}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#52524e;padding:3px 0">Total sessions</td>
                <td style="font-size:14px;font-weight:600;color:#1a1a19;text-align:right;padding:3px 0">${d.totalSessions}</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e8e8e6;margin:0" /></td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px">
        <p style="font-size:12px;color:#a8a29e;margin:0 0 8px;line-height:1.5">
          This is your monthly performance report from ${d.workspaceName}.
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

function monthName(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, month + 1, 1));
  const end = new Date(nextMonth.getTime() - 86400000).toISOString().split("T")[0];
  return { start, end };
}

async function computeMonthStats(
  supabase: any,
  wsId: string,
  start: string,
  end: string,
): Promise<MonthStats> {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("duration, revenue, client_id, billable")
    .eq("workspace_id", wsId)
    .gte("date", start)
    .lte("date", end);

  const stats: MonthStats = { hours: 0, revenue: 0, sessions: 0, billableHours: 0, clients: new Set() };
  for (const s of sessions || []) {
    const dur = Number(s.duration) || 0;
    stats.hours += dur;
    stats.sessions++;
    if (s.billable) {
      stats.revenue += Number(s.revenue) || 0;
      stats.billableHours += dur;
    }
    stats.clients.add(s.client_id);
  }
  return stats;
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
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

    // Previous month range
    const now = new Date();
    const prevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prevPrevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));

    const curr = getMonthRange(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth());
    const prev = getMonthRange(prevPrevMonthDate.getUTCFullYear(), prevPrevMonthDate.getUTCMonth());

    log("Period", { current: curr, previous: prev });

    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, name, plan_id, owner_email");

    if (!workspaces || workspaces.length === 0) {
      log("No workspaces");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    const currentMonthStr = now.toISOString().slice(0, 7);

    for (const ws of workspaces) {
      const planId = ws.plan_id || "starter";
      if (!PLANS_WITH_INSIGHTS.has(planId)) {
        continue;
      }

      // Check preferences — insight_alert category, monthly frequency
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("user_id, frequency, email")
        .eq("workspace_id", ws.id)
        .eq("category", "insight");

      const eligibleUserIds: string[] = [];
      if (prefs) {
        for (const p of prefs) {
          if (p.email && ["monthly", "weekly", "daily", "instant"].includes(p.frequency)) {
            eligibleUserIds.push(p.user_id);
          }
        }
      }

      // Get configured recipients
      const { data: recipients } = await supabase
        .from("notification_recipients")
        .select("member_id")
        .eq("workspace_id", ws.id)
        .eq("category", "insight");

      const memberIds = recipients?.map((r: any) => r.member_id) || [];

      const { data: members } = await supabase
        .from("workspace_members")
        .select("id, email, user_id, name")
        .eq("workspace_id", ws.id)
        .eq("status", "active");

      // Determine recipients
      let recipientEmails: { email: string; name: string | null }[] = [];
      if (memberIds.length > 0 && members) {
        recipientEmails = members
          .filter((m: any) => memberIds.includes(m.id))
          .filter((m: any) => {
            if (eligibleUserIds.length > 0 && m.user_id) {
              return eligibleUserIds.includes(m.user_id);
            }
            return true;
          })
          .map((m: any) => ({ email: m.email, name: m.name }));
      } else if (ws.owner_email) {
        const ownerEligible = eligibleUserIds.length === 0 || prefs === null || prefs.length === 0;
        if (ownerEligible) {
          recipientEmails = [{ email: ws.owner_email, name: null }];
        }
      }

      if (recipientEmails.length === 0) {
        continue;
      }

      // Check email quota
      const quota = PLAN_QUOTA[planId];
      if (quota !== null) {
        const { data: quotaRow } = await supabase
          .from("email_quotas")
          .select("emails_sent, month")
          .eq("workspace_id", ws.id)
          .maybeSingle();
        const sent = quotaRow?.month === currentMonthStr ? (quotaRow?.emails_sent || 0) : 0;
        if (sent + recipientEmails.length > quota) {
          log("Quota exceeded", { id: ws.id });
          continue;
        }
      }

      // Compute stats
      const currStats = await computeMonthStats(supabase, ws.id, curr.start, curr.end);
      const prevStats = await computeMonthStats(supabase, ws.id, prev.start, prev.end);

      // Skip if no activity in either month
      if (currStats.sessions === 0 && prevStats.sessions === 0) {
        log("No activity — skipping", { id: ws.id });
        continue;
      }

      const effectiveRate = currStats.hours > 0 ? currStats.revenue / currStats.hours : 0;
      const prevEffectiveRate = prevStats.hours > 0 ? prevStats.revenue / prevStats.hours : 0;
      const billableRatio = currStats.hours > 0 ? (currStats.billableHours / currStats.hours) * 100 : 0;
      const prevBillableRatio = prevStats.hours > 0 ? (prevStats.billableHours / prevStats.hours) * 100 : 0;

      // Top clients by revenue
      const { data: clientSessions } = await supabase
        .from("sessions")
        .select("duration, revenue, client_id, billable")
        .eq("workspace_id", ws.id)
        .gte("date", curr.start)
        .lte("date", curr.end);

      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, status")
        .eq("workspace_id", ws.id);

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));
      const clientAgg: Record<string, { name: string; hours: number; revenue: number }> = {};
      for (const s of clientSessions || []) {
        const c = clientMap.get(s.client_id);
        if (!c) continue;
        if (!clientAgg[s.client_id]) clientAgg[s.client_id] = { name: c.name, hours: 0, revenue: 0 };
        clientAgg[s.client_id].hours += Number(s.duration) || 0;
        if (s.billable) clientAgg[s.client_id].revenue += Number(s.revenue) || 0;
      }
      const sortedClients = Object.values(clientAgg).sort((a, b) => b.revenue - a.revenue);
      const topClients = sortedClients.slice(0, 5).map((c) => ({
        ...c,
        pctRevenue: currStats.revenue > 0 ? (c.revenue / currStats.revenue) * 100 : 0,
      }));
      const topClientPct = sortedClients.length > 0 && currStats.revenue > 0
        ? (sortedClients[0].revenue / currStats.revenue) * 100
        : 0;

      // Get currency
      const { data: invSetting } = await supabase
        .from("workspace_settings")
        .select("data")
        .eq("workspace_id", ws.id)
        .eq("section", "invoicing")
        .maybeSingle();
      const currency = (invSetting?.data as any)?.defaultCurrency || "USD";

      const activeClients = (clients || []).filter((c: any) => c.status === "Active").length;

      const insightData: InsightData = {
        workspaceName: ws.name,
        month: monthName(prevMonthDate),
        prevMonth: monthName(prevPrevMonthDate),
        totalHours: currStats.hours,
        totalRevenue: currStats.revenue,
        totalSessions: currStats.sessions,
        effectiveRate,
        billableRatio,
        activeClients,
        hoursDelta: pctDelta(currStats.hours, prevStats.hours),
        revenueDelta: pctDelta(currStats.revenue, prevStats.revenue),
        rateDelta: pctDelta(effectiveRate, prevEffectiveRate),
        billableDelta: billableRatio - prevBillableRatio,
        topClients,
        topClientPct,
        topClientName: sortedClients.length > 0 ? sortedClients[0].name : "",
        currency,
      };

      const html = buildInsightHtml(insightData);
      const subject = `${insightData.month} Insights — ${fmtCurrency(currStats.revenue, currency)} earned`;

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
              subject,
              html,
            }),
          });
          const result = await res.json();
          if (!res.ok) {
            log("Resend error", { email: recipient.email, error: result });
            continue;
          }
          totalSent++;
          log("Insight sent", { workspace: ws.name, to: recipient.email });

          await supabase.from("notifications").insert({
            workspace_id: ws.id,
            category: "insight",
            event_type: "insight_alert",
            title: `${insightData.month} performance report`,
            body: `${fmtCurrency(currStats.revenue, currency)} earned, ${currStats.hours.toFixed(1)}h logged`,
            email_sent: true,
            metadata: {
              resend_email_id: result.id,
              month: insightData.month,
              revenueDelta: insightData.revenueDelta,
              rateDelta: insightData.rateDelta,
            },
          });
        } catch (e) {
          log("Send error", { email: recipient.email, error: String(e) });
        }
      }

      // Update quota
      await supabase
        .from("email_quotas")
        .upsert(
          {
            workspace_id: ws.id,
            month: currentMonthStr,
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
