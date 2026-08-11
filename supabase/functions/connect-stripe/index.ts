import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const STRIPE_CLIENT_ID = Deno.env.get("STRIPE_CLIENT_ID");
    if (!STRIPE_CLIENT_ID) {
      throw new Error("STRIPE_CLIENT_ID is not configured");
    }

    const userId = claims.claims.sub as string;

    // Resolve the caller's workspace and require admin/owner
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["Owner", "Admin"])
      .limit(1)
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a random, single-use state token bound to this user + workspace
    const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: stateErr } = await admin.from("stripe_oauth_states").insert({
      state,
      user_id: userId,
      workspace_id: member.workspace_id,
    });
    if (stateErr) {
      throw new Error("Failed to initiate Stripe connection");
    }

    // Build the Stripe Connect OAuth URL
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/connect-stripe-callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: STRIPE_CLIENT_ID,
      scope: "read_write",
      redirect_uri: redirectUri,
      state: state,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;


    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("connect-stripe error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
