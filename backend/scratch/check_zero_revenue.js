const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');
client.connect().then(async () => {
    try {
        const r = await client.query(`
            SELECT 
                data::date as dia,
                COUNT(*) as qty,
                tipo_de_atividade
            FROM importador.producao_ba_detalhado 
            WHERE status = 'Concluída' 
              AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
              AND (receita_vivo = 0 AND receita_fibrasil = 0)
            GROUP BY dia, tipo_de_atividade
            ORDER BY dia DESC
        `);
        console.table(r.rows);

        const r2 = await client.query(`
            SELECT COUNT(*) as qty_zero
            FROM importador.producao_ba_detalhado 
            WHERE status = 'Concluída' 
              AND UPPER(TRIM(empresa)) = 'TECNOMULTI'
              AND (receita_vivo = 0 AND receita_fibrasil = 0)
        `);
        console.log("Total records with 0 revenue:", r2.rows[0].qty_zero);

        const r3 = await client.query(`
            SELECT 
                tipo_de_atividade,
                estado,
                tecnologia,
                cidade,
                COUNT(*) as qty
            FROM importador.zeus_consolidado pd
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
              AND COALESCE(re.receita_vivo, r.receita_vivo, 0) = 0 
              AND COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0) = 0
            GROUP BY 1, 2, 3, 4
            ORDER BY qty DESC
        `);
        console.table(r3.rows);

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
