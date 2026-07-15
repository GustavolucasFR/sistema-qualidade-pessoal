const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Updating missing tecnologia to GPON...");
        
        const res = await client.query(`
            UPDATE importador.zeus_consolidado
            SET tecnologia = 'GPON'
            WHERE (tecnologia IS NULL OR tecnologia = 'nan' OR tecnologia = '')
        `);
        console.log("Updated " + res.rowCount + " rows.");

        console.log("Refreshing fatos_dashboard using test_motor.js...");

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
