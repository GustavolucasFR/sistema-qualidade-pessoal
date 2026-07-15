const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT COUNT(*) as total, COUNT(DISTINCT n_mero_da_ordem_de_servi_o) as distinct_os FROM importador.zeus_consolidado`);
    console.table(r.rows);
    pool.end();
}
check();
