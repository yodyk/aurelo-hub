// ── Send workspace invitation email via Resend ─────────────────────
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WORDMARK_URL =
  "https://oqrqypuulgeqzjcgqruw.supabase.co/storage/v1/object/public/email-assets/aurelo-wordmark.png";

interface InvitePayload {
  inviteId: string;
}

function buildHtml(opts: {
  workspaceName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  workspaceLogoUrl?: string;
}): string {
  const { workspaceName, inviterName, role, acceptUrl, workspaceLogoUrl } = opts;

  const logoHtml = workspaceLogoUrl
    ? `<td style="vertical-align:middle"><img src="${workspaceLogoUrl}" alt="${workspaceName}" height="28" style="display:inline-block;vertical-align:middle" /></td>`
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
    <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;border:1px solid #e8e8e6;border-radius:12px;overflow:hidden">

      <!-- Header -->
      <tr><td style="background:#f8f8f7;padding:24px 32px;border-bottom:1px solid #e8e8e6">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          ${logoHtml}
          <td style="vertical-align:middle;text-align:${workspaceLogoUrl ? 'right' : 'left'}">
            <img src="${WORDMARK_URL}" alt="Aurelo" height="18" style="display:inline-block;vertical-align:middle;opacity:0.9" />
          </td>
        </tr></table>
      </td></tr>

      <!-- Accent strip -->
      <tr><td style="height:3px;background:linear-gradient(90deg,#2e7d9a 0%,#1e5f75 100%)"></td></tr>

      <!-- Content -->
      <tr><td style="padding:32px 32px 24px">
        <p style="font-size:11px;font-weight:600;color:#2e7d9a;letter-spacing:0.1em;margin:0 0 8px;text-transform:uppercase">Workspace Invitation</p>
        <h1 style="font-size:24px;font-weight:700;color:#1a1a19;letter-spacing:-0.02em;margin:0 0 16px;line-height:1.2">
          You've been invited
        </h1>
        <p style="font-size:14px;color:#52524e;line-height:1.7;margin:0 0 8px">
          <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> as ${role === 'Admin' ? 'an' : 'a'} <strong>${role}</strong>.
        </p>
        <p style="font-size:14px;color:#52524e;line-height:1.7;margin:0 0 28px">
          Accept the invitation below to start collaborating with the team.
        </p>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr><td style="background:#2e7d9a;border-radius:8px;padding:0">
                <a href="${acceptUrl}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;padding:14px 32px">
                  Accept invitation →
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#a8a29e;line-height:1.5;margin:28px 0 6px">
          If the button doesn't work, paste this URL into your browser:
        </p>
        <p style="font-size:12px;color:#2e7d9a;line-height:1.5;word-break:break-all;margin:0 0 8px">${acceptUrl}</p>
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #e8e8e6;margin:0" /></td></tr>

      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px">
        <p style="font-size:12px;color:#a8a29e;margin:0 0 8px;line-height:1.5">
          Wasn't expecting this? You can safely ignore it — no changes will be made.
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

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { inviteId } = (await req.json()) as InvitePayload;
    if (!inviteId) throw new Error("inviteId is required");

    // Get the invite
    const { data: invite, error: invErr } = await supabase
      .from("pending_invites")
      .select("*")
      .eq("id", inviteId)
      .maybeSingle();
    if (invErr || !invite) throw new Error("Invite not found");

    // Get workspace info
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", invite.workspace_id)
      .single();
    if (!workspace) throw new Error("Workspace not found");

    // Get inviter name
    const { data: inviterMember } = await supabase
      .from("workspace_members")
      .select("name, email")
      .eq("user_id", userData.user.id)
      .eq("workspace_id", invite.workspace_id)
      .maybeSingle();
    const inviterName = inviterMember?.name || inviterMember?.email || userData.user.email || "Someone";

    // Get workspace logo
    const { data: logoFiles } = await supabase.storage
      .from("logos")
      .list(workspace.id, { limit: 10 });
    let workspaceLogoUrl: string | undefined;
    if (logoFiles && logoFiles.length > 0) {
      // Prefer email logo
      const emailLogo = logoFiles.find((f: any) => f.name.startsWith("email"));
      const appLogo = logoFiles.find((f: any) => f.name.startsWith("app"));
      const logoFile = emailLogo || appLogo || logoFiles[0];
      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(`${workspace.id}/${logoFile.name}`);
      workspaceLogoUrl = urlData?.publicUrl;
    }

    // Build accept URL — uses APP_ORIGIN secret or falls back
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://aureloapp.lovable.app";
    const acceptUrl = `${appOrigin}/accept-invite?id=${inviteId}`;

    const html = buildHtml({
      workspaceName: workspace.name,
      inviterName,
      role: invite.role,
      acceptUrl,
      workspaceLogoUrl,
    });

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${workspace.name} via Aurelo <noreply@getaurelo.com>`,
        to: [invite.email],
        subject: `You've been invited to join ${workspace.name}`,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to send email: ${result?.message || res.statusText}`);
    }

    console.log("[SEND-WORKSPACE-INVITE] Email sent", { to: invite.email, resendId: result.id });

    return new Response(
      JSON.stringify({ success: true, resendEmailId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SEND-WORKSPACE-INVITE] ERROR", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
