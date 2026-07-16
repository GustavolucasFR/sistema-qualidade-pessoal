fetch('http://localhost:3001/api/backlog/datas').then(r => r.json()).then(d => console.log('Datas:', d)).catch(e => console.error(e));
fetch('http://localhost:3001/api/backlog?groupBy=cidade').then(r => r.json()).then(d => console.log('Backlog:', d)).catch(e => console.error(e));
