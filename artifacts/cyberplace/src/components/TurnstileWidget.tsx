import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
        theme?: "light" | "dark" | "auto";
      }) => string;
      remove?: (widgetId: string) => void;
      reset?: (widgetId: string) => void;
    };
  }
}

type Props = {
  onTokenChange: (token: string) => void;
  onError?: () => void;
  onReadyChange?: (ready: boolean) => void;
};

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function ensureTurnstileScript() {
  const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    if (window.turnstile) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true });
    });
  }

  const script = document.createElement("script");
  script.id = TURNSTILE_SCRIPT_ID;
  script.src = TURNSTILE_SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);

  return new Promise<void>((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true });
  });
}

export function TurnstileWidget({ onTokenChange, onError, onReadyChange }: Props) {
  const containerId = useId().replace(/:/g, "");
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const [scriptReady, setScriptReady] = useState(Boolean(window.turnstile));

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    void ensureTurnstileScript()
      .then(() => {
        if (cancelled) return;
        setScriptReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        onError?.();
      });

    return () => {
      cancelled = true;
    };
  }, [onError, siteKey]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(document.getElementById(containerId) as HTMLElement, {
      sitekey: siteKey,
      theme: "auto",
      callback: (token) => {
        onReadyChange?.(true);
        onTokenChange(token);
      },
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => {
        onReadyChange?.(false);
        onTokenChange("");
        onError?.();
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [containerId, onError, onReadyChange, onTokenChange, scriptReady, siteKey]);

  if (!siteKey) return null;

  return <div id={containerId} className="min-h-16" />;
}
