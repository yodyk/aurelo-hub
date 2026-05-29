import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { motion } from "motion/react";
import { Loader2, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AureloWordmark } from "@/components/AureloWordmark";

type Status = "loading" | "accepting" | "success" | "error" | "needs-login" | "needs-signup";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteId = searchParams.get("id");

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [role, setRole] = useState("");

  const acceptInvite = useCallback(async (userId: string, userEmail: string, userName: string | null) => {
    if (!inviteId) return;
    setStatus("accepting");

    try {
      // Fetch the invite
      const { data: invite, error: invErr } = await supabase
        .from("pending_invites")
        .select("*")
        .eq("id", inviteId)
        .maybeSingle();

      if (invErr || !invite) {
        setError("This invitation is no longer valid or has already been used.");
        setStatus("error");
        return;
      }

      // Verify email matches
      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        setError(`This invitation was sent to ${invite.email}. Please sign in with that email address.`);
        setStatus("error");
        return;
      }

      setWorkspaceName(invite.workspace_id); // Will be resolved below
      setRole(invite.role);

      // Get workspace name
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", invite.workspace_id)
        .maybeSingle();

      // For non-members, workspaces RLS may block this. Use the invite data.
      const wsName = ws?.name || "the workspace";
      setWorkspaceName(wsName);

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", invite.workspace_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingMember) {
        // Already a member, just clean up and redirect
        await supabase.from("pending_invites").delete().eq("id", inviteId);
        setStatus("success");
        setTimeout(() => navigate("/", { replace: true }), 2000);
        return;
      }

      // Create workspace membership
      const { error: memErr } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: invite.workspace_id,
          user_id: userId,
          email: userEmail,
          name: userName || userEmail.split("@")[0],
          role: invite.role,
          status: "active",
          joined_at: new Date().toISOString(),
        });

      if (memErr) {
        console.error("Failed to create membership:", memErr);
        setError("Failed to join the workspace. Please try again or contact the workspace owner.");
        setStatus("error");
        return;
      }

      // Clean up the invite
      await supabase.from("pending_invites").delete().eq("id", inviteId);

      // Set this workspace as active
      localStorage.setItem("aurelo_active_workspace", invite.workspace_id);

      setStatus("success");
      setTimeout(() => navigate("/", { replace: true }), 2500);
    } catch (err: any) {
      console.error("Accept invite error:", err);
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }, [inviteId, navigate]);

  useEffect(() => {
    if (!inviteId) {
      setError("No invitation ID provided.");
      setStatus("error");
      return;
    }

    // Check auth state
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.name || user.user_metadata?.full_name || null;
        await acceptInvite(user.id, user.email!, name);
      } else {
        // Guests cannot read pending_invites directly due RLS, so prompt auth first.
        setStatus("needs-login");
      }
    });
  }, [inviteId, acceptInvite]);

  // Listen for auth state changes (user signs in/up while on this page)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user && status === "needs-login") {
        const user = session.user;
        const name = user.user_metadata?.name || user.user_metadata?.full_name || null;
        await acceptInvite(user.id, user.email!, name);
      }
    });
    return () => { try { data.subscription.unsubscribe(); } catch (_) {} };
  }, [acceptInvite, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[420px] text-center"
      >
        <div className="flex justify-center mb-8">
          <AureloWordmark className="h-[22px] w-auto text-foreground" />
        </div>

        {(status === "loading" || status === "accepting") && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {status === "loading" ? "Loading invitation…" : "Joining workspace…"}
            </h1>
            <p className="text-sm text-muted-foreground">Please wait a moment</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Welcome to {workspaceName}!
            </h1>
            <p className="text-sm text-muted-foreground">
              You've joined as {role === "Admin" ? "an" : "a"} <strong>{role}</strong>. Redirecting you now…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Invitation error
            </h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 mt-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-[color-mix(in_oklab,var(--primary)_92%,black)] transition-colors"
            >
              Go to Home
            </Link>
          </div>
        )}

        {status === "needs-login" && (
          <div className="space-y-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              You've been invited
            </h1>
            <p className="text-sm text-muted-foreground">
              {role ? (
                <>
                  Sign in or create an account to join the workspace as {role === "Admin" ? "an" : "a"} <strong>{role}</strong>.
                </>
              ) : (
                <>Sign in or create an account to accept this workspace invitation.</>
              )}
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                to={`/login?redirect=/accept-invite?id=${inviteId}`}
                className="w-full h-[var(--control-xl)] rounded-lg bg-primary text-white text-sm font-medium flex items-center justify-center hover:bg-[color-mix(in_oklab,var(--primary)_92%,black)] transition-colors"
              >
                Sign in to accept
              </Link>
              <Link
                to={`/signup?redirect=/accept-invite?id=${inviteId}`}
                className="w-full h-[var(--control-xl)] rounded-lg border border-[var(--hairline)] bg-card text-foreground text-sm font-medium flex items-center justify-center hover:bg-[var(--surface-sunken)] transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
