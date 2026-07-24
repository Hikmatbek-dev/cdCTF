/**
 * Demo showcase content — so a first-time visitor (or an award judge) never
 * lands on an empty Competitions or Jobs page while the community is still
 * growing. It creates ONE sample sponsored competition and a demo employer with
 * a couple of job listings, then attaches the competition to challenges that
 * already exist.
 *
 * Deliberately honest: it does NOT fabricate learners, solves, or certificates.
 * Those feed the public /impact page, and inflating them would misrepresent the
 * platform's real reach. This seeds *features to look at*, not *metrics to
 * brag about*.
 *
 * Idempotent — safe to run more than once (keyed on the demo names/email).
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter ./scripts run seed-demo
 * Remove everything it created:
 *   DATABASE_URL=... pnpm --filter ./scripts run seed-demo -- --undo
 *
 * Optional env:
 *   SEED_SPONSOR_NAME   sponsor credited on the demo competition (default "Example Sponsor")
 *   SEED_SPONSOR_URL    sponsor link
 *   SEED_EMPLOYER_PASS  password for the demo employer login. If unset, a strong
 *                       random one is generated and printed once — never a fixed
 *                       default, so no known credential can be committed or
 *                       reused across deployments.
 */
import { Pool } from "pg";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const DEMO_TAG = "[demo] ";
const COMP_NAME = `${DEMO_TAG}cdCTF Open`;
const EMPLOYER_EMAIL = "demo-employer@cdctf.uz";
const EMPLOYER_NICK = "demo_employer";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const undo = process.argv.includes("--undo");
const pool = new Pool({ connectionString });

async function main() {
  if (undo) return removeDemo();

  const sponsorName = process.env.SEED_SPONSOR_NAME || "Example Sponsor";
  const sponsorUrl = process.env.SEED_SPONSOR_URL || null;
  // Never a fixed default: a committed password would let anyone log into this
  // account on a live deployment. Generate a strong one and print it once.
  const generatedPass = randomBytes(15).toString("base64url");
  const employerPass = process.env.SEED_EMPLOYER_PASS || generatedPass;

  // 1) A sponsored competition, active for the next week, attached to up to six
  //    existing published challenges so its page is populated.
  const existing = await pool.query("SELECT id FROM competitions WHERE name = $1 LIMIT 1", [COMP_NAME]);
  let compId: number;
  if (existing.rowCount) {
    compId = existing.rows[0].id;
    await pool.query(
      `UPDATE competitions SET sponsor_name=$2, sponsor_url=$3, prize=$4,
         start_time=now() - interval '1 hour', end_time=now() + interval '7 days'
       WHERE id=$1`,
      [compId, sponsorName, sponsorUrl, "1,000 USD + amaliyot / internship"],
    );
    console.log(`• Competition already existed (#${compId}) — refreshed.`);
  } else {
    const inserted = await pool.query(
      `INSERT INTO competitions (name, description, type, start_time, end_time, sponsor_name, sponsor_url, prize)
       VALUES ($1,$2,'public', now() - interval '1 hour', now() + interval '7 days', $3, $4, $5)
       RETURNING id`,
      [
        COMP_NAME,
        "A sample sponsored event. Solve challenges, climb the board, win the prize.",
        sponsorName, sponsorUrl, "1,000 USD + amaliyot / internship",
      ],
    );
    compId = inserted.rows[0].id;
    console.log(`• Created competition #${compId}.`);
  }

  const challenges = await pool.query("SELECT id FROM ctf_tasks WHERE is_published = true ORDER BY id LIMIT 6");
  for (const row of challenges.rows) {
    await pool.query(
      "INSERT INTO competition_tasks (competition_id, ctf_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [compId, row.id],
    );
  }
  console.log(`  attached ${challenges.rowCount} challenge(s).`);

  // 2) A demo employer account (so the job board is not empty).
  const foundEmployer = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [EMPLOYER_EMAIL]);
  let employerId: number;
  if (foundEmployer.rowCount) {
    employerId = foundEmployer.rows[0].id;
    await pool.query("UPDATE users SET is_employer = true, company_name = $2 WHERE id = $1", [employerId, "Example Corp"]);
    console.log(`• Employer already existed (#${employerId}).`);
  } else {
    const passwordHash = await bcrypt.hash(employerPass, 12);
    const insertedUser = await pool.query(
      `INSERT INTO users (nickname, email, password_hash, role, email_verified, is_employer, company_name)
       VALUES ($1,$2,$3,'user', true, true, $4) RETURNING id`,
      [EMPLOYER_NICK, EMPLOYER_EMAIL, passwordHash, "Example Corp"],
    );
    employerId = insertedUser.rows[0].id;
    console.log(`• Created employer #${employerId} — login ${EMPLOYER_EMAIL} / ${employerPass}`);
  }

  // 3) A couple of job listings.
  const jobs = [
    { title: `${DEMO_TAG}SOC Analyst (Intern)`, type: "internship", location: "Tashkent", desc: "Monitor alerts, triage incidents, learn on a real SOC. Great first role for a cdCTF graduate." },
    { title: `${DEMO_TAG}Junior Penetration Tester`, type: "full_time", location: "Tashkent / Remote", desc: "Web and network assessments alongside a senior team. cdCTF challenge experience valued." },
  ];
  for (const job of jobs) {
    const exists = await pool.query("SELECT id FROM jobs WHERE employer_id = $1 AND title = $2 LIMIT 1", [employerId, job.title]);
    if (exists.rowCount) continue;
    await pool.query(
      `INSERT INTO jobs (employer_id, title, company, description, location, employment_type, apply_url, is_active)
       VALUES ($1,$2,'Example Corp',$3,$4,$5,'https://example.com/apply', true)`,
      [employerId, job.title, job.desc, job.location, job.type],
    );
  }
  console.log(`• Ensured ${jobs.length} job listing(s).`);

  console.log("\nDone. This is demo content — replace the sponsor, employer and listings with real ones,");
  console.log("or run with --undo to remove it. The /impact numbers stay real either way.");
}

async function removeDemo() {
  const comp = await pool.query("SELECT id FROM competitions WHERE name = $1", [COMP_NAME]);
  for (const row of comp.rows) {
    await pool.query("DELETE FROM competition_tasks WHERE competition_id = $1", [row.id]);
    await pool.query("DELETE FROM competition_solves WHERE competition_id = $1", [row.id]);
    await pool.query("DELETE FROM competition_users WHERE competition_id = $1", [row.id]);
    await pool.query("DELETE FROM competition_teams WHERE competition_id = $1", [row.id]);
    await pool.query("DELETE FROM competitions WHERE id = $1", [row.id]);
  }
  const emp = await pool.query("SELECT id FROM users WHERE email = $1", [EMPLOYER_EMAIL]);
  for (const row of emp.rows) {
    await pool.query("DELETE FROM jobs WHERE employer_id = $1", [row.id]);
    await pool.query("DELETE FROM users WHERE id = $1", [row.id]);
  }
  console.log("Removed demo competition, employer and job listings.");
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
