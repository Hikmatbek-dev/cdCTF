import { Router, type IRouter } from "express";
import { getTelegramChannelUrl } from "../lib/telegram";

const router: IRouter = Router();

// GET /api/config — public, non-secret site settings the client renders
// everywhere (e.g. the official Telegram channel link in the footer).
router.get("/", async (_req, res) => {
  const telegramChannelUrl = await getTelegramChannelUrl();
  res.json({ telegramChannelUrl });
});

export default router;
