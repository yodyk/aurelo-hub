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

    console.log("Stripe Connect account linked:", connectedAccountId, "for user:", state);

    // Save the connected account ID to the workspace
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find the user's workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", state)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!member) {
      throw new Error("No workspace found for user");
    }

    const { error: updateErr } = await supabase
      .from("workspaces")
      .update({ stripe_connect_account_id: connectedAccountId })
      .eq("id", member.workspace_id);

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
