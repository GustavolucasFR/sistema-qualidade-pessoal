const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT chave, receita_vivo, receita_fibrasil
            FROM importador.regras_receita
            ORDER BY receita_vivo ASC
            LIMIT 5
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
