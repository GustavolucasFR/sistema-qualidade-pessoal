const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query(`
SELECT SUM(
    CASE WHEN pd.status = 'Concluída' THEN 
        COALESCE(re1.receita_vivo, re2.receita_vivo, 0) + COALESCE(re1.receita_fibrasil, re2.receita_fibrasil, 0)
    ELSE 0 END
) as total
FROM importador.zeus_consolidado pd
LEFT JOIN importador.macro_atividades ma ON UPPER(TRIM(pd.tipo_de_atividade)) = UPPER(TRIM(ma.atividade_zeus))
LEFT JOIN importador.regras_receita_extra re1 ON UPPER(TRIM(re1.chave)) = UPPER(
    TRIM(pd.tipo_de_atividade) || 
    TRIM(pd.estado) || 
    TRIM(pd.tecnologia_gpon) || 
    TRIM(CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FIBRASIL' ELSE 'VIVO' END) ||
    TRIM(LOWER(pd.o_protetor_de_surto_externo_foi_instalado_nessa_visita_)) ||
    TRIM(LOWER(pd.o_protetor_de_surto_externo_j__estava_instalado_no_modem_))
)
LEFT JOIN importador.regras_receita_extra re2 ON UPPER(TRIM(re2.chave)) = UPPER(
    TRIM(ma.macro_atividade) || 
    TRIM(pd.estado) || 
    TRIM(pd.tecnologia_gpon) || 
    TRIM(CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FIBRASIL' ELSE 'VIVO' END) ||
    TRIM(LOWER(pd.o_protetor_de_surto_externo_foi_instalado_nessa_visita_)) ||
    TRIM(LOWER(pd.o_protetor_de_surto_externo_j__estava_instalado_no_modem_))
)
WHERE EXTRACT(MONTH FROM CASE WHEN EXTRACT(DAY FROM pd.data_agendada_para_execu__o::date) >= 21 THEN pd.data_agendada_para_execu__o::date + interval '1 month' ELSE pd.data_agendada_para_execu__o::date END) = 7
`)).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
