/**
 * A read-only report on what the content and the funnel actually look like.
 *
 * 165 lessons were written and finished four times. 97 challenges were written
 * and solved 221 times. Nobody knew that until someone counted — the platform
 * measured how much content existed, never whether any of it worked.
 *
 * This changes nothing. It reads, counts, and prints, so it is safe to point at
 * production. Run it before deciding what to build next.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts run audit
 */
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const pool = new Pool({ connectionString });

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const amber = (s: string) => `\x1b[33m${s}\x1b[0m`;

function section(title: string) {
  console.log(`\n${bold(title)}`);
  console.log(dim("─".repeat(title.length)));
}

/** `n` of `total`, with the share, coloured by how bad the share is. */
function ratio(label: string, n: number, total: number, badAbove = 0.2) {
  const share = total === 0 ? 0 : n / total;
  const text = `${String(n).padStart(4)} / ${total}  (${Math.round(share * 100)}%)`;
  const colour = share === 0 ? green : share > badAbove ? red : amber;
  console.log(`  ${label.padEnd(42)} ${colour(text)}`);
}

async function one<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await pool.query<T>(sql, params);
  return rows[0];
}

async function main() {
  console.log(bold("\ncdCTF — kontent va voronka hisoboti"));

  section("Voronka");
  const funnel = await one<{ learners: string; started: string; finished_lesson: string; solved: string; passed_exam: string; certified: string }>(`
    select
      (select count(*) from users where is_blocked = false and role = 'user')::text as learners,
      (select count(distinct user_id) from user_lesson_attempts)::text as started,
      (select count(distinct user_id) from user_lesson_attempts where status = 'completed')::text as finished_lesson,
      (select count(distinct user_id) from ctf_attempts where solved = true)::text as solved,
      (select count(distinct user_id) from module_exam_attempts where passed = true)::text as passed_exam,
      (select count(distinct user_id) from certificates)::text as certified
  `);
  const learners = Number(funnel.learners);
  const steps: Array<[string, number]> = [
    ["Ro'yxatdan o'tgan", learners],
    ["Topshiriq yechgan", Number(funnel.solved)],
    ["Darsni ochgan", Number(funnel.started)],
    ["Darsni tugatgan", Number(funnel.finished_lesson)],
    ["Imtihondan o'tgan", Number(funnel.passed_exam)],
    ["Sertifikat olgan", Number(funnel.certified)],
  ];
  for (const [label, n] of steps) {
    const share = learners === 0 ? 0 : n / learners;
    const bar = "█".repeat(Math.round(share * 30)).padEnd(30, "·");
    const colour = share >= 0.3 ? green : share > 0 ? amber : red;
    console.log(`  ${label.padEnd(20)} ${colour(bar)} ${String(n).padStart(4)}`);
  }

  section("Topshiriqlar");
  const ctf = await one<Record<string, string>>(`
    select
      count(*)::text as total,
      count(*) filter (where is_published)::text as published,
      -- A description that is missing, shorter than a sentence, or just the
      -- name again, is not a challenge anybody can attempt.
      count(*) filter (where coalesce(trim(description), '') = ''
                          or length(trim(description)) < 40
                          or lower(trim(description)) = lower(trim(name)))::text as thin_desc,
      count(*) filter (where name_uz is null or trim(name_uz) = ''
                          or description_uz is null or trim(description_uz) = '')::text as no_uz,
      count(*) filter (where name_ru is null or trim(name_ru) = ''
                          or description_ru is null or trim(description_ru) = '')::text as no_ru,
      count(*) filter (where hint is null or trim(hint) = '')::text as no_hint,
      count(*) filter (where flag not like 'sha256$%')::text as plain_flag
    from ctf_tasks
  `);
  const ctfTotal = Number(ctf.total);
  console.log(`  ${"Jami".padEnd(42)} ${ctfTotal}  ${dim(`(nashr qilingan: ${ctf.published})`)}`);
  ratio("Tavsifi yo'q yoki juda qisqa", Number(ctf.thin_desc), ctfTotal);
  ratio("O'zbekcha tarjimasi yo'q", Number(ctf.no_uz), ctfTotal);
  ratio("Ruscha tarjimasi yo'q", Number(ctf.no_ru), ctfTotal);
  ratio("Maslahati yo'q", Number(ctf.no_hint), ctfTotal, 0.5);
  ratio("Flagi ochiq matnda (xavfsizlik)", Number(ctf.plain_flag), ctfTotal, 0);

  const neverSolved = await one<{ n: string }>(`
    select count(*)::text as n from ctf_tasks t
    where t.is_published
      and not exists (select 1 from ctf_attempts a where a.ctf_id = t.id and a.solved)
  `);
  ratio("Hech kim yechmagan", Number(neverSolved.n), Number(ctf.published), 0.6);

  section("Darslar va modullar");
  const learn = await one<Record<string, string>>(`
    select
      (select count(*) from lessons where is_published)::text as lessons,
      (select count(*) from modules where is_published)::text as modules,
      (select count(*) from lessons l where l.is_published
         and not exists (select 1 from user_lesson_attempts a
                         where a.lesson_id = l.id and a.status = 'completed'))::text as never_finished,
      (select count(*) from lessons where is_published
         and (title_uz is null or trim(title_uz) = ''))::text as no_uz,
      (select count(*) from modules m where m.is_published
         and not exists (select 1 from module_questions q where q.module_id = m.id))::text as no_exam
  `);
  const lessons = Number(learn.lessons);
  console.log(`  ${"Nashr qilingan darslar".padEnd(42)} ${lessons}`);
  console.log(`  ${"Nashr qilingan modullar".padEnd(42)} ${learn.modules}`);
  ratio("Hech kim tugatmagan darslar", Number(learn.never_finished), lessons, 0.6);
  ratio("O'zbekcha sarlavhasi yo'q", Number(learn.no_uz), lessons);
  ratio("Imtihon savoli yo'q modullar", Number(learn.no_exam), Number(learn.modules), 0);

  section("Bo'sh bo'limlar");
  // A feature nobody has used yet is not a bug — but a page that is empty to
  // every visitor is a promise the platform is not keeping.
  const empty = await one<Record<string, string>>(`
    select
      (select count(*) from competitions)::text as competitions,
      (select count(*) from jobs)::text as jobs,
      (select count(*) from users where open_to_work and is_blocked = false)::text as open_to_work,
      (select count(*) from certificates)::text as certificates,
      (select count(*) from ctf_writeups)::text as writeups
  `);
  for (const [label, n] of [
    ["Musobaqalar", empty.competitions],
    ["Vakansiyalar", empty.jobs],
    ["Ishga tayyor profillar", empty.open_to_work],
    ["Berilgan sertifikatlar", empty.certificates],
    ["Writeuplar", empty.writeups],
  ] as Array<[string, string]>) {
    const v = Number(n);
    console.log(`  ${label.padEnd(42)} ${v === 0 ? red("0  ← sahifa bo'sh") : green(String(v))}`);
  }

  section("Nima qilish kerak");
  const todo: string[] = [];
  if (Number(ctf.thin_desc) > 0) todo.push(`${ctf.thin_desc} ta topshiriq tavsifi yaroqsiz → pnpm --filter ./scripts run fix-content`);
  if (Number(ctf.no_uz) > 0 || Number(ctf.no_ru) > 0) todo.push(`Tarjima yetishmaydi: uz ${ctf.no_uz}, ru ${ctf.no_ru}`);
  if (Number(ctf.plain_flag) > 0) todo.push(`${ctf.plain_flag} ta flag ochiq matnda saqlanmoqda — bu zaiflik`);
  if (Number(learn.no_exam) > 0) todo.push(`${learn.no_exam} ta modulda imtihon savoli yo'q — sertifikat berilmaydi`);
  if (Number(funnel.certified) === 0 && learners > 0) todo.push("Hech kim sertifikat olmagan — imtihongacha bo'lgan yo'lni tekshiring");
  if (Number(empty.competitions) === 0) todo.push("Musobaqa yo'q — /competitions va /e sahifalari bo'sh");
  if (todo.length === 0) {
    console.log(`  ${green("Diqqat talab qiladigan narsa topilmadi.")}`);
  } else {
    for (const t of todo) console.log(`  ${amber("•")} ${t}`);
  }
  console.log();
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
