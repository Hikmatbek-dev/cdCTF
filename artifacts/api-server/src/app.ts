import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";
import { reportErrorToSentry } from "./lib/integrations";
import { corsOptions, createRateLimiter, securityHeaders } from "./middleware/security";

const app: Express = express();
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
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled request error");
  void reportErrorToSentry(err, { route: req.originalUrl, method: req.method });
  res.status(500).json({ error: "Internal server error" });
});

export default app;
