import { pool } from "@workspace/db";
import { logger } from "./logger";

/**
 * Creates an index, tolerating the one thing that can legitimately stop it.
 *
 * A unique index fails if the table already holds rows that violate it — and it
 * may, because nothing enforced these pairs before. Rather than delete a user's
 * data at boot, or let the server refuse to start, this logs exactly what is
 * wrong and carries on without the index. The invariant stays unenforced until
 * someone looks, which is the honest outcome.
 */
async function createIndexSafely(name: string, statement: string) {
  try {
    await pool.query(statement);
  } catch (err) {
    logger.error(
      { err, index: name },
      `Could not create index ${name}. If this is a unique index, the table already contains duplicate rows — find and merge them, then restart. The invariant is NOT enforced until then.`,
    );
  }
}

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

  // Modules turn the flat lesson list into courses: an ordered set of lessons
  // that ends in an exam and, at or above pass_score, a certificate.
  // Mirrors lib/db/src/schema/learn.ts — schema-parity.sh fails if they drift.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS modules (
      id serial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      title text NOT NULL,
      title_uz text,
      title_ru text,
      description text NOT NULL,
      description_uz text,
      description_ru text,
      category_id integer REFERENCES learn_categories(id),
      order_index integer NOT NULL DEFAULT 0,
      estimated_hours integer NOT NULL DEFAULT 0,
      difficulty text NOT NULL DEFAULT 'beginner',
      pass_score integer NOT NULL DEFAULT 80,
      is_published boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id integer REFERENCES modules(id)");
  await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS module_questions (
      id serial PRIMARY KEY,
      module_id integer NOT NULL REFERENCES modules(id),
      question text NOT NULL,
      question_uz text,
      question_ru text,
      options jsonb NOT NULL,
      options_uz jsonb,
      options_ru jsonb,
      correct_option integer NOT NULL,
      order_index integer NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS module_exam_attempts (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id),
      module_id integer NOT NULL REFERENCES modules(id),
      attempt_count integer NOT NULL DEFAULT 0,
      exam_session_id text,
      exam_started_at timestamptz,
      best_score integer NOT NULL DEFAULT 0,
      passed boolean NOT NULL DEFAULT false,
      passed_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      id serial PRIMARY KEY,
      serial text NOT NULL UNIQUE,
      user_id integer NOT NULL REFERENCES users(id),
      module_id integer NOT NULL REFERENCES modules(id),
      full_name text NOT NULL,
      score integer NOT NULL,
      issued_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Mirrors lib/db/src/schema/learn.ts programDiplomasTable — the whole-program
  // credential, issued once every module is passed. userId is UNIQUE: one
  // diploma per learner.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS program_diplomas (
      id serial PRIMARY KEY,
      serial text NOT NULL UNIQUE,
      user_id integer NOT NULL UNIQUE REFERENCES users(id),
      full_name text NOT NULL,
      average_score integer NOT NULL,
      module_count integer NOT NULL,
      issued_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const [name, statement] of [
    ["modules_published_idx", "CREATE INDEX IF NOT EXISTS modules_published_idx ON modules(is_published)"],
    ["modules_order_idx", "CREATE INDEX IF NOT EXISTS modules_order_idx ON modules(order_index)"],
    ["lessons_module_id_idx", "CREATE INDEX IF NOT EXISTS lessons_module_id_idx ON lessons(module_id)"],
    ["module_questions_module_id_idx", "CREATE INDEX IF NOT EXISTS module_questions_module_id_idx ON module_questions(module_id)"],
    ["module_exam_attempts_user_module_idx", "CREATE UNIQUE INDEX IF NOT EXISTS module_exam_attempts_user_module_idx ON module_exam_attempts(user_id, module_id)"],
    ["module_exam_attempts_module_id_idx", "CREATE INDEX IF NOT EXISTS module_exam_attempts_module_id_idx ON module_exam_attempts(module_id)"],
    ["certificates_user_module_idx", "CREATE UNIQUE INDEX IF NOT EXISTS certificates_user_module_idx ON certificates(user_id, module_id)"],
    ["certificates_module_id_idx", "CREATE INDEX IF NOT EXISTS certificates_module_id_idx ON certificates(module_id)"],
  ] as const) {
    await createIndexSafely(name, statement);
  }

  // Mirrors lib/db/src/schema/rate-limits.ts. Both halves are required: this is
  // what production runs, that is what the tests and types come from, and
  // schema-parity.sh fails if they disagree.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key text PRIMARY KEY,
      count integer NOT NULL DEFAULT 0,
      reset_at timestamptz NOT NULL
    )
  `);
  await createIndexSafely(
    "rate_limits_reset_at_idx",
    "CREATE INDEX IF NOT EXISTS rate_limits_reset_at_idx ON rate_limits(reset_at)",
  );

  await pool.query("ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS file_id integer REFERENCES ctf_files(id)");
  await pool.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS invite_code text");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS competitions_invite_code_idx ON competitions(invite_code) WHERE invite_code IS NOT NULL");
  await pool.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS sponsor_name text");
  await pool.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS sponsor_logo_url text");
  await pool.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS sponsor_url text");
  await pool.query("ALTER TABLE competitions ADD COLUMN IF NOT EXISTS prize text");

  // Team play: teams register within a competition, and members join under one.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competition_teams (
      id serial PRIMARY KEY,
      competition_id integer NOT NULL REFERENCES competitions(id),
      name text NOT NULL,
      invite_code text NOT NULL,
      captain_id integer NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS competition_teams_competition_name_idx ON competition_teams(competition_id, name)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS competition_teams_invite_code_idx ON competition_teams(invite_code)");
  await pool.query("ALTER TABLE competition_users ADD COLUMN IF NOT EXISTS team_id integer REFERENCES competition_teams(id)");
  await pool.query("ALTER TABLE competition_solves ADD COLUMN IF NOT EXISTS team_id integer REFERENCES competition_teams(id)");
  // One solve per team per challenge — the concurrent-submit backstop for the
  // shared-solve model.
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS competition_solves_competition_ctf_team_idx ON competition_solves(competition_id, ctf_id, team_id) WHERE team_id IS NOT NULL");

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

  // One-time backfill, guarded by the column's own absence: the accounts that
  // the old hardcoded nickname check excluded keep being excluded, but if an
  // admin later clears the flag it stays cleared. Backfilling unconditionally
  // would silently undo that on every boot.
  const { rowCount: hasExclusionColumn } = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'excluded_from_scoring'",
  );
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS excluded_from_scoring boolean NOT NULL DEFAULT false");
  if (!hasExclusionColumn) {
    const { rowCount } = await pool.query(
      "UPDATE users SET excluded_from_scoring = true WHERE nickname = 'bozkurtshadow'",
    );
    logger.info({ rowCount }, "Backfilled excluded_from_scoring from the previous hardcoded nickname");
  }
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS open_to_work boolean NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_employer boolean NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name text");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_url text");

  // Job board — the paid end of the talent pipeline.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id serial PRIMARY KEY,
      employer_id integer NOT NULL REFERENCES users(id),
      title text NOT NULL,
      company text NOT NULL,
      description text NOT NULL,
      location text,
      employment_type text NOT NULL DEFAULT 'full_time',
      apply_url text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS jobs_active_created_idx ON jobs(is_active, created_at)");
  await pool.query("CREATE INDEX IF NOT EXISTS jobs_employer_id_idx ON jobs(employer_id)");

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      prefix text NOT NULL,
      scopes text NOT NULL,
      last_used_at timestamptz,
      expires_at timestamptz,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS api_tokens_user_id_idx ON api_tokens(user_id)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider text NOT NULL,
      provider_account_id text NOT NULL,
      provider_email text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  // The unique index is load-bearing: it is what stops one provider identity
  // being linked to two accounts.
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS oauth_accounts_provider_account_idx ON oauth_accounts(provider, provider_account_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS oauth_accounts_user_id_idx ON oauth_accounts(user_id)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS passkeys (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id text NOT NULL UNIQUE,
      public_key text NOT NULL,
      counter integer NOT NULL DEFAULT 0,
      transports text,
      device_type text,
      backed_up boolean NOT NULL DEFAULT false,
      name text NOT NULL,
      last_used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS passkeys_user_id_idx ON passkeys(user_id)");

  // Indexes for the tables that predate this file. Postgres does not index a
  // foreign key for you, and none of these had one — every lookup was a full
  // scan. Each column here is one the server actually filters on.
  const indexes: Array<[string, string]> = [
    ["ctf_tasks_author_id_idx", "CREATE INDEX IF NOT EXISTS ctf_tasks_author_id_idx ON ctf_tasks(author_id)"],
    ["ctf_tasks_published_idx", "CREATE INDEX IF NOT EXISTS ctf_tasks_published_idx ON ctf_tasks(is_published)"],
    ["ctf_attempts_ctf_id_idx", "CREATE INDEX IF NOT EXISTS ctf_attempts_ctf_id_idx ON ctf_attempts(ctf_id)"],
    ["ctf_attempts_solved_idx", "CREATE INDEX IF NOT EXISTS ctf_attempts_solved_idx ON ctf_attempts(user_id) WHERE solved"],
    ["ctf_attempts_blocked_idx", "CREATE INDEX IF NOT EXISTS ctf_attempts_blocked_idx ON ctf_attempts(ctf_id) WHERE blocked"],
    ["lessons_category_id_idx", "CREATE INDEX IF NOT EXISTS lessons_category_id_idx ON lessons(category_id)"],
    ["lessons_author_id_idx", "CREATE INDEX IF NOT EXISTS lessons_author_id_idx ON lessons(author_id)"],
    ["lessons_published_idx", "CREATE INDEX IF NOT EXISTS lessons_published_idx ON lessons(is_published)"],
    ["lesson_questions_lesson_id_idx", "CREATE INDEX IF NOT EXISTS lesson_questions_lesson_id_idx ON lesson_questions(lesson_id)"],
    ["user_lesson_attempts_lesson_id_idx", "CREATE INDEX IF NOT EXISTS user_lesson_attempts_lesson_id_idx ON user_lesson_attempts(lesson_id)"],
    ["user_lesson_attempts_status_idx", "CREATE INDEX IF NOT EXISTS user_lesson_attempts_status_idx ON user_lesson_attempts(status)"],
    ["user_titles_title_id_idx", "CREATE INDEX IF NOT EXISTS user_titles_title_id_idx ON user_titles(title_id)"],
    ["competition_users_user_id_idx", "CREATE INDEX IF NOT EXISTS competition_users_user_id_idx ON competition_users(user_id)"],
    ["competition_solves_competition_id_idx", "CREATE INDEX IF NOT EXISTS competition_solves_competition_id_idx ON competition_solves(competition_id)"],
    ["audit_logs_created_at_idx", "CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)"],
    ["audit_logs_actor_user_id_idx", "CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON audit_logs(actor_user_id)"],
    // The scoreboard's exact filter and sort in one index.
    ["users_leaderboard_idx", "CREATE INDEX IF NOT EXISTS users_leaderboard_idx ON users(role, is_blocked, points)"],

    // Unique: these pairs are what every route already assumes. They may fail on
    // an existing database that collected duplicates while nothing enforced them
    // — createIndexSafely says so loudly rather than deleting anything.
    ["ctf_attempts_user_ctf_idx", "CREATE UNIQUE INDEX IF NOT EXISTS ctf_attempts_user_ctf_idx ON ctf_attempts(user_id, ctf_id)"],
    ["user_lesson_attempts_user_lesson_idx", "CREATE UNIQUE INDEX IF NOT EXISTS user_lesson_attempts_user_lesson_idx ON user_lesson_attempts(user_id, lesson_id)"],
    ["user_titles_user_title_idx", "CREATE UNIQUE INDEX IF NOT EXISTS user_titles_user_title_idx ON user_titles(user_id, title_id)"],
    ["competition_tasks_competition_ctf_idx", "CREATE UNIQUE INDEX IF NOT EXISTS competition_tasks_competition_ctf_idx ON competition_tasks(competition_id, ctf_id)"],
    ["competition_users_competition_user_idx", "CREATE UNIQUE INDEX IF NOT EXISTS competition_users_competition_user_idx ON competition_users(competition_id, user_id)"],
    ["competition_solves_competition_ctf_user_idx", "CREATE UNIQUE INDEX IF NOT EXISTS competition_solves_competition_ctf_user_idx ON competition_solves(competition_id, ctf_id, user_id)"],
  ];

  for (const [name, statement] of indexes) await createIndexSafely(name, statement);

  logger.info({ indexCount: indexes.length }, "Database shape verified");
}
