const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function check() {
    let r = await pool.query(`SELECT status, SUM(producao_rs) FROM importador.fatos_dashboard WHERE data_execucao >= '2026-06-21' AND cluster_oficial IN ('NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA') GROUP BY status`);
    console.table(r.rows);
    pool.end();
}
check();
