import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db/schema";
import { inArray, sql } from "drizzle-orm";
import { logger } from "./logger";

const TOKEN_KEY = "telegram_bot_token";
const CHAT_KEY = "telegram_chat_id";

// A short in-memory cache so a burst of audit events does not read app_settings
// once per event. Per serverless instance, which is fine — a stale token for a
// few seconds after a change is harmless.
let cache: { token: string | null; chatId: string | null; at: number } | null = null;
const CACHE_MS = 30_000;

export async function getTelegramConfig(): Promise<{ token: string | null; chatId: string | null }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return { token: cache.token, chatId: cache.chatId };
  try {
    const rows = await db.select().from(appSettingsTable).where(inArray(appSettingsTable.key, [TOKEN_KEY, CHAT_KEY]));
    const map = new Map(rows.map(r => [r.key, r.value]));
    const conf = { token: map.get(TOKEN_KEY) ?? null, chatId: map.get(CHAT_KEY) ?? null };
    cache = { ...conf, at: Date.now() };
    return conf;
  } catch (err) {
    logger.warn({ err }, "getTelegramConfig failed");
    return { token: null, chatId: null };
  }
}

/** Persist a setting, or clear it when value is null. Busts the cache. */
async function putSetting(key: string, value: string | null): Promise<void> {
  await db.insert(appSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: sql`now()` } });
  cache = null;
}

export async function setTelegramToken(token: string | null): Promise<void> {
  await putSetting(TOKEN_KEY, token && token.trim() ? token.trim() : null);
}

export async function setTelegramChatId(chatId: string | null): Promise<void> {
  await putSetting(CHAT_KEY, chatId && chatId.trim() ? chatId.trim() : null);
}

/**
 * Sends one message to the configured Telegram chat. Returns a result rather
 * than throwing, so callers can surface a real error (the settings test) or
 * ignore it (the log firehose). Never throws.
 */
export async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const { token, chatId } = await getTelegramConfig();
  if (!token || !chatId) return { ok: false, error: "not_configured" };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `telegram ${response.status} ${body.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fire-and-forget log line to Telegram. Never blocks the request and never
 * throws into it — a broken or unset bot must not affect the action being
 * logged. Silent when no bot is configured.
 */
export function sendTelegramLog(text: string): void {
  void sendTelegram(text).then(res => {
    if (!res.ok && res.error !== "not_configured") logger.warn({ error: res.error }, "telegram log failed");
  });
}

/** Escapes the characters that would break HTML parse_mode. */
export function tgEscape(value: string | number): string {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
