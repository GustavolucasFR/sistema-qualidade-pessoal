const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT login_tecnico, status, COUNT(*)
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date = '2026-07-08'
              AND (empresa IS NULL OR empresa = 'nan' OR empresa = '')
              AND login_tecnico ILIKE 'BKT_%'
            GROUP BY 1, 2
            ORDER BY 3 DESC
            LIMIT 10
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
