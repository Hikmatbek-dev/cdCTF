/**
 * Imports the Uzbekistan-set challenges from ./content/uz-scenarios.ts.
 *
 * The content and the importer are separate on purpose: adding a challenge
 * should mean appending an object to a data file, not editing a script that
 * talks to a database. Everything below is mechanics.
 *
 * Flags are hashed here with exactly the algorithm the server verifies with
 * (sha256 of the trimmed flag, prefixed `sha256$` — see
 * artifacts/api-server/src/lib/flags.ts), so no plaintext answer ever reaches
 * the database or this script's output.
 *
 * Idempotent. Re-running updates the text of an existing challenge — matched on
 * `name` — and never duplicates it. A challenge that already has solves keeps
 * its flag: rewriting it would invalidate work people have already done.
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter ./scripts run import-uz
 *   DATABASE_URL=... pnpm --filter ./scripts run import-uz -- --dry-run
 *   DATABASE_URL=... pnpm --filter ./scripts run import-uz -- --undo
 */
import { Pool } from "pg";
import { createHash } from "node:crypto";
import { UZ_SCENARIOS, type LocalChallenge } from "./content/uz-scenarios.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const dsn: string = connectionString;

const dryRun = process.argv.includes("--dry-run");
const undo = process.argv.includes("--undo");

/** Must stay identical to the server's hashFlag — see the header comment. */
function hashFlag(flag: string): string {
  return `sha256$${createHash("sha256").update(flag.trim().replace(/\r\n/g, "\n"), "utf8").digest("hex")}`;
}

/**
 * Refuses to import content that is broken in a way the database would happily
 * accept — a duplicate name silently becomes an update of the wrong row, and a
 * flag in the wrong format is unsolvable no matter how good the puzzle is.
 */
function validate(items: LocalChallenge[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of items) {
    if (seen.has(c.name)) problems.push(`duplicate name: ${c.name}`);
    seen.add(c.name);
    if (!/^cdCTF\{[^}]+\}$/.test(c.flag)) problems.push(`${c.name}: flag is not cdCTF{...}`);
    for (const field of ["nameUz", "nameRu", "descriptionUz", "descriptionRu", "hintUz", "hintRu"] as const) {
      if (!c[field]?.trim()) problems.push(`${c.name}: ${field} is empty`);
    }
    if (c.points <= 0) problems.push(`${c.name}: points must be positive`);
  }
  return problems;
}

async function main() {
  const problems = validate(UZ_SCENARIOS);
  if (problems.length > 0) {
    console.error("Content is invalid:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  // No ssl option: pg reads `sslmode` from the DSN itself, which is how the
  // other import scripts and the server connect. Forcing SSL on here broke the
  // unix-socket URL the test harness uses.
  const pool = new Pool({ connectionString: dsn });

  try {
    if (undo) {
      let removed = 0;
      let kept = 0;
      for (const c of UZ_SCENARIOS) {
        const { rows } = await pool.query<{ id: number }>("select id from ctf_tasks where name = $1", [c.name]);
        if (rows.length === 0) continue;
        const id = rows[0].id;
        const { rows: solves } = await pool.query<{ n: string }>(
          "select count(*)::text as n from ctf_attempts where ctf_id = $1 and solved = true", [id],
        );
        if (Number(solves[0].n) > 0) {
          // Deleting would take points away from people who earned them.
          console.log(`  keep   ${c.name} — has ${solves[0].n} solve(s)`);
          kept++;
          continue;
        }
        if (!dryRun) {
          await pool.query("delete from ctf_attempts where ctf_id = $1", [id]);
          await pool.query("delete from ctf_tasks where id = $1", [id]);
        }
        console.log(`  delete ${c.name}`);
        removed++;
      }
      console.log(`\n${dryRun ? "[dry-run] " : ""}removed ${removed}, kept ${kept}`);
      return;
    }

    let inserted = 0;
    let updated = 0;
    for (const c of UZ_SCENARIOS) {
      const { rows } = await pool.query<{ id: number }>("select id from ctf_tasks where name = $1", [c.name]);

      if (rows.length === 0) {
        if (!dryRun) {
          await pool.query(
            `insert into ctf_tasks
               (name, name_uz, name_ru, description, description_uz, description_ru,
                category, difficulty, points, flag, hint, hint_uz, hint_ru, hint_cost, is_published)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true)`,
            [c.name, c.nameUz, c.nameRu, c.description, c.descriptionUz, c.descriptionRu,
             c.category, c.difficulty, c.points, hashFlag(c.flag), c.hint, c.hintUz, c.hintRu, c.hintCost],
          );
        }
        console.log(`  insert ${c.category.padEnd(14)} ${c.name}`);
        inserted++;
        continue;
      }

      const id = rows[0].id;
      const { rows: solves } = await pool.query<{ n: string }>(
        "select count(*)::text as n from ctf_attempts where ctf_id = $1 and solved = true", [id],
      );
      const alreadySolved = Number(solves[0].n) > 0;

      if (!dryRun) {
        // Text, points and hints are always refreshed; the flag only when
        // nobody has solved it yet.
        await pool.query(
          `update ctf_tasks set
             name_uz=$2, name_ru=$3, description=$4, description_uz=$5, description_ru=$6,
             category=$7, difficulty=$8, points=$9, hint=$10, hint_uz=$11, hint_ru=$12, hint_cost=$13
           where id=$1`,
          [id, c.nameUz, c.nameRu, c.description, c.descriptionUz, c.descriptionRu,
           c.category, c.difficulty, c.points, c.hint, c.hintUz, c.hintRu, c.hintCost],
        );
        if (!alreadySolved) {
          await pool.query("update ctf_tasks set flag=$2 where id=$1", [id, hashFlag(c.flag)]);
        }
      }
      console.log(`  update ${c.category.padEnd(14)} ${c.name}${alreadySolved ? " (flag kept — already solved)" : ""}`);
      updated++;
    }

    console.log(`\n${dryRun ? "[dry-run] " : ""}${inserted} inserted, ${updated} updated, ${UZ_SCENARIOS.length} total`);
    console.log("Categories:", [...new Set(UZ_SCENARIOS.map(c => c.category))].sort().join(", "));
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
