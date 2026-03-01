import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronRight,
  X,
  Building,
  Palette,
  DollarSign,
  Users,
  Sparkles,
} from "lucide-react";
import { useData } from "../data/DataContext";

interface SetupStep {
  id: string;
  label: string;
  description: string;
  icon: typeof Building;
  done: boolean;
  action: () => void;
}

export function SetupChecklist() {
  const navigate = useNavigate();
  const { identity, clients, initSettings, initLogos } = useData();

  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("aurelo_setup_dismissed") === "true";
  });

  const steps = useMemo<SetupStep[]>(() => {
    const wsName = initSettings?.workspace?.name || initSettings?.workspace?.workspaceName;
    const hasLogo = !!initLogos?.app?.url;
    const hasFinancial = !!initSettings?.financial?.currency;
    const hasIdentity = !!identity;
    const hasClient = clients.length > 0;

    return [
      {
        id: "workspace",
        label: "Name your workspace",
        description: "Set a name & website for your studio",
        icon: Building,
        done: !!wsName,
        action: () => navigate("/settings?tab=workspace"),
      },
      {
        id: "identity",
        label: "Choose your identity",
        description: "Customize work categories for your role",
        icon: Sparkles,
        done: hasIdentity,
        action: () => navigate("/settings?tab=workspace"),
      },
      {
        id: "branding",
        label: "Upload your logo",
        description: "Brand your workspace and client portals",
        icon: Palette,
        done: hasLogo,
        action: () => navigate("/settings?tab=workspace"),
      },
      {
        id: "financial",
        label: "Set financial defaults",
        description: "Configure tax rate, currency & weekly target",
        icon: DollarSign,
        done: hasFinancial,
        action: () => navigate("/settings?tab=financial"),
      },
      {
        id: "client",
        label: "Add your first client",
        description: "Start tracking time and earning revenue",
        icon: Users,
        done: hasClient,
        action: () => navigate("/clients"),
      },
    ];
  }, [initSettings, initLogos, identity, clients, navigate]);

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  // Don't show if dismissed or all done
  if (dismissed || allDone) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("aurelo_setup_dismissed", "true");
  };

  // Find first incomplete step for the nudge
  const nextStep = steps.find((s) => !s.done);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="bg-card border border-border rounded-xl overflow-hidden mb-6"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>
              Finish setting up your workspace
            </div>
            <div className="text-[12px] text-muted-foreground">
              {completedCount} of {steps.length} steps complete
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/50 transition-colors flex-shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="h-1.5 bg-accent rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="px-3 pb-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={step.action}
              disabled={step.done}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                step.done
                  ? "opacity-50 cursor-default"
                  : "hover:bg-accent/50 cursor-pointer"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  step.done
                    ? "bg-primary/15"
                    : "border border-border group-hover:border-primary/30"
                }`}
              >
                {step.done ? (
                  <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
                ) : (
                  <Icon className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13px] ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                  style={{ fontWeight: 500 }}
                >
                  {step.label}
                </div>
                {!step.done && (
                  <div className="text-[11px] text-muted-foreground/70 leading-snug">
                    {step.description}
                  </div>
                )}
              </div>
              {!step.done && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
