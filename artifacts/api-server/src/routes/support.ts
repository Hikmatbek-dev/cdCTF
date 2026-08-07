import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { optionalAuth } from "../middleware/auth";
import { createRateLimiter } from "../middleware/security";
import { sendTelegramLog, tgEscape } from "../lib/telegram";

const router: IRouter = Router();

// Anyone can file a report, so it is rate-limited by IP to keep it from being a
// spam vector — a handful a minute is plenty for a real person.
const supportRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 5, keyPrefix: "support", store: "shared" });

const CATEGORIES = new Set(["bug", "question", "suggestion", "other"]);

// POST /api/support — file a bug report or support request.
router.post("/", optionalAuth, supportRateLimit, async (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  if (message.length < 5) return res.status(400).json({ error: "Please describe the problem (at least 5 characters)" });
  if (message.length > 4000) return res.status(400).json({ error: "Message is too long" });

  const category = CATEGORIES.has(String(req.body?.category)) ? String(req.body.category) : "bug";
  const email = String(req.body?.email ?? "").trim().slice(0, 200) || null;
  const pageUrl = String(req.body?.pageUrl ?? "").trim().slice(0, 500) || null;
  const userId = req.user?.userId ?? null;

  // The reporter's nickname, for the notification (the id alone is not helpful in
  // a Telegram message).
  let who = "anonymous";
  if (userId) {
    const [u] = await db.select({ nickname: usersTable.nickname }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (u) who = u.nickname;
  }

  const [ticket] = await db.insert(supportTicketsTable)
    .values({ userId, email, category, message, pageUrl })
    .returning({ id: supportTicketsTable.id });

  sendTelegramLog([
    `🆘 <b>Support: ${tgEscape(category)}</b> (#${ticket.id})`,
    `👤 ${tgEscape(who)}${email ? " · " + tgEscape(email) : ""}`,
    pageUrl ? `🔗 ${tgEscape(pageUrl)}` : "",
    `💬 ${tgEscape(message).slice(0, 800)}`,
  ].filter(Boolean).join("\n"));

  res.status(201).json({ ok: true, id: ticket.id });
});

export default router;
