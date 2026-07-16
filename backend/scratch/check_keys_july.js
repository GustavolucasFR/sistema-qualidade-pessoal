const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r1 = await client.query("SELECT tipo_de_atividade, estado, tecnologia, realizou_reaproveitamento_do_drop_, projeto_matrix__fibra_dedicada_, cidade FROM importador.zeus_consolidado WHERE data_agendada_para_execu__o::date = '2026-07-14' AND status = 'Concluída' LIMIT 5;");
        console.table(r1.rows);
    } catch (e) { console.error(e); }
    client.end();
});
