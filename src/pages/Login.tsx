import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../data/AuthContext";
import { AureloWordmark } from "../components/AureloWordmark";
import { AuthVisualPanel } from "../components/AuthVisualPanel";
import { lovable } from "@/integrations/lovable";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // If there's a redirect (e.g. from invite), go there, otherwise home
      navigate(redirectTo || "/", { replace: true });
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Invalid email or password");
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
              Welcome back
            </h1>
            <p className="text-[14px] text-[#717182]" style={{ fontWeight: 400 }}>
              Sign in to your workspace to continue
            </p>
          </div>

          {/* Social Sign In */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) setError(error.message || "Google sign-in failed");
              }}
              className="w-full h-10 rounded-lg border border-black/10 bg-white text-[#1c1c1c] text-[14px] flex items-center justify-center gap-2.5 hover:bg-[#f5f5f5] active:bg-[#eee] transition-all duration-200"
              style={{ fontWeight: 500 }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={async () => {
                const { error } = await lovable.auth.signInWithOAuth("apple", {
                  redirect_uri: window.location.origin,
                });
                if (error) setError(error.message || "Apple sign-in failed");
              }}
              className="w-full h-10 rounded-lg bg-[#1c1c1c] text-white text-[14px] flex items-center justify-center gap-2.5 hover:bg-[#333] active:bg-[#111] transition-all duration-200"
              style={{ fontWeight: 500 }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-black/[0.06]" />
            <span className="text-[12px] text-[#b0b0b8]" style={{ fontWeight: 500 }}>or</span>
            <div className="flex-1 h-px bg-black/[0.06]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3.5 py-2.5 rounded-lg bg-[#5ea1bf]/6 border border-[#5ea1bf]/15 text-[13px] text-[#5ea1bf]"
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/reset-password"
                  className="text-[12px] text-[#5ea1bf] hover:text-[#4d8fad] transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-[#5ea1bf] text-white text-[14px] flex items-center justify-center gap-2 hover:bg-[#4d8fad] active:bg-[#437d99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              style={{ fontWeight: 500 }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] text-center">
            <p className="text-[13px] text-[#717182]">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#5ea1bf] hover:text-[#4d8fad] transition-colors"
                style={{ fontWeight: 500 }}
              >
                Create one
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <AuthVisualPanel />
    </div>
  );
}
