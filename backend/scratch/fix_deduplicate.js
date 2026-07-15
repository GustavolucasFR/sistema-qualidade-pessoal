const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', password: 'postgres', host: 'localhost', database: 'postgres' });

async function fixDuplicates() {
    console.log("Removing duplicates from zeus_consolidado with priority for 'Concluída'...");
    try {
        await pool.query('BEGIN');
        
        let res = await pool.query(`
            WITH ranked AS (
                SELECT ctid,
                       ROW_NUMBER() OVER(
                           PARTITION BY n_mero_da_ordem_de_servi_o 
                           ORDER BY 
                               CASE WHEN status = 'Concluída' THEN 1 ELSE 2 END,
                               data_agendada_para_execu__o DESC,
                               ctid DESC
                       ) as rn
                FROM importador.zeus_consolidado
            )
            DELETE FROM importador.zeus_consolidado 
            WHERE ctid IN (
                SELECT ctid FROM ranked WHERE rn > 1
            );
        `);
        console.log(`Deleted ${res.rowCount} duplicate rows.`);

        console.log("Refreshing Materialized View fatos_dashboard...");
        await pool.query(`REFRESH MATERIALIZED VIEW importador.fatos_dashboard`);
        
        let ba = await pool.query(`SELECT sum(producao_rs) FROM importador.fatos_dashboard`);
        console.log("New BA Total:", ba.rows[0].sum);
        
        await pool.query('COMMIT');
        console.log("Done.");

    } catch (e) {
        await pool.query('ROLLBACK');
        console.error(e);
    } finally {
        pool.end();
    }
}
fixDuplicates();
