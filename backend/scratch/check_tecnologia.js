const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT data_agendada_para_execu__o::date as dia, 
                   COUNT(*) FILTER (WHERE tecnologia IS NULL OR tecnologia = 'nan') as qtd_null,
                   COUNT(*) FILTER (WHERE tecnologia IS NOT NULL AND tecnologia != 'nan') as qtd_not_null
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date >= '2026-07-01'
              AND data_agendada_para_execu__o::date <= '2026-07-13'
            GROUP BY 1
            ORDER BY 1
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
