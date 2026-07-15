const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function inspectDupe() {
    try {
        let dupe = await pool.query(`
            SELECT n_mero_da_ordem_de_servi_o, status, data_agendada_para_execu__o, tipo_de_atividade
            FROM importador.zeus_consolidado 
            WHERE n_mero_da_ordem_de_servi_o = '8-7MS95IRE:C00A39635B' OR n_mero_da_ordem_de_servi_o = '192352888:V0001NVBYV'
            ORDER BY n_mero_da_ordem_de_servi_o
        `);
        console.log("Duplicate details:", dupe.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
inspectDupe();
