const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        DELETE FROM importador.whitelist_armarios
        WHERE "ARMARIO" = 'PERCE_G1I07';
        `;
        const res = await client.query(query);
        console.log(`Deleted ${res.rowCount} rows.`);
    } catch (e) { console.error(e); }
    client.end();
});
