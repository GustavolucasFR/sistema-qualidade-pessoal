const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        SELECT 
            pd.tipo_de_atividade,
            UPPER(
                TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
                CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
                CASE 
                    WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) IN ('não', 'nao') THEN 'Não' 
                    WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
                    ELSE '-' 
                END
            ) as chave_gerada_normal
        FROM importador.zeus_consolidado pd
        WHERE pd.data_agendada_para_execu__o::date = '2026-07-14' AND pd.status = 'Concluída'
        LIMIT 10;
        `;
        const r1 = await client.query(query);
        console.table(r1.rows);
    } catch (e) { console.error(e); }
    client.end();
});
