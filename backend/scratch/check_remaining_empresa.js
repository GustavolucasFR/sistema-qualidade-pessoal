const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r_count = await client.query(`
            SELECT count(*) 
            FROM importador.zeus_consolidado 
            WHERE (empresa IS NULL OR empresa = 'nan' OR empresa = '')
        `);
        console.log("Remaining with missing empresa:", r_count.rows[0].count);

        const r = await client.query(`
            SELECT login_tecnico, tecnicos, status, data_agendada_para_execu__o::date
            FROM importador.zeus_consolidado 
            WHERE (empresa IS NULL OR empresa = 'nan' OR empresa = '')
            LIMIT 10
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
