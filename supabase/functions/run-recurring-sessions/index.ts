import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkCronAuth } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getDayOfWeek(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun, 6=Sat
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

    const today = formatDate(new Date());
    const todayDow = getDayOfWeek(today);
    const isWeekend = todayDow === 0 || todayDow === 6;

    // Fetch all active recurring rules
    const { data: rules, error: fetchErr } = await supabase
      .from("recurring_sessions")
      .select("*, clients!inner(workspace_id, rate, model, retainer_remaining, retainer_total, status)")
      .eq("active", true);

    if (fetchErr) throw fetchErr;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0;

    for (const rule of rules) {
      // Skip inactive clients
      if (rule.clients?.status !== "Active") continue;

      // Skip weekends if rule says so
      if (isWeekend && rule.skip_weekends) continue;

      // Determine if this rule should fire today
      const lastRun = rule.last_run_date;
      if (lastRun === today) continue; // already ran today

      let shouldRun = false;

      if (rule.frequency === "daily") {
        shouldRun = true;
      } else if (rule.frequency === "weekly") {
        // Run once per week: if no last run, or 7+ days since last run
        if (!lastRun) {
          shouldRun = true;
        } else {
          const [ly, lm, ld] = lastRun.split("-").map(Number);
          const lastDate = new Date(Date.UTC(ly, lm - 1, ld));
          const todayDate = new Date(Date.UTC(
            ...today.split("-").map(Number) as [number, number, number]
          ));
          todayDate.setUTCMonth(todayDate.getUTCMonth()); // fix month
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          shouldRun = diffDays >= 7;
        }
      } else if (rule.frequency === "monthly") {
        if (!lastRun) {
          shouldRun = true;
        } else {
          const [ly, lm] = lastRun.split("-").map(Number);
          const [ty, tm] = today.split("-").map(Number);
          shouldRun = ty > ly || tm > lm;
        }
      }

      if (!shouldRun) continue;

      // Calculate revenue
      const rate = Number(rule.clients?.rate || 0);
      const revenue = rule.billable ? rate * Number(rule.duration) : 0;

      // Find workspace member for logged_by (use workspace owner as fallback)
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", rule.workspace_id)
        .single();

      if (!workspace) continue;

      const { error: insertErr } = await supabase.from("sessions").insert({
        workspace_id: rule.workspace_id,
        client_id: rule.client_id,
        project_id: rule.project_id,
        task: rule.task || "Recurring session",
        notes: rule.notes,
        duration: rule.duration,
        billable: rule.billable,
        date: today,
        revenue,
        logged_by: workspace.owner_id,
        allocation_type: rule.clients?.model === "Retainer" ? "retainer" : null,
      });

      if (insertErr) {
        console.error(`Failed to insert session for rule ${rule.id}:`, insertErr);
        continue;
      }

      // Update retainer remaining if applicable
      if (rule.clients?.model === "Retainer" && rule.billable) {
        const newRemaining = Math.max(
          0,
          Number(rule.clients.retainer_remaining || 0) - Number(rule.duration)
        );
        await supabase
          .from("clients")
          .update({ retainer_remaining: newRemaining })
          .eq("id", rule.client_id);
      }

      // Update last_run_date
      await supabase
        .from("recurring_sessions")
        .update({ last_run_date: today, updated_at: new Date().toISOString() })
        .eq("id", rule.id);

      created++;
    }

    return new Response(JSON.stringify({ created, date: today }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("run-recurring-sessions error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
