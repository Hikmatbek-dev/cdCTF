import { Router } from "express";
import { db } from "@workspace/db";
import { communityMessages } from "@workspace/db/schema";
import { eq, desc, and, lt } from "drizzle-orm";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// In-memory rate limiting map: userId -> lastMessageTimestamp
const rateLimits = new Map<number, number>();
const RATE_LIMIT_MS = 3000; // 3 seconds

// Get latest messages (supports pagination)
router.get("/", async (req, res) => {
  try {
    const beforeId = req.query.beforeId ? parseInt(req.query.beforeId as string) : undefined;
    
    let whereClause = eq(communityMessages.isDeleted, false);
    if (beforeId && !isNaN(beforeId)) {
      whereClause = and(eq(communityMessages.isDeleted, false), lt(communityMessages.id, beforeId)) as any;
    }

    const limitParam = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const limit = isNaN(limitParam) ? 50 : Math.min(limitParam, 500);

    const messages = await db.query.communityMessages.findMany({
      where: whereClause,
      orderBy: [desc(communityMessages.id)],
      limit: limit,
      with: {
        user: {
          columns: {
            id: true,
            nickname: true,
            avatarUrl: true,
            role: true,
            points: true
          }
        }
      }
    });
    
    // Return them in ascending order for the chat window (oldest first at top, newest at bottom)
    res.json(messages.reverse());
  } catch (error) {
    console.error("Failed to fetch chat messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Post a new message
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user!.userId;

    // Rate Limiting check
    const now = Date.now();
    const lastMsgTime = rateLimits.get(userId);
    if (lastMsgTime && now - lastMsgTime < RATE_LIMIT_MS) {
      const waitSecs = Math.ceil((RATE_LIMIT_MS - (now - lastMsgTime)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSecs}s before sending another message.` });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: "Message too long" });
    }

    rateLimits.set(userId, now);

    const [newMessage] = await db
      .insert(communityMessages)
      .values({
        userId,
        content: content.trim(),
      })
      .returning();

    // Fetch the inserted message with user relations
    const messageWithUser = await db.query.communityMessages.findFirst({
      where: eq(communityMessages.id, newMessage.id),
      with: {
        user: {
          columns: {
            id: true,
            nickname: true,
            avatarUrl: true,
            role: true,
            points: true
          }
        }
      }
    });

    res.status(201).json(messageWithUser);
  } catch (error) {
    console.error("Failed to post message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a message (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id as string, 10);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: "Invalid message ID" });
    }

    await db.update(communityMessages)
      .set({ isDeleted: true })
      .where(eq(communityMessages.id, messageId));

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
