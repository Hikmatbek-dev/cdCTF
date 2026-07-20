/**
 * Import the module curriculum in scripts/curriculum/curriculum.json.
 *
 * A module is a course: an ordered set of lessons that ends in a final exam and
 * a certificate. This importer moves the whole structure into a database —
 * categories, modules, the lessons that belong to each module in order, the
 * per-lesson quizzes, and the module's final exam.
 *
 * Idempotent on three keys, so running it twice adds only what is missing:
 *   - a category is reused if one with the same name exists
 *   - a module is reused if one with the same slug exists
 *   - a lesson is reused if one with the same title exists
 * A module that already exists still has its exam and its lessons' order
 * reconciled, so re-running after editing the curriculum picks up changes to
 * ordering and to the exam without duplicating anything.
 *
 * The content is validated for shape by scripts/curriculum/build.py before
 * export — every module and lesson trilingual, every question with a valid
 * correct answer — so this script only moves verified content.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts exec tsx ./src/import-curriculum.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "pg";

type Question = {
  question: string; questionUz: string; questionRu: string;
  options: string[]; optionsUz: string[]; optionsRu: string[];
  correctOption: number;
};
type Lesson = {
  module: string; category: string; orderIndex: number; points: number;
  title: string; titleUz: string; titleRu: string;
  content: string; contentUz: string; contentRu: string;
  questions: Question[];
};
type Module = {
  slug: string; category: string;
  title: string; titleUz: string; titleRu: string;
  description: string; descriptionUz: string; descriptionRu: string;
  difficulty: string; estimatedHours: number; passScore: number; orderIndex: number;
  exam: Question[];
};
type Category = { key: string; name: string; nameUz: string; nameRu: string };
type Data = { categories: Category[]; modules: Module[]; lessons: Lesson[] };

const here = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(here, "..", "curriculum", "curriculum.json");

async function main() {
  const url = process.env.DATABASE_URL;
  // curriculum.json is generated and deliberately not committed, so that it can
  // never drift from the Python that produced it. A missing file therefore means
  // "you have not built it yet", not "something is broken" — say so plainly.
  if (!existsSync(jsonPath)) {
    console.error("curriculum.json topilmadi. Avval uni yarating:\n");
    console.error("    python3 scripts/curriculum/build.py\n");
    process.exit(1);
  }
  const data: Data = JSON.parse(readFileSync(jsonPath, "utf8"));
  // With DATABASE_URL, connect by URL. Without it, fall back to the standard
  // PG* variables, which pg reads automatically — that path avoids URL-encoding
  // a password, where a single '+' or '@' silently corrupts it.
  if (!url && !process.env.PGHOST) {
    console.error("DATABASE_URL yoki PGHOST/PGUSER/PGPASSWORD kerak");
    process.exit(1);
  }
  const pool = url ? new Pool({ connectionString: url }) : new Pool();

  try {
    // Bring the tables up to what this importer writes, in case the target
    // database predates the module columns. Each is IF NOT EXISTS, a no-op when
    // present, and matches the app's own schema (ensureDatabaseShape).
    for (const ddl of [
      "ALTER TABLE learn_categories ADD COLUMN IF NOT EXISTS name_uz text",
      "ALTER TABLE learn_categories ADD COLUMN IF NOT EXISTS name_ru text",
      `CREATE TABLE IF NOT EXISTS modules (
         id serial PRIMARY KEY,
         slug text NOT NULL UNIQUE,
         title text NOT NULL, title_uz text, title_ru text,
         description text NOT NULL, description_uz text, description_ru text,
         category_id integer REFERENCES learn_categories(id),
         order_index integer NOT NULL DEFAULT 0,
         estimated_hours integer NOT NULL DEFAULT 0,
         difficulty text NOT NULL DEFAULT 'beginner',
         pass_score integer NOT NULL DEFAULT 80,
         is_published boolean NOT NULL DEFAULT true,
         created_at timestamptz NOT NULL DEFAULT now())`,
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title_uz text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title_ru text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_uz text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_ru text",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id integer REFERENCES modules(id)",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS question_uz text",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS question_ru text",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS options_uz jsonb",
      "ALTER TABLE lesson_questions ADD COLUMN IF NOT EXISTS options_ru jsonb",
      `CREATE TABLE IF NOT EXISTS module_questions (
         id serial PRIMARY KEY,
         module_id integer NOT NULL REFERENCES modules(id),
         question text NOT NULL, question_uz text, question_ru text,
         options jsonb NOT NULL, options_uz jsonb, options_ru jsonb,
         correct_option integer NOT NULL,
         order_index integer NOT NULL DEFAULT 0)`,
    ]) {
      await pool.query(ddl);
    }

    // Categories first — everything else references them.
    const catId = new Map<string, number>();
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

    // Modules, keyed by slug. An existing module has its metadata and exam
    // reconciled rather than skipped, so editing the curriculum and re-running
    // updates it in place.
    const moduleId = new Map<string, number>();
    let modAdded = 0, modUpdated = 0;
    for (const m of data.modules) {
      const cid = catId.get(m.category) ?? null;
      const existing = await pool.query("SELECT id FROM modules WHERE slug = $1 LIMIT 1", [m.slug]);
      let mid: number;
      if (existing.rowCount) {
        mid = existing.rows[0].id;
        await pool.query(
          `UPDATE modules SET title=$2, title_uz=$3, title_ru=$4,
             description=$5, description_uz=$6, description_ru=$7,
             category_id=$8, order_index=$9, estimated_hours=$10,
             difficulty=$11, pass_score=$12 WHERE id=$1`,
          [mid, m.title, m.titleUz, m.titleRu, m.description, m.descriptionUz,
           m.descriptionRu, cid, m.orderIndex, m.estimatedHours, m.difficulty, m.passScore]);
        modUpdated++;
      } else {
        const created = await pool.query(
          `INSERT INTO modules
             (slug, title, title_uz, title_ru, description, description_uz, description_ru,
              category_id, order_index, estimated_hours, difficulty, pass_score, is_published)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true) RETURNING id`,
          [m.slug, m.title, m.titleUz, m.titleRu, m.description, m.descriptionUz,
           m.descriptionRu, cid, m.orderIndex, m.estimatedHours, m.difficulty, m.passScore]);
        mid = created.rows[0].id;
        modAdded++;
      }
      moduleId.set(m.slug, mid);

      // Rebuild the exam from scratch: it is a small, wholly-owned set, so
      // replacing it is simpler than diffing and cannot leave stale questions.
      await pool.query("DELETE FROM module_questions WHERE module_id = $1", [mid]);
      let eo = 0;
      for (const q of m.exam) {
        await pool.query(
          `INSERT INTO module_questions
             (module_id, question, question_uz, question_ru,
              options, options_uz, options_ru, correct_option, order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [mid, q.question, q.questionUz, q.questionRu,
           JSON.stringify(q.options), JSON.stringify(q.optionsUz),
           JSON.stringify(q.optionsRu), q.correctOption, eo++]);
      }
    }

    // Lessons. A new lesson is inserted with its quiz; an existing one (matched
    // by title) has only its module and order reconciled, so re-running after a
    // reshuffle fixes ordering without touching content or duplicating quizzes.
    let added = 0, reordered = 0;
    for (const l of data.lessons) {
      const cid = catId.get(l.category);
      const mid = moduleId.get(l.module) ?? null;
      const exists = await pool.query("SELECT id FROM lessons WHERE title = $1 LIMIT 1", [l.title]);
      if (exists.rowCount) {
        await pool.query("UPDATE lessons SET module_id=$2, order_index=$3 WHERE id=$1",
          [exists.rows[0].id, mid, l.orderIndex]);
        reordered++;
        continue;
      }
      const lesson = await pool.query(
        `INSERT INTO lessons
           (title, title_uz, title_ru, content, content_uz, content_ru,
            category_id, module_id, order_index, points, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) RETURNING id`,
        [l.title, l.titleUz, l.titleRu, l.content, l.contentUz, l.contentRu,
         cid, mid, l.orderIndex, l.points]);
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
      console.log(`  + [${l.module}] ${l.title} (${l.questions.length} savol)`);
    }

    console.log(`\n🎉 Modullar: ${modAdded} yangi, ${modUpdated} yangilandi.`);
    console.log(`🎉 Darslar: ${added} qo'shildi, ${reordered} qayta tartiblandi.`);
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
