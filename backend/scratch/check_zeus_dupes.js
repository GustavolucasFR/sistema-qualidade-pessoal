const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT n_mero_da_ordem_de_servi_o, count(*) FROM importador.zeus_consolidado GROUP BY n_mero_da_ordem_de_servi_o HAVING count(*) > 1 LIMIT 5`);
    console.table(r.rows);
    pool.end();
}
check();
