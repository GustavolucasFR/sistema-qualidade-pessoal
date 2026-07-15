const pool = require('../src/config/db'); 
pool.query("SELECT view_definition FROM information_schema.views WHERE table_schema = 'importador' AND table_name = 'resultado_kpis'").then(res => console.log(res.rows[0])).catch(console.error).finally(()=>pool.end());
