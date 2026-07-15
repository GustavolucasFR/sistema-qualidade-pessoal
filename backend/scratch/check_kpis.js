const pool = require('../src/config/db'); 
pool.query('SELECT "Mes_Referencia", tmr FROM importador.resultado_kpis').then(res => console.log(res.rows)).catch(console.error).finally(()=>pool.end());
