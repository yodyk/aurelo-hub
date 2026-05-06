// ── Send the client portal link via email ──────────────────────────
// Authenticated workspace members can email a portal link to a client.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-PORTAL-LINK-EMAIL] ${step}${d}`);
};

const WORDMARK_URL =
  "https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png";

interface Payload {
  clientId: string;
  recipientEmail: string;
  message?: string;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

function buildHtml(opts: {
  clientName: string;
  workspaceName: string;
  workspaceLogoUrl?: string;
  portalUrl: string;
  message?: string;
  fromName: string;
}): string {
  const { clientName, workspaceName, workspaceLogoUrl, portalUrl, message, fromName } = opts;
  const logoHtml = workspaceLogoUrl
    ? `<td style="vertical-align:middle"><img src="${workspaceLogoUrl}" alt="${workspaceName}" height="28" style="display:inline-block;vertical-align:middle" /></td>`
    : `<td style="vertical-align:middle"><span style="font-size:16px;font-weight:700;color:#1a1a19">${workspaceName}</span></td>`;

  const messageHtml = message
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:#f9f9f8;border-radius:8px"><tr><td style="padding:16px 20px"><p style="font-size:13px;color:#52524e;line-height:1.6;margin:0;white-space:pre-wrap">${message.replace(/</g, "&lt;")}</p></td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;border:1px solid #e8e8e6;border-radius:12px;overflow:hidden">
  <tr><td style="background:#f8f8f7;padding:24px 32px;border-bottom:1px solid #e8e8e6">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${logoHtml}
      <td style="vertical-align:middle;text-align:right"><img src="${WORDMARK_URL}" alt="aurelo" height="18" style="opacity:0.9" /></td>
    </tr></table>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#2e7d9a 0%,#1e5f75 100%)"></td></tr>
  <tr><td style="padding:32px 32px 24px">
    <p style="font-size:11px;font-weight:600;color:#2e7d9a;letter-spacing:0.1em;margin:0 0 8px;text-transform:uppercase">Your Portal</p>
    <h1 style="font-size:24px;font-weight:700;color:#1a1a19;letter-spacing:-0.02em;margin:0 0 12px;line-height:1.2">View your project details</h1>
    <p style="font-size:14px;color:#52524e;line-height:1.7;margin:0 0 24px">
      Hi <strong>${clientName}</strong>, ${fromName} has shared a private portal with you. You'll be able to track progress, time logged, and project activity in real time.
    </p>
    ${messageHtml}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0">
      <tr><td align="center">
        <a href="${portalUrl}" target="_blank" style="display:inline-block;padding:14px 40px;background:#2e7d9a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.02em">
          Open your portal
        </a>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#a8a29e;margin:20px 0 0;line-height:1.5;text-align:center;word-break:break-all">
      Or paste this link into your browser:<br/>
      <a href="${portalUrl}" style="color:#2e7d9a;text-decoration:none">${portalUrl}</a>
    </p>
  </td></tr>
  <tr><td style="padding:16px 32px 24px;border-top:1px solid #e8e8e6">
    <p style="font-size:11px;color:#c4c4c0;margin:0">Sent with <a href="https://getaurelo.com" style="color:#2e7d9a;text-decoration:none">Aurelo</a></p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const payload = (await req.json()) as Payload;
    if (!payload.clientId) throw new Error("clientId is required");
    if (!payload.recipientEmail || !isValidEmail(payload.recipientEmail)) {
      throw new Error("A valid recipient email is required");
    }
    if (payload.message && payload.message.length > 1000) {
      throw new Error("Message must be under 1000 characters");
    }

    // Resolve workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .limit(1).maybeSingle();
    if (!member) throw new Error("No workspace found");
    const workspaceId = member.workspace_id;

    // Load client (must belong to workspace)
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, workspace_id")
      .eq("id", payload.clientId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!client) throw new Error("Client not found");

    // Get or create active portal token
    let { data: portal } = await supabase
      .from("portal_tokens")
      .select("token, active")
      .eq("client_id", client.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!portal) {
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(15)))
        .map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
      const { data: created, error: createErr } = await supabase
        .from("portal_tokens")
        .insert({ workspace_id: workspaceId, client_id: client.id, token: newToken, active: true })
        .select("token, active").single();
      if (createErr) throw new Error(`Failed to create portal token: ${createErr.message}`);
      portal = created;
    } else if (!portal.active) {
      await supabase.from("portal_tokens").update({ active: true })
        .eq("client_id", client.id).eq("workspace_id", workspaceId);
    }

    // Workspace branding
    const { data: wsRow } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
    const { data: wsSetting } = await supabase
      .from("workspace_settings").select("data")
      .eq("workspace_id", workspaceId).eq("section", "workspace").maybeSingle();
    const wsData = (wsSetting?.data as Record<string, string>) || {};
    const workspaceName = wsData.name || wsRow?.name || "Aurelo";

    const { data: logoFiles } = await supabase.storage.from("logos").list(workspaceId, { limit: 1 });
    let workspaceLogoUrl: string | undefined;
    if (logoFiles && logoFiles.length > 0) {
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(`${workspaceId}/${logoFiles[0].name}`);
      workspaceLogoUrl = urlData?.publicUrl;
    }

    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://app.getaurelo.com";
    const portalUrl = `${appOrigin}/portal/${portal!.token}`;

    const html = buildHtml({
      clientName: client.name,
      workspaceName,
      workspaceLogoUrl,
      portalUrl,
      message: payload.message,
      fromName: workspaceName,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${workspaceName} <noreply@getaurelo.com>`,
        to: [payload.recipientEmail],
        subject: `${workspaceName} shared your project portal`,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      log("Resend API error", result);
      throw new Error(`Failed to send email: ${result?.message || res.statusText}`);
    }

    // Log to notifications so it appears in the email activity log with tracking
    await supabase.from("notifications").insert({
      workspace_id: workspaceId,
      category: "client",
      event_type: "portal_link_sent",
      title: `Portal link sent for ${client.name}`,
      body: `Sent to ${payload.recipientEmail}`,
      email_sent: true,
      metadata: {
        clientId: client.id,
        clientEmail: payload.recipientEmail,
        resend_email_id: result.id,
      },
    });

    log("Portal link email sent", { resendId: result.id, to: payload.recipientEmail });

    return new Response(
      JSON.stringify({ success: true, resendEmailId: result.id, portalUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
