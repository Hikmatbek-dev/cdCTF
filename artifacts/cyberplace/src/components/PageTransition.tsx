import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      // No `will-change: transform` here. It creates a containing block for
      // `position: fixed` descendants exactly as a real transform does, so every
      // page that paints a `fixed inset-0` backdrop had that backdrop anchored
      // to this wrapper instead of the viewport. Framer Motion already sets
      // will-change for the duration of the animation and clears it after,
      // which is what we want; pinning it permanently only leaves the side
      // effect behind once the animation is over.
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, duration = 0.5 }: { children: ReactNode, delay?: number, duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration, delay }}
      style={{ willChange: "opacity" }}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0 }: { children: ReactNode, delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: "easeOut" 
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
