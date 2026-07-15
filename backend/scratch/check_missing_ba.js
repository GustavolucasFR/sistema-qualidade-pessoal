const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function checkMissingBA() {
    try {
        let res = await pool.query(`
            SELECT tipo_de_atividade, estado, tecnologia, count(*)
            FROM importador.fatos_dashboard
            WHERE status = 'Concluída' AND producao_rs = 0
            GROUP BY tipo_de_atividade, estado, tecnologia
            ORDER BY count(*) DESC
        `);
        console.log("Concluída but 0 producao_rs:", res.rows);

        let sumRes = await pool.query(`SELECT sum(producao_rs) FROM importador.fatos_dashboard`);
        console.log("Current BA:", sumRes.rows[0].sum);

        // Also check if any rows were excluded by the empresa filter
        let empresaRes = await pool.query(`
            SELECT upper(TRIM(BOTH FROM empresa)) as emp, count(*)
            FROM importador.zeus_consolidado
            GROUP BY emp
        `);
        console.log("Empresas in zeus_consolidado:", empresaRes.rows);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkMissingBA();
