import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspace_id, event_type, payload, _test_webhook_id } = await req.json();
    if (!workspace_id || !event_type) {
      return new Response(JSON.stringify({ error: 'workspace_id and event_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Authorize: either internal call (service-role/cron secret) or authenticated workspace member
    const authHeader = req.headers.get('Authorization') || '';
    const cronSecret = req.headers.get('x-cron-secret');
    const internalSecret = Deno.env.get('CRON_SECRET');
    const isInternal = internalSecret && cronSecret === internalSecret;

    if (!isInternal) {
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace_id)
        .eq('user_id', userData.user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (!member) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // For test pings, require admin/owner
      if (_test_webhook_id && member.role !== 'Owner' && member.role !== 'Admin') {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // If _test_webhook_id is set, send a ping to that specific webhook only
    if (_test_webhook_id) {
      const { data: wh, error: whErr } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', _test_webhook_id)
        .eq('workspace_id', workspace_id)
        .maybeSingle();

      if (whErr || !wh) {
        return new Response(JSON.stringify({ success: false, statusCode: null, error: 'Webhook not found' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await dispatchWebhook(supabase, wh, 'ping', payload, workspace_id);
      return new Response(JSON.stringify(result), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch active webhooks for this workspace that subscribe to this event
    const { data: webhooks, error: whErr } = await supabase
      .from('webhooks')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('active', true);

    if (whErr) {
      console.error('Failed to fetch webhooks:', whErr);
      return new Response(JSON.stringify({ error: 'Failed to fetch webhooks' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matchingWebhooks = (webhooks || []).filter((wh: any) =>
      wh.events && wh.events.includes(event_type)
    );

    if (matchingWebhooks.length === 0) {
      return new Response(JSON.stringify({ dispatched: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await Promise.allSettled(
      matchingWebhooks.map((wh: any) => dispatchWebhook(supabase, wh, event_type, payload, workspace_id))
    );

    const dispatched = results.filter(r => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ dispatched, total: matchingWebhooks.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook dispatch error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function dispatchWebhook(
  supabase: any,
  webhook: any,
  eventType: string,
  payload: any,
  workspaceId: string,
): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  const body = JSON.stringify({
    event: eventType,
    data: payload,
    webhook_id: webhook.id,
    timestamp: new Date().toISOString(),
  });

  // HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhook.signing_secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let success = false;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Webhook-Id': webhook.id,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = res.status;
    responseBody = await res.text().catch(() => null);
    success = res.ok;
  } catch (err: any) {
    errorMessage = err.name === 'AbortError' ? 'Request timed out (10s)' : (err.message || 'Network error');
  }

  // Log delivery
  await supabase.from('webhook_deliveries').insert({
    webhook_id: webhook.id,
    workspace_id: workspaceId,
    event_type: eventType,
    payload,
    status_code: statusCode,
    response_body: responseBody?.slice(0, 2000) || null,
    attempt,
    success,
    error_message: errorMessage,
  });

  // Retry once on failure (attempt 2)
  if (!success && attempt < 2) {
    await new Promise(r => setTimeout(r, 2000));
    return dispatchWebhook(supabase, webhook, eventType, payload, workspaceId, attempt + 1);
  }

  return { success, statusCode, error: errorMessage };
}
