// ── Check for overdue invoices and update status + notify ──────────
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-OVERDUE] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const today = new Date().toISOString().split("T")[0];
    log("Running overdue check", { today });

    // Find all sent invoices with due_date in the past
    const { data: overdueInvoices, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, number, client_name, client_id, total, currency, due_date, workspace_id")
      .eq("status", "sent")
      .lt("due_date", today);

    // Build set of workspace IDs that have opted in to auto-overdue
    const workspaceIds = [...new Set((overdueInvoices || []).map((i: any) => i.workspace_id))];
    const optedInWorkspaces = new Set<string>();

    for (const wsId of workspaceIds) {
      const { data: setting } = await supabase
        .from("workspace_settings")
        .select("data")
        .eq("workspace_id", wsId)
        .eq("section", "notifications")
        .maybeSingle();
      if ((setting?.data as any)?.autoMarkOverdue === true) {
        optedInWorkspaces.add(wsId);
      }
    }

    log("Opted-in workspaces", { count: optedInWorkspaces.size, ids: [...optedInWorkspaces] });

    if (fetchErr) {
      log("Error fetching invoices", { error: fetchErr.message });
      throw new Error(fetchErr.message);
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      log("No overdue invoices found");
      return new Response(
        JSON.stringify({ updated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    log("Found overdue invoices", { count: overdueInvoices.length });

    let updated = 0;

    for (const inv of overdueInvoices) {
      // Skip workspaces that haven't opted in
      if (!optedInWorkspaces.has(inv.workspace_id)) {
        log("Skipping invoice — workspace not opted in", { id: inv.id, workspace_id: inv.workspace_id });
        continue;
      }

      // Mark as overdue
      const { error: updateErr } = await supabase
        .from("invoices")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("id", inv.id);

      if (updateErr) {
        log("Failed to update invoice", { id: inv.id, error: updateErr.message });
        continue;
      }

      updated++;

      const total = Number(inv.total) || 0;
      const currency = inv.currency || "USD";
      const fmtTotal = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total);
      const clientName = inv.client_name || "A client";

      // Create in-app notification
      await supabase.from("notifications").insert({
        workspace_id: inv.workspace_id,
        category: "invoice",
        event_type: "invoice.overdue",
        title: `Invoice ${inv.number} is overdue`,
        body: `${clientName}'s invoice for ${fmtTotal} was due ${inv.due_date} and is now overdue.`,
        metadata: { invoiceId: inv.id, clientId: inv.client_id, total, dueDate: inv.due_date },
      });

      // Dispatch webhook event
      try {
        const dispatchUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/dispatch-webhook`;
        await fetch(dispatchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            workspace_id: inv.workspace_id,
            event_type: "invoice.overdue",
            payload: {
              id: inv.id,
              number: inv.number,
              client_id: inv.client_id,
              total,
              currency,
              due_date: inv.due_date,
            },
          }),
        });
      } catch {
        // Non-fatal
      }

      log("Processed overdue invoice", { id: inv.id, number: inv.number });
    }

    log("Overdue check complete", { updated });

    return new Response(
      JSON.stringify({ updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
