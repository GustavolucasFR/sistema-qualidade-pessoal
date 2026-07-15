const { Client } = require('pg');

const client = new Client('postgresql://postgres:postgres@localhost:5432/postgres');

client.connect().then(async () => {
    try {
        console.log("Fixing negative values in regras_receita...");
        
        await client.query(`
            UPDATE importador.regras_receita
            SET receita_vivo = 0
            WHERE receita_vivo < 0;
            
            UPDATE importador.regras_receita
            SET receita_fibrasil = 0
            WHERE receita_fibrasil < 0;
            
            UPDATE importador.regras_receita_extra
            SET receita_vivo = 0
            WHERE receita_vivo < 0;
            
            UPDATE importador.regras_receita_extra
            SET receita_fibrasil = 0
            WHERE receita_fibrasil < 0;
        `);

        console.log("Refreshing fatos_dashboard using test_motor.js...");

    } catch (e) {
        console.error(e.message);
    }
    client.end();
});
