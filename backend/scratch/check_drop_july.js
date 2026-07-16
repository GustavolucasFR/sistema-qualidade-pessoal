const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        SELECT 
            pd.tipo_de_atividade,
            pd.realizou_reaproveitamento_do_drop_,
            CASE 
                WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'não' THEN 'Não'
                WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) IN ('sim', 'sim parcialmente', 'sim - parcial') THEN 'Sim'
                ELSE '-'
            END as drop_tratado,
            COUNT(*)
        FROM importador.zeus_consolidado pd
        WHERE pd.data_agendada_para_execu__o::date = '2026-07-14' AND pd.status = 'Concluída'
        GROUP BY 1, 2, 3
        ORDER BY 4 DESC
        LIMIT 10;
        `;
        const r1 = await client.query(query);
        console.table(r1.rows);
    } catch (e) { console.error(e); }
    client.end();
});
