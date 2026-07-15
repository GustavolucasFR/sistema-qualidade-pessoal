const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT * FROM importador.regras_reparo_extra LIMIT 10")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
