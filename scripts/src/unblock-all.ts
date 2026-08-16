import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const pool = new Pool({ connectionString });

async function main() {
  const ctfRes = await pool.query(`UPDATE ctf_attempts SET blocked = false, wrong_attempts = 0 WHERE blocked = true`);
  console.log(`Unblocked ${ctfRes.rowCount} CTF attempts.`);

  const lessonRes = await pool.query(`UPDATE user_lesson_attempts SET blocked = false WHERE blocked = true`);
  console.log(`Unblocked ${lessonRes.rowCount} lesson attempts.`);
  
  const examRes = await pool.query(`UPDATE user_module_exams SET blocked = false, escape_count = 0 WHERE blocked = true`);
  console.log(`Unblocked ${examRes.rowCount} module exam attempts.`);
}

main().then(() => pool.end()).catch(err => { console.error(err); pool.end(); });
