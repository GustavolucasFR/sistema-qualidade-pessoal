const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

async function listTables() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'importador'
    `);
    console.log("Tables:");
    console.log(res.rows.map(r => r.table_name).join(', '));

    for (let row of res.rows) {
        const cols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'importador' AND table_name = $1
        `, [row.table_name]);
        console.log(`\nTable ${row.table_name} columns:`);
        console.log(cols.rows.map(r => r.column_name).join(', '));
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

listTables();
