import { motion } from "motion/react";
import loginBg from "@/assets/login-bg.jpg";

export function AuthVisualPanel() {
  return (
    <div className="hidden lg:flex flex-1 relative overflow-hidden rounded-l-[24px]">
      <motion.img
        src={loginBg}
        alt=""
        initial={{ opacity: 0, scale: 1 }}
        animate={{
          opacity: 1,
          scale: [1, 1.08, 1],
          filter: ["blur(0px)", "blur(2px)", "blur(0px)"],
        }}
        transition={{
          opacity: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as const },
          scale: { duration: 20, repeat: Infinity, ease: "easeInOut" },
          filter: { duration: 20, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <motion.div
        className="absolute inset-0 mix-blend-soft-light"
        animate={{
          background: [
            "radial-gradient(ellipse at 20% 30%, rgba(94,161,191,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(94,161,191,0.3) 0%, transparent 50%)",
            "radial-gradient(ellipse at 60% 20%, rgba(120,190,220,0.5) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(70,140,170,0.4) 0%, transparent 50%)",
            "radial-gradient(ellipse at 40% 60%, rgba(94,161,191,0.5) 0%, transparent 50%), radial-gradient(ellipse at 75% 30%, rgba(80,150,180,0.35) 0%, transparent 50%)",
            "radial-gradient(ellipse at 20% 30%, rgba(94,161,191,0.6) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(94,161,191,0.3) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
