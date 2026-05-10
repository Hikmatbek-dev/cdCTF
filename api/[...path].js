let readyPromise = null;
let serverlessPromise = null;

function loadServerless() {
  if (!serverlessPromise) {
    serverlessPromise = import("../artifacts/api-server/dist/serverless.mjs");
  }
  return serverlessPromise;
}

async function ensureReady() {
  const { ensureDatabaseShape } = await loadServerless();
  if (!readyPromise) {
    readyPromise = ensureDatabaseShape();
  }
  return readyPromise;
}

export default async function handler(req, res) {
  try {
    await ensureReady();
    const { app } = await loadServerless();
    return app(req, res);
  } catch (err) {
    const { logger, reportErrorToSentry } = await loadServerless();
    logger.error({ err }, "Vercel function initialization failed");
    void reportErrorToSentry(err, { type: "vercelFunctionInitialization" });
    return res.status(500).json({ error: "Internal server error" });
  }
}
