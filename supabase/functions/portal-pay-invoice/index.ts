// ── Portal-initiated invoice payment (unauthenticated, token-based) ──
// Validates a portal token, looks up the invoice, and creates a Stripe
// Checkout Session on the workspace's connected Stripe account.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PORTAL-PAY-INVOICE] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, invoice_id } = await req.json();
    if (!token || !invoice_id) {
      return new Response(JSON.stringify({ error: 'token and invoice_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Validate token
    const { data: portalToken } = await sb
      .from('portal_tokens')
      .select('client_id, workspace_id, active')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle();

    if (!portalToken) {
      return new Response(JSON.stringify({ error: 'Invalid portal link' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { client_id, workspace_id } = portalToken;

    // Fetch invoice scoped to this client + workspace
    const { data: invoice } = await sb
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .eq('client_id', client_id)
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (String(invoice.status).toLowerCase() === 'paid') {
      return new Response(JSON.stringify({ error: 'Invoice already paid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we already created a payment URL, reuse it
    if (invoice.stripe_payment_url) {
      log('Reusing payment URL', { invoiceId: invoice.id });
      return new Response(JSON.stringify({ url: invoice.stripe_payment_url }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get workspace Stripe Connect account
    const { data: workspace } = await sb
      .from('workspaces')
      .select('stripe_connect_account_id, name')
      .eq('id', workspace_id)
      .maybeSingle();

    if (!workspace?.stripe_connect_account_id) {
      return new Response(JSON.stringify({ error: 'Online payments not enabled for this workspace.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2025-08-27.basil' });

    const currency = (invoice.currency || 'USD').toLowerCase();
    const lineItems = ((invoice.line_items as any[]) || []).map((li: any) => ({
      price_data: {
        currency,
        product_data: { name: li.description || 'Invoice line item' },
        unit_amount: Math.round((li.amount / (li.quantity || 1)) * 100),
      },
      quantity: li.quantity || 1,
    }));

    if (invoice.tax_amount && invoice.tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: `Tax (${((invoice.tax_rate || 0) * 100).toFixed(1)}%)` },
          unit_amount: Math.round(invoice.tax_amount * 100),
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get('origin') || Deno.env.get('APP_ORIGIN') || 'https://app.getaurelo.com';
    const portalUrl = `${origin}/portal/${token}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        customer_email: invoice.client_email || undefined,
        payment_intent_data: {
          description: `Invoice ${invoice.number}`,
          metadata: { invoice_id: invoice.id, invoice_number: invoice.number, source: 'portal' },
        },
        metadata: { invoice_id: invoice.id, invoice_number: invoice.number, source: 'portal' },
        success_url: `${portalUrl}?payment=success&focus=invoice:${invoice.id}`,
        cancel_url: `${portalUrl}?payment=cancelled&focus=invoice:${invoice.id}`,
      },
      { stripeAccount: workspace.stripe_connect_account_id },
    );

    log('Checkout session created', { invoiceId: invoice.id, sessionId: session.id });

    await sb
      .from('invoices')
      .update({ stripe_payment_url: session.url, updated_at: new Date().toISOString() })
      .eq('id', invoice.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('ERROR', { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
