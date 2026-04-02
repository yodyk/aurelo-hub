import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Loader2, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AureloWordmark } from "../components/AureloWordmark";
import { AureloIcon } from "../components/AureloIcon";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Detect recovery token in URL hash (user clicked reset link in email)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset");
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      if (err.message?.includes("security purposes") || err.message?.includes("request this after")) {
        setError("Please wait a moment before trying again");
      } else {
        setError(err.message || "Failed to send reset email");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fafaf9]">
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-12">
            <AureloWordmark className="h-[22px] w-auto text-foreground" />
          </div>

          {mode === "request" ? (
            <>
              <div className="mb-8">
                <h1 className="text-[24px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                  Reset your password
                </h1>
                <p className="text-[14px] text-[#717182]">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2e7d9a]/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-[#2e7d9a]" />
                  </div>
                  <h2 className="text-[18px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600 }}>
                    Check your email
                  </h2>
                  <p className="text-[13px] text-[#717182]">
                    If an account exists for {email}, you'll receive a password reset link shortly.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-3.5 py-2.5 rounded-lg bg-[#c27272]/6 border border-[#c27272]/15 text-[13px] text-[#c27272]"
                      style={{ fontWeight: 500 }}
                    >
                      {error}
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-[13px] text-[#1c1c1c] mb-1.5" style={{ fontWeight: 500 }}>
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="w-full h-10 px-3 rounded-lg border border-black/10 bg-white text-[14px] text-[#1c1c1c] placeholder:text-[#b0b0b8] outline-none focus:border-[#2e7d9a]/40 focus:ring-2 focus:ring-[#2e7d9a]/10 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 rounded-lg bg-[#2e7d9a] text-white text-[14px] flex items-center justify-center gap-2 hover:bg-[#256a83] active:bg-[#1e5f75] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ fontWeight: 500 }}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[24px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                  Set a new password
                </h1>
                <p className="text-[14px] text-[#717182]">
                  Choose a new password for your account.
                </p>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-12 h-12 rounded-full bg-[#2e7d9a]/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-[#2e7d9a]" />
                  </div>
                  <h2 className="text-[18px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600 }}>
                    Password updated
                  </h2>
                  <p className="text-[13px] text-[#717182]">
                    Redirecting you to sign in…
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-3.5 py-2.5 rounded-lg bg-[#c27272]/6 border border-[#c27272]/15 text-[13px] text-[#c27272]"
                      style={{ fontWeight: 500 }}
                    >
                      {error}
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-[13px] text-[#1c1c1c] mb-1.5" style={{ fontWeight: 500 }}>
                      New password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      className="w-full h-10 px-3 rounded-lg border border-black/10 bg-white text-[14px] text-[#1c1c1c] placeholder:text-[#b0b0b8] outline-none focus:border-[#2e7d9a]/40 focus:ring-2 focus:ring-[#2e7d9a]/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] text-[#1c1c1c] mb-1.5" style={{ fontWeight: 500 }}>
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      className="w-full h-10 px-3 rounded-lg border border-black/10 bg-white text-[14px] text-[#1c1c1c] placeholder:text-[#b0b0b8] outline-none focus:border-[#2e7d9a]/40 focus:ring-2 focus:ring-[#2e7d9a]/10 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 rounded-lg bg-[#2e7d9a] text-white text-[14px] flex items-center justify-center gap-2 hover:bg-[#256a83] active:bg-[#1e5f75] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ fontWeight: 500 }}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Update password
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Back to login */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#2e7d9a] hover:text-[#256a83] transition-colors"
              style={{ fontWeight: 500 }}
            >
              <ArrowLeft className="w-3 h-3" />
              Back to sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
