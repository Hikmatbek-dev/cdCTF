-- CyberPlace / cdCTF schema for Supabase SQL Editor.
-- Run this once in Supabase Dashboard -> SQL Editor.
--
-- This file is half of how production gets its schema, not a leftover. It
-- creates the 14 base tables; ensureDatabaseShape() in
-- artifacts/api-server/src/lib/database.ts adds the rest at every cold start —
-- sessions, passkeys, OAuth, API tokens, backup codes, login history, plus
-- later columns and every index. Neither half is complete alone, and this one
-- cannot run second: the ALTERs there need these tables to exist.
--
-- The tests do NOT use this file. They build the database with drizzle-kit push
-- from lib/db/src/schema/*.ts, which never runs against production. So a column
-- added only to the drizzle schema exists in CI and not in production, and the
-- query using it passes every test and 500s once deployed.
--
-- scripts/manual-tests/schema-parity.sh builds a database each way and diffs
-- them, so that stays impossible rather than merely untrue today. Add a table
-- or column and you must touch BOTH sides; the suite tells you which you missed.

create table if not exists users (
  id serial primary key,
  nickname text not null unique,
  email text not null unique,
  password_hash text not null,
  avatar_url text,
  points integer not null default 0,
  role text not null default 'user',
  email_verified boolean not null default false,
  email_verification_token text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ctf_tasks (
  id serial primary key,
  name text not null,
  name_uz text,
  name_ru text,
  description text not null,
  description_uz text,
  description_ru text,
  category text not null,
  difficulty text not null default 'easy',
  points integer not null default 100,
  hint_cost integer not null default 10,
  hint text,
  flag text not null,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists ctf_attempts (
  id serial primary key,
  user_id integer not null references users(id),
  ctf_id integer not null references ctf_tasks(id),
  wrong_attempts integer not null default 0,
  hint_used boolean not null default false,
  solved boolean not null default false,
  blocked boolean not null default false,
  solved_at timestamptz,
  blocked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists learn_categories (
  id serial primary key,
  name text not null,
  name_uz text,
  name_ru text,
  created_at timestamptz not null default now()
);

create table if not exists lessons (
  id serial primary key,
  title text not null,
  title_uz text,
  title_ru text,
  content text not null,
  content_uz text,
  content_ru text,
  category_id integer not null references learn_categories(id),
  points integer not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists lesson_questions (
  id serial primary key,
  lesson_id integer not null references lessons(id),
  question text not null,
  question_uz text,
  question_ru text,
  options jsonb not null,
  options_uz jsonb,
  options_ru jsonb,
  correct_option integer not null,
  order_index integer not null default 0
);

create table if not exists user_lesson_attempts (
  id serial primary key,
  user_id integer not null references users(id),
  lesson_id integer not null references lessons(id),
  status text not null default 'not_started',
  attempt_count integer not null default 0,
  escape_count integer not null default 0,
  test_session_id text,
  test_started_at timestamptz,
  blocked boolean not null default false,
  blocked_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists titles (
  id serial primary key,
  name text not null,
  category text not null unique,
  points integer not null default 500,
  created_at timestamptz not null default now()
);

create table if not exists user_titles (
  id serial primary key,
  user_id integer not null references users(id),
  title_id integer not null references titles(id),
  earned_at timestamptz not null default now()
);

create table if not exists competitions (
  id serial primary key,
  name text not null,
  description text,
  type text not null default 'public',
  invite_code text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists competitions_invite_code_idx
  on competitions(invite_code)
  where invite_code is not null;

create table if not exists competition_tasks (
  id serial primary key,
  competition_id integer not null references competitions(id),
  ctf_id integer not null references ctf_tasks(id)
);

create table if not exists competition_users (
  id serial primary key,
  competition_id integer not null references competitions(id),
  user_id integer not null references users(id),
  joined_at timestamptz not null default now()
);

create table if not exists competition_solves (
  id serial primary key,
  competition_id integer not null references competitions(id),
  user_id integer not null references users(id),
  ctf_id integer not null references ctf_tasks(id),
  points_earned integer not null default 0,
  solved_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id serial primary key,
  actor_user_id integer references users(id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

insert into titles (name, category, points)
values
  ('Kriptograf', 'Crypto', 500),
  ('Web Hacker', 'Web', 500),
  ('Reverse Engineer', 'Reverse', 500),
  ('Forensics Analyst', 'Forensics', 500),
  ('Binary Exploiter', 'Pwn', 500),
  ('OSINT Hunter', 'OSINT', 500),
  ('Stego Master', 'Steganography', 500)
on conflict (category) do nothing;

insert into learn_categories (name, name_uz, name_ru)
values
  ('Web Security', 'Veb Xavfsizlik', 'Веб безопасность'),
  ('Cryptography', 'Kriptografiya', 'Криптография'),
  ('Networking', 'Tarmoqlar', 'Сети'),
  ('Linux & Terminal', 'Linux va Terminal', 'Linux и терминал'),
  ('OSINT', 'OSINT', 'OSINT')
on conflict do nothing;
