const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT count(*) as total FROM importador.zeus_consolidado WHERE UPPER(TRIM(empresa)) = 'TECNOMULTI'`);
    console.log('Total rows in zeus_consolidado:', r.rows[0].total);

    let r2 = await pool.query(`SELECT count(*) as total FROM importador.fatos_dashboard`);
    console.log('Total rows in fatos_dashboard:', r2.rows[0].total);

    pool.end();
}
check();
