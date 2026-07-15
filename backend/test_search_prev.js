const { Client } = require('pg'); 
const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres'); 
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'importador' AND table_name = 'zeus_consolidado'")).then(async res => { 
  for(let row of res.rows) { 
    try { 
      let qr = await client.query(`SELECT count(*) FROM importador.zeus_consolidado WHERE "${row.column_name}"::text ILIKE '%PREV/%'`); 
      if (qr.rows[0].count > 0) console.log(row.column_name, qr.rows[0].count); 
    } catch(e){} 
  } 
  client.end(); 
}).catch(e => console.error(e));
