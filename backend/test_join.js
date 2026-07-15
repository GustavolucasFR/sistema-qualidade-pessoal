const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT pd.tipo_de_atividade, ma.macro_atividade FROM importador.zeus_consolidado pd LEFT JOIN importador.macro_atividades ma ON UPPER(TRIM(pd.tipo_de_atividade)) = UPPER(TRIM(ma.atividade_zeus)) WHERE pd.tipo_de_atividade ILIKE '%defeito%' LIMIT 5")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
