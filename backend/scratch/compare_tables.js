const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT 
                SUM(receita_total) as r_detalhado
            FROM importador.producao_ba_detalhado
            WHERE UPPER(TRIM(empresa)) = 'TECNOMULTI'
        `);
        console.log("Total in producao_ba_detalhado:", r.rows[0].r_detalhado);

        const r2 = await client.query(`
            SELECT 
                SUM(receita_total) as r_dashboard
            FROM importador.fatos_dashboard
            WHERE UPPER(TRIM(empresa)) = 'TECNOMULTI'
        `);
        console.log("Total in fatos_dashboard:", r2.rows[0].r_dashboard);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
