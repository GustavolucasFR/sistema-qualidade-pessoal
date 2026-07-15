const pool = require('../src/config/db'); 
pool.query(`SELECT t_rmino_da_atividade, data_agendada_para_execu__o, in_cio_previsto, data_de_cria__o_da_atividade FROM importador.zeus_consolidado WHERE tipo_de_atividade ILIKE '%defeito%' AND (status ILIKE '%conclu%' OR status ILIKE '%cancel%') LIMIT 5`).then(res => console.log(res.rows)).catch(console.error).finally(()=>pool.end());
