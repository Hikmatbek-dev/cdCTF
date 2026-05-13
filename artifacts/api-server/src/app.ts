import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "node:path";
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
app.use("/uploads", express.static(process.env.LOCAL_UPLOAD_DIR ? path.resolve(process.env.LOCAL_UPLOAD_DIR) : path.resolve(process.cwd(), "..", "..", "uploads")));

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
