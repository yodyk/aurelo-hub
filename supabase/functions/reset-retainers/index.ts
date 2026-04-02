import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

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

      const startDate = new Date(cycleStart + "T00:00:00");
      const cycleEnd = new Date(startDate);
      cycleEnd.setDate(cycleEnd.getDate() + cycleDays);
      const cycleEndStr = cycleEnd.toISOString().split("T")[0];

      // Check if cycle has completed
      if (today >= cycleEnd) {
        const hoursUsed = (client.retainer_total || 0) - (client.retainer_remaining || 0);

        // Snapshot current cycle to history
        await supabase.from("retainer_history").insert({
          workspace_id: client.workspace_id,
          client_id: client.id,
          cycle_start: cycleStart,
          cycle_end: cycleEndStr,
          hours_total: client.retainer_total,
          hours_used: hoursUsed,
          hours_remaining: client.retainer_remaining || 0,
          revenue: hoursUsed * (client.rate || 0),
          rate: client.rate || 0,
        });

        // Reset retainer: set remaining back to total, advance cycle start
        await supabase
          .from("clients")
          .update({
            retainer_remaining: client.retainer_total,
            retainer_cycle_start: todayStr,
            updated_at: new Date().toISOString(),
          })
          .eq("id", client.id);

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
