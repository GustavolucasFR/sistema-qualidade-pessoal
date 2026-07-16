const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        SELECT 
            pd.tipo_de_atividade as c1,
            pd.estado as c2,
            pd.tecnologia as c3,
            CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END as c4,
            CASE 
                WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) IN ('não', 'nao') THEN 'Não' 
                WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
                ELSE '-' 
            END as c5
        FROM importador.zeus_consolidado pd
        WHERE pd.data_agendada_para_execu__o::date = '2026-07-14' AND pd.status = 'Concluída'
        LIMIT 10;
        `;
        const r1 = await client.query(query);
        console.table(r1.rows);
    } catch (e) { console.error(e); }
    client.end();
});
