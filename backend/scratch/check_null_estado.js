const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        SELECT estado, COUNT(*) 
        FROM importador.zeus_consolidado 
        WHERE data_agendada_para_execu__o::date = '2026-07-14' AND status = 'Concluída'
        GROUP BY estado;
        `;
        const r1 = await client.query(query);
        console.table(r1.rows);
    } catch (e) { console.error(e); }
    client.end();
});
