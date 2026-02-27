import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, ArrowRight, Loader2, Check, X } from "lucide-react";
import { useAuth } from "../data/AuthContext";
import { AureloIcon } from "../components/AureloIcon";
import { AureloWordmark } from "../components/AureloWordmark";

// Password rules (from spec): min 8 chars, 1 digit, 1 uppercase
const rules = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One uppercase", test: (p: string) => /[A-Z]/.test(p) },
];

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const allValid = rules.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (!allValid) {
      setError("Password doesn't meet requirements");
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      setSuccess(true);
      // Navigate to onboarding after short delay
      setTimeout(() => navigate("/onboarding", { replace: true }), 600);
    } catch (err: any) {
      console.error("Signup failed:", err);
      if (err.message?.includes("already registered")) {
        setError("An account with this email already exists");
      } else {
        setError(err.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fafaf9]">
      {/* Left — Auth Form */}
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

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[24px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
              Create your account
            </h1>
            <p className="text-[14px] text-[#717182]" style={{ fontWeight: 400 }}>
              Start managing your freelance business
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-12 h-12 rounded-full bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-[#5ea1bf]" />
              </div>
              <h2 className="text-[18px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600 }}>
                Account created!
              </h2>
              <p className="text-[13px] text-[#717182]">
                Please check your email to verify your account, then sign in.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  className="w-full h-10 px-3 rounded-lg border border-black/10 bg-white text-[14px] text-[#1c1c1c] placeholder:text-[#b0b0b8] outline-none focus:border-[#5ea1bf]/40 focus:ring-2 focus:ring-[#5ea1bf]/10 transition-all"
                />
              </div>

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
                  className="w-full h-10 px-3 rounded-lg border border-black/10 bg-white text-[14px] text-[#1c1c1c] placeholder:text-[#b0b0b8] outline-none focus:border-[#5ea1bf]/40 focus:ring-2 focus:ring-[#5ea1bf]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] text-[#1c1c1c] mb-1.5" style={{ fontWeight: 500 }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    className="w-full h-10 px-3 pr-10 rounded-lg border border-black/10 bg-white text-[14px] text-[#1c1c1c] placeholder:text-[#b0b0b8] outline-none focus:border-[#5ea1bf]/40 focus:ring-2 focus:ring-[#5ea1bf]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0b0b8] hover:text-[#717182] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password rules */}
                {password.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-3 mt-2.5"
                  >
                    {rules.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <div key={rule.label} className="flex items-center gap-1">
                          {passed ? (
                            <Check className="w-3 h-3 text-[#5ea1bf]" />
                          ) : (
                            <X className="w-3 h-3 text-[#b0b0b8]" />
                          )}
                          <span
                            className={`text-[11px] ${passed ? "text-[#5ea1bf]" : "text-[#b0b0b8]"}`}
                            style={{ fontWeight: 500 }}
                          >
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !allValid}
                className="w-full h-10 rounded-lg bg-[#5ea1bf] text-white text-[14px] flex items-center justify-center gap-2 hover:bg-[#4d8fad] active:bg-[#437d99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                style={{ fontWeight: 500 }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Sign in link */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] text-center">
            <p className="text-[13px] text-[#717182]">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#5ea1bf] hover:text-[#4d8fad] transition-colors"
                style={{ fontWeight: 500 }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right — Visual Panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `
            radial-gradient(ellipse at 25% 0%, rgba(94, 161, 191, 0.14) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 90%, rgba(191, 160, 68, 0.06) 0%, transparent 45%),
            linear-gradient(160deg, #eef4f7 0%, #e6edf2 40%, #e0e8ee 70%, #dae3ea 100%)
          `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
            linear-gradient(rgba(94,161,191,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(94,161,191,1) 1px, transparent 1px)
          `,
            backgroundSize: "56px 56px",
          }}
        />

        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[10%] w-28 h-28 rounded-2xl bg-white/20 border border-white/25"
        />
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[30%] right-[12%] w-20 h-20 rounded-xl bg-[#5ea1bf]/[0.04] border border-[#5ea1bf]/[0.08]"
        />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[20%] left-[20%] w-16 h-16 rounded-full bg-white/15 border border-white/20"
        />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-center max-w-[280px]"
          >
            <div
              className="w-11 h-11 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 flex items-center justify-center mx-auto mb-5"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}
            >
              <AureloIcon className="w-5 h-5 text-[#5ea1bf]" />
            </div>
            <h2
              className="text-[24px] text-[#1c1c1c]/70 mb-2.5"
              style={{ fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}
            >
              Freelance grows here.
            </h2>
            <p className="text-[13px] text-[#717182]/60 leading-relaxed">
              Track time, manage clients, and see where your business is headed.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
