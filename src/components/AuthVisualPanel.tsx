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
          scale: [1, 1.06, 1],
          filter: ["blur(0px)", "blur(1.5px)", "blur(0px)"],
        }}
        transition={{
          opacity: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as const },
          scale: { duration: 35, repeat: Infinity, ease: "easeInOut" },
          filter: { duration: 35, repeat: Infinity, ease: "easeInOut" },
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
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Bottom gradient for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/60 via-black/25 to-transparent pointer-events-none" />

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-10 pb-12"
      >
        <h2
          className="text-[28px] text-white leading-tight mb-2"
          style={{ fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Freelance grows here.
        </h2>
        <p
          className="text-[15px] text-white/70 max-w-[320px]"
          style={{ fontWeight: 400 }}
        >
          Track time, manage clients, and see where your business is headed.
        </p>
      </motion.div>
    </div>
  );
}
