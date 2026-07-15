const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Updating missing empresa using other rows from the same login_tecnico in zeus_consolidado...");
        
        await client.query(`
            UPDATE importador.zeus_consolidado z1
            SET empresa = z2.empresa
            FROM (
                SELECT login_tecnico, MAX(empresa) as empresa
                FROM importador.zeus_consolidado
                WHERE empresa IS NOT NULL AND empresa != 'nan' AND empresa != ''
                GROUP BY login_tecnico
            ) z2
            WHERE z1.login_tecnico = z2.login_tecnico
              AND (z1.empresa IS NULL OR z1.empresa = 'nan' OR z1.empresa = '')
        `);

        // Check if there are still Concluída orders with missing empresa on day 8
        const r = await client.query(`
            SELECT login_tecnico, empresa, COUNT(*)
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date = '2026-07-08'
              AND status = 'Concluída'
            GROUP BY 1, 2
            ORDER BY 3 DESC
            LIMIT 10
        `);
        console.table(r.rows);

        console.log("Refreshing fatos_dashboard...");
        await client.query(`REFRESH MATERIALIZED VIEW importador.fatos_dashboard`);

        console.log("Done.");

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
