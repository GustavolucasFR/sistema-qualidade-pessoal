const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Checking if we can find these logins in base_de_tecnicos:");
        const r2 = await client.query(`
            SELECT b.matricula, b.nome, b.empresa
            FROM importador.base_de_tecnicos b
            WHERE b.matricula IN ('G0043264', '80471704', '81077501', '81044838', '80849851')
        `);
        console.table(r2.rows);

        const r3 = await client.query(`
            SELECT z.login_tecnico, z.status, b.empresa
            FROM importador.zeus_consolidado z
            JOIN importador.base_de_tecnicos b ON b.matricula = z.login_tecnico
            WHERE (z.empresa IS NULL OR z.empresa = 'nan')
              AND z.login_tecnico NOT ILIKE 'BKT_%'
            LIMIT 5
        `);
        console.table(r3.rows);

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
