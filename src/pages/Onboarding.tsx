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
} from "lucide-react";
import { useData } from "../data/DataContext";
import { AureloIcon } from "../components/AureloIcon";
import { AureloWordmark } from "../components/AureloWordmark";
import { seedDemoData } from "../data/settingsApi";
import { type IdentityType, IDENTITY_OPTIONS, getCategoriesForIdentity } from "../data/identityPresets";

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
  const [seeding, setSeeding] = useState(false);
  const [step, setStep] = useState<"select" | "confirm" | "explore">("select");

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

  const handleStartTour = async () => {
    setSeeding(true);
    try {
      await seedDemoData();
      localStorage.setItem("aurelo_tour_active", "true");
      localStorage.setItem("aurelo_demo_mode", "true");
      // Force a full navigation to ensure DataContext reloads with seeded data
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to seed demo data:", err);
      // Still start the tour even if seeding fails
      localStorage.setItem("aurelo_tour_active", "true");
      localStorage.setItem("aurelo_demo_mode", "true");
      window.location.href = "/";
    }
  };

  const handleStartFresh = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      {/* Top bar */}
      <div className="px-8 py-6 flex items-center justify-between">
        <AureloWordmark className="h-[20px] w-auto text-foreground opacity-70" />
        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {["select", "confirm", "explore"].map((s, i) => {
            const stepIndex = ["select", "confirm", "explore"].indexOf(step);
            const isActive = i === stepIndex;
            const isComplete = i < stepIndex;
            return (
              <div
                key={s}
                className={`h-1 rounded-full transition-all duration-300 ${
                  isActive ? "w-6 bg-[#5ea1bf]" : isComplete ? "w-3 bg-[#5ea1bf]/40" : "w-3 bg-black/[0.06]"
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
          <AnimatePresence mode="wait">
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
                  <div className="w-12 h-12 rounded-2xl bg-[#5ea1bf]/8 flex items-center justify-center mx-auto mb-5">
                    <AureloIcon className="w-6 h-6 text-[#5ea1bf]" />
                  </div>
                  <h1
                    className="text-[26px] text-[#1c1c1c] mb-2"
                    style={{ fontWeight: 600, letterSpacing: "-0.015em" }}
                  >
                    What best describes your work?
                  </h1>
                  <p className="text-[15px] text-[#78716c] max-w-md mx-auto leading-relaxed">
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
                            ? "bg-white border-[#5ea1bf]/40 ring-2 ring-[#5ea1bf]/10"
                            : "bg-white border-black/[0.06] hover:border-black/[0.12] hover:bg-[#fafaf9]"
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
                              className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#5ea1bf] flex items-center justify-center"
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? "bg-[#5ea1bf]/10" : "bg-stone-100 group-hover:bg-stone-200/70"
                            }`}
                          >
                            <Icon className={`w-[18px] h-[18px] ${isSelected ? "text-[#5ea1bf]" : "text-stone-500"}`} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`text-[14px] mb-0.5 ${isSelected ? "text-[#1c1c1c]" : "text-[#1c1c1c]"}`}
                              style={{ fontWeight: 600 }}
                            >
                              {option.label}
                            </div>
                            <div className="text-[12px] text-[#78716c] leading-snug">{option.emoji} {option.label}</div>
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
                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#5ea1bf] text-white text-[14px] hover:bg-[#4d8fad] active:bg-[#437d99] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ fontWeight: 500 }}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Skip */}
                <div className="text-center mt-4">
                  <button
                    onClick={() => navigate("/", { replace: true })}
                    className="text-[13px] text-[#a8a29e] hover:text-[#78716c] transition-colors"
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
                  <div className="w-12 h-12 rounded-2xl bg-[#5ea1bf]/8 flex items-center justify-center mx-auto mb-5">
                    {selected &&
                      (() => {
                        const Icon = IDENTITY_ICONS[selected];
                        return <Icon className="w-6 h-6 text-[#5ea1bf]" />;
                      })()}
                  </div>
                  <h2 className="text-[22px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                    Your {selected} workspace
                  </h2>
                  <p className="text-[14px] text-[#78716c] max-w-sm mx-auto leading-relaxed">
                    We'll set up these default work categories for tracking your time. You can edit them anytime in
                    Settings.
                  </p>
                </div>

                {/* Category preview */}
                <div
                  className="bg-white rounded-xl border border-black/[0.06] p-6 mb-8"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
                >
                  <div className="text-[12px] text-[#a8a29e] uppercase tracking-wider mb-4" style={{ fontWeight: 600 }}>
                    Work categories
                  </div>
                  <motion.div className="flex flex-wrap gap-2" variants={container} initial="hidden" animate="show">
                    {previewCategories.map((cat) => (
                      <motion.div
                        key={cat.name}
                        variants={item}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[13px] ${
                          cat.billable
                            ? "bg-[#5ea1bf]/[0.04] border-[#5ea1bf]/15 text-[#1c1c1c]"
                            : "bg-stone-50 border-stone-200/60 text-stone-500"
                        }`}
                        style={{ fontWeight: 500 }}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${cat.billable ? "bg-[#5ea1bf]" : "bg-stone-400"}`} />
                        {cat.name}
                        {!cat.billable && (
                          <span className="text-[10px] text-stone-400 ml-0.5" style={{ fontWeight: 400 }}>
                            non-billable
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center gap-2 text-[12px] text-[#a8a29e]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5ea1bf]" />
                    <span>{previewCategories.filter((c) => c.billable).length} billable</span>
                    <span className="text-stone-300 mx-1">/</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    <span>{previewCategories.filter((c) => !c.billable).length} non-billable</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setStep("select")}
                    className="px-5 py-2.5 rounded-xl border border-black/[0.08] text-[14px] text-[#78716c] hover:text-[#1c1c1c] hover:bg-stone-50 transition-all"
                    style={{ fontWeight: 500 }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={saving}
                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#5ea1bf] text-white text-[14px] hover:bg-[#4d8fad] active:bg-[#437d99] disabled:opacity-60 transition-all duration-200"
                    style={{ fontWeight: 500 }}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Set up workspace
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center mt-4">
                  <button
                    onClick={() => navigate("/", { replace: true })}
                    className="text-[13px] text-[#a8a29e] hover:text-[#78716c] transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="explore"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                {/* Explore step */}
                <div className="text-center mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#5ea1bf]/8 flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="w-6 h-6 text-[#5ea1bf]" />
                  </div>
                  <h2 className="text-[22px] text-[#1c1c1c] mb-2" style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                    Want a quick tour?
                  </h2>
                  <p className="text-[14px] text-[#78716c] max-w-sm mx-auto leading-relaxed">
                    We'll load a sample design studio with real-looking clients, projects, and time entries so you can
                    see Aurelo in action.
                  </p>
                </div>

                {/* Two option cards */}
                <div className="grid grid-cols-2 gap-3 mb-8 max-w-lg mx-auto">
                  {/* Take the tour */}
                  <button
                    onClick={handleStartTour}
                    disabled={seeding}
                    className="relative text-left bg-white rounded-xl border-[1.5px] border-[#5ea1bf]/30 p-5 hover:border-[#5ea1bf]/50 hover:-translate-y-0.5 transition-all duration-200 group ring-2 ring-[#5ea1bf]/8"
                    style={{ boxShadow: "0 2px 8px rgba(94,161,191,0.08)" }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#5ea1bf]/10 flex items-center justify-center mb-3 group-hover:bg-[#5ea1bf]/15 transition-colors">
                      <Sparkles className="w-[18px] h-[18px] text-[#5ea1bf]" />
                    </div>
                    <div className="text-[14px] text-[#1c1c1c] mb-1" style={{ fontWeight: 600 }}>
                      {seeding ? "Loading..." : "Explore with demo data"}
                    </div>
                    <div className="text-[12px] text-[#78716c] leading-snug">
                      See a fully loaded workspace with a guided walkthrough
                    </div>
                    {seeding && (
                      <div className="absolute top-4 right-4">
                        <Loader2 className="w-4 h-4 animate-spin text-[#5ea1bf]" />
                      </div>
                    )}
                    <div
                      className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#5ea1bf]"
                      style={{ fontWeight: 500 }}
                    >
                      Recommended
                      <Check className="w-3 h-3" />
                    </div>
                  </button>

                  {/* Start fresh */}
                  <button
                    onClick={handleStartFresh}
                    className="text-left bg-white rounded-xl border-[1.5px] border-black/[0.06] p-5 hover:border-black/[0.12] hover:-translate-y-0.5 transition-all duration-200 group"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center mb-3 group-hover:bg-stone-200/70 transition-colors">
                      <ArrowRight className="w-[18px] h-[18px] text-stone-500" />
                    </div>
                    <div className="text-[14px] text-[#1c1c1c] mb-1" style={{ fontWeight: 600 }}>
                      Start with a clean slate
                    </div>
                    <div className="text-[12px] text-[#78716c] leading-snug">
                      Jump straight in and add your own clients and data
                    </div>
                    <div
                      className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#a8a29e]"
                      style={{ fontWeight: 500 }}
                    >
                      I know what I'm doing
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
