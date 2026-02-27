import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import AureloLogo from "@/components/AureloLogo";
import { Palette, Code, Megaphone, Sparkles, Briefcase, Box, Building2 } from "lucide-react";

const identityTypes = [
  { id: "Designer", label: "Designer", icon: Palette },
  { id: "Developer", label: "Developer", icon: Code },
  { id: "Marketer", label: "Marketer", icon: Megaphone },
  { id: "Creative", label: "Creative", icon: Sparkles },
  { id: "Consultant", label: "Consultant", icon: Briefcase },
  { id: "Product", label: "Product", icon: Box },
  { id: "Agency", label: "Agency", icon: Building2 },
];

export default function Onboarding() {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selected) {
      navigate("/");
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

        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
          <Button size="sm" disabled={!selected} onClick={handleContinue}>
            Continue
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
