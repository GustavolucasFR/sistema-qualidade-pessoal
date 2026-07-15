const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT data_agendada_para_execu__o::date as dia, COUNT(*)
            FROM importador.zeus_consolidado
            WHERE empresa IS NULL OR TRIM(empresa) = ''
            GROUP BY dia
            ORDER BY dia
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
