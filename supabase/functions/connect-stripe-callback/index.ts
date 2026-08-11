import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

Deno.serve(async (req) => {
  // This is a redirect endpoint — browser navigates here directly from Stripe
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // user_id
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    // Determine the app origin for redirects
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://id-preview--22875432-e94f-4b4a-982b-c31ec1cc0988.lovable.app";

    if (error) {
      console.error("Stripe Connect OAuth error:", error, errorDesc);
      return Response.redirect(
        `${appOrigin}/settings?tab=integrations&stripe_connect=error&message=${encodeURIComponent(errorDesc || error)}`,
        302,
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${appOrigin}/settings?tab=integrations&stripe_connect=error&message=${encodeURIComponent("Missing code or state")}`,
        302,
      );
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate the state token: must exist, be unused, and be unexpired.
    // The workspace comes from the stored token — never from the query string.
    const { data: stateRow } = await supabase
      .from("stripe_oauth_states")
      .select("id, workspace_id, used_at, expires_at")
      .eq("state", state)
      .maybeSingle();

    if (
      !stateRow ||
      stateRow.used_at ||
      new Date(stateRow.expires_at).getTime() < Date.now()
    ) {
      console.error("Stripe Connect callback: invalid or expired state token");
      return Response.redirect(
        `${appOrigin}/settings?tab=integrations&stripe_connect=error&message=${encodeURIComponent("Invalid or expired connection request")}`,
        302,
      );
    }

    // Consume the token atomically so it can only be used once
    const { data: consumed } = await supabase
      .from("stripe_oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("id", stateRow.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (!consumed) {
      return Response.redirect(
        `${appOrigin}/settings?tab=integrations&stripe_connect=error&message=${encodeURIComponent("Invalid or expired connection request")}`,
        302,
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });

    // Exchange the authorization code for a connected account ID
    const response = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const connectedAccountId = response.stripe_user_id;
    if (!connectedAccountId) {
      throw new Error("No stripe_user_id returned from token exchange");
    }

    const { error: updateErr } = await supabase
      .from("workspaces")
      .update({ stripe_connect_account_id: connectedAccountId })
      .eq("id", stateRow.workspace_id);

    if (updateErr) {
      throw new Error(`Failed to save account: ${updateErr.message}`);
    }


    return Response.redirect(
      `${appOrigin}/settings?tab=integrations&stripe_connect=success`,
      302,
    );
  } catch (err) {
    console.error("connect-stripe-callback error:", err);
    const appOrigin = Deno.env.get("APP_ORIGIN") || "https://id-preview--22875432-e94f-4b4a-982b-c31ec1cc0988.lovable.app";
    return Response.redirect(
      `${appOrigin}/settings?tab=integrations&stripe_connect=error&message=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`,
      302,
    );
  }
});
