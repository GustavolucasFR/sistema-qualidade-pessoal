import React, { useState, useEffect, useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Briefcase, User, MapPin, CalendarDays, TrendingUp, CheckCircle, Activity, RefreshCw, X } from 'lucide-react';
import { usePersistentState } from '../hooks/usePersistentState';
import { RefreshContext } from '../context/RefreshContext';
import ExportButtons from './ExportButtons';
import HierarchyFilterBar from './HierarchyFilterBar';

const DashboardProdutividade = ({ userRole, isDark }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agrupamento, setAgrupamento] = usePersistentState('prod_agrupamento', 'tecnico'); // tecnico, cidade, cluster
  const [periodo, setPeriodo] = usePersistentState('prod_periodo', 'mensal'); // diaria, semanal, mensal
  const [clusterFilter, setClusterFilter] = usePersistentState('prod_cluster', 'Todos');
  const [gerenciaFilter, setGerenciaFilter] = usePersistentState('prod_gerencia', 'Todas');
  const [coordenadorFilter, setCoordenadorFilter] = usePersistentState('prod_coordenador', 'Todas');
  const [gestorFilter, setGestorFilter] = usePersistentState('prod_gestor', 'Todos');
  const [availableClusters, setAvailableClusters] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { tick } = useContext(RefreshContext);

  const [modalData, setModalData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  
  const handleRowClick = async (row) => {
    setIsModalOpen(true);
    setLoadingModal(true);
    try {
      const queryParams = new URLSearchParams({
        agrupamento,
        agrupador: row.agrupador,
        periodo,
        periodo_data: row.periodo_data
      });
      const res = await fetch(`http://${window.location.hostname}:3001/api/produtividade/detalhes?${queryParams}`);
      if (res.ok) {
        const json = await res.json();
        setModalData({ row, details: json });
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
    } finally {
      setLoadingModal(false);
    }
  };

  useEffect(() => {
    // Populate clusters filter (using the ones that exist in the DB)
    const fetchClusters = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/api/clusters/resumo`);
        if (res.ok) {
          const json = await res.json();
          setAvailableClusters(json.map(c => c.cluster));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchClusters();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          agrupamento,
          periodo,
          cluster: clusterFilter,
          gerencia: gerenciaFilter,
          coordenador_jr: coordenadorFilter,
          gestor: gestorFilter
        });
        const res = await fetch(`http://${window.location.hostname}:3001/api/produtividade?${queryParams}`);
        if (res.ok) {
          const json = await res.json();
          
          const formatName = (name) => {
            if (!name) return 'Desconhecido';
            const preposicoes = ['da', 'de', 'do', 'das', 'dos', 'e'];
            return name.toLowerCase().split(' ').map(word => 
              preposicoes.includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          };

          // Formatar datas para exibição limpa
          const formattedData = json.map(item => {
             const d = new Date(item.periodo_data);
             // Ajuste para a data aparecer de forma amigável e evitar duplicidades (agrupador + data)
             let dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
             if (periodo === 'mensal') dateLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
             if (periodo === 'semanal') dateLabel = `Sem ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit'})}`;
             
             const agrupador = formatName(item.agrupador || 'Desconhecido');

             return {
                 ...item,
                 agrupador,
                 dateLabel,
                 chartLabel: `${agrupador} (${dateLabel})`,
                 pu_total: Math.round(parseFloat(item.pu_total || 0)),
                 baremo_medio: parseFloat(parseFloat(item.baremo_medio || 0).toFixed(2)),
                 efetividade_media: parseFloat(parseFloat(item.efetividade_media || 0).toFixed(1))
             };
          });
          
          setData(formattedData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [agrupamento, periodo, clusterFilter, gerenciaFilter, coordenadorFilter, gestorFilter, refreshTrigger, tick]);

  if (loading && data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-600 mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Processando métricas de produção...</p>
      </div>
    );
  }

  // Pegamos apenas a ocorrência mais recente de cada agrupador (pois os dados já vêm ordenados)
  const uniqueChartData = data.reduce((acc, curr) => {
    if (!acc.find(item => item.agrupador === curr.agrupador)) {
      acc.push(curr);
    }
    return acc;
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      
      {/* Header and Controls */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-6">
        <HierarchyFilterBar 
          gerenciaFilter={gerenciaFilter} setGerenciaFilter={setGerenciaFilter}
          coordenadorFilter={coordenadorFilter} setCoordenadorFilter={setCoordenadorFilter}
          gestorFilter={gestorFilter} setGestorFilter={setGestorFilter}
        />
        <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <Activity className="text-blue-600" size={28} />
                    Produtividade e Efetividade
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Análise de PU, Pontuação Baremo e Efetividade Operacional.
                </p>
            </div>
            
            {/* Filtro de Cluster Base */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                <MapPin size={18} className="text-slate-500 dark:text-slate-400" />
                <select 
                    value={clusterFilter} 
                    onChange={(e) => setClusterFilter(e.target.value)}
                    className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none"
                >
                    <option value="Todos">Todos os Clusters</option>
                    {availableClusters.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Dimension and Time Toggles */}
        <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setAgrupamento('tecnico')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${agrupamento === 'tecnico' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <User size={16} /> Técnico
                </button>
                <button 
                    onClick={() => setAgrupamento('cidade')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${agrupamento === 'cidade' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <MapPin size={16} /> Cidade
                </button>
                <button 
                    onClick={() => setAgrupamento('cluster')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${agrupamento === 'cluster' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <Briefcase size={16} /> Cluster
                </button>
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 ml-auto">
                <button 
                    onClick={() => setPeriodo('diaria')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 'diaria' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <CalendarDays size={16} /> Diária
                </button>
                <button 
                    onClick={() => setPeriodo('semanal')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 'semanal' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <CalendarDays size={16} /> Semanal
                </button>
                <button 
                    onClick={() => setPeriodo('mensal')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${periodo === 'mensal' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    <CalendarDays size={16} /> Mensal
                </button>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                disabled={loading}
                className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-800 transition-colors"
                title="Recarregar Dados"
              >
                <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              </button>
              
              <ExportButtons 
                data={data}
                headers={['Agrupador', 'Período', 'Total Atividades', 'PU Total', 'Baremo Médio', 'Efetividade (%)']}
                mapRow={(row) => ({
                  'Agrupador': row.agrupador,
                  'Período': row.dateLabel,
                  'Total Atividades': row.total_atividades,
                  'PU Total': row.pu_total,
                  'Baremo Médio': row.baremo_medio,
                  'Efetividade (%)': row.efetividade_media
                })}
                filenamePrefix={`produtividade_${agrupamento}_${periodo}`}
              />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="rounded-xl overflow-hidden p-5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <TrendingUp className="text-blue-500" size={20} />
                    Volume de Produção (Pontos Unitários)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={uniqueChartData.slice(0, 15)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="agrupador" stroke={isDark ? '#94a3b8' : '#64748b'} tick={{fontSize: 10}} />
                            <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }} />
                            <Legend />
                            <Bar dataKey="pu_total" name="Total PU" fill="#1d3575" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="rounded-xl overflow-hidden p-5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <CheckCircle className="text-emerald-500" size={20} />
                    Efetividade e Baremo
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={uniqueChartData.slice(0, 15)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="agrupador" stroke={isDark ? '#94a3b8' : '#64748b'} tick={{fontSize: 10}} />
                            <YAxis yAxisId="left" domain={[0, 100]} stroke="#10b981" />
                            <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a' }} />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="efetividade_media" name="% Efetividade" stroke="#10b981" strokeWidth={3} />
                            <Line yAxisId="right" type="monotone" dataKey="pu_total" name="Score Baremo" stroke="#8b5cf6" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                <h2 className="font-bold text-slate-800 dark:text-white">Relatório Detalhado de Produção</h2>
                <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                    Mostrando Top 100 resultados
                </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700">Entidade ({agrupamento})</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700">Período</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Atividades</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Produção (PU)</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Score Baremo</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Efetividade Operacional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum dado encontrado para o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={idx} onClick={() => handleRowClick(row)} className="hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer">
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{row.agrupador}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{row.dateLabel}</td>
                        <td className="p-4 text-center text-slate-700 dark:text-slate-300">{row.volume_atividades}</td>
                        <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">{row.pu_total}</td>
                        <td className="p-4 text-center">
                            <span className={`inline-flex py-1 px-2 rounded font-medium text-xs ${row.baremo_medio >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {row.baremo_medio}
                            </span>
                        </td>
                        <td className="p-4 text-center">
                            <span className={`inline-flex py-1 px-2 rounded font-medium text-xs ${row.efetividade_media >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {row.efetividade_media}%
                            </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </div>

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Atividades: {modalData?.row?.agrupador}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingModal ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
                      <tr className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400">
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700">Técnico</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700">Atividade</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700">Status</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">PU</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Baremo</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">Efetividade</th>
                        <th className="p-3 border-b border-slate-200 dark:border-slate-700">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {modalData?.details?.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-500">Nenhum detalhe encontrado.</td>
                        </tr>
                      ) : (
                        modalData?.details?.map((detail, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{detail.tecnico}</td>
                            <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{detail.tipo_de_atividade}</td>
                            <td className="p-3 text-sm text-slate-600 dark:text-slate-400">{detail.status}</td>
                            <td className="p-3 text-sm font-bold text-blue-600 dark:text-blue-400 text-center">{detail.pontos_unitarios}</td>
                            <td className="p-3 text-sm text-center">
                               <span className={`inline-flex py-1 px-2 rounded font-medium text-xs ${detail.pontuacao_baremo >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                 {detail.pontuacao_baremo}
                               </span>
                            </td>
                            <td className="p-3 text-sm text-center text-slate-700 dark:text-slate-300">
                               {detail.efetividade_tecnico !== null ? detail.efetividade_tecnico + '%' : '-'}
                            </td>
                            <td className="p-3 text-sm text-slate-500 whitespace-nowrap">
                               {detail.data_execucao ? new Date(detail.data_execucao).toLocaleDateString('pt-BR') : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardProdutividade;
