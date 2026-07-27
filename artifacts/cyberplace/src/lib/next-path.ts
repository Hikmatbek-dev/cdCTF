/**
 * Carrying a destination through the login screen.
 *
 * Signing in used to always land on /ctf. So the strongest signal of learning
 * intent this platform has — someone read a whole lesson and pressed "I'm done,
 * take the test" — was answered by dropping them on the challenge grid, with
 * the lesson id thrown away. Measured result: 0 of 34 learners had ever
 * completed a lesson.
 *
 * A `next` parameter fixes it, and is also an open-redirect if taken at face
 * value: `?next=https://evil.example` would send a freshly authenticated user
 * off-site. Hence `safeNext` — same-site absolute paths only.
 */

/** Builds `/login?next=…` for a path the user should return to. */
export function loginWithNext(path: string): string {
  return `/login?next=${encodeURIComponent(path)}`;
}

/**
 * The destination to use after a successful sign-in, or null when there is
 * nothing safe to use.
 *
 * Accepts only a path on this site: it must start with a single `/`. `//host`
 * and `/\host` are protocol-relative URLs that browsers resolve to another
 * origin, so both are rejected, as is anything with a scheme.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  // A percent-encoded second slash gets past the checks above but is decoded by
  // the router, so normalise before deciding.
  try {
    value = decodeURI(value);
  } catch {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  // Never bounce back to the auth screens — that loops.
  if (/^\/(login|register|verify-email|reset-password|forgot-password)\b/.test(value)) return null;
  return value;
}

/** Reads `next` from the current query string, already validated. */
export function nextFromLocation(): string | null {
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}
