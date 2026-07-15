const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Checking if we can find these logins in tecnicos:");
        const r2 = await client.query(`
            SELECT b.mat_vivo, b.nome, b.empresa
            FROM importador.tecnicos b
            WHERE b.mat_vivo::text IN ('G0043264', '80471704', '81077501', '81044838', '80849851')
        `);
        console.table(r2.rows);

        const r3 = await client.query(`
            SELECT count(*) 
            FROM importador.zeus_consolidado z
            JOIN importador.tecnicos b ON b.mat_vivo::text = z.login_tecnico
            WHERE (z.empresa IS NULL OR z.empresa = 'nan')
              AND z.login_tecnico NOT ILIKE 'BKT_%'
        `);
        console.log("Matches found in tecnicos:", r3.rows[0].count);

        console.log("Updating zeus_consolidado with tecnicos...");
        await client.query(`
            UPDATE importador.zeus_consolidado z
            SET empresa = b.empresa,
                tecnicos = b.nome
            FROM importador.tecnicos b
            WHERE b.mat_vivo::text = z.login_tecnico
              AND (z.empresa IS NULL OR z.empresa = 'nan')
        `);

        // Refresh views
        console.log("Refreshing fatos_dashboard...");
        await client.query(`REFRESH MATERIALIZED VIEW importador.fatos_dashboard`);

        console.log("Done.");

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
