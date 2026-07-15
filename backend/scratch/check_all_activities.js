const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT tipo_de_atividade, COUNT(*) 
            FROM importador.zeus_consolidado
            WHERE status = 'Concluída' AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
            GROUP BY 1
            ORDER BY 1
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
