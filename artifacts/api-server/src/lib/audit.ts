import type { Request } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db/schema";
import { logger } from "./logger";
import { sendTelegramLog, tgEscape } from "./telegram";

export async function writeAuditLog(
  req: Request,
  action: string,
  targetType: string,
  targetId?: string | number,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLogsTable).values({
      actorUserId: req.user?.userId ?? null,
      action,
      targetType,
      targetId: targetId === undefined ? null : String(targetId),
      metadata: metadata ?? null,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });
  } catch (err) {
    logger.warn({ err, action, targetType, targetId }, "Failed to write audit log");
  }

  // Mirror every recorded action to Telegram (if a bot is configured). Separate
  // from the DB write above so a Telegram hiccup never loses the audit row, and
  // vice-versa.
  const parts = [
    `🔔 <b>${tgEscape(action)}</b>`,
    `👤 actor: ${req.user?.userId ?? "—"}`,
    `🎯 ${tgEscape(targetType)}${targetId === undefined ? "" : " #" + tgEscape(targetId)}`,
  ];
  if (metadata && Object.keys(metadata).length > 0) {
    parts.push(`<code>${tgEscape(JSON.stringify(metadata)).slice(0, 500)}</code>`);
  }
  sendTelegramLog(parts.join("\n"));
}
