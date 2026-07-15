const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT DISTINCT UPPER(TRIM(empresa))
            FROM importador.zeus_consolidado
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
