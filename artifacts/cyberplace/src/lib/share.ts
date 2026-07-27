/**
 * Share links, in one place.
 *
 * Every network wants the URL in a different parameter and encodes it
 * differently; getting one of them subtly wrong produces a link that opens the
 * composer with an empty body, which nobody notices until a sponsor complains.
 */

/** Absolute URL for a same-site path, built from the live origin. */
export function absoluteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export function telegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/** LinkedIn's feed composer. For a credential, prefer the profile deep link. */
export function linkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/**
 * Copies text, falling back to a prompt. The Clipboard API is unavailable on
 * insecure origins and inside some in-app browsers (Telegram's own, notably) —
 * without the fallback the button would appear to do nothing at all.
 */
export async function copyText(value: string, fallbackLabel: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    window.prompt(fallbackLabel, value);
    return false;
  }
}
