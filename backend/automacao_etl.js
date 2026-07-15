const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' });

/**
 * Motor de ETL (Esqueleto)
 * Futuramente, esta classe será invocada por um Cron Job (ex: node-cron)
 * todos os dias de madrugada para ler os ficheiros do Sharepoint/FTP,
 * injetá-los na BD, e gerar Alertas.
 */
class MotorETL {
    async executar() {
        console.log("Iniciando rotina de ETL Automática...");
        
        try {
            await this.extrairDados();
            await this.transformarCarregar();
            await this.gerarAlertas();
            console.log("Rotina de ETL concluída com sucesso.");
        } catch (error) {
            console.error("Erro fatal no ETL:", error);
        }
    }

    async extrairDados() {
        console.log("1. Extracção de Dados (A conectar a fontes...)");
        // TODO: Lógica para consumir API do Zeus ou ler de pasta partilhada
        // ex: fetch('api-zeus/dados-ontem')
    }

    async transformarCarregar() {
        console.log("2. Transformação e Carregamento...");
        // TODO: Lógica que hoje está em importar_excel.py
        // Inserção na tabela importador.resultados_sla
    }

    async gerarAlertas() {
        console.log("3. Detecção de Anomalias e Geração de Alertas...");
        
        // Exemplo: Simulação de geração de alerta se TDNA > 15%
        const clustersOffensores = await pool.query(`
            SELECT cidade, MAX(tdna) as tdna_max 
            FROM importador.resultados_sla 
            GROUP BY cidade
            HAVING MAX(tdna) > 15
        `);

        for (const row of clustersOffensores.rows) {
            await pool.query(`
                INSERT INTO importador.alertas (tipo_alerta, mensagem, severidade, cluster)
                VALUES ($1, $2, $3, $4)
            `, [
                'TDNA Crítico', 
                `O cluster de ${row.cidade} apresentou TDNA de ${row.tdna_max}% (acima da margem de 15%).`, 
                'Alta', 
                row.cidade
            ]);
            console.log(`[ALERTA] TDNA Crítico gerado para ${row.cidade}`);
        }
    }
}

// Se for chamado diretamente via terminal
if (require.main === module) {
    const motor = new MotorETL();
    motor.executar().then(() => process.exit(0));
}

module.exports = MotorETL;
