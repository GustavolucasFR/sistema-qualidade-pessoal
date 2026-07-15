const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT login_tecnico, COUNT(*) as qtd
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date = '2026-07-08'
              AND (empresa IS NULL OR empresa = 'nan' OR empresa = '')
            GROUP BY 1
            ORDER BY 2 DESC
            LIMIT 10
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
