const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Top logins with null empresa in zeus_consolidado on 14/07:");
        const r2 = await client.query(`
            SELECT login_tecnico, COUNT(*) as qtde
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date = '2026-07-14'
              AND empresa IS NULL
            GROUP BY login_tecnico
            ORDER BY qtde DESC
            LIMIT 20;
        `);
        console.table(r2.rows);

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
