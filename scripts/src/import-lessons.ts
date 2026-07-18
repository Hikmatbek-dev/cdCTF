/**
 * Import the curriculum in scripts/content/lessons.json.
 *
 * Idempotent on two levels: a category is reused if one with the same name
 * already exists, and a lesson is skipped if its title is already present. So
 * running this twice adds only what is missing and never duplicates a lesson or
 * its questions.
 *
 * The content is validated for shape by generate_lessons.py before export —
 * every lesson trilingual, every question with a valid correct answer — so this
 * script only moves verified content into a database.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts exec tsx ./src/import-lessons.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "pg";

type Question = {
  question: string; questionUz: string; questionRu: string;
  options: string[]; optionsUz: string[]; optionsRu: string[];
  correctOption: number;
};
type Lesson = {
  category: string; points: number;
  title: string; titleUz: string; titleRu: string;
  content: string; contentUz: string; contentRu: string;
  questions: Question[];
};
type Category = { key: string; name: string; nameUz: string; nameRu: string };
type Data = { categories: Category[]; lessons: Lesson[] };

const here = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(here, "..", "content", "lessons.json");

async function main() {
  const url = process.env.DATABASE_URL;
  const data: Data = JSON.parse(readFileSync(jsonPath, "utf8"));
  // With DATABASE_URL, connect by URL. Without it, fall back to the standard
  // PG* variables (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE), which pg
  // reads automatically. That path avoids URL-encoding a password — a single
  // '+' or '@' in a URL password silently corrupts it and looks like a wrong
  // password.
  if (!url && !process.env.PGHOST) {
    console.error("DATABASE_URL yoki PGHOST/PGUSER/PGPASSWORD kerak");
    process.exit(1);
  }
  const pool = url ? new Pool({ connectionString: url }) : new Pool();

  // Resolve each category to an id, creating it only if absent.
  const catId = new Map<string, number>();
  try {
    // Bring the tables up to what this importer writes, in case the target
    // database predates these columns. Each is IF NOT EXISTS, so it is a no-op
    // when the column already exists, and matches the app's own schema.
    for (const alter of [
      "ALTER TABLE learn_categories ADD COLUMN IF NOT EXISTS name_uz text",
      "ALTER TABLE learn_categories ADD COLUMN IF NOT EXISTS name_ru text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title_uz text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title_ru text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_uz text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_ru text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS question_uz text",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS question_ru text",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS options_uz jsonb",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS options_ru jsonb",
    ]) {
      await pool.query(alter);
    }

    for (const c of data.categories) {
      const existing = await pool.query(
        "SELECT id FROM learn_categories WHERE name = $1 LIMIT 1", [c.name]);
      if (existing.rowCount) {
        catId.set(c.key, existing.rows[0].id);
      } else {
        const created = await pool.query(
          "INSERT INTO learn_categories (name, name_uz, name_ru) VALUES ($1,$2,$3) RETURNING id",
          [c.name, c.nameUz, c.nameRu]);
        catId.set(c.key, created.rows[0].id);
      }
    }

    let added = 0;
    let skipped = 0;
    for (const l of data.lessons) {
      const exists = await pool.query(
        "SELECT 1 FROM lessons WHERE title = $1 LIMIT 1", [l.title]);
      if (exists.rowCount) {
        skipped++;
        continue;
      }
      const cid = catId.get(l.category);
      const lesson = await pool.query(
        `INSERT INTO lessons
           (title, title_uz, title_ru, content, content_uz, content_ru,
            category_id, points, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id`,
        [l.title, l.titleUz, l.titleRu, l.content, l.contentUz, l.contentRu, cid, l.points]);
      const lessonId = lesson.rows[0].id;

      let order = 0;
      for (const q of l.questions) {
        await pool.query(
          `INSERT INTO lesson_questions
             (lesson_id, question, question_uz, question_ru,
              options, options_uz, options_ru, correct_option, order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [lessonId, q.question, q.questionUz, q.questionRu,
           JSON.stringify(q.options), JSON.stringify(q.optionsUz),
           JSON.stringify(q.optionsRu), q.correctOption, order++]);
      }
      added++;
      console.log(`  + [${l.category}] ${l.title} (${l.questions.length} savol)`);
    }
    console.log(`\n🎉 ${added} dars qo'shildi, ${skipped} o'tkazib yuborildi.`);
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
