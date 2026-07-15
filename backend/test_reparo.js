const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT chave, receita_vivo FROM importador.regras_receita_extra WHERE chave ILIKE '%REPARO%'")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
