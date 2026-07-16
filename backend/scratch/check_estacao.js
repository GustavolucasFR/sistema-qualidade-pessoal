const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado' AND column_name LIKE 'esta%';
        `;
        const r1 = await client.query(query);
        console.table(r1.rows);
    } catch (e) { console.error(e); }
    client.end();
});
