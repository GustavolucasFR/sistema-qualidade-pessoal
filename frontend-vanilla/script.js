const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const btnAnalisar = document.getElementById('btnAnalisar');
const processingState = document.getElementById('processingState');

// KPIs
const kpiTotal = document.getElementById('kpiTotal');
const kpiSuccess = document.getElementById('kpiSuccess');
const kpiError = document.getElementById('kpiError');

// Tabela e Download
const tableBody = document.getElementById('tableBody');
const btnDownload = document.getElementById('btnDownload');

let selectedFile = null;

// Eventos de Drag & Drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
        dropzone.classList.add('dragover');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
        dropzone.classList.remove('dragover');
    }, false);
});

dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

dropzone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        selectedFile = files[0];
        
        // Atualiza a UI para mostrar o arquivo
        dropzone.innerHTML = `
            <i class="fa-solid fa-file-excel drop-icon" style="color: var(--accent-primary);"></i>
            <h3 style="color: var(--text-main);">${selectedFile.name}</h3>
            <p>${(selectedFile.size / 1024).toFixed(2)} KB</p>
        `;
        
        btnAnalisar.disabled = false;
    }
}

// Simular Análise
btnAnalisar.addEventListener('click', () => {
    if (!selectedFile) return;

    // Estado de Loading
    btnAnalisar.disabled = true;
    dropzone.style.opacity = '0.5';
    processingState.classList.remove('hidden');

    // Reset UI
    tableBody.innerHTML = '';
    kpiTotal.innerText = '-';
    kpiSuccess.innerText = '-';
    kpiError.innerText = '-';
    btnDownload.disabled = true;

    // Simulação do backend (Node + Python) - Delay de 2 segundos
    setTimeout(() => {
        mockBackendResponse();
    }, 2000);
});

function mockBackendResponse() {
    // Esconder loading
    processingState.classList.add('hidden');
    dropzone.style.opacity = '1';
    btnAnalisar.disabled = false;

    // Dados Fictícios do motor_regras.py
    const mockResult = {
        status: "sucesso",
        kpis: {
            total_linhas: 1250,
            linhas_conformes: 1247,
            linhas_com_erro: 3
        },
        erros_detalhados: [
            {
                linha_excel: 42,
                erros: ["A coluna 'Preco' é obrigatória e está vazia."],
                dados_linha: { ID: "PROD-042", NomeProduto: "Teclado Mecânico" }
            },
            {
                linha_excel: 89,
                erros: ["O valor 'Em Estoque' em 'Status' é inválido. Permitidos: Ativo, Inativo, Em Revisão."],
                dados_linha: { ID: "PROD-089", NomeProduto: "Monitor 24" }
            },
            {
                linha_excel: 312,
                erros: ["O valor em 'Preco' deve ser maior que 0."],
                dados_linha: { ID: "PROD-312", NomeProduto: "Mousepad", Preco: 0 }
            }
        ],
        caminho_csv_saida: "/dados/2_dados_consolidados/planilha_teste_processado.csv"
    };

    renderResults(mockResult);
}

function renderResults(resultado) {
    // Update KPIs com animação simples
    animateValue(kpiTotal, 0, resultado.kpis.total_linhas, 1000);
    animateValue(kpiSuccess, 0, resultado.kpis.linhas_conformes, 1000);
    animateValue(kpiError, 0, resultado.kpis.linhas_com_erro, 1000);

    // Update Table
    if (resultado.erros_detalhados.length > 0) {
        resultado.erros_detalhados.forEach(erro => {
            const tr = document.createElement('tr');
            
            // Formatando erros em tags
            const tagsErros = erro.erros.map(e => `<span class="error-tag">${e}</span>`).join('');
            
            tr.innerHTML = `
                <td><strong>#${erro.linha_excel}</strong></td>
                <td>${tagsErros}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" title="Ver Detalhes">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--success);">
                    <i class="fa-solid fa-check-circle"></i> Nenhuma inconsistência encontrada!
                </td>
            </tr>
        `;
    }

    // Enable Download
    btnDownload.disabled = false;
}

// Helper para animar números
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}
