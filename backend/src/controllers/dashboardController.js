const pool = require('../config/db');

// --- CÓDIGO RESTAURADO DAS ROTAS DO DASHBOARD ---

const getPenalizacoes = async (req, res) => {
    try {
        const query = 'SELECT * FROM importador.resultado_penalizacoes';
        const { rows } = await pool.query(query);

        if (!rows || rows.length === 0) {
            return res.json([]);
        }

        const results = rows.map(data => ({
            id: Math.random().toString(36).substring(2, 9),
            cliente: data['ID_Cliente'],
            tecnico: data['Tecnico_Responsavel'],
            motivo: data['Motivo_Penalizacao'] || 'Desconhecido',
            valor_apurado: parseFloat(data['Dias_Apurados'] || 0),
            mes: data['Mes_Referencia'] || 'Desconhecido',
            estado: data['Estado'] || 'Desconhecido',
            cidade: data['Cidade'] || 'Desconhecido',
            severidade: (data['Motivo_Penalizacao'] || '').includes('SLA') ? 'Critica' : 
                       ((data['Motivo_Penalizacao'] || '').includes('IFI') ? 'Alta' : 'Media')
        }));

        const agrupado = {};
        
        results.forEach(item => {
            if (!item.cliente || item.cliente === 'Desconhecido') return;
            
            const key = `${item.cliente}_${item.mes}_${item.tecnico}_${item.motivo}`;
            if (!agrupado[key]) {
                agrupado[key] = {
                    ...item,
                    ocorrencias_agrupadas: 1,
                    soma_apurado: item.valor_apurado
                };
            } else {
                agrupado[key].ocorrencias_agrupadas += 1;
                agrupado[key].soma_apurado += item.valor_apurado;
            }
        });
        
        const resultadosFinais = Object.values(agrupado).map(item => {
            const count = item.ocorrencias_agrupadas;
            
            if (count === 2 && item.severidade !== 'Critica') {
                item.severidade = 'Alta';
            } else if (count >= 3) {
                item.severidade = 'Critica';
            }
            
            if (item.motivo.includes('SLA')) {
                item.valor_apurado = item.soma_apurado;
            }
            
            return item;
        });
        
        res.json(resultadosFinais);
    } catch (err) {
        if (err.code === '42P01') {
            return res.json([]); 
        }
        res.status(500).json({ erro: 'Falha interna.' });
    }
};

const getFinanceiro = async (req, res) => {
    try {
        const query = 'SELECT * FROM importador.resultado_financeiro';
        const { rows } = await pool.query(query);

        if (!rows || rows.length === 0) {
            return res.json([]);
        }

        const results = rows.map(data => ({
            id: Math.random().toString(36).substring(2, 9),
            tecnico: data['NOME_TECNICO'] || data['Tecnico_Responsavel'],
            infracao: data['INFRACAO'] || data['Tipo_Infracao'],
            valor: parseFloat(data['Valor_Desconto_RS'] || 0),
            mes: data['Mes_Referencia'] || 'Desconhecido',
            estado: data['Estado'] || data['Status'] || 'Desconhecido',
            cidade: data['Cidade'] || 'Desconhecido'
        })).filter(item => {
            const st = (item.estado || '').toLowerCase();
            const inf = (item.infracao || '').toLowerCase();
            return !st.includes('cancelada') && !inf.includes('cancelada');
        });

        res.json(results);
    } catch (err) {
        if (err.code === '42P01') {
            return res.json([]); 
        }
        res.status(500).json({ erro: 'Falha interna.' });
    }
};

const getKpis = async (req, res) => {
    try {
        const query = 'SELECT * FROM importador.resultado_kpis';
        const { rows } = await pool.query(query);

        if (!rows || rows.length === 0) {
            return res.json({});
        }

        const kpis_por_mes = {};
        rows.forEach(row => {
            const mes = row['Mes_Referencia'];
            if (mes) {
                kpis_por_mes[mes] = {
                    nota: row.nota,
                    pontos: row.pontos,
                    reparo_4h: row.reparo_4h,
                    outlier_12h: row.outlier_12h,
                    tmr: row.tmr,
                    efetividade_altas: row.efetividade_altas,
                    minima_agenda: row.minima_agenda,
                    bd_planta: row.bd_planta
                };
            }
        });

        res.json(kpis_por_mes);
    } catch (err) {
        if (err.code === '42P01') {
            return res.json({}); 
        }
        res.status(500).json({ erro: 'Falha interna.' });
    }
};

const excelToISO_ms = (excelVal, baseDateExcel = 0) => {
    if (excelVal === null || excelVal === undefined || excelVal === '') return null;
    const num = parseFloat(excelVal);
    if (isNaN(num)) {
        if (typeof excelVal === 'string' && excelVal.includes('/')) {
            const parts = excelVal.split('/');
            if (parts.length === 3) {
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).getTime();
            }
        }
        return null;
    }
    let finalNum = num;
    if (num < 1 && baseDateExcel > 0) {
        finalNum = parseFloat(baseDateExcel) + num;
    }
    return Math.round((finalNum - 25569) * 86400 * 1000);
};


const formatDateTime = (dateStr, timeStr) => {
    if (!timeStr) return null;
    if (timeStr.length > 10) return timeStr; // Probably already has date
    if (!dateStr) return null;
    return `${dateStr.substring(0, 10)}T${timeStr}`;
};

const getOperacionalTodos = async (req, res) => {
    try {
        // Obter do zeus_consolidado
        let whereClause = `WHERE "data_agendada_para_execu__o" IS NOT NULL OR "data_de_cria__o_da_atividade" IS NOT NULL`;
        
        if (req.userRole === 'TECNICO') {
            whereClause = `WHERE ("data_agendada_para_execu__o" IS NOT NULL OR "data_de_cria__o_da_atividade" IS NOT NULL) AND (UPPER(TRIM("tecnicos")) = (SELECT UPPER(TRIM(nome)) FROM importador.base_de_tecnicos WHERE TRIM(matricula) = '${req.username}' LIMIT 1) OR UPPER(TRIM("recurso")) = (SELECT UPPER(TRIM(nome)) FROM importador.base_de_tecnicos WHERE TRIM(matricula) = '${req.username}' LIMIT 1))`;
        }

        const { rows } = await pool.query(`
            SELECT 
                zc."tecnicos", zc."recurso", zc."nome_operador", zc."empresa", zc."tipo_de_atividade",
                zc."n_mero_da_ordem_de_servi_o", zc."status", zc."cidade", zc."c_digo_de_cliente",
                zc."data_agendada_para_execu__o", zc."data_de_cria__o_da_atividade",
                zc."sla_fim", zc."t_rmino_da_atividade", zc."in_cio_previsto", zc."motivo_de_cancelamento",
                zc."zona_de_trabalho", zc."estado",
                ro.irr_pct, ro.ifi_pct
            FROM importador.zeus_consolidado zc
            LEFT JOIN (
                SELECT UPPER(TRIM(b.nome)) as tnome, MAX(r.irr_pct) as irr_pct, MAX(r.ifi_pct) as ifi_pct
                FROM importador.base_de_tecnicos b
                JOIN importador.remuneracao_oficial r ON b.matricula = r.matricula
                GROUP BY UPPER(TRIM(b.nome))
            ) ro ON ro.tnome = UPPER(TRIM(COALESCE(zc."tecnicos", zc."recurso", zc."nome_operador")))
            ${whereClause.replace(/\"(data_agendada_para_execu__o|data_de_cria__o_da_atividade|tecnicos|recurso)\"/g, 'zc."$1"')}
        `);

        if (!rows || rows.length === 0) return res.json([]);

        const mapping = {
            'CABEDELO': 'JOAO PESSOA', 'CAMPINA GRANDE': 'JOAO PESSOA', 'CARUARU': 'CARUARU',
            'GARANHUNS': 'CARUARU', 'JABOATAO DOS GUARARAPES': 'RECIFE', 'JOAO PESSOA': 'JOAO PESSOA', 'JOÃO PESSOA': 'JOAO PESSOA',
            'MOSSORO': 'NATAL', 'NATAL': 'NATAL', 'PARNAMIRIM': 'NATAL', 'PATOS': 'JOAO PESSOA', 'RECIFE': 'RECIFE'
        };
        const allowedClusters = ['NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA'];

        const results = rows.map(data => {
            const cityName = (data['cidade'] || '').toUpperCase().trim();
            let clusterMapped = mapping[cityName] || cityName;
            if (clusterMapped === 'JOÃO PESSOA') clusterMapped = 'JOAO PESSOA';

            return {
                id: Math.random().toString(36).substring(2, 10),
            tecnico: data['tecnicos'] || data['recurso'] || data['nome_operador'] || 'Desconhecido',
            empresa: data['empresa'] || 'Desconhecida',
            atividade: data['tipo_de_atividade'] || 'Desconhecida',
            os: data['n_mero_da_ordem_de_servi_o'],
            status: data['status'] || 'Desconhecido',
            cidade: data['cidade'] || 'Desconhecida',
            cluster: clusterMapped,
            cliente: data['c_digo_de_cliente'] || '',
            data_agendada: data['data_agendada_para_execu__o'],
            data_criacao: data['data_de_cria__o_da_atividade'],
            sla_fim: data['sla_fim'] ? data['sla_fim'].replace(' ', 'T') : null,
            termino_atividade: formatDateTime(data['data_agendada_para_execu__o'] || data['data_de_cria__o_da_atividade'], data['t_rmino_da_atividade']),
            inicio_previsto: formatDateTime(data['data_agendada_para_execu__o'] || data['data_de_cria__o_da_atividade'], data['in_cio_previsto']),
            motivo_cancelamento: data['motivo_de_cancelamento'],
            irr: data['irr_pct'] !== null ? parseFloat(data['irr_pct']) : null,
            ifi: data['ifi_pct'] !== null ? parseFloat(data['ifi_pct']) : null
            };
        }).filter(item => {
            if (!allowedClusters.includes(item.cluster)) return false;
            const st = (item.status || '').toLowerCase();
            const inf = (item.atividade || '').toLowerCase();
            return !st.includes('cancelada') && !inf.includes('cancelada');
        });
        res.json(results);
    } catch (err) {
        console.error('Erro getOperacionalTodos:', err);
        res.status(500).json({ erro: 'Falha interna.' });
    }
};

const timeToHours = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const t = timeStr.split(' ').pop();
    const parts = t.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0] || 0) + parseInt(parts[1] || 0)/60 + parseInt(parts[2] || 0)/3600;
};

const getSlasOfensores = async (req, res) => {
    try {
        const { mes } = req.query;
        let slaParams = [];
        let slaFilter = '';
        if (mes && mes !== 'Todos') {
            slaFilter = "AND TO_CHAR(rsz.data_execucao, 'YYYY-MM') = $1";
            slaParams = [mes];
        }

        const { rows: mesesRows } = await pool.query(`
            SELECT DISTINCT TO_CHAR(data_execucao, 'YYYY-MM') as mes
            FROM importador.resultados_sla_zeus
            WHERE data_execucao IS NOT NULL
            ORDER BY mes DESC
        `);
        const meses_disponiveis = mesesRows.map(r => r.mes);

        if (req.userRole === 'TECNICO') {
            slaFilter += ` AND UPPER(TRIM(rsz.tecnico)) = (SELECT UPPER(TRIM(nome)) FROM importador.base_de_tecnicos WHERE TRIM(matricula) = '${req.username}' LIMIT 1) `;
        }

        const { rows } = await pool.query(`
            SELECT rsz.tecnico, rsz.cidade as empresa, rsz.tempo_execucao, rsz.sla_alvo, rsz.status
            FROM importador.resultados_sla_zeus rsz
            INNER JOIN importador.base_de_tecnicos bt ON bt.nome = rsz.tecnico
            WHERE 1=1 ${slaFilter}
        `, slaParams);
        const ofensoresMap = {};
        
        rows.forEach(data => {
            const tecnico = data.tecnico || 'Desconhecido';
            const cidade = data.empresa || 'Desconhecida';
            
            const mapping = {
                'CABEDELO': 'JOAO PESSOA', 'CAMPINA GRANDE': 'JOAO PESSOA', 'CARUARU': 'CARUARU',
                'GARANHUNS': 'CARUARU', 'JABOATAO DOS GUARARAPES': 'RECIFE', 'JOAO PESSOA': 'JOAO PESSOA',
                'MOSSORO': 'NATAL', 'NATAL': 'NATAL', 'PARNAMIRIM': 'NATAL', 'PATOS': 'JOAO PESSOA', 'RECIFE': 'RECIFE'
            };
            const clusterName = mapping[cidade.toUpperCase().trim()];
            if (!clusterName) return; // whitelist armarios

            const status = (data.status || '').toUpperCase();
            
            if (status.includes('CONCLU') || status.includes('COMPLETA')) {
                const exeHoras = timeToHours(data.tempo_execucao);
                const slaHoras = timeToHours(data.sla_alvo);
                
                if (exeHoras > slaHoras && slaHoras > 0) {
                    const excedidoHoras = exeHoras - slaHoras;
                    const key = `${tecnico}|${cidade}`;
                    if (!ofensoresMap[key]) ofensoresMap[key] = { tecnico, empresa: cidade, falhas: 0, total_excedido: 0 };
                    ofensoresMap[key].falhas += 1;
                    ofensoresMap[key].total_excedido += excedidoHoras;
                }
            }
        });
        const results = Object.values(ofensoresMap).sort((a, b) => b.falhas - a.falhas);
        res.json({ ofensores: results, meses_disponiveis });
    } catch (err) {
        res.status(500).json({ erro: 'Falha ao calcular ofensores SLA.' });
    }
};

const getSlasFalhasTecnico = async (req, res) => {
    try {
        const { tecnico } = req.params;
        const { mes } = req.query;
        
        let slaParams = [tecnico];
        let slaFilter = 'WHERE rsz.tecnico = $1';
        if (mes && mes !== 'Todos') {
            slaFilter += " AND TO_CHAR(rsz.data_execucao, 'YYYY-MM') = $2";
            slaParams.push(mes);
        }

        const { rows } = await pool.query(`
            SELECT rsz.tipo_de_atividade as atividade, rsz.data_execucao, rsz.tempo_execucao, rsz.sla_alvo, rsz.status, rsz.cidade
            FROM importador.resultados_sla_zeus rsz
            INNER JOIN importador.base_de_tecnicos bt ON bt.nome = rsz.tecnico
            ${slaFilter}
        `, slaParams);
        
        const falhas = [];
        rows.forEach((data, i) => {
            const status = (data.status || '').toUpperCase();
            if (status.includes('CONCLU') || status.includes('COMPLETA')) {
                const exeHoras = timeToHours(data.tempo_execucao);
                const slaHoras = timeToHours(data.sla_alvo);
                if (exeHoras > slaHoras && slaHoras > 0) {
                    falhas.push({
                        os: `Atividade-${i+1}`,
                        atividade: data.atividade,
                        data_execucao: data.data_execucao,
                        sla_alvo: data.sla_alvo,
                        tempo_execucao: data.tempo_execucao,
                        tempo_excedido_horas: (exeHoras - slaHoras).toFixed(2),
                        cidade: data.cidade || 'N/A'
                    });
                }
            }
        });
        falhas.sort((a, b) => new Date(b.data_execucao) - new Date(a.data_execucao));
        res.json(falhas);
    } catch (err) {
        res.status(500).json({ erro: 'Falha ao buscar falhas do tecnico.' });
    }
};

const getPerfilTecnico = async (req, res) => {
    try {
        const { tecnico } = req.params;
        const { rows } = await pool.query(`
            SELECT rsz.status, rsz.tempo_execucao, rsz.sla_alvo, rsz.efetividade_tecnico, rsz.pontuacao_baremo
            FROM importador.resultados_sla_zeus rsz
            INNER JOIN importador.base_de_tecnicos bt ON bt.nome = rsz.tecnico
            WHERE rsz.tecnico = $1
        `, [tecnico]);
        
        let concluidas = 0;
        let falhasSLA = 0;
        let somaEfetividade = 0;
        let qtdEfetividade = 0;
        
        rows.forEach(data => {
            const status = (data.status || '').toUpperCase();
            if (status.includes('CONCLU') || status.includes('COMPLETA')) {
                concluidas++;
                const exeHoras = timeToHours(data.tempo_execucao);
                const slaHoras = timeToHours(data.sla_alvo);
                if (exeHoras > slaHoras && slaHoras > 0) {
                    falhasSLA++;
                }

                if (data.efetividade_tecnico !== null && data.efetividade_tecnico !== undefined) {
                    const efe = parseFloat(data.efetividade_tecnico);
                    if (!isNaN(efe)) {
                        somaEfetividade += efe;
                        qtdEfetividade++;
                    }
                }
            }
        });
        
        const cumprimento_sla = concluidas > 0 ? (((concluidas - falhasSLA) / concluidas) * 100).toFixed(1) : 0;
        const produtividade = qtdEfetividade > 0 ? (somaEfetividade / qtdEfetividade).toFixed(1) : 0;
        
        res.json({
            sla: {
                total_falhas: falhasSLA,
                cumprimento_perc: cumprimento_sla
            },
            indicadores_adicionais: {
                nota_eficiencia: cumprimento_sla, 
                nota_produtividade: produtividade
            }
        });
    } catch (err) {
        res.status(500).json({ erro: 'Falha ao buscar perfil do tecnico.' });
    }
};


const getClustersResumo = async (req, res) => {
    try {
        const mesParam = req.query.mes; // YYYY-MM
        let queryParams = [];
        let filterSla = '';
        let filterTdna = '';
        let filterBacklog = '';

        if (mesParam && mesParam !== 'Todos') {
            queryParams.push(mesParam);
            filterSla = "AND TO_CHAR(data_execucao, 'YYYY-MM') = $1";
            filterTdna = "AND TO_CHAR(data_agendada_para_execu_o::timestamp, 'YYYY-MM') = $1";
            
            // convert YYYY-MM to MM/YYYY for backlog (or keep it as substring match on DATA_CARGA)
            // Backlog typically has DD/MM/YYYY. If we have YYYY-MM, it's parts[1]/parts[0]
            const parts = mesParam.split('-');
            if (parts.length === 2) {
                const mesAno = `${parts[1]}/${parts[0]}`; // MM/YYYY
                filterBacklog = `AND "DATA_CARGA" LIKE '%${mesAno}%'`;
            }
        }

        const { rows } = await pool.query(`
            SELECT cidade, tempo_execucao, sla_alvo, status, efetividade_tecnico
            FROM importador.resultados_sla_zeus
            WHERE cidade IS NOT NULL ${filterSla}
        `, queryParams);
        
        const mapping = {
            'CABEDELO': 'JOAO PESSOA', 'CAMPINA GRANDE': 'JOAO PESSOA', 'CARUARU': 'CARUARU',
            'GARANHUNS': 'CARUARU', 'JABOATAO DOS GUARARAPES': 'RECIFE', 'JOAO PESSOA': 'JOAO PESSOA',
            'MOSSORO': 'NATAL', 'NATAL': 'NATAL', 'PARNAMIRIM': 'NATAL', 'PATOS': 'JOAO PESSOA', 'RECIFE': 'RECIFE'
        };
        
        const clusterStats = {};
        
        rows.forEach(data => {
            const cityName = (data.cidade || '').toUpperCase().trim();
            const clusterName = mapping[cityName];
            if (!clusterName) return;
            
            if (!clusterStats[clusterName]) {
                clusterStats[clusterName] = { 
                    total_falhas: 0, 
                    horas_perdidas: 0, 
                    concluidas: 0, 
                    soma_efetividade: 0,
                    qtd_efetividade: 0,
                    // Outros KPIs
                    eficiencia: null, produtividade: null, irt: null, tdna: null,
                    chegada_slot: null, efetividade: null, ifi_premium: null, irr_premium: null,
                    tdna_total: 0, tdna_falhas: 0,
                    ifi_irr_total: 0, ifi_falhas: 0, irr_falhas: 0
                };
            }
            
            const status = (data.status || '').toUpperCase();
            if (status.includes('CONCLU') || status.includes('COMPLETA')) {
                clusterStats[clusterName].concluidas++;
                const exeHoras = timeToHours(data.tempo_execucao);
                const slaHoras = timeToHours(data.sla_alvo);
                
                if (exeHoras > slaHoras && slaHoras > 0) {
                    clusterStats[clusterName].total_falhas++;
                    clusterStats[clusterName].horas_perdidas += (exeHoras - slaHoras);
                }
                
                if (data.efetividade_tecnico !== null && data.efetividade_tecnico !== undefined) {
                    const efe = parseFloat(data.efetividade_tecnico);
                    if (!isNaN(efe)) {
                        clusterStats[clusterName].soma_efetividade += efe;
                        clusterStats[clusterName].qtd_efetividade++;
                    }
                }
            }
        });

        // Buscar TDNA
        const { rows: tdnaRows } = await pool.query(`
            SELECT cidade, status
            FROM importador.metricas_tdna
            WHERE cidade IS NOT NULL ${filterTdna}
        `, queryParams);
        
        tdnaRows.forEach(data => {
            const cityName = (data.cidade || '').toUpperCase().trim();
            const clusterName = mapping[cityName];
            if (!clusterName || !clusterStats[clusterName]) return;
            
            const status = (data.status || '').toUpperCase();
            clusterStats[clusterName].tdna_total++;
            if (status.includes('CANCELAD') || status.includes('INCOMPLETA')) {
                clusterStats[clusterName].tdna_falhas++;
            }
        });

        // Buscar IFI e IRR
        // Here we do not pass queryParams to the third query because it doesn't use $1 safely (it uses LIKE directly).
        // It's safe since filterBacklog is constructed internally from mesParam splitting.
        const { rows: ifiIrrRows } = await pool.query(`
            SELECT "CITY" as cidade, 
                   SUM(CAST(NULLIF(TRIM(CAST("IFI" AS TEXT)), '') AS INTEGER)) as ifi_falhas, 
                   SUM(CAST(NULLIF(TRIM(CAST("IRR" AS TEXT)), '') AS INTEGER)) as irr_falhas, 
                   COUNT(*) as total 
            FROM importador.backlogdiario_historico 
            WHERE "CITY" IS NOT NULL ${filterBacklog}
            GROUP BY "CITY"
        `);
        
        ifiIrrRows.forEach(data => {
            const cityName = (data.cidade || '').toUpperCase().trim();
            const clusterName = mapping[cityName];
            if (!clusterName || !clusterStats[clusterName]) return;
            
            clusterStats[clusterName].ifi_falhas += parseInt(data.ifi_falhas || 0);
            clusterStats[clusterName].irr_falhas += parseInt(data.irr_falhas || 0);
            clusterStats[clusterName].ifi_irr_total += parseInt(data.total || 0);
        });

        const allowedClusters = ['NATAL', 'RECIFE', 'CARUARU', 'JOAO PESSOA'];
        const results = Object.keys(clusterStats)
            .filter(c => allowedClusters.includes(c))
            .sort()
            .map(cluster => {
            const stats = clusterStats[cluster];
            // Eficiência (Cumprimento de SLA)
            let eficiencia = 0;
            if (stats.concluidas > 0) {
                eficiencia = ((stats.concluidas - stats.total_falhas) / stats.concluidas) * 100;
            }
            
            let produtividade = null;
            if (stats.qtd_efetividade > 0) {
                produtividade = stats.soma_efetividade / stats.qtd_efetividade;
            }
            
            let tdna = null;
            if (stats.tdna_total > 0) {
                tdna = (stats.tdna_falhas / stats.tdna_total) * 100;
            }

            let ifi = null;
            let irr = null;
            if (stats.ifi_irr_total > 0) {
                // IFI/IRR premium >= 90 no frontend, então calculamos o percentual de SUCESSO (100 - falhas)
                ifi = 100 - ((stats.ifi_falhas / stats.ifi_irr_total) * 100);
                irr = 100 - ((stats.irr_falhas / stats.ifi_irr_total) * 100);
            }
            
            return {
                cluster: cluster,
                total_falhas: stats.total_falhas,
                horas_perdidas: parseFloat(stats.horas_perdidas.toFixed(1)),
                eficiencia: parseFloat(eficiencia.toFixed(1)),
                produtividade: produtividade !== null ? parseFloat(produtividade.toFixed(1)) : null, 
                irt: null, 
                tdna: tdna !== null ? parseFloat(tdna.toFixed(1)) : null,
                chegada_slot: null, 
                efetividade: produtividade !== null ? parseFloat(produtividade.toFixed(1)) : null, 
                ifi_premium: ifi !== null ? parseFloat(ifi.toFixed(1)) : null, 
                irr_premium: irr !== null ? parseFloat(irr.toFixed(1)) : null
            };
        });

        res.json(results);
    } catch (err) {
        console.error('Erro getClustersResumo:', err);
        res.status(500).json({ erro: 'Falha ao buscar resumo dos clusters.' });
    }
};

const getProdutividade = async (req, res) => {
    const { agrupamento = 'tecnico', periodo = 'mensal', cluster } = req.query;

    let groupCol = 'tecnico';
    if (agrupamento === 'cidade') groupCol = 'cidade';
    if (agrupamento === 'cluster') {
        groupCol = `
            CASE UPPER(TRIM(cidade))
                WHEN 'CABEDELO' THEN 'JOAO PESSOA'
                WHEN 'CAMPINA GRANDE' THEN 'JOAO PESSOA'
                WHEN 'CARUARU' THEN 'CARUARU'
                WHEN 'GARANHUNS' THEN 'CARUARU'
                WHEN 'JABOATAO DOS GUARARAPES' THEN 'RECIFE'
                WHEN 'JOAO PESSOA' THEN 'JOAO PESSOA'
                WHEN 'MOSSORO' THEN 'NATAL'
                WHEN 'NATAL' THEN 'NATAL'
                WHEN 'PARNAMIRIM' THEN 'NATAL'
                WHEN 'PATOS' THEN 'JOAO PESSOA'
                WHEN 'RECIFE' THEN 'RECIFE'
                ELSE UPPER(TRIM(cidade))
            END
        `;
    }

    let dataTrunc = "DATE_TRUNC('month', data_execucao)";
    if (periodo === 'semanal') dataTrunc = "DATE_TRUNC('week', data_execucao)";
    if (periodo === 'diaria') dataTrunc = "DATE_TRUNC('day', data_execucao)";

    let whereClause = `WHERE data_execucao IS NOT NULL AND UPPER(TRIM(tecnico)) != 'BUCKET'`;
    let params = [];
    
    const mapping = {
        'CABEDELO': 'JOAO PESSOA', 'CAMPINA GRANDE': 'JOAO PESSOA', 'CARUARU': 'CARUARU',
        'GARANHUNS': 'CARUARU', 'JABOATAO DOS GUARARAPES': 'RECIFE', 'JOAO PESSOA': 'JOAO PESSOA',
        'MOSSORO': 'NATAL', 'NATAL': 'NATAL', 'PARNAMIRIM': 'NATAL', 'PATOS': 'JOAO PESSOA', 'RECIFE': 'RECIFE'
    };

    if (cluster && cluster !== 'Todos') {
        let cidadesDoCluster = [];
        for (const [cid, clus] of Object.entries(mapping)) {
            if (clus === cluster) {
                cidadesDoCluster.push(cid);
            }
        }
        
        if (cidadesDoCluster.length > 0) {
            const inList = cidadesDoCluster.map(c => `'${c}'`).join(',');
            whereClause += ` AND UPPER(TRIM(cidade)) IN (${inList})`;
        } else {
            whereClause += ` AND UPPER(TRIM(cidade)) = $1`;
            params.push(cluster.toUpperCase().trim());
        }
    } else {
        const todasCidades = Object.keys(mapping).map(c => `'${c}'`).join(',');
        whereClause += ` AND UPPER(TRIM(cidade)) IN (${todasCidades})`;
    }

    if (req.userRole === 'TECNICO') {
        whereClause += ` AND UPPER(TRIM(tecnico)) = (SELECT UPPER(TRIM(nome)) FROM importador.base_de_tecnicos WHERE TRIM(matricula) = '${req.username}' LIMIT 1) `;
    }

    try {
        const query = `
            SELECT 
                ${groupCol} AS agrupador,
                ${dataTrunc} AS periodo_data,
                SUM(pontos_unitarios) AS pu_total,
                AVG(pontuacao_baremo) AS baremo_medio,
                AVG(efetividade_tecnico) AS efetividade_media,
                COUNT(*) as volume_atividades
            FROM importador.resultados_sla_zeus
            ${whereClause}
            GROUP BY ${groupCol}, ${dataTrunc}
            ORDER BY ${dataTrunc} DESC, pu_total DESC LIMIT 100
        `;
        const { rows } = await pool.query(query, params.length > 0 ? params : undefined);
        res.json(rows);
    } catch (err) {
        console.error('Erro getProdutividade:', err);
        res.status(500).json({ erro: 'Falha ao calcular produtividade.' });
    }
};

const getProdutividadeDetalhes = async (req, res) => {
    try {
        const { agrupamento = 'tecnico', agrupador, periodo, periodo_data } = req.query;

        let dataTrunc = "DATE_TRUNC('month', data_execucao)";
        if (periodo === 'semanal') dataTrunc = "DATE_TRUNC('week', data_execucao)";
        if (periodo === 'diaria') dataTrunc = "DATE_TRUNC('day', data_execucao)";
        
        let whereClause = `WHERE data_execucao IS NOT NULL AND UPPER(TRIM(tecnico)) != 'BUCKET' AND ${dataTrunc}::date = $1::date`;
        let params = [periodo_data];

        if (agrupamento === 'tecnico') {
            whereClause += ` AND UPPER(TRIM(tecnico)) = $2`;
            params.push(agrupador.toUpperCase().trim());
        } else if (agrupamento === 'cidade') {
            whereClause += ` AND UPPER(TRIM(cidade)) = $2`;
            params.push(agrupador.toUpperCase().trim());
        } else if (agrupamento === 'cluster') {
             const mapping = {
                'CABEDELO': 'JOAO PESSOA', 'CAMPINA GRANDE': 'JOAO PESSOA', 'CARUARU': 'CARUARU',
                'GARANHUNS': 'CARUARU', 'JABOATAO DOS GUARARAPES': 'RECIFE', 'JOAO PESSOA': 'JOAO PESSOA',
                'MOSSORO': 'NATAL', 'NATAL': 'NATAL', 'PARNAMIRIM': 'NATAL', 'PATOS': 'JOAO PESSOA', 'RECIFE': 'RECIFE'
            };
            let cidadesDoCluster = [];
            for (const [cid, clus] of Object.entries(mapping)) {
                if (clus.toUpperCase() === agrupador.toUpperCase().trim()) {
                    cidadesDoCluster.push(cid);
                }
            }
            if (cidadesDoCluster.length > 0) {
                const inList = cidadesDoCluster.map(c => `'${c}'`).join(',');
                whereClause += ` AND UPPER(TRIM(cidade)) IN (${inList})`;
            } else {
                whereClause += ` AND UPPER(TRIM(cidade)) = $2`;
                params.push(agrupador.toUpperCase().trim());
            }
        }
        
        if (req.userRole === 'TECNICO') {
            whereClause += ` AND UPPER(TRIM(tecnico)) = (SELECT UPPER(TRIM(nome)) FROM importador.base_de_tecnicos WHERE TRIM(matricula) = '${req.username}' LIMIT 1) `;
        }

        const query = `
            SELECT 
                tecnico, cidade, tipo_de_atividade, status, data_execucao, tempo_execucao,
                pontos_unitarios, pontuacao_baremo, efetividade_tecnico, sla_alvo
            FROM importador.resultados_sla_zeus
            ${whereClause}
            ORDER BY data_execucao DESC
            LIMIT 500
        `;
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Erro getProdutividadeDetalhes:', err);
        res.status(500).json({ erro: 'Falha ao buscar detalhes de produtividade.' });
    }
};

const getPlanosAcao = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM importador.planos_acao ORDER BY criado_em DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ erro: 'Falha ao buscar planos de ação.' });
    }
};

const postPlanosAcao = async (req, res) => {
    try {
        const { titulo, problema, causa_raiz, acao_proposta, responsavel, cluster, kpi_foco, prazo } = req.body;
        await pool.query(`INSERT INTO importador.planos_acao 
                          (titulo, problema, causa_raiz, acao_proposta, responsavel, cluster, kpi_foco, prazo, status) 
                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendente')`, 
                          [titulo, problema, causa_raiz, acao_proposta, responsavel, cluster, kpi_foco, prazo]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro postPlanosAcao:', err);
        res.status(500).json({ erro: 'Falha ao salvar plano de ação.' });
    }
};

const putPlanosAcao = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await pool.query('UPDATE importador.planos_acao SET status = $1 WHERE id = $2', [status, id]);
        
        await pool.query(`INSERT INTO importador.planos_acao_historico (plano_id, usuario, tipo, conteudo) 
                          VALUES ($1, $2, 'MUDANCA_STATUS', $3)`, [id, req.username || 'Sistema', `Status alterado para ${status}`]);

        res.json({ success: true });
    } catch (err) {
        console.error('Erro putPlanosAcao:', err);
        res.status(500).json({ erro: 'Falha ao atualizar plano de ação.' });
    }
};

const updatePlanoAcao = async (req, res) => {
    try {
        const { id } = req.params;
        const { prazo, responsavel, status } = req.body;
        
        const current = await pool.query('SELECT prazo, responsavel, status FROM importador.planos_acao WHERE id = $1', [id]);
        if (current.rows.length === 0) return res.status(404).json({erro: 'Plano não encontrado'});
        
        await pool.query(`UPDATE importador.planos_acao SET prazo = $1, responsavel = $2, status = $3, atualizado_em = NOW() WHERE id = $4`, 
                          [prazo, responsavel, status, id]);
        
        let changes = [];
        if (current.rows[0].status !== status) changes.push(`Status: ${status}`);
        if (current.rows[0].responsavel !== responsavel) changes.push(`Resp: ${responsavel}`);
        
        if (changes.length > 0) {
            await pool.query(`INSERT INTO importador.planos_acao_historico (plano_id, usuario, tipo, conteudo) 
                              VALUES ($1, $2, 'EDICAO', $3)`, [id, req.username || 'Sistema', `Editou: ${changes.join(', ')}`]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Erro updatePlanoAcao:', err);
        res.status(500).json({ erro: 'Falha ao atualizar plano.' });
    }
};

const deletePlanoAcao = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM importador.planos_acao WHERE id = $1', [id]);
        res.json({ success: true, message: 'Plano excluído com sucesso' });
    } catch (err) {
        console.error('Erro deletePlanoAcao:', err);
        res.status(500).json({ erro: 'Falha ao excluir plano de ação.' });
    }
};

const getHistoricoPlano = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await pool.query('SELECT * FROM importador.planos_acao_historico WHERE plano_id = $1 ORDER BY criado_em ASC', [id]);
        res.json(rows);
    } catch (err) {
        console.error('Erro getHistorico:', err);
        res.status(500).json({ erro: 'Falha ao buscar histórico.' });
    }
};

const postComentarioPlano = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario } = req.body;
        await pool.query(`INSERT INTO importador.planos_acao_historico (plano_id, usuario, tipo, conteudo) 
                          VALUES ($1, $2, 'TEXTO', $3)`, [id, req.username || 'Sistema', comentario]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro postComentario:', err);
        res.status(500).json({ erro: 'Falha ao salvar comentário.' });
    }
};

const postFotoPlano = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhuma foto enviada.' });
        }
        const filepath = `/uploads/${req.file.filename}`;
        await pool.query(`INSERT INTO importador.planos_acao_historico (plano_id, usuario, tipo, conteudo) 
                          VALUES ($1, $2, 'FOTO', $3)`, [id, req.username || 'Sistema', filepath]);
        res.json({ success: true, filepath });
    } catch (err) {
        console.error('Erro postFoto:', err);
        res.status(500).json({ erro: 'Falha ao salvar foto.' });
    }
};

const getAlertas = async (req, res) => {
    try {
        const dbAlerts = await pool.query("SELECT * FROM importador.alertas ORDER BY data_alerta DESC LIMIT 10");
        let alertas = dbAlerts.rows;
        
        // Dynamic alerts for anomalies
        const result = await pool.query(`
            SELECT 
                nome_tecnico as tecnico,
                COUNT(*) as total_anomalias,
                SUM(is_cancelada) as canceladas
            FROM importador.fatos_dashboard
            WHERE data_execucao >= date_trunc('month', current_date)
            GROUP BY 1
            HAVING COUNT(*) >= 50 OR SUM(is_cancelada) >= 15
            ORDER BY total_anomalias DESC
            LIMIT 5
        `);
        
        const alertasDinamicos = result.rows.map((row, index) => ({
            id: `dinamico-${index}`,
            severidade: row.canceladas >= 25 || row.total_anomalias > 100 ? 'Crítico' : 'Alto',
            data_geracao: new Date(),
            tipo_alerta: 'Volume Anormal de Ocorrências',
            mensagem: `O técnico ${row.tecnico || 'Desconhecido'} registou ${row.total_anomalias} anomalias operacionais neste mês (${row.canceladas} canceladas). É necessário acompanhamento.`
        }));

        res.json([...alertasDinamicos, ...alertas]);
    } catch (err) {
        console.error('Erro getAlertas:', err);
        res.status(500).json({ erro: 'Falha ao buscar alertas.' });
    }
};

const getMetas = async (req, res) => {
    res.json({
        irt: 50, tdna: 2.5, chegada_slot: 95, efetividade: 75, ifi_premium: 80, irr_premium: 85
    });
};

const getMesesDisponiveis = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT DISTINCT TO_CHAR(data_execucao::date, 'YYYY-MM') as mes
            FROM importador.resultados_sla_zeus
            WHERE data_execucao IS NOT NULL
            UNION
            SELECT DISTINCT TO_CHAR(data_execucao, 'YYYY-MM') as mes
            FROM importador.fatos_dashboard
            WHERE data_execucao IS NOT NULL
            ORDER BY mes DESC
        `);
        
        const meses = rows.map(r => r.mes);
        res.json(meses);
    } catch (error) {
        console.error("Erro em getMesesDisponiveis:", error);
        res.status(500).json({ erro: 'Erro interno do servidor ao buscar meses.' });
    }
};


const getSimuladorContrato = async (req, res) => {
    try {
        const { mes } = req.query;
        let filter = '';
        let params = [];
        
        if (mes && mes !== 'Todos') {
            filter = "WHERE TO_CHAR(data_execucao, 'YYYY-MM') = $1";
            params = [mes];
        }

        // Simulação básica baseada nos dados do Zeus
        const query = `
            SELECT 
                COUNT(*) as total_reparos,
                SUM(CASE WHEN status ILIKE '%CONCLU%' OR status ILIKE '%COMPLETA%' THEN 1 ELSE 0 END) as concluidas,
                SUM(CASE WHEN flag_defeito_recente = 'Sim' THEN 1 ELSE 0 END) as defeitos_recentes
            FROM importador.resultados_sla_zeus
            ${filter}
        `;
        
        const { rows } = await pool.query(query, params);
        
        // SLA compliance calc
        const slaQuery = `
            SELECT status, tempo_execucao, sla_alvo
            FROM importador.resultados_sla_zeus
            ${filter}
        `;
        const slaRes = await pool.query(slaQuery, params);
        
        let falhasSLA = 0;
        let concluidasSla = 0;
        slaRes.rows.forEach(data => {
            const status = (data.status || '').toUpperCase();
            if (status.includes('CONCLU') || status.includes('COMPLETA')) {
                concluidasSla++;
                const exeHoras = timeToHours(data.tempo_execucao);
                const slaHoras = timeToHours(data.sla_alvo);
                if (exeHoras > slaHoras && slaHoras > 0) {
                    falhasSLA++;
                }
            }
        });
        
        const cumprimento_sla = concluidasSla > 0 ? (((concluidasSla - falhasSLA) / concluidasSla) * 100) : 100;
        
        const data = rows[0];
        const total = parseInt(data.total_reparos) || 0;
        const concluidas = parseInt(data.concluidas) || 0;
        const defeitos = parseInt(data.defeitos_recentes) || 0;
        const tdna = concluidas > 0 ? (defeitos / concluidas) * 100 : 0;
        
        // Simulação da nota final (0 a 110)
        // SLA ideal é 100%, TDNA ideal é < 5%
        // Isso é uma simulação genérica com base na extração
        let nota_sla = cumprimento_sla; 
        let nota_tdna = tdna <= 5 ? 100 : (100 - (tdna - 5)*10); // perde 10 pontos por % acima de 5%
        if (nota_tdna < 0) nota_tdna = 0;
        
        let pontuacao_final = (nota_sla * 0.6) + (nota_tdna * 0.4);
        // Bonus (max 110)
        if (cumprimento_sla >= 98 && tdna <= 3) {
            pontuacao_final += 10;
        }
        if (pontuacao_final > 110) pontuacao_final = 110;

        // Fator Fcb (Tabelas do Anexo 09)
        let fcb = 0;
        let conceito = 'Z';
        
        if (pontuacao_final >= 110) { fcb = 10.00; conceito = 'A'; }
        else if (pontuacao_final >= 109) { fcb = 9.80; conceito = 'A'; }
        else if (pontuacao_final >= 108) { fcb = 9.60; conceito = 'A'; }
        else if (pontuacao_final >= 100) { fcb = 8.00; conceito = 'A'; }
        else if (pontuacao_final >= 90) { fcb = 5.50; conceito = 'A'; }
        else if (pontuacao_final >= 85) { fcb = 4.25; conceito = 'A'; }
        else if (pontuacao_final >= 70) { fcb = 0.50; conceito = 'B'; }
        else if (pontuacao_final >= 69) { fcb = -0.34; conceito = 'C'; }
        else if (pontuacao_final >= 60) { fcb = -0.67; conceito = 'C'; }
        else if (pontuacao_final >= 50) { fcb = -2.01; conceito = 'D'; }
        else { fcb = -3.35; conceito = 'Z'; } // < 50
        
        res.json({
            mes: mes || 'Todos',
            total_reparos: total,
            cumprimento_sla: cumprimento_sla.toFixed(2),
            tdna: tdna.toFixed(2),
            pontuacao_final: pontuacao_final.toFixed(2),
            conceito: conceito,
            fcb_perc: fcb
        });
        
    } catch (error) {
        console.error('Erro getSimuladorContrato', error);
        res.status(500).json({erro: error.message});
    }
};

const getArmariosReparos = async (req, res) => {
    try {
        const { mes } = req.query;
        let whereClause = `tipo_de_atividade ILIKE '%defeito%' AND id_de_arm_rio IS NOT NULL AND id_de_arm_rio != ''`;
        
        if (mes && mes !== 'Todos') {
            whereClause += ` AND SUBSTRING(COALESCE(data_agendada_para_execu__o, data_de_cria__o_da_atividade), 1, 7) = '${mes}'`;
        }

        const query = `
            SELECT 
                id_de_arm_rio as armario, 
                count(*) as qtd_reparos,
                MAX(latitude) as lat,
                MAX(longitude) as lon
            FROM importador.zeus_consolidado 
            WHERE ${whereClause}
            GROUP BY id_de_arm_rio 
            ORDER BY qtd_reparos DESC 
            LIMIT 20
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar armários com mais reparos:', error);
        res.status(500).json({ error: 'Erro ao buscar armários com mais reparos' });
    }
};

const getHeatmapDados = async (req, res) => {
    try {
        const { mes } = req.query;
        let mesFilter = '';
        if (mes && mes !== 'Todos') {
            mesFilter = `AND SUBSTRING(COALESCE(data_agendada_para_execu__o, data_de_cria__o_da_atividade), 1, 7) = '${mes}'`;
        }

        const query = `
            SELECT 
                latitude, 
                longitude,
                tipo_de_atividade
            FROM importador.zeus_consolidado 
            WHERE latitude IS NOT NULL 
              AND longitude IS NOT NULL 
              ${mesFilter}
            -- LIMIT 10000 -- can limit if performance becomes an issue
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar heatmap:', error);
        res.status(500).json({ error: 'Erro ao buscar heatmap' });
    }
};

module.exports = {
    getSimuladorContrato,
    getPenalizacoes,
    getFinanceiro,
    getKpis,
    getOperacionalTodos,
    getSlasOfensores,
    getClustersResumo,
    getMesesDisponiveis,
    getPlanosAcao,
    postPlanosAcao,
    putPlanosAcao,
    updatePlanoAcao,
    deletePlanoAcao,
    getHistoricoPlano,
    postComentarioPlano,
    postFotoPlano,
    getAlertas,
    getMetas,
    getProdutividade,
    getProdutividadeDetalhes,
    getSlasFalhasTecnico,
    getPerfilTecnico,
    getArmariosReparos,
    getHeatmapDados
};
