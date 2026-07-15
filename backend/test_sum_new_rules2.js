const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT COUNT(*), SUM(COALESCE(re1.receita_vivo, 0)) FROM importador.zeus_consolidado pd LEFT JOIN importador.regras_receita_extra re1 ON UPPER(TRIM(re1.chave)) = UPPER(TRIM(pd.tipo_de_atividade) || CASE WHEN UPPER(pd.cidade) IN ('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS') THEN 'FIBRASILRN' ELSE 'VIVO' END)")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
