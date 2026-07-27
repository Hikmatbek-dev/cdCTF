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

/**
 * How long a stagger may run in total.
 *
 * These wrappers are used per card, with `delay={i * 0.05}`. At 24 challenges a
 * page that made the last card wait 1.15s after it came into view — a grid that
 * assembles itself in front of the reader. The delay is clamped so a long list
 * finishes in the same time a short one does.
 */
const MAX_STAGGER = 0.3;

/**
 * Reveal-on-scroll, written so it can never hide content.
 *
 * `initial: { opacity: 0 }` plus `whileInView` means the element is invisible
 * until an IntersectionObserver fires. When it does not — a browser that
 * throttles observers in a background/in-app webview, a headless render, an
 * observer that misses because the element was laid out mid-scroll — the
 * content stays in the DOM at zero opacity and the page looks empty. That was
 * observed on the live challenge grid: every challenge present in the markup,
 * nothing on the screen.
 *
 * So the animation runs on mount instead of on intersection. Everything is
 * visible by the time it can matter, the effect is unchanged for the reader who
 * sees it, and there is no state in which content exists but cannot be seen.
 * `prefers-reduced-motion` skips it entirely — Framer reads the media query.
 */
export function FadeIn({ children, delay = 0, duration = 0.5 }: { children: ReactNode, delay?: number, duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay: Math.min(delay, MAX_STAGGER) }}
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
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: Math.min(delay, MAX_STAGGER),
        ease: "easeOut",
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
