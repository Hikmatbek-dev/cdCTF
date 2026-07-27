let readyPromise = null;
let serverlessPromise = null;

function loadServerless() {
  if (!serverlessPromise) {
    serverlessPromise = import("../artifacts/api-server/dist/serverless.mjs");
  }
  return serverlessPromise;
}

export default async function handler(req, res) {
  try {
    const { app, ensureDatabaseShape } = await loadServerless();
    if (!readyPromise) {
      // Cleared on failure. A rejected promise is still a promise, so caching
      // one meant every later request on this container awaited the same
      // rejection — one transient database blip and the instance answered 500
      // for the rest of its life instead of retrying.
      readyPromise = ensureDatabaseShape().catch(err => {
        readyPromise = null;
        throw err;
      });
    }
    await readyPromise;
    return app(req, res);
  } catch (err) {
    console.error("Vercel function initialization failed:", err);
    try {
      const { logger, reportErrorToSentry } = await loadServerless();
      logger.error({ err }, "Vercel function initialization failed");
      void reportErrorToSentry(err, { type: "vercelFunctionInitialization" });
    } catch (loggingErr) {
      console.error("Critical: Logging failed too:", loggingErr);
    }
    // No `details`: this used to return err.message to the client, which for an
    // initialization failure is a database error naming hosts, missing env vars
    // and module paths. The request-path handler in app.ts already returns a
    // bare message; this was the one exception.
    return res.status(500).json({ error: "Internal server error" });
  }
}
