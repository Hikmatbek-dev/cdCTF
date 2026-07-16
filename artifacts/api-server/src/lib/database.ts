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

  await pool.query("ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS file_id integer REFERENCES ctf_files(id)");
  await pool.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS invite_code text");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS competitions_invite_code_idx ON competitions(invite_code) WHERE invite_code IS NOT NULL");
  
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token text");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamptz");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_id text NOT NULL UNIQUE,
      ip_address text,
      user_agent text,
      device_label text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      revoked_reason text
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions(expires_at)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_history (
      id serial PRIMARY KEY,
      user_id integer REFERENCES users(id) ON DELETE SET NULL,
      identifier text NOT NULL,
      ip_address text,
      user_agent text,
      device_label text,
      success boolean NOT NULL,
      failure_reason text,
      suspicious boolean NOT NULL DEFAULT false,
      suspicious_reasons text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS login_history_user_id_created_at_idx ON login_history(user_id, created_at)");
  await pool.query("CREATE INDEX IF NOT EXISTS login_history_ip_address_idx ON login_history(ip_address)");

  // Authorship and draft state. `DEFAULT true` deliberately backfills every
  // existing challenge and lesson as published so they stay visible.
  await pool.query("ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS author_id integer REFERENCES users(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true");
  await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS author_id integer REFERENCES users(id) ON DELETE SET NULL");
  await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true");
  await pool.query("CREATE INDEX IF NOT EXISTS ctf_tasks_author_id_idx ON ctf_tasks(author_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS lessons_author_id_idx ON lessons(author_id)");

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret text");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_used_step integer");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_backup_codes (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash text NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS user_backup_codes_user_id_idx ON user_backup_codes(user_id)");

  logger.info("Database shape verified");
}
