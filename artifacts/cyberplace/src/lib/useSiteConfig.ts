import { useQuery } from "@tanstack/react-query";

export type SiteConfig = { telegramChannelUrl: string | null };

/**
 * Public, non-secret site settings (e.g. the official Telegram channel link).
 * Cached for the session so the footer and competition pages share one fetch.
 */
export function useSiteConfig() {
  const { data } = useQuery<SiteConfig>({
    queryKey: ["site-config"],
    queryFn: async () => {
      const r = await fetch("/api/config");
      if (!r.ok) throw new Error("config");
      return r.json() as Promise<SiteConfig>;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? { telegramChannelUrl: null };
}
