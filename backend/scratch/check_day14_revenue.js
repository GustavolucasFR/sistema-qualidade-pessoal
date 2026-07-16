const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r1 = await client.query("SELECT COUNT(*), SUM(producao_rs) FROM importador.fatos_dashboard WHERE data_execucao = '2026-07-14' AND status = 'Concluída';");
        console.log("Total Concluidas:", r1.rows[0]);
        
        const r2 = await client.query("SELECT COUNT(*) FROM importador.fatos_dashboard WHERE data_execucao = '2026-07-14' AND status = 'Concluída' AND producao_rs = 0;");
        console.log("Total Concluidas with 0 revenue:", r2.rows[0].count);
        
        const r3 = await client.query("SELECT tipo_de_atividade, COUNT(*) FROM importador.fatos_dashboard WHERE data_execucao = '2026-07-14' AND status = 'Concluída' AND producao_rs = 0 GROUP BY tipo_de_atividade ORDER BY count DESC LIMIT 10;");
        console.log("Top atividades with 0 revenue:");
        console.table(r3.rows);

    } catch (e) { console.error(e); }
    client.end();
});
