import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function ensureDatabaseShape() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id serial PRIMARY KEY,
      actor_user_id integer REFERENCES users(id),
      action text NOT NULL,
      target_type text NOT NULL,
      target_id text,
      metadata jsonb,
      ip_address text,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ctf_files (
      id serial PRIMARY KEY,
      filename text NOT NULL,
      content_type text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS invite_code text");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS competitions_invite_code_idx ON competitions(invite_code) WHERE invite_code IS NOT NULL");

  logger.info("Database shape verified");
}
