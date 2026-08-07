import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * A tiny key-value store for runtime settings a super-admin sets from the panel
 * rather than from the environment — the Telegram bot token and chat id for log
 * forwarding live here. Secrets in this table (the bot token) are never returned
 * to the client in full; the API reports only whether one is set.
 */
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
