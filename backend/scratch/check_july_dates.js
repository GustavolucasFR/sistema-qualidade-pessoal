const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT data_agendada_para_execu__o::date as dia, COUNT(*) as qtd 
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date >= '2026-07-01'
              AND data_agendada_para_execu__o::date <= '2026-07-13'
            GROUP BY 1
            ORDER BY 1
        `);
        console.log("Dias em Julho:");
        r.rows.forEach(row => {
            const dateStr = row.dia.toISOString().split('T')[0];
            console.log(`${dateStr}: ${row.qtd} ordens`);
        });
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
