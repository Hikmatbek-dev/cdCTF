import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "node:path";
import { getLocalUploadsRoot } from "./lib/storage";
import router from "./routes";
import { logger } from "./lib/logger";
import { reportErrorToSentry } from "./lib/integrations";
import { CorsOriginError, corsOptions, createRateLimiter, securityHeaders } from "./middleware/security";

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
// "instance": this one guards this process against being hammered, and it sits
// in front of every request including static files — a shared counter here
// would mean a database write per asset. The limits that are actually security
// controls are on the auth routes, and those are shared.
app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 600, keyPrefix: "global", store: "instance" }));
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

// Unmatched API routes should answer JSON, not Express's default HTML page.
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl.split("?")[0]}` });
});

/**
 * An http-errors-style error that already knows its status and has a message
 * meant for the client. `expose` is the library's own signal for that — an
 * internal failure never sets it, so this cannot leak one.
 */
function isExposedClientError(err: unknown): err is { status: number; message: string } {
  return typeof err === "object" && err !== null
    && "expose" in err && err.expose === true
    && "status" in err && typeof err.status === "number"
    && err.status >= 400 && err.status < 500
    && "message" in err && typeof err.message === "string";
}

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // A rejected Origin is a policy decision, not a server fault — answering 500
  // here also meant every scanner hit burned a Sentry event.
  if (err instanceof CorsOriginError) {
    return res.status(403).json({ error: "Origin is not allowed" });
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      error: err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : err.message,
    });
  }

  if (typeof err === "object" && err !== null && "type" in err && err.type === "entity.too.large") {
    return res.status(413).json({ error: `Request body is too large. Limit is ${REQUEST_BODY_LIMIT}.` });
  }

  // body-parser and friends throw http-errors: a status, and `expose` meaning
  // "this message is safe to show the client". Malformed JSON is the common one
  // — it was answering 500 and reporting to Sentry, when it is simply a bad
  // request that no server change would fix.
  if (isExposedClientError(err)) {
    return res.status(err.status).json({ error: err.message });
  }

  logger.error({ err }, "Unhandled request error");
  void reportErrorToSentry(err, { route: req.originalUrl, method: req.method });
  res.status(500).json({ error: "Internal server error" });
});

export default app;
