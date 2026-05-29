import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Check,
  Loader2,
  Palette,
  Code2,
  Megaphone,
  Sparkles,
  MessageCircle,
  Box,
  Building,
  Crown,
} from "lucide-react";
import { useData } from "../data/DataContext";
import { AureloIcon } from "../components/AureloIcon";
import { AureloWordmark } from "../components/AureloWordmark";

import { type IdentityType, IDENTITY_OPTIONS, getCategoriesForIdentity } from "../data/identityPresets";
import { PLANS, type PlanId } from "../data/plans";
import { OnboardingPlanPicker } from "../components/OnboardingPlanPicker";

const IDENTITY_ICONS: Record<IdentityType, typeof Palette> = {
  designer: Palette,
  developer: Code2,
  copywriter: Sparkles,
  consultant: MessageCircle,
  photographer: Box,
  videographer: Building,
  marketer: Megaphone,
  other: Code2,
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { setIdentityAndCategories } = useData();
  const [selected, setSelected] = useState<IdentityType | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [step, setStep] = useState<"select" | "confirm" | "explore" | "plan">("select");

  const previewCategories = selected ? getCategoriesForIdentity(selected) : [];

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const categories = getCategoriesForIdentity(selected);
      await setIdentityAndCategories(selected, categories);
      setStep("explore");
    } catch (err) {
      console.error("Failed to save identity:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartTour = () => {
    localStorage.setItem("aurelo_tour_active", "true");
    localStorage.setItem("aurelo_demo_mode", "true");
    window.location.href = "/";
  };

  const handleStartFresh = () => {
    localStorage.setItem("aurelo_tour_active", "true");
    setStep("plan");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="px-8 py-6 flex items-center justify-between">
        <AureloWordmark className="h-[20px] w-auto text-foreground opacity-70" />
        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {["select", "confirm", "explore", "plan"].map((s, i) => {
            const stepIndex = ["select", "confirm", "explore", "plan"].indexOf(step);
            const isActive = i === stepIndex;
            const isComplete = i < stepIndex;
            return (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  isActive ? "w-6 bg-primary" : isComplete ? "w-3 bg-primary/40" : "w-3 bg-[var(--hairline)]"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <AnimatePresence>
            {step === "select" ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Heading */}
                <div className="text-center mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto mb-5">
                    <AureloIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h1
                    className="text-[26px] text-foreground mb-2"
                    style={{ fontWeight: 600, letterSpacing: "-0.015em" }}
                  >
                    What best describes your work?
                  </h1>
                  <p className="text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                    This helps Aurelo set up your workspace with relevant work categories. You can always customize
                    later.
                  </p>
                </div>

                {/* Identity grid */}
                <motion.div
                  className="grid grid-cols-2 gap-2.5 mb-8"
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                {IDENTITY_OPTIONS.map((option) => {
                    const Icon = IDENTITY_ICONS[option.value];
                    const isSelected = selected === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        variants={item}
                        onClick={() => setSelected(option.value)}
                        className={`relative text-left px-5 py-4 rounded-xl border-[1.5px] transition-all duration-200 group ${
                          isSelected
                            ? "bg-card border-primary/55 ring-2 ring-primary/15"
                            : "bg-card border-[var(--hairline)] hover:border-[var(--border-strong)] hover:bg-background"
                        }`}
                        style={{
                          boxShadow: isSelected ? "0 2px 8px rgba(94,161,191,0.08)" : "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                      >
                        {/* Selection check */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-3 right-3 w-5 h-5 rounded-circle bg-primary flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? "bg-primary/10" : "bg-[var(--accent)] group-hover:bg-[var(--secondary)]"
                            }`}
                          >
                            <Icon className={`w-[18px] h-[18px] ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`text-[14px] mb-0.5 ${isSelected ? "text-foreground" : "text-foreground"}`}
                              style={{ fontWeight: 600 }}
                            >
                              {option.label}
                            </div>
                            <div className="text-[12px] text-muted-foreground leading-snug">{option.emoji} {option.label}</div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {/* Continue button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => selected && setStep("confirm")}
                    disabled={!selected}
                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-primary text-white text-[14px] hover:bg-[color-mix(in_oklab,var(--primary)_92%,black)] active:bg-[color-mix(in_oklab,var(--primary)_84%,black)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ fontWeight: 500 }}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Skip */}
                <div className="text-center mt-4">
                  <button
                    onClick={() => {
                      localStorage.setItem("aurelo_tour_active", "true");
                      navigate("/", { replace: true });
                    }}
                    className="text-[13px] text-[var(--foreground-subtle)] hover:text-muted-foreground transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            ) : step === "confirm" ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Confirmation step — show categories */}
                <div className="text-center mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto mb-5">
                    {selected &&
                      (() => {
                        const Icon = IDENTITY_ICONS[selected];
                        return <Icon className="w-6 h-6 text-primary" />;
                      })()}
                  </div>
                  <h2 className="text-[22px] text-foreground mb-2" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                    Your {selected} workspace
                  </h2>
                  <p className="text-[14px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    We'll set up these default work categories for tracking your time. You can edit them anytime in
                    Settings.
                  </p>
                </div>

                {/* Category preview */}
                <div
                  className="bg-card rounded-xl border border-[var(--hairline)] p-6 mb-8"
                  style={{ boxShadow: "var(--elev-1)" }}
                >
                  <div className="text-[12px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-4" style={{ fontWeight: 600 }}>
                    Work categories
                  </div>
                  <motion.div className="flex flex-wrap gap-2" variants={container} initial="hidden" animate="show">
                    {previewCategories.map((cat) => (
                      <motion.div
                        key={cat.name}
                        variants={item}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[13px] ${
                          cat.billable
                            ? "bg-primary/[0.04] border-primary/20 text-foreground"
                            : "bg-[var(--surface-sunken)] border-[var(--hairline)] text-muted-foreground"
                        }`}
                        style={{ fontWeight: 500 }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${cat.billable ? "bg-primary" : "bg-[var(--foreground-subtle)]"}`} />
                        {cat.name}
                        {!cat.billable && (
                          <span className="text-[10px] text-[var(--foreground-subtle)] ml-0.5" style={{ fontWeight: 400 }}>
                            non-billable
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="mt-4 pt-3 border-t border-[var(--hairline)] flex items-center gap-2 text-[12px] text-[var(--foreground-subtle)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{previewCategories.filter((c) => c.billable).length} billable</span>
                    <span className="text-[var(--foreground-subtle)] mx-1">/</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-subtle)]" />
                    <span>{previewCategories.filter((c) => !c.billable).length} non-billable</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setStep("select")}
                    className="px-5 py-2.5 rounded-xl border border-[var(--hairline)] text-[14px] text-muted-foreground hover:text-foreground hover:bg-[var(--surface-sunken)] transition-all"
                    style={{ fontWeight: 500 }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={saving}
                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-primary text-white text-[14px] hover:bg-[color-mix(in_oklab,var(--primary)_92%,black)] active:bg-[color-mix(in_oklab,var(--primary)_84%,black)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ fontWeight: 500 }}
                  >
                    Set up workspace
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center mt-4">
                  <button
                    onClick={() => {
                      localStorage.setItem("aurelo_tour_active", "true");
                      navigate("/", { replace: true });
                    }}
                    className="text-[13px] text-[var(--foreground-subtle)] hover:text-muted-foreground transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            ) : step === "explore" ? (
              <motion.div
                key="explore"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Explore step */}
                <div className="text-center mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-[22px] text-foreground mb-2" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                    Want a quick tour?
                  </h2>
                  <p className="text-[14px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    We'll load a sample design studio with real-looking clients, projects, and time entries so you can
                    see Aurelo in action.
                  </p>
                </div>

                {/* Two option cards */}
                <div className="grid grid-cols-2 gap-3 mb-8 max-w-lg mx-auto">
                  {/* Take the tour */}
                  <button
                    onClick={handleStartTour}
                    className="relative text-left bg-card rounded-xl border-[1.5px] border-primary/40 p-5 hover:border-primary/60 hover:-translate-y-0.5 transition-all duration-200 group ring-2 ring-primary/[0.08]"
                    style={{ boxShadow: "var(--elev-1)" }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                      <Sparkles className="w-[18px] h-[18px] text-primary" />
                    </div>
                    <div className="text-[14px] text-foreground mb-1" style={{ fontWeight: 600 }}>
                      Explore with a guided tour
                    </div>
                    <div className="text-[12px] text-muted-foreground leading-snug">
                      Get a guided walkthrough of the workspace
                    </div>
                    <div
                      className="mt-3 inline-flex items-center gap-1 text-[12px] text-primary"
                      style={{ fontWeight: 500 }}
                    >
                      Recommended
                      <Check className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Start fresh */}
                  <button
                    onClick={handleStartFresh}
                    className="text-left bg-card rounded-xl border-[1.5px] border-[var(--hairline)] p-5 hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-all duration-200 group"
                    style={{ boxShadow: "var(--elev-1)" }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center mb-3 group-hover:bg-[var(--secondary)] transition-colors">
                      <ArrowRight className="w-[18px] h-[18px] text-muted-foreground" />
                    </div>
                    <div className="text-[14px] text-foreground mb-1" style={{ fontWeight: 600 }}>
                      Start with a clean slate
                    </div>
                    <div className="text-[12px] text-muted-foreground leading-snug">
                      Jump straight in and add your own clients and data
                    </div>
                    <div
                      className="mt-3 inline-flex items-center gap-1 text-[12px] text-[var(--foreground-subtle)]"
                      style={{ fontWeight: 500 }}
                    >
                      I know what I'm doing
                    </div>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <OnboardingPlanPicker onContinue={() => {
                  localStorage.setItem("aurelo_tour_active", "true");
                  navigate("/", { replace: true });
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
