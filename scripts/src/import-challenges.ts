/**
 * Import the verified challenges in scripts/content/challenges.json.
 *
 * The flags are stored pre-hashed (sha256$…), exactly as the server writes them
 * via hashFlag, so a submitted flag validates the same whether the challenge was
 * created here or through the admin panel.
 *
 * Idempotent: a challenge already present by name is skipped, so running this
 * twice — or against a database that already has some of them — adds only what
 * is missing and never duplicates.
 *
 * Every flag was proven solvable by generate_challenges.py before it landed in
 * the JSON; this script only moves that verified content into a database.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts exec tsx ./src/import-challenges.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "pg";

type Challenge = {
  category: string;
  difficulty: string;
  points: number;
  flagHash: string;
  name: string; nameUz: string; nameRu: string;
  description: string; descriptionUz: string; descriptionRu: string;
  hint: string; hintUz: string; hintRu: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(here, "..", "content", "challenges.json");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL kerak");
    process.exit(1);
  }
  const challenges: Challenge[] = JSON.parse(readFileSync(jsonPath, "utf8"));
  const pool = new Pool({ connectionString: url });

  let added = 0;
  let skipped = 0;
  try {
    for (const c of challenges) {
      const exists = await pool.query("SELECT 1 FROM ctf_tasks WHERE name = $1 LIMIT 1", [c.name]);
      if (exists.rowCount) {
        skipped++;
        continue;
      }
      await pool.query(
        `INSERT INTO ctf_tasks
           (name, name_uz, name_ru, description, description_uz, description_ru,
            category, difficulty, points, hint, flag, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)`,
        [
          c.name, c.nameUz, c.nameRu,
          c.description, c.descriptionUz, c.descriptionRu,
          c.category, c.difficulty, c.points, c.hint, c.flagHash,
        ],
      );
      added++;
      console.log(`  + [${c.category}/${c.difficulty}/${c.points}] ${c.name}`);
    }
  } finally {
    await pool.end();
  }

  console.log(`\n🎉 ${added} qo'shildi, ${skipped} o'tkazib yuborildi (allaqachon bor).`);
}

main().catch(e => { console.error(e); process.exit(1); });
