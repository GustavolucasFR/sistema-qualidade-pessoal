const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'postgres', password: 'postgres', port: 5432 });

const query = `
    DROP MATERIALIZED VIEW IF EXISTS importador.fatos_dashboard;
    CREATE MATERIALIZED VIEW importador.fatos_dashboard AS
    WITH regras_combinadas AS (
        SELECT 
            pd.n_mero_da_ordem_de_servi_o as id_os,
            pd.data_agendada_para_execu__o::date as data_execucao,
            
            -- Calculo do Mes Ciclo (dia 21 a dia 20)
            EXTRACT(MONTH FROM 
                CASE WHEN EXTRACT(DAY FROM pd.data_agendada_para_execu__o::date) >= 21 
                     THEN pd.data_agendada_para_execu__o::date + interval '1 month' 
                     ELSE pd.data_agendada_para_execu__o::date 
                END
            )::int as mes_ciclo,
            
            -- Tratamento de Cidade e Cluster
            UPPER(TRIM(pd.cidade)) as cidade_raw,
            CASE UPPER(TRIM(pd.cidade))
                WHEN 'CABEDELO' THEN 'JOAO PESSOA'
                WHEN 'CAMPINA GRANDE' THEN 'JOAO PESSOA'
                WHEN 'CARUARU' THEN 'CARUARU'
                WHEN 'GARANHUNS' THEN 'CARUARU'
                WHEN 'JABOATAO DOS GUARARAPES' THEN 'RECIFE'
                WHEN 'JOAO PESSOA' THEN 'JOAO PESSOA'
                WHEN 'JOÃO PESSOA' THEN 'JOAO PESSOA'
                WHEN 'MOSSORO' THEN 'NATAL'
                WHEN 'NATAL' THEN 'NATAL'
                WHEN 'PARNAMIRIM' THEN 'NATAL'
                WHEN 'PATOS' THEN 'JOAO PESSOA'
                WHEN 'RECIFE' THEN 'RECIFE'
                ELSE UPPER(TRIM(pd.cidade))
            END as cluster_oficial,
            
            -- Identificadores Pessoais
            pd.login_tecnico,
            t.mat_vivo,
            UPPER(TRIM(COALESCE(pd.tecnicos, pd.recurso, pd.nome_operador))) as nome_tecnico,
            
            -- Flags Operacionais (Atividades)
            pd.status,
            pd.tipo_de_atividade,
            CASE WHEN pd.tipo_de_atividade ILIKE '%instalação%' OR pd.tipo_de_atividade ILIKE '%instalacao%' THEN 1 ELSE 0 END as is_instalacao,
            CASE WHEN pd.tipo_de_atividade ILIKE '%mudança%' OR pd.tipo_de_atividade ILIKE '%mudanca%' THEN 1 ELSE 0 END as is_mudanca,
            CASE WHEN pd.tipo_de_atividade ILIKE '%reparo%' THEN 1 ELSE 0 END as is_reparo,
            CASE WHEN pd.status = 'Concluída' AND (
                      pd.tipo_de_atividade ILIKE '%instalação%' OR pd.tipo_de_atividade ILIKE '%instalacao%'
                   OR pd.tipo_de_atividade ILIKE '%mudança%' OR pd.tipo_de_atividade ILIKE '%mudanca%'
                   OR pd.tipo_de_atividade ILIKE '%alteração%' OR pd.tipo_de_atividade ILIKE '%alteracao%'
                 ) THEN 1 ELSE 0 END as is_produtivo,
            
            -- Calculo Financeiro
            CASE WHEN pd.status = 'Concluída' THEN 
                COALESCE(re.receita_vivo, r.receita_vivo, 0)
            ELSE 0 END as receita_vivo,
            
            CASE WHEN pd.status = 'Concluída' THEN 
                COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0)
            ELSE 0 END as receita_fibrasil,
            
            0::numeric as producao_preventiva,
            
            CASE WHEN pd.status = 'Concluída' THEN 
                COALESCE(re.receita_vivo, r.receita_vivo, 0) + COALESCE(re.receita_fibrasil, r.receita_fibrasil, 0)
            ELSE 0 END as producao_rs,
            
            -- Flags de Anomalias
            CASE WHEN UPPER(pd.status) LIKE '%CANCEL%' THEN 1 ELSE 0 END as is_cancelada,
            
            -- Empresa
            UPPER(TRIM(pd.empresa)) as empresa
            
        FROM importador.zeus_consolidado pd
        LEFT JOIN importador.tecnicos t ON t.mat_vivo::text = pd.login_tecnico::text
        LEFT JOIN importador.macro_atividades ma ON UPPER(TRIM(pd.tipo_de_atividade)) = UPPER(TRIM(ma.atividade_zeus))
        
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
        WHERE UPPER(TRIM(pd.empresa)) = 'TECNOMULTI'
    )
    SELECT * FROM regras_combinadas;
    
    CREATE INDEX idx_fatos_dashboard_data ON importador.fatos_dashboard(data_execucao);
    CREATE INDEX idx_fatos_dashboard_cluster ON importador.fatos_dashboard(cluster_oficial);
    CREATE INDEX idx_fatos_dashboard_mes ON importador.fatos_dashboard(mes_ciclo);
    CREATE INDEX idx_fatos_dashboard_status ON importador.fatos_dashboard(status);
`;

pool.query(query).then(() => {
    console.log("Materialized View importador.fatos_dashboard criada com sucesso!");
    return pool.query("SELECT COUNT(*) FROM importador.fatos_dashboard");
}).then(res => {
    console.log("Linhas carregadas:", res.rows[0].count);
    pool.end();
}).catch(console.error);
