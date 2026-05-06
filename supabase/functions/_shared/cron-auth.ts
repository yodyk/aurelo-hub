// Shared helper for cron-only edge functions.
// Returns null if the request is authorized; otherwise a Response to return.
export function checkCronAuth(req: Request, corsHeaders: Record<string, string>): Response | null {
  const secret = Deno.env.get('CRON_SECRET');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // If no CRON_SECRET configured, allow (back-compat) but warn.
  if (!secret) {
    console.warn('[cron-auth] CRON_SECRET not set — endpoint is publicly callable');
    return null;
  }

  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization') || '';
  const bearer = authHeader.replace('Bearer ', '');

  if (headerSecret === secret) return null;
  if (serviceRole && bearer === serviceRole) return null;

  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
