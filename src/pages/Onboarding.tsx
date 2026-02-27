import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import AureloLogo from "@/components/AureloLogo";
import { Palette, Code, Megaphone, Sparkles, Briefcase, Box, Building2, Camera } from "lucide-react";
import { useAuth } from "@/data/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { type IdentityType, getCategoriesForIdentity } from "@/data/identityPresets";

const identityTypes: { id: IdentityType; label: string; icon: any }[] = [
  { id: "designer", label: "Designer", icon: Palette },
  { id: "developer", label: "Developer", icon: Code },
  { id: "marketer", label: "Marketer", icon: Megaphone },
  { id: "copywriter", label: "Copywriter", icon: Sparkles },
  { id: "consultant", label: "Consultant", icon: Briefcase },
  { id: "photographer", label: "Photographer", icon: Camera },
  { id: "videographer", label: "Videographer", icon: Box },
  { id: "other", label: "Other", icon: Building2 },
];

export default function Onboarding() {
  const [selected, setSelected] = useState<IdentityType | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { workspaceId } = useAuth();

  const handleContinue = async () => {
    if (!selected || !workspaceId) return;
    setSaving(true);

    try {
      const categories = getCategoriesForIdentity(selected);

      // Save identity setting
      await supabase.from('workspace_settings').upsert(
        { workspace_id: workspaceId, section: 'identity', data: { type: selected } },
        { onConflict: 'workspace_id,section' }
      );

      // Save categories
      await supabase.from('workspace_settings').upsert(
        { workspace_id: workspaceId, section: 'categories', data: categories as any },
        { onConflict: 'workspace_id,section' }
      );

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Failed to save identity:", err);
      // Navigate anyway — non-fatal
      navigate("/", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="w-full max-w-lg space-y-8"
      >
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <AureloLogo />
          </div>
          <h1 className="text-xl font-semibold text-foreground">What kind of work do you do?</h1>
          <p className="text-sm text-muted-foreground">This helps us set up the right categories for your workflow.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {identityTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={`card-surface p-4 text-center space-y-2 transition-all ${
                selected === type.id
                  ? "ring-2 ring-primary border-primary"
                  : "hover:-translate-y-0.5"
              }`}
            >
              <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl ${
                selected === type.id ? "bg-primary/10" : "bg-accent"
              }`}>
                <type.icon className={`h-5 w-5 ${selected === type.id ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className="text-sm font-medium text-foreground">{type.label}</p>
            </button>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-center">
          <button
            disabled={!selected || saving}
            onClick={handleContinue}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[14px] rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ fontWeight: 500 }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
