const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function checkTotal() {
    try {
        let viewdef = await pool.query(`SELECT sum(producao_rs) FROM importador.fatos_dashboard`);
        console.log("Fatos Dashboard Total Producao RS:", viewdef.rows[0].sum);

        // Check deduplicate logic
        let testDedupe = await pool.query(`
            WITH ranked AS (
                SELECT ctid,
                       ROW_NUMBER() OVER(
                           PARTITION BY n_mero_da_ordem_de_servi_o 
                           ORDER BY 
                               CASE WHEN status = 'Concluída' THEN 1 ELSE 2 END,
                               data_agendada_para_execu__o DESC
                       ) as rn
                FROM importador.zeus_consolidado
            )
            SELECT count(*) FROM ranked WHERE rn > 1;
        `);
        console.log("Rows that would be deleted with smart dedupe:", testDedupe.rows[0].count);
        
        let exactDupes = await pool.query(`
            WITH ranked AS (
                SELECT ctid,
                       ROW_NUMBER() OVER(
                           PARTITION BY n_mero_da_ordem_de_servi_o, status, data_agendada_para_execu__o, tipo_de_atividade
                           ORDER BY ctid DESC
                       ) as rn
                FROM importador.zeus_consolidado
            )
            SELECT count(*) FROM ranked WHERE rn > 1;
        `);
        console.log("Exact duplicates:", exactDupes.rows[0].count);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkTotal();
