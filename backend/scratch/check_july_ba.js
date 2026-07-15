const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT data::date as dia, SUM(receita_total) as receita
            FROM importador.producao_ba_detalhado 
            WHERE data::date >= '2026-07-01'
              AND data::date <= '2026-07-13'
              AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
            GROUP BY 1
            ORDER BY 1
        `);
        console.log("Receita BA por Dia em Julho (TECNOMULTI):");
        r.rows.forEach(row => {
            const dateStr = row.dia.toISOString().split('T')[0];
            console.log(`${dateStr}: R$ ${row.receita}`);
        });
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
