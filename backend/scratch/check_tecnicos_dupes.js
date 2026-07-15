const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT mat_vivo, count(*) FROM importador.tecnicos GROUP BY mat_vivo HAVING count(*) > 1`);
    console.log('tecnicos dupes:', r.rows);
    pool.end();
}
check();
