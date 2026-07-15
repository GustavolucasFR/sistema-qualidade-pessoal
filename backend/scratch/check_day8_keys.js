const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT 
                tipo_de_atividade,
                estado,
                tecnologia,
                cidade,
                realizou_reaproveitamento_do_drop_,
                projeto_matrix__fibra_dedicada_
            FROM importador.zeus_consolidado 
            WHERE data_agendada_para_execu__o::date = '2026-07-08'
              AND status = 'Concluída'
              AND login_tecnico = '81077674'
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
