const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT data_agendada_para_execu__o::date as dia, status, count(*) 
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date >= '2026-07-08'
              AND data_agendada_para_execu__o::date <= '2026-07-11'
            GROUP BY 1, 2
            ORDER BY 1, 3 DESC
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
