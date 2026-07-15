const { Pool } = require('pg');
const pool = new Pool({connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'});
pool.query("SELECT TO_DATE('25/06/2026', 'DD/MM/YYYY') - TO_DATE('24/06/2026', 'DD/MM/YYYY') AS diff")
  .then(r => console.log(r.rows))
  .finally(() => pool.end());
