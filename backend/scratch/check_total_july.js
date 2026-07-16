const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r1 = await client.query("SELECT SUM(producao_rs) FROM importador.fatos_dashboard WHERE data_execucao = '2026-07-14' AND is_cancelada = 0;");
        console.log("Total RS 14/07:", r1.rows[0]);
    } catch (e) { console.error(e); }
    client.end();
});
