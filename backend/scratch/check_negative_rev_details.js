const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT login_tecnico, receita_vivo, receita_fibrasil, receita_total, macro_ativdade
            FROM importador.producao_ba_detalhado 
            WHERE login_tecnico = '81074634'
              AND data::date = '2026-07-08'
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
