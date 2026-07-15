const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT pg_typeof(producao_rs) FROM importador.fatos_dashboard LIMIT 1")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
