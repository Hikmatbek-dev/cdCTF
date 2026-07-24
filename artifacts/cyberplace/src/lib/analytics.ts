/**
 * Product analytics — how many people arrive, sign up, and start a lesson.
 *
 * You cannot run a marketing push blind; this is the instrument that tells you
 * whether it worked. Deliberately privacy-first and cookieless (Plausible /
 * self-hostable umami), so no consent banner is needed and it stays off unless
 * a domain is configured. Sentry (setupFrontendMonitoring) covers errors; this
 * covers behaviour.
 *
 * Enable by setting, in the Vercel env:
 *   VITE_PLAUSIBLE_DOMAIN   = cyberplace.uz
 *   VITE_PLAUSIBLE_SRC      = https://plausible.io/js/script.js   (optional; a
 *                             self-hosted umami/plausible URL also works)
 * With no domain set it does nothing, so it is safe to ship dark.
 */
export function setupAnalytics() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!domain) return;

  const src = (import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined)
    || "https://plausible.io/js/script.js";

  const s = document.createElement("script");
  s.defer = true;
  s.setAttribute("data-domain", domain);
  s.src = src;
  document.head.appendChild(s);
}

/**
 * Record a custom goal (a signup, a first lesson started, a flag captured), if
 * analytics is loaded. A no-op otherwise, so callers never need to guard.
 */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  const w = window as unknown as { plausible?: (e: string, o?: { props?: Record<string, unknown> }) => void };
  w.plausible?.(event, props ? { props } : undefined);
}
