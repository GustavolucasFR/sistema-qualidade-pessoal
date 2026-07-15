const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT 
                tipo_de_atividade,
                COUNT(*) as qty
            FROM importador.zeus_consolidado
            WHERE tipo_de_atividade ILIKE 'PREV%'
               OR tipo_de_atividade ILIKE '%PREV%'
               OR UPPER(TRIM(tipo_de_atividade)) IN (
                   'PREVENTIVA QUALIDADE BANDA LARGA',
                   'PREVENTIVA QUALIDADE TV'
               )
            GROUP BY 1
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
