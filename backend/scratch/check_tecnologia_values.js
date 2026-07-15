const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT tecnologia, COUNT(*)
            FROM importador.zeus_consolidado
            WHERE tecnologia IS NOT NULL AND tecnologia != 'nan' AND tecnologia != ''
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
