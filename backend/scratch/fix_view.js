const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Fixing producao_ba_detalhado view...");
        
        await client.query(`DROP MATERIALIZED VIEW IF EXISTS importador.fatos_dashboard CASCADE;`);
        await client.query(`DROP VIEW IF EXISTS importador.producao_ba_detalhado CASCADE;`);

        await client.query(`
        CREATE VIEW importador.producao_ba_detalhado AS
        SELECT 
            login_tecnico::text as login_tecnico,
            cidade::text,
            cidade::text as cluster,
            tipo_de_atividade::text as macro_ativdade,
            0.0::double precision as ptbaremo,
            COALESCE(re.receita_vivo, r.receita_vivo, 0) as receita_vivo,
            COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0) as receita_fibrasil,
            (COALESCE(re.receita_vivo, r.receita_vivo, 0) + COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0)) as receita_total,
            0::bigint as data_agendada_para_execucao,
            NULL::text as periodo,
            NULL::text as ciclo,
            status::text,
            empresa::text,
            tipo_de_atividade::text,
            data_agendada_para_execu__o::timestamp as data
        FROM importador.zeus_consolidado pd
        LEFT JOIN importador.regras_receita_extra re ON UPPER(TRIM(re.chave)) = UPPER(
            TRIM(pd.tipo_de_atividade) || TRIM(pd.estado) || TRIM(pd.tecnologia) || 
            CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FiBrasil' ELSE 'Vivo' END || 
            CASE 
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'não' THEN 'Não'
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'sim' THEN 'Sim'
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'sim parcialmente' THEN 'Sim'
              WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'sim - parcial' THEN 'Sim'
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
        );
        `);

        console.log("Rebuilding fatos_dashboard using test_motor.js...");

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
