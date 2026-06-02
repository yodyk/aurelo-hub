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
      .select("id, workspace_id, name, retainer_total, retainer_remaining, retainer_cycle_start, retainer_cycle_days, retainer_status, rate, custom_fields")
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

        // Read planned next-cycle settings from custom_fields._system.retainer.
        // - nextCycleBaseHours: one-time override of the base allotment (cleared after use)
        // - pendingCarryoverHours: persistent contract cap on how many unused hours can roll over
        const cf: any = client.custom_fields || {};
        const planning: any =
          cf && typeof cf === "object" && !Array.isArray(cf) &&
          cf._system && typeof cf._system === "object" && !Array.isArray(cf._system) &&
          cf._system.retainer && typeof cf._system.retainer === "object" && !Array.isArray(cf._system.retainer)
            ? cf._system.retainer
            : {};

        const baseOverride = Number(planning.nextCycleBaseHours);
        const nextBaseHours = Number.isFinite(baseOverride) && baseOverride >= 0
          ? baseOverride
          : retainerTotal;

        const cap = Math.max(0, Number(planning.pendingCarryoverHours) || 0);
        const actualLeftover = Math.max(0, retainerRemaining);
        const effectiveCarryover = Math.min(cap, actualLeftover);

        const nextCycleTotal = nextBaseHours + effectiveCarryover;

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

        // Build the next custom_fields: clear one-time base override, keep cap.
        let nextCustomFields = cf;
        if (planning.nextCycleBaseHours != null) {
          const nextRetainer = { ...planning };
          delete nextRetainer.nextCycleBaseHours;
          nextCustomFields = {
            ...(cf || {}),
            _system: {
              ...((cf && cf._system) || {}),
              retainer: nextRetainer,
            },
          };
        }

        const update: Record<string, unknown> = {
          retainer_total: nextCycleTotal,
          retainer_remaining: nextCycleTotal,
          retainer_carryover_hours: effectiveCarryover,
          retainer_cycle_start: nextCycleStartStr,
          updated_at: new Date().toISOString(),
        };
        if (nextCustomFields !== cf) update.custom_fields = nextCustomFields;

        const { error: updateError } = await supabase
          .from("clients")
          .update(update)
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
