const { Client } = require("pg");
const client = new Client({ connectionString: "postgresql://postgres:password@localhost:5432/cyberplace" });
client.connect().then(() => {
  return client.query("SELECT id, name, flag FROM ctf_tasks;");
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
