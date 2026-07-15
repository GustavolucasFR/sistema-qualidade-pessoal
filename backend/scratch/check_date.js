const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function checkDate() {
    try {
        let res = await pool.query(`SELECT MAX(data_execucao) FROM importador.fatos_dashboard`);
        console.log("MAX data_execucao:", res.rows[0].max);

        let countByMonth = await pool.query(`
            SELECT mes_ciclo, COUNT(*), SUM(producao_rs) 
            FROM importador.fatos_dashboard 
            GROUP BY mes_ciclo 
            ORDER BY mes_ciclo DESC
        `);
        console.log("By month:", countByMonth.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkDate();
