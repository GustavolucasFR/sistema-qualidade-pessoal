const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const query = `
        SELECT 
            pd.tipo_de_atividade,
            CASE 
                WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) IN ('não', 'nao') THEN 'Não'
                WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) IN ('sim', 'sim parcialmente', 'sim - parcial', 'sim - total') THEN 'Sim'
                ELSE '-'
            END as drop_tratado,
            re.chave as chave_extra,
            re.receita_vivo as rev_extra_vivo,
            re.receita_fibrasil as rev_extra_fib,
            r.chave as chave_normal,
            r.receita_vivo as rev_norm_vivo,
            r.receita_fibrasil as rev_norm_fib
        FROM importador.zeus_consolidado pd
        LEFT JOIN importador.regras_receita_extra re ON UPPER(TRIM(re.chave)) = UPPER(
            TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
            CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
            CASE 
                WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) IN ('não', 'nao') THEN 'Não'
                WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) IN ('sim', 'sim parcialmente', 'sim - parcial', 'sim - total') THEN 'Sim'
                ELSE '-'
            END ||
            CASE 
                WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) IN ('não', 'nao') THEN 'Não' 
                WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
                ELSE '-' 
            END
        )
        LEFT JOIN importador.regras_receita r ON UPPER(TRIM(r.chave)) = UPPER(
            TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
            CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
            CASE 
                WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) IN ('não', 'nao') THEN 'Não' 
                WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
                ELSE '-' 
            END
        )
        WHERE pd.data_agendada_para_execu__o::date = '2026-07-14' AND pd.status = 'Concluída'
        LIMIT 10;
        `;
        const r1 = await client.query(query);
        console.table(r1.rows);
    } catch (e) { console.error(e); }
    client.end();
});
