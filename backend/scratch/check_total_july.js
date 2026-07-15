const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT 
                SUM(receita_total) as receita 
            FROM importador.producao_ba_detalhado 
            WHERE EXTRACT(MONTH FROM CASE WHEN EXTRACT(DAY FROM data::date) >= 21 THEN data::date + interval '1 month' ELSE data::date END) = 7
              AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
