const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'importador' AND table_name = 'backlogdiario_historico';
        `;
        const r1 = await client.query(query);
        console.table(r1.rows.filter(r => r.column_name.includes('STATUS')));
    } catch (e) { console.error(e); }
    client.end();
});
