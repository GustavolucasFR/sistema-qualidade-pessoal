const http = require('http');

http.get('http://localhost:8080/api/producao-ba?empresa=TECNOMULTI', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      console.log('Cidades:', j.data_cidade.map(c => ({
          cluster: c.cluster, 
          parent: c.parent_cluster, 
          meta: c.meta_orcada, 
          prod: c.producao_rs
      })));
    } catch(e) {
      console.error(e);
    }
  });
}).on('error', console.error);
