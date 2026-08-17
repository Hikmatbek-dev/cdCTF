require("dotenv").config({ path: "./artifacts/api-server/.env" });
const { Client } = require("pg");
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  const res = await client.query("SELECT id, title, flag, is_hashed FROM ctf_challenges WHERE title ILIKE '%handshake%'");
  console.log(res.rows);
  client.end();
});
