const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'regras_receita_extra'")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
