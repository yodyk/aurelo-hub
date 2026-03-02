import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { planIdFromProductId } from "./plan-mapping.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    log("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    log("ERROR", { message: "Missing stripe-signature header" });
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("Signature verification failed", { message: msg });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.customer_email) {
          log("Checkout completed", { email: session.customer_email, subscription: session.subscription });
          await syncSubscription(stripe, supabase, session.customer as string);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        log("Subscription updated", { id: sub.id, status: sub.status, customer: sub.customer });
        await syncSubscription(stripe, supabase, sub.customer as string);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        log("Subscription deleted", { id: sub.id, customer: sub.customer });
        await handleCancellation(supabase, sub.customer as string);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        log("Payment failed", { customer: invoice.customer, amount: invoice.amount_due });
        // For now just log — could add notifications in future
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("Handler error", { type: event.type, message: msg });
    // Still return 200 so Stripe doesn't retry endlessly
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ── Helpers ──────────────────────────────────────────────────────────

async function syncSubscription(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  customerId: string,
) {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  const email = customer.email;
  if (!email) return;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    await handleCancellation(supabase, customerId);
    return;
  }

  const sub = subscriptions.data[0];
  const productId = sub.items.data[0].price.product as string;
  const planId = planIdFromProductId(productId);

  if (!planId) {
    log("Unknown product", { productId });
    return;
  }

  let subscriptionEnd: string | null = null;
  try {
    const anchor = (sub as any).billing_cycle_anchor;
    if (typeof anchor === "number") {
      subscriptionEnd = new Date(anchor * 1000).toISOString();
    }
  } catch { /* non-critical */ }

  // Find workspace by owner email
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_email", email)
    .limit(1)
    .maybeSingle();

  if (!workspace) {
    log("No workspace found for email", { email });
    return;
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      plan_id: planId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan_period_end: subscriptionEnd,
      is_trial: false,
      trial_end: null,
    })
    .eq("id", workspace.id);

  if (error) {
    log("DB update error", { error: error.message });
  } else {
    log("Workspace synced", { workspaceId: workspace.id, planId });
  }
}

async function handleCancellation(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
) {
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .limit(1)
    .maybeSingle();

  if (!workspace) {
    log("No workspace for customer", { customerId });
    return;
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      plan_id: "starter",
      stripe_subscription_id: null,
      plan_period_end: null,
    })
    .eq("id", workspace.id);

  if (error) {
    log("Cancellation DB error", { error: error.message });
  } else {
    log("Workspace downgraded to starter", { workspaceId: workspace.id });
  }
}
