const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`SELECT * FROM importador.base_de_tecnicos LIMIT 1`);
        console.log("Colunas exatas:", Object.keys(r.rows[0]));
        console.log(r.rows[0]);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
