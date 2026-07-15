const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT relation::regclass, mode, granted, pid FROM pg_locks WHERE relation::regclass::text ILIKE '%fatos%'")).then(res => { console.log(res.rows); client.end(); }).catch(e => console.error(e));
