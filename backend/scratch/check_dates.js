const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function checkDateRange() {
    try {
        let res = await pool.query(`
            SELECT MIN(data_agendada_para_execu__o), MAX(data_agendada_para_execu__o), count(*) 
            FROM importador.zeus_consolidado
        `);
        console.log("Zeus dates:", res.rows[0]);

        let grouped = await pool.query(`
            SELECT data_agendada_para_execu__o, count(*) 
            FROM importador.zeus_consolidado
            GROUP BY data_agendada_para_execu__o
            ORDER BY data_agendada_para_execu__o
        `);
        console.log("By day:", grouped.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkDateRange();
