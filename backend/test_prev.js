const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT detalhe_da_atividade, COUNT(*) FROM importador.zeus_consolidado WHERE UPPER(detalhe_da_atividade) LIKE '%PREV%' GROUP BY detalhe_da_atividade")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
