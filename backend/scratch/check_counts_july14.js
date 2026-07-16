const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query1 = `
        SELECT empresa, COUNT(*) 
        FROM importador.zeus_consolidado 
        WHERE data_agendada_para_execu__o::date = '2026-07-14' 
        GROUP BY empresa;
        `;
        const r1 = await client.query(query1);
        console.log("Zeus consolidado 14/07 by empresa:");
        console.table(r1.rows);
        
        const query2 = `
        SELECT COUNT(*) 
        FROM importador.fatos_dashboard 
        WHERE data_execucao = '2026-07-14';
        `;
        const r2 = await client.query(query2);
        console.log("Fatos Dashboard 14/07 total:", r2.rows[0].count);
    } catch (e) { console.error(e); }
    client.end();
});
