const axios = require('axios');
axios.get('http://localhost:3001/api/producao-ba?mes=5').then(res => {
    console.log('Cluster Rows:', res.data.data_cluster.length, 'Total RS:', res.data.totais?.producao_rs);
}).catch(console.error);
