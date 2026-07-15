const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function executarAuditoriaPython(caminhoArquivoExcel, tipoPlanilha) {
    return new Promise((resolve, reject) => {
        const scriptPython = path.resolve(__dirname, '../../analytics/motor_regras.py');
        const caminhoAbsolutoExcel = path.resolve(caminhoArquivoExcel);

        console.log(`\n[Node.js] Iniciando motor Python para: ${path.basename(caminhoAbsolutoExcel)}`);
        console.log(`[Node.js] Aplicando regras do tipo: "${tipoPlanilha}"\n`);

        const comando = `python "${scriptPython}" "${caminhoAbsolutoExcel}" "${tipoPlanilha}"`;

        exec(comando, (error, stdout, stderr) => {
            if (error) return reject(error);
            try {
                resolve(JSON.parse(stdout));
            } catch (err) {
                console.error(stdout);
                reject(err);
            }
        });
    });
}

async function testarFluxo() {
    const arquivoTeste = path.resolve(__dirname, '../../dados/1_uploads_brutos/planilha_teste.xlsx');
    
    if (!fs.existsSync(arquivoTeste)) {
        console.error(`\n❌ ATENÇÃO: Arquivo não encontrado em: ${arquivoTeste}`);
        return;
    }

    try {
        const resultado = await executarAuditoriaPython(arquivoTeste, 'telefonica_anexo09');

        if (resultado.status === 'sucesso') {
            console.log("✅ Processamento Concluído com Sucesso!");
            console.log(`📊 Linhas Analisadas : ${resultado.kpis.total_linhas}`);
            if (resultado.kpis.total_penalizacoes !== undefined) {
                console.log(`❌ Total de Penalizações: ${resultado.kpis.total_penalizacoes}`);
            } else {
                console.log(`✔️ Linhas Aprovadas  : ${resultado.kpis.linhas_conformes}`);
                console.log(`❌ Linhas com Erro   : ${resultado.kpis.linhas_com_erro}`);
            }
            console.log(`📁 Relatório salvo em: ${resultado.caminho_csv_saida}`);
            
            if (resultado.erros_detalhados && resultado.erros_detalhados.length > 0) {
                console.log("\n⚠️ Detalhe das Não-Conformidades (Amostra):");
                console.log(JSON.stringify(resultado.erros_detalhados.slice(0, 2), null, 2));
            }
        } else {
            console.error("❌ Erro interno Python:", resultado.mensagem);
        }
    } catch (erro) {
        console.error("❌ Falha na comunicação:", erro);
    }
}
testarFluxo();
