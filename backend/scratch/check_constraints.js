const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'importador.zeus_consolidado'::regclass`);
    console.table(r.rows);
    pool.end();
}
check();
