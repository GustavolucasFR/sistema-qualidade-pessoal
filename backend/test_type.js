const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'importador' AND table_name = 'fatos_dashboard'")).then(res => { console.log(res.rows.find(c => c.column_name === 'producao_rs')); client.end(); }).catch(e => console.error(e));
