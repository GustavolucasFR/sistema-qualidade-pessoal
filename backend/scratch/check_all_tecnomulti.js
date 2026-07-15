const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT 
                empresa, 
                SUM(receita_total) as receita 
            FROM importador.producao_ba_detalhado 
            WHERE empresa ILIKE '%TECNOMULTI%'
            GROUP BY empresa
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
