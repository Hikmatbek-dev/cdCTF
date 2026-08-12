import { Router } from "express";
import { db } from "@workspace/db";
import { communityMessages } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Get latest messages
router.get("/", async (req, res) => {
  try {
    const messages = await db.query.communityMessages.findMany({
      where: eq(communityMessages.isDeleted, false),
      orderBy: [desc(communityMessages.createdAt)],
      limit: 100,
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

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: "Message content is required" });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: "Message too long" });
    }

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

export default router;
