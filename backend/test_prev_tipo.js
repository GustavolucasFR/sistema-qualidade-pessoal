const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT DISTINCT tipo_de_atividade FROM importador.zeus_consolidado WHERE detalhe_da_atividade ILIKE '%PREV/%'")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
