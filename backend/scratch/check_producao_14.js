const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Totais de ZEUS no dia 14/07:");
        const r1 = await client.query(`
            SELECT status, empresa, COUNT(*) as qtde
            FROM importador.zeus_consolidado
            WHERE data_agendada_para_execu__o::date = '2026-07-14'
            GROUP BY status, empresa;
        `);
        console.table(r1.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
