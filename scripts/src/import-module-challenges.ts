/**
 * Import the verified challenges in scripts/content/module-challenges.json —
 * the Recon, Exploitation and Pwn sets that fill the three modules that had no
 * practice.
 *
 * Identical in behaviour to import-challenges.ts (idempotent by name, flags
 * pre-hashed as sha256$… exactly as the server writes them), just a different
 * source file. Every flag was proven solvable by
 * generate_module_challenges.py before it landed in the JSON.
 *
 * Usage:  DATABASE_URL=... pnpm --filter ./scripts exec tsx ./src/import-module-challenges.ts
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
const jsonPath = join(here, "..", "content", "module-challenges.json");

async function main() {
  const url = process.env.DATABASE_URL;
  const challenges: Challenge[] = JSON.parse(readFileSync(jsonPath, "utf8"));
  if (!url && !process.env.PGHOST) {
    console.error("DATABASE_URL yoki PGHOST/PGUSER/PGPASSWORD kerak");
    process.exit(1);
  }
  const pool = url ? new Pool({ connectionString: url }) : new Pool();

  let added = 0;
  let skipped = 0;
  try {
    for (const alter of [
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS name_uz text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS name_ru text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS description_uz text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS description_ru text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true",
    ]) {
      await pool.query(alter);
    }

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
