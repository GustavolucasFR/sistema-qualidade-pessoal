const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT SUM(producao_rs) as total 
            FROM importador.fatos_dashboard 
            WHERE UPPER(TRIM(empresa)) = 'TECNOMULTI'
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
