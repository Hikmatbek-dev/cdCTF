import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "node:path";
import { getLocalUploadsRoot } from "./lib/storage";
import router from "./routes";
import { logger } from "./lib/logger";
import { reportErrorToSentry } from "./lib/integrations";
import { corsOptions, createRateLimiter, securityHeaders } from "./middleware/security";

const app: Express = express();
const REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || "10mb";
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    logger.info(
      {
        req: {
          method: req.method,
          url: req.originalUrl.split("?")[0],
        },
        res: {
          statusCode: res.statusCode,
        },
        responseTime: Date.now() - start,
      },
      "request completed",
    );
  });

  next();
});
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 600, keyPrefix: "global" }));
app.use(cookieParser());
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));
app.use("/uploads", express.static(getLocalUploadsRoot()));

// Fallback for missing files in /uploads/ - try to find them in the database
app.get("/uploads/ctf/:filename", async (req, res, next) => {
  try {
    const filenameWithUuid = req.params.filename;
    // The old format was UUID-filename. Extact the filename part.
    const originalFilename = filenameWithUuid.replace(/^[0-9a-f-]{36}-/, "");

    const { pool } = await import("@workspace/db");
    const result = await pool.query(
      "SELECT content_type, content FROM ctf_files WHERE filename = $1 ORDER BY created_at DESC LIMIT 1",
      [originalFilename]
    );

    if (result.rowCount && result.rowCount > 0) {
      const { content_type, content } = result.rows[0];
      const buffer = Buffer.from(content, "base64");
      res.setHeader("Content-Type", content_type);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(originalFilename)}"`);
      return res.send(buffer);
    }
  } catch (e) {
    logger.error({ err: e }, "Upload fallback error");
  }
  next();
});

app.use("/api", router);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      error: err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : err.message,
    });
  }

  if (typeof err === "object" && err !== null && "type" in err && err.type === "entity.too.large") {
    return res.status(413).json({ error: `Request body is too large. Limit is ${REQUEST_BODY_LIMIT}.` });
  }

  logger.error({ err }, "Unhandled request error");
  void reportErrorToSentry(err, { route: req.originalUrl, method: req.method });
  res.status(500).json({ error: "Internal server error" });
});

export default app;
