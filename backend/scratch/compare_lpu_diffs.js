const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT 
                pd.tipo_de_atividade,
                COUNT(*) as qty,
                SUM(COALESCE(re.receita_vivo, r.receita_vivo, 0) + COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0)) as receita_complexa,
                SUM(COALESCE(lpu.receita_vivo, 0)) as receita_lpu
            FROM importador.zeus_consolidado pd
            LEFT JOIN importador.lpu lpu ON UPPER(TRIM(lpu.atividade)) = UPPER(TRIM(pd.tipo_de_atividade))
            LEFT JOIN importador.regras_receita_extra re ON UPPER(TRIM(re.chave)) = UPPER(
                TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
                CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
                CASE 
                  WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'não' THEN 'Não'
                  WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) IN ('sim', 'sim parcialmente', 'sim - parcial') THEN 'Sim'
                  ELSE '-'
                END ||
                CASE 
                  WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
                  WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
                  ELSE '-' 
                END
            )
            LEFT JOIN importador.regras_receita r ON UPPER(TRIM(r.chave)) = UPPER(
                TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
                CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
                CASE 
                  WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'não' THEN 'Não' 
                  WHEN LOWER(TRIM(pd.projeto_matrix__fibra_dedicada_)) = 'sim' THEN 'Sim' 
                  ELSE '-' 
                END
            )
            WHERE pd.status = 'Concluída' 
              AND UPPER(TRIM(pd.empresa)) = 'TECNOMULTI'
              AND pd.data_agendada_para_execu__o::date >= '2026-07-01'
              AND pd.data_agendada_para_execu__o::date <= '2026-07-31'
            GROUP BY 1
            HAVING SUM(COALESCE(re.receita_vivo, r.receita_vivo, 0) + COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0)) > SUM(COALESCE(lpu.receita_vivo, 0))
            ORDER BY 3 DESC
            LIMIT 10
        `);
        console.table(r.rows);
    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
