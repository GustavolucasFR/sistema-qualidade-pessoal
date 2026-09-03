import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Clock, Users, ShieldAlert, ArrowDownToLine, Search, RefreshCw, DollarSign, FileText, ChevronDown, ChevronRight, Moon, Sun, Printer, Shield, Database } from 'lucide-react';
import { usePersistentState } from '../hooks/usePersistentState';
import { RefreshContext } from '../context/RefreshContext';
import ExportButtons from './ExportButtons';
import HierarchyFilterBar from './HierarchyFilterBar';

export default function DashboardOperacional({ userRole, isDark }) {
  const [busca, setBusca] = useState('');
  const [abaAtual, setAbaAtual] = usePersistentState('oper_abaAtual', 'operacional'); // 'operacional' ou 'financeiro'
  const [mesSelecionadoOp, setMesSelecionadoOp] = usePersistentState('oper_mesOp', 'Todos');
  const [mesSelecionadoFin, setMesSelecionadoFin] = usePersistentState('oper_mesFin', 'Todos');
  const [estadoSelecionado, setEstadoSelecionado] = usePersistentState('oper_estado', 'Todos');
  const [cidadeSelecionada, setCidadeSelecionada] = usePersistentState('oper_cidade', 'Todas');
  const [gerenciaFilter, setGerenciaFilter] = usePersistentState('oper_gerencia', 'Todas');
  const [coordenadorFilter, setCoordenadorFilter] = usePersistentState('oper_coordenador', 'Todas');
  const [gestorFilter, setGestorFilter] = usePersistentState('oper_gestor', 'Todos');
  const { tick } = useContext(RefreshContext);

  const [dadosOperacionais, setDadosOperacionais] = useState([]);
  const [dadosFinanceiros, setDadosFinanceiros] = useState([]);
  const [dadosKpis, setDadosKpis] = useState(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Estado para controlar quais técnicos estão expandidos nas tabelas
  const [expandedTecnicos, setExpandedTecnicos] = useState({});


  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio_Qualidade`,
    onBeforeGetContent: () => {
      return new Promise((resolve) => {
        setIsPrinting(true);
        setTimeout(() => {
          resolve();
        }, 200);
      });
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    }
  });

  const toggleTecnico = (tecnico) => {
    setExpandedTecnicos(prev => ({
      ...prev,
      [tecnico]: !prev[tecnico]
    }));
  };

  const carregarDados = () => {
    setCarregando(true);
    setErro(null);
    setExpandedTecnicos({}); // Reseta o estado de expansão ao recarregar

    Promise.all([
      fetch(`http://${window.location.hostname}:3001/api/operacional/todos`).then(res => res.json())
    ])
      .then(([opData]) => {
        if (opData && opData.erro && opData.erro.includes('interno')) throw new Error(opData.erro);

        const processedOpData = Array.isArray(opData) ? opData.map(d => {
            const dataStr = d.termino_atividade || d.data_agendada || d.data_criacao;
            let mes = 'Desconhecido';
            if (dataStr) {
                const date = new Date(dataStr);
                if (!isNaN(date)) {
                    mes = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                }
            }
            return {
                ...d,
                mes,
                cluster: d.cluster || 'Desconhecido'
            };
        }) : [];
        setDadosOperacionais(processedOpData);
        setDadosFinanceiros([]); // mantido mock para nao quebrar algo
        setDadosKpis({});
        
        setCarregando(false);
      })
      .catch(err => {
        setErro(err.message || 'Falha ao carregar os dados. O backend está rodando?');
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregarDados();
  }, [tick]);

  // Extrair opções únicas (Meses, Estados, Cidades)
  const mesesOpDisponiveis = useMemo(() => {
    const meses = dadosOperacionais.map(d => d.mes).filter(m => m && m !== 'Desconhecido');
    return [...new Set(meses)].sort((a, b) => {
      const [mA, yA] = a.split('/');
      const [mB, yB] = b.split('/');
      return new Date(yB, mB - 1) - new Date(yA, mA - 1);
    });
  }, [dadosOperacionais]);

  const mesesFinDisponiveis = useMemo(() => {
    const meses = dadosFinanceiros.map(d => d.mes).filter(m => m && m !== 'Desconhecido');
    return [...new Set(meses)].sort((a, b) => {
      const [mA, yA] = a.split('/');
      const [mB, yB] = b.split('/');
      return new Date(yB, mB - 1) - new Date(yA, mA - 1);
    });
  }, [dadosFinanceiros]);
  
  const clustersDisponiveis = useMemo(() => {
    const clustersOp = dadosOperacionais.map(d => d.cluster).filter(e => e && e !== 'Desconhecido');
    const clustersFin = dadosFinanceiros.map(d => d.cluster).filter(e => e && e !== 'Desconhecido');
    return [...new Set([...clustersOp, ...clustersFin])].sort();
  }, [dadosOperacionais, dadosFinanceiros]);

  const cidadesDisponiveis = useMemo(() => {
    // Filtramos cidades disponíveis com base no cluster selecionado, ou todas se 'Todos' estiver selecionado
    const filtradosOp = estadoSelecionado === 'Todos' ? dadosOperacionais : dadosOperacionais.filter(d => d.cluster === estadoSelecionado);
    const filtradosFin = estadoSelecionado === 'Todos' ? dadosFinanceiros : dadosFinanceiros.filter(d => d.cluster === estadoSelecionado);
    
    const cidadesOp = filtradosOp.map(d => d.cidade).filter(c => c && c !== 'Desconhecido');
    const cidadesFin = filtradosFin.map(d => d.cidade).filter(c => c && c !== 'Desconhecido');
    return [...new Set([...cidadesOp, ...cidadesFin])].sort();
  }, [dadosOperacionais, dadosFinanceiros, estadoSelecionado]);

  useEffect(() => {
    if (mesesOpDisponiveis.length > 0 && mesSelecionadoOp === 'Todos') {
        setMesSelecionadoOp(mesesOpDisponiveis[0]);
    }
  }, [mesesOpDisponiveis]);

  useEffect(() => {
    if (mesesFinDisponiveis.length > 0 && mesSelecionadoFin === 'Todos') {
        setMesSelecionadoFin(mesesFinDisponiveis[0]);
    }
  }, [mesesFinDisponiveis]);

  useEffect(() => {
    // Ao mudar o estado, reseta a cidade para 'Todas'
    setCidadeSelecionada('Todas');
  }, [estadoSelecionado]);

  // Filtrar os dados brutos pelos seletores
  const opFiltradoBase = useMemo(() => {
    return dadosOperacionais.filter(d => {
      const passaMes = mesSelecionadoOp === 'Todos' || d.mes === mesSelecionadoOp;
      const passaEstado = estadoSelecionado === 'Todos' || d.cluster === estadoSelecionado;
      const passaCidade = cidadeSelecionada === 'Todas' || d.cidade === cidadeSelecionada;
      return passaMes && passaEstado && passaCidade;
    });
  }, [dadosOperacionais, mesSelecionadoOp, estadoSelecionado, cidadeSelecionada]);

  const finFiltradoBase = useMemo(() => {
    return dadosFinanceiros.filter(d => {
      const passaMes = mesSelecionadoFin === 'Todos' || d.mes === mesSelecionadoFin;
      const passaEstado = estadoSelecionado === 'Todos' || d.cluster === estadoSelecionado;
      const passaCidade = cidadeSelecionada === 'Todas' || d.cidade === cidadeSelecionada;
      return passaMes && passaEstado && passaCidade;
    });
  }, [dadosFinanceiros, mesSelecionadoFin, estadoSelecionado, cidadeSelecionada]);

  // Métricas Operacionais
  const metricasOp = useMemo(() => {
    if (opFiltradoBase.length === 0) return { 
      totalOS: 0, 
      topTecnico: { nome: '-', quantidade: 0 }, 
      contagemPorTecnico: {},
      totalConcluidas: 0, totalCanceladas: 0, totalAbertas: 0
    };

    let totalOS = 0;
    let totalConcluidas = 0;
    let totalCanceladas = 0;
    let totalAbertas = 0;

    const contagemPorTecnico = opFiltradoBase.reduce((acc, curr) => {
      const qtd = 1;
      totalOS += qtd;

      acc[curr.tecnico] = (acc[curr.tecnico] || 0) + qtd;
      
      const status = (curr.status || '').toUpperCase();
      if (status.includes('CONCLU')) totalConcluidas += qtd;
      else if (status.includes('CANCEL')) totalCanceladas += qtd;
      else totalAbertas += qtd;
      
      return acc;
    }, {});

    let topTecnico = { nome: '-', quantidade: 0 };
    Object.entries(contagemPorTecnico).forEach(([nome, quantidade]) => {
      if (quantidade > topTecnico.quantidade) {
        topTecnico = { nome, quantidade };
      }
    });

    return { totalOS, topTecnico, contagemPorTecnico, totalConcluidas, totalCanceladas, totalAbertas };
  }, [opFiltradoBase]);

  // Métricas Financeiras
  const metricasFin = useMemo(() => {
    if (finFiltradoBase.length === 0) return { totalMultas: 0, impactoTotal: 0, topInfrator: { nome: '-', valor: 0 }, impactoPorTecnico: {} };

    const totalMultas = finFiltradoBase.length;
    const impactoTotal = finFiltradoBase.reduce((acc, curr) => acc + curr.valor, 0);

    const impactoPorTecnico = finFiltradoBase.reduce((acc, curr) => {
      acc[curr.tecnico] = (acc[curr.tecnico] || 0) + curr.valor;
      return acc;
    }, {});

    let topInfrator = { nome: '-', valor: 0 };
    Object.entries(impactoPorTecnico).forEach(([nome, valor]) => {
      if (valor > topInfrator.valor) {
        topInfrator = { nome, valor };
      }
    });

    return { totalMultas, impactoTotal, topInfrator, impactoPorTecnico };
  }, [finFiltradoBase]);

  // Filtros de busca textual
  const dadosOpFiltrados = opFiltradoBase.filter(item =>
    (item.tecnico || '').toLowerCase().includes(busca.toLowerCase()) ||
    (item.os || '').toLowerCase().includes(busca.toLowerCase()) ||
    (item.atividade || '').toLowerCase().includes(busca.toLowerCase())
  );

  const dadosFinFiltrados = finFiltradoBase.filter(item =>
    (item.tecnico || '').toLowerCase().includes(busca.toLowerCase()) ||
    (item.infracao || '').toLowerCase().includes(busca.toLowerCase())
  );

  // Agrupar dados por Técnico
  const dadosOpAgrupados = useMemo(() => {
    const grupos = {};
    dadosOpFiltrados.forEach(item => {
      const tec = item.tecnico || 'Desconhecido';
      if (!grupos[tec]) {
        grupos[tec] = {
          tecnico: tec,
          totalPenalidades: 0,
          cluster: item.cluster,
          cidade: item.cidade,
          irr: item.irr,
          ifi: item.ifi,
          detalhes: []
        };
      }
      grupos[tec].totalPenalidades += item.ocorrencias_agrupadas || 1;
      grupos[tec].detalhes.push(item);
    });
    return Object.values(grupos).sort((a, b) => b.totalPenalidades - a.totalPenalidades);
  }, [dadosOpFiltrados]);

  const dadosFinAgrupados = useMemo(() => {
    const grupos = {};
    dadosFinFiltrados.forEach(item => {
      const tec = item.tecnico || 'Desconhecido';
      if (!grupos[tec]) {
        grupos[tec] = {
          tecnico: tec,
          totalRnc: 0,
          totalValor: 0,
          cluster: item.cluster,
          cidade: item.cidade,
          ocorrencias: []
        };
      }
      grupos[tec].totalRnc += 1;
      grupos[tec].totalValor += item.valor;
      grupos[tec].ocorrencias.push(item);
    });
    return Object.values(grupos).sort((a, b) => b.totalValor - a.totalValor);
  }, [dadosFinFiltrados]);

  const dadosSeveridade = useMemo(() => {
    if (opFiltradoBase.length === 0) return [];
    const contagem = opFiltradoBase.reduce((acc, curr) => {
      const stat = curr.status || 'Desconhecido';
      acc[stat] = (acc[stat] || 0) + (curr.ocorrencias_agrupadas || 1);
      return acc;
    }, {});
    return Object.entries(contagem).map(([name, value]) => ({ name, value }));
  }, [opFiltradoBase]);
  
  const CORES_SEVERIDADE = {
    'MUITO ALTA': '#dc2626',
    'ALTA': '#ef4444',
    'MEDIA': '#698dd0',
    'BAIXA': '#2f529e',
    'MUITO BAIXA': '#1d3575'
  };

  const dadosTopTecnicos = useMemo(() => {
    return dadosOpAgrupados.slice(0, 5).map(g => ({
      name: g.tecnico.split(' ')[0],
      quantidade: g.totalPenalidades
    }));
  }, [dadosOpAgrupados]);
  const formatName = (name) => {
    if (!name) return 'Desconhecido';
    const preposicoes = ['da', 'de', 'do', 'das', 'dos', 'e'];
    return name.toLowerCase().split(' ').map(word => 
      preposicoes.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="mb-4 px-4 pt-2">
      <HierarchyFilterBar 
        gerenciaFilter={gerenciaFilter} setGerenciaFilter={setGerenciaFilter}
        coordenadorFilter={coordenadorFilter} setCoordenadorFilter={setCoordenadorFilter}
        gestorFilter={gestorFilter} setGestorFilter={setGestorFilter}
      />
    </div>
    <div>
      <div ref={printRef} className="min-h-screen bg-transparent p-6 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">

      {/* Cabeçalho */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="text-blue-600" />
            Painel de Auditoria e Qualidade
          </h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">Monitoramento de SLAs e Impacto Financeiro (Live)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {abaAtual === 'operacional' ? (
            <select 
              value={mesSelecionadoOp}
              onChange={(e) => setMesSelecionadoOp(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Todos">Todas as Competências</option>
              {mesesOpDisponiveis.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <select 
              value={mesSelecionadoFin}
              onChange={(e) => setMesSelecionadoFin(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Todos">Todas as Competências</option>
              {mesesFinDisponiveis.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          <select 
            value={estadoSelecionado}
            onChange={(e) => setEstadoSelecionado(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="Todos">Todos os Clusters</option>
            {clustersDisponiveis.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          <select 
            value={cidadeSelecionada}
            onChange={(e) => setCidadeSelecionada(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={estadoSelecionado === 'Todos' && cidadesDisponiveis.length > 50} // Para evitar listas imensas de cidades do Brasil inteiro sem estado
          >
            <option value="Todas">Todas as Cidades</option>
            {cidadesDisponiveis.map(cid => (
              <option key={cid} value={cid}>{cid}</option>
            ))}
          </select>
          <button onClick={carregarDados} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
            Atualizar
          </button>
          
          <ExportButtons 
            data={opFiltradoBase || []} 
            headers={['Mês', 'Cluster', 'Cidade', 'Técnico', 'Cliente', 'OS', 'Atividade', 'Status']} 
            mapRow={(row) => ({
              'Mês': row.mes || '-',
              'Cluster': row.cluster || '-',
              'Cidade': row.cidade || '-',
              'Técnico': row.tecnico || '-',
              'Cliente': row.cliente || '-',
              'OS': row.os || '-',
              'Atividade': row.atividade || '-',
              'Status': row.status || '-'
            })} 
            filenamePrefix={`operacional_${mesSelecionadoOp}`} 
          />
        </div>
      </header>

      {/* Abas removidas a pedido do utilizador */}

      {carregando && (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">Conectando ao Motor Analítico...</p>
        </div>
      )}

      {erro && !carregando && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 p-6 rounded-xl flex items-center gap-4 mb-6">
          <AlertTriangle size={32} />
          <div>
            <h3 className="font-bold">Aviso de Sincronização</h3>
            <p>{erro}</p>
          </div>
        </div>
      )}

      {!carregando && !erro && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Health Check Global */}
          {dadosKpis && mesSelecionadoOp !== 'Todos' && dadosKpis[mesSelecionadoOp] && (() => {
            const kpiDoMes = dadosKpis[mesSelecionadoOp];
            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold shadow-sm
                    ${kpiDoMes.nota === 'A' ? 'bg-green-100 dark:bg-green-900/40 text-green-700' :
                      kpiDoMes.nota === 'B' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700' :
                      kpiDoMes.nota === 'C' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700' :
                      kpiDoMes.nota === 'D' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700' :
                      'bg-red-100 dark:bg-red-900/40 text-red-700'}
                  `}>
                    {kpiDoMes.nota}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Health Check da Operação ({mesSelecionadoOp})</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">Score Global: {kpiDoMes.pontos} pontos (Nota {kpiDoMes.nota})</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Reparo 4h */}
                  <div className="bg-transparent rounded-lg p-4 border border-slate-100 dark:border-slate-700/50 print:break-inside-avoid">
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mb-1 truncate">Reparo 4h</p>
                    <p className={`text-xl font-bold ${kpiDoMes.reparo_4h >= 92 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpiDoMes.reparo_4h}%
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Meta: &ge; 92%</p>
                  </div>
                  {/* Outlier 12h */}
                  <div className="bg-transparent rounded-lg p-4 border border-slate-100 dark:border-slate-700/50 print:break-inside-avoid">
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mb-1 truncate">Outlier 12h</p>
                    <p className={`text-xl font-bold ${kpiDoMes.outlier_12h <= 3 ? 'text-green-600' : kpiDoMes.outlier_12h <= 8 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {kpiDoMes.outlier_12h}%
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Meta: &lt; 3%</p>
                  </div>
                  {/* TMR */}
                  <div className="bg-transparent rounded-lg p-4 border border-slate-100 dark:border-slate-700/50 print:break-inside-avoid">
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mb-1 truncate">TMR (min)</p>
                    <p className={`text-xl font-bold ${kpiDoMes.tmr <= 180 ? 'text-green-600' : kpiDoMes.tmr <= 240 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {kpiDoMes.tmr}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Meta: 120-180m</p>
                  </div>
                  {/* Efetividade */}
                  <div className="bg-transparent rounded-lg p-4 border border-slate-100 dark:border-slate-700/50 print:break-inside-avoid">
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mb-1 truncate">Efetividade</p>
                    <p className={`text-xl font-bold ${kpiDoMes.efetividade_altas >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpiDoMes.efetividade_altas}%
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Meta: &ge; 90%</p>
                  </div>
                  {/* Mínima Agenda */}
                  <div className="bg-transparent rounded-lg p-4 border border-slate-100 dark:border-slate-700/50 print:break-inside-avoid">
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mb-1 truncate">Mín. Agenda</p>
                    <p className={`text-xl font-bold ${kpiDoMes.minima_agenda >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpiDoMes.minima_agenda}%
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Meta: &ge; 90%</p>
                  </div>
                  {/* BD por Planta */}
                  <div className="bg-transparent rounded-lg p-4 border border-slate-100 dark:border-slate-700/50 print:break-inside-avoid">
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium mb-1 truncate">BD/Planta</p>
                    <p className={`text-xl font-bold ${kpiDoMes.bd_planta <= 2 ? 'text-green-600' : kpiDoMes.bd_planta <= 4 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {kpiDoMes.bd_planta}%
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Meta: &lt; 2%</p>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Novos Gráficos Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-xl overflow-hidden p-6 print:break-inside-avoid">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Ocorrências por Severidade</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosSeveridade}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dadosSeveridade.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_SEVERIDADE[entry.name] || '#1d3575'} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f1f5f9' : '#0f172a' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden p-6 print:break-inside-avoid">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Top 5 Técnicos (Volume)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosTopTecnicos}>
                    <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} />
                    <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f1f5f9' : '#0f172a' }} cursor={{ fill: isDark ? '#334155' : '#f1f5f9' }} />
                    <Bar dataKey="quantidade" fill="#1d3575" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Cards Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center gap-2 print:break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-lg">
                  <Shield size={20} />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">OS Concluídas</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{metricasOp.totalConcluidas}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center gap-2 print:break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-lg">
                  <AlertTriangle size={20} />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">OS Canceladas</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{metricasOp.totalCanceladas}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center gap-2 print:break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Outros Status</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{metricasOp.totalAbertas}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center gap-2 print:break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg">
                  <Database size={20} />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total OS</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{metricasOp.totalOS}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col justify-center gap-2 print:break-inside-avoid">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-lg">
                  <Users size={20} />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Top Técnico (Vol)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]" title={metricasOp.topTecnico.nome}>{metricasOp.topTecnico.nome}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{metricasOp.topTecnico.quantidade} OS</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Tabela Operacional */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 col-span-1 lg:col-span-3 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Log Detalhado (Operacional)</h2>
                <div className="relative w-full md:w-64 print:hidden">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar técnico, OS ou atividade..."
                    className="w-full pl-9 pr-4 py-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm">
                  <thead className="bg-transparent text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 w-12"></th>
                      <th className="px-6 py-4">Técnico Resp.</th>
                      <th className="px-6 py-4 text-center">Ocorrências</th>
                      <th className="px-6 py-4 text-center">Local (Principal)</th>
                      <th className="px-6 py-4 text-center">IRR</th>
                      <th className="px-6 py-4 text-center">IFI</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {dadosOpAgrupados.map((grupo, idx) => (
                      <React.Fragment key={`op-${idx}`}>
                        <tr 
                          onClick={() => toggleTecnico(`op-${grupo.tecnico}`)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-900 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 transition-colors">
                            <span className="print:hidden">
                              {expandedTecnicos[`op-${grupo.tecnico}`] || isPrinting ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{formatName(grupo.tecnico)}</td>
                          <td className="px-6 py-4 text-center font-medium text-slate-700 dark:text-slate-300">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {grupo.totalPenalidades} OS{grupo.totalPenalidades !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500 text-xs">{grupo.cidade} - {grupo.cluster}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                              {grupo.irr !== null && grupo.irr !== undefined ? (
                                  <span className={grupo.irr <= 13 ? 'text-emerald-600' : 'text-rose-600'}>{grupo.irr.toFixed(1)}%</span>
                              ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                              {grupo.ifi !== null && grupo.ifi !== undefined ? (
                                  <span className={grupo.ifi <= 13 ? 'text-emerald-600' : 'text-rose-600'}>{grupo.ifi.toFixed(1)}%</span>
                              ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="print:hidden">
                              {expandedTecnicos[`op-${grupo.tecnico}`] || isPrinting ? 'Recolher' : 'Expandir'}
                            </span>
                          </td>
                        </tr>
                        
                        {/* Linhas Expandidas */}
                        {(isPrinting || expandedTecnicos[`op-${grupo.tecnico}`]) && (
                          <tr className="bg-transparent/50">
                            <td colSpan="7" className="p-0 border-b border-slate-200 dark:border-slate-700">
                              <div className="pl-6 sm:pl-16 pr-6 py-4 shadow-inner bg-transparent">
                                <table className="w-full text-left text-sm">
                                  <thead className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">
                                    <tr>
                                      <th className="font-medium px-2 py-2 text-left">OS</th>
                                      <th className="font-medium px-2 py-2 text-left">Atividade</th>
                                      <th className="font-medium px-2 py-2 text-center">Status</th>
                                      <th className="font-medium px-2 py-2 text-right">Data Fim</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {grupo.detalhes.map((det, dIdx) => (
                                      <tr key={dIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{det.os || '-'}</td>
                                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">{det.atividade || '-'}</td>
                                        <td className="px-2 py-2 text-center">
                                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${det.status && det.status.toLowerCase().includes('conclu') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                                            {det.status || 'Desconhecido'}
                                          </span>
                                        </td>
                                        <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300 font-medium">
                                          {det.termino_atividade ? new Date(det.termino_atividade).toLocaleString('pt-BR') : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {dadosOpAgrupados.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          Nenhum dado operacional correspondente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}