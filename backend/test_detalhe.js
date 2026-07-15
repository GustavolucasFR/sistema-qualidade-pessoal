const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT DISTINCT detalhe_da_atividade FROM importador.zeus_consolidado WHERE tipo_de_atividade ILIKE '%defeito%' LIMIT 10")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
