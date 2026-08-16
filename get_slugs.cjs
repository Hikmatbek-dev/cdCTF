const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/cdctf' });
pool.query('SELECT slug FROM learn_modules').then(res => {
  console.log(res.rows.map(r => r.slug));
  pool.end();
}).catch(err => {
  console.error("error", err.message);
  pool.end();
});
