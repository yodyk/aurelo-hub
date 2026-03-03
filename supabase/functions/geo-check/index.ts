// Geo-restriction: blocks signups from non-US IPs
// Uses ipapi.co free tier (no API key needed, 1000 req/day)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers (Supabase edge functions expose this)
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';

    if (!clientIp || clientIp === '127.0.0.1' || clientIp === '::1') {
      // Local development — allow
      return new Response(
        JSON.stringify({ allowed: true, country: 'US', ip: clientIp, reason: 'localhost' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query ipapi.co for geolocation
    const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`, {
      headers: { 'User-Agent': 'Aurelo/1.0' },
    });

    if (!geoRes.ok) {
      // If geo service fails, allow (fail-open to not block legit users)
      console.error(`Geo lookup failed: ${geoRes.status}`);
      return new Response(
        JSON.stringify({ allowed: true, country: 'unknown', ip: clientIp, reason: 'geo_service_unavailable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geo = await geoRes.json();
    const country = geo.country_code || geo.country || 'unknown';
    const allowed = country === 'US';

    return new Response(
      JSON.stringify({
        allowed,
        country,
        ip: clientIp,
        region: geo.region || null,
        reason: allowed ? 'us_allowed' : 'non_us_blocked',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Geo-check error:', err);
    // Fail-open
    return new Response(
      JSON.stringify({ allowed: true, country: 'unknown', reason: 'error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
