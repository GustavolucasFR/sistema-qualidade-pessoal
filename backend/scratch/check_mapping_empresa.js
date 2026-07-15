const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Checking sample of missing empresa (not BKT_) in zeus_consolidado:");
        const r = await client.query(`
            SELECT login_tecnico, tecnicos, status, data_agendada_para_execu__o::date
            FROM importador.zeus_consolidado 
            WHERE (empresa IS NULL OR empresa = 'nan')
              AND login_tecnico NOT ILIKE 'BKT_%'
            LIMIT 10
        `);
        console.table(r.rows);

        const r_count = await client.query(`
            SELECT COUNT(*) 
            FROM importador.zeus_consolidado 
            WHERE (empresa IS NULL OR empresa = 'nan')
              AND login_tecnico NOT ILIKE 'BKT_%'
        `);
        console.log("Total missing empresa (not BKT_):", r_count.rows[0].count);

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
