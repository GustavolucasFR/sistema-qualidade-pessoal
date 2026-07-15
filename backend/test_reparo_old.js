const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT * FROM importador.regras_receita WHERE atividade ILIKE '%REPARO%' LIMIT 10")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
