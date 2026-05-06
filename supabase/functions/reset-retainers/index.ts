import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCronAuth } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateOnly(date: Date) {
  return date.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authErr = checkCronAuth(req, corsHeaders);
  if (authErr) return authErr;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const today = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ));

    // Find all active retainer clients whose cycle has elapsed
    const { data: clients, error } = await supabase
      .from("clients")
      .select("id, workspace_id, name, retainer_total, retainer_remaining, retainer_cycle_start, retainer_cycle_days, retainer_status, rate")
      .eq("model", "Retainer")
      .eq("status", "Active")
      .eq("retainer_status", "active")
      .gt("retainer_total", 0);

    if (error) throw error;

    let resetCount = 0;

    for (const client of clients || []) {
      const cycleStart = client.retainer_cycle_start;
      const cycleDays = client.retainer_cycle_days || 30;

      if (!cycleStart) continue;

      const startDate = parseDateOnly(cycleStart);
      const cycleEnd = addUtcDays(startDate, cycleDays);
      const nextCycleStart = addUtcDays(cycleEnd, 1);
      const cycleEndStr = formatDateOnly(cycleEnd);
      const nextCycleStartStr = formatDateOnly(nextCycleStart);

      // Reset the cycle starting the day after the cycle end date.
      if (today > cycleEnd) {
        const retainerTotal = Number(client.retainer_total || 0);
        const retainerRemaining = Number(client.retainer_remaining ?? retainerTotal);
        const hoursUsed = Math.max(0, retainerTotal - retainerRemaining);

        // Snapshot current cycle to history
        const { error: historyError } = await supabase.from("retainer_history").insert({
          workspace_id: client.workspace_id,
          client_id: client.id,
          cycle_start: cycleStart,
          cycle_end: cycleEndStr,
          hours_total: retainerTotal,
          hours_used: hoursUsed,
          hours_remaining: retainerRemaining,
          revenue: hoursUsed * (client.rate || 0),
          rate: client.rate || 0,
        });

        if (historyError) throw historyError;

        // Reset retainer: set remaining back to total and advance to the next cycle boundary.
        const { error: updateError } = await supabase
          .from("clients")
          .update({
            retainer_remaining: retainerTotal,
            retainer_cycle_start: nextCycleStartStr,
            updated_at: new Date().toISOString(),
          })
          .eq("id", client.id);

        if (updateError) throw updateError;

        resetCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, reset: resetCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Reset retainers error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
