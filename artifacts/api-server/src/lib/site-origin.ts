import type { Request } from "express";

/**
 * The origin this response should advertise itself under.
 *
 * Everything public — canonical links, Open Graph URLs, og:image, the sitemap —
 * used to hardcode `https://cdctf.uz`. That domain is not connected yet, so
 * every one of those links pointed at a host that answers nothing: search
 * engines were handed a sitemap of dead URLs, and a shared link's preview image
 * and click-through both went nowhere.
 *
 * Hardcoding the working host instead would only move the problem — the day
 * cdctf.uz is connected, every link would still say vercel.app. So the origin
 * is read from the request, and the whole thing becomes correct on both hosts
 * without a redeploy.
 *
 * The Host header is attacker-controlled, and a canonical or og:url built from
 * it is a cache-poisoning primitive. Hence the allowlist: an unrecognised Host
 * falls back to the brand domain rather than being echoed.
 */
const FALLBACK = "https://cdctf.uz";

/** Hosts we will mirror back. Anything else is treated as spoofed. */
function isTrustedHost(host: string): boolean {
  const bare = host.toLowerCase().split(":")[0];
  if (bare === "cdctf.uz" || bare === "www.cdctf.uz") return true;
  // Every deployment of this project, including preview URLs, so a preview
  // shares its own links rather than production's.
  if (bare.endsWith(".vercel.app")) return true;
  if (bare === "localhost" || bare === "127.0.0.1") return true;
  return false;
}

export function siteOrigin(req: Request): string {
  // An explicit setting always wins — it is the escape hatch for a custom
  // domain that is not in the list above.
  const configured = process.env.PUBLIC_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const host = req.get("host") ?? "";
  if (!isTrustedHost(host)) return FALLBACK;

  // Vercel terminates TLS, so req.protocol is http here; x-forwarded-proto is
  // what the client actually used.
  const forwarded = String(req.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const proto = forwarded || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}
