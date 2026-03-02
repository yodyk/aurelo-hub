import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CONNECT-STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    log("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_CONNECT_WEBHOOK_SECRET" });
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

  log("Event received", { type: event.type, id: event.id, account: event.account });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only handle payment-mode sessions (not subscriptions)
      if (session.mode !== "payment") {
        log("Skipping non-payment session", { mode: session.mode });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const invoiceId = session.metadata?.invoice_id;
      if (!invoiceId) {
        log("No invoice_id in metadata, skipping");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      log("Processing payment for invoice", { invoiceId, paymentStatus: session.payment_status });

      if (session.payment_status === "paid") {
        // Fetch the invoice to check current status
        const { data: invoice, error: fetchErr } = await supabase
          .from("invoices")
          .select("id, status, number")
          .eq("id", invoiceId)
          .maybeSingle();

        if (fetchErr) {
          log("Error fetching invoice", { invoiceId, error: fetchErr.message });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!invoice) {
          log("Invoice not found in database", { invoiceId });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (invoice.status === "paid") {
          log("Invoice already marked paid", { invoiceId, number: invoice.number });
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mark invoice as paid
        const { error: updateErr } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            paid_date: new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId);

        if (updateErr) {
          log("Error marking invoice paid", { invoiceId, error: updateErr.message });
        } else {
          log("Invoice marked as paid", { invoiceId, number: invoice.number });
        }
      }
    } else {
      log("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("Handler error", { type: event.type, message: msg });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
