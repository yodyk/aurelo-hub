import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-INVOICE-PAYMENT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const userId = userData.user.id;
    log("User authenticated", { userId });

    // Get request body
    const { invoiceId } = await req.json();
    if (!invoiceId) throw new Error("invoiceId is required");

    // Get workspace membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!member) throw new Error("No workspace found");
    const workspaceId = member.workspace_id;

    // Get the invoice
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (invErr || !invoice) throw new Error("Invoice not found");
    log("Invoice found", { number: invoice.number, total: invoice.total });

    // Get workspace's Stripe Connect account
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("stripe_connect_account_id")
      .eq("id", workspaceId)
      .maybeSingle();
    if (!workspace?.stripe_connect_account_id) {
      throw new Error("No Stripe account connected. Go to Settings → Integrations to connect Stripe.");
    }
    const connectedAccountId = workspace.stripe_connect_account_id;
    log("Connected account", { connectedAccountId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Build line items for Stripe Checkout from invoice line items
    const lineItems = ((invoice.line_items as any[]) || []).map((li: any) => ({
      price_data: {
        currency: (invoice.currency || "USD").toLowerCase(),
        product_data: {
          name: li.description || "Invoice line item",
        },
        unit_amount: Math.round((li.amount / (li.quantity || 1)) * 100), // convert to cents
      },
      quantity: li.quantity || 1,
    }));

    // Add tax as a separate line item if applicable
    if (invoice.tax_amount && invoice.tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency: (invoice.currency || "USD").toLowerCase(),
          product_data: {
            name: `Tax (${((invoice.tax_rate || 0) * 100).toFixed(1)}%)`,
          },
          unit_amount: Math.round(invoice.tax_amount * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get("origin") || Deno.env.get("APP_ORIGIN") || "http://localhost:3000";

    // Create checkout session on the connected account
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        customer_email: invoice.client_email || undefined,
        payment_intent_data: {
          description: `Invoice ${invoice.number}`,
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.number,
          },
        },
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.number,
        },
        success_url: `${origin}/invoicing?payment=success&invoice=${invoice.number}`,
        cancel_url: `${origin}/invoicing?payment=cancelled&invoice=${invoice.number}`,
      },
      {
        stripeAccount: connectedAccountId,
      },
    );

    log("Checkout session created", { sessionId: session.id, url: session.url });

    // Save payment URL to invoice
    const { error: updateErr } = await supabase
      .from("invoices")
      .update({
        stripe_payment_url: session.url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateErr) {
      log("Failed to save payment URL", { error: updateErr.message });
    }

    return new Response(
      JSON.stringify({ url: session.url }),
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
