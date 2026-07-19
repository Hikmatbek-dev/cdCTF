import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Validates a request body against a schema generated from the OpenAPI spec.
 *
 * The point is not to save the handwritten checks a few lines — it is that the
 * spec, the generated client and the server stop being able to disagree. They
 * had: the spec said a password needed 6 characters while the server demanded
 * 10 and four character classes, and nothing noticed for months.
 *
 * `req.body` is replaced with the parsed value, so a handler reads what passed
 * validation rather than what arrived.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: firstIssue(result.error) });
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return res.status(400).json({ error: firstIssue(result.error) });
    // req.query is a getter on Express 5 — assigning to it throws. Handlers read
    // the validated copy from res.locals instead.
    res.locals.query = result.data;
    next();
  };
}

/**
 * One readable message, not the whole issue tree.
 *
 * Clients here render `error` as-is, and every existing handler answers
 * `{ error: "..." }`. Returning a different shape from validated routes would
 * mean the UI shows nothing useful on exactly the routes that validate best.
 */
function firstIssue(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}
