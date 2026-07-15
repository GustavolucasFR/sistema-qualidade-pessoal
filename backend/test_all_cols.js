const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado'")).then(res => { console.log(res.rows.map(r=>r.column_name).join(', ')); client.end(); }).catch(e => console.error(e));
