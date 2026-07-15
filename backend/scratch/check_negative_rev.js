const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT login_tecnico, receita_total
            FROM importador.producao_ba_detalhado 
            WHERE data::date = '2026-07-08'
              AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
              AND receita_total < 0
            LIMIT 10
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
