const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT SUM(receita_total) as receita
            FROM importador.producao_ba_detalhado 
            WHERE (data::date BETWEEN '2026-07-08' AND '2026-07-11')
              AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
