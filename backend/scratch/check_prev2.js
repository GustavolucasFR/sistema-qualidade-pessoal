const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT DISTINCT tipo_de_atividade
            FROM importador.zeus_consolidado
            WHERE tipo_de_atividade ILIKE '%preve%' OR tipo_de_atividade ILIKE '%prev%'
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
