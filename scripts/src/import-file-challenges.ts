/**
 * Upload file-based challenges to Supabase Storage and register them.
 *
 * Reads scripts/content/file-challenges.json (gitignored — it carries flags),
 * uploads each artifact from scripts/content/files/ to the same Supabase bucket
 * the app uses, and inserts a challenge whose file_url points at the public
 * object. Every flag was proven extractable from its file by
 * generate_file_challenges.py before export.
 *
 * Idempotent: a challenge already present by name is skipped (and its file is
 * not re-uploaded), so re-running adds only what is missing.
 *
 * Needs, as environment variables (never in the command's URL, so secrets are
 * not logged):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   — for the upload
 *   SUPABASE_STORAGE_BUCKET                    — optional, defaults to "cdctf"
 *   DATABASE_URL, or PGHOST/PGUSER/PGPASSWORD  — for the database
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=postgres \
 *   pnpm --filter ./scripts exec tsx ./src/import-file-challenges.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

type FileChallenge = {
  category: string; difficulty: string; points: number;
  flagHash: string; filename: string;
  name: string; nameUz: string; nameRu: string;
  description: string; descriptionUz: string; descriptionRu: string;
  hint: string; hintUz: string; hintRu: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(here, "..", "content", "file-challenges.json");
const filesDir = join(here, "..", "content", "files");

function contentType(filename: string): string {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  if (filename.endsWith(".zip")) return "application/zip";
  if (filename.endsWith(".pcap")) return "application/vnd.tcpdump.pcap";
  return "application/octet-stream";
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "cdctf";
  if (!supabaseUrl || !supabaseKey) {
    console.error("SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak");
    process.exit(1);
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && !process.env.PGHOST) {
    console.error("DATABASE_URL yoki PGHOST/PGUSER/PGPASSWORD kerak");
    process.exit(1);
  }

  const challenges: FileChallenge[] = JSON.parse(readFileSync(jsonPath, "utf8"));
  const pool = dbUrl ? new Pool({ connectionString: dbUrl }) : new Pool();

  let added = 0;
  let skipped = 0;
  try {
    for (const alter of [
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS name_uz text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS name_ru text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS description_uz text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS description_ru text",
      "ALTER TABLE ctf_tasks ADD COLUMN IF NOT EXISTS file_url text",
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

      // Upload the artifact to the same bucket, public path, as the app.
      const objectName = `ctf/${randomUUID()}-${c.filename}`;
      const buffer = readFileSync(join(filesDir, c.filename));
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectName}`;
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          "Content-Type": contentType(c.filename),
          "x-upsert": "true",
        },
        body: buffer,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Storage upload failed for ${c.filename}: ${res.status} ${text}`);
      }
      const fileUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectName}`;

      await pool.query(
        `INSERT INTO ctf_tasks
           (name, name_uz, name_ru, description, description_uz, description_ru,
            category, difficulty, points, hint, flag, file_url, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)`,
        [
          c.name, c.nameUz, c.nameRu,
          c.description, c.descriptionUz, c.descriptionRu,
          c.category, c.difficulty, c.points, c.hint, c.flagHash, fileUrl,
        ],
      );
      added++;
      console.log(`  + [${c.category}/${c.points}] ${c.name}  (${c.filename})`);
    }
    console.log(`\n🎉 ${added} fayl-challenge qo'shildi, ${skipped} o'tkazib yuborildi.`);
  } finally {
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
