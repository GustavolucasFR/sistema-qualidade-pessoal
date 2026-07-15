import React, { useState, useEffect, useContext } from 'react';
import { Map, BarChart2, TrendingUp, AlertTriangle, Trophy, Layers, Calendar, ChevronDown } from 'lucide-react';
import { formatarMesAno } from '../utils/dateFormatter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePersistentState } from '../hooks/usePersistentState';
import { RefreshContext } from '../context/RefreshContext';
import ExportButtons from './ExportButtons';

const COLORS = ['#1d3575', '#dc2626', '#2f529e', '#ef4444', '#698dd0'];

const DashboardClusters = ({ userRole, isDark }) => {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = usePersistentState('clusters_mes', 'Todos');
  const [historyDates, setHistoryDates] = useState([]);
  const { tick } = useContext(RefreshContext);
  const chartsRef = React.useRef(null);

  useEffect(() => {
    const fetchDates = async () => {
      try {
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/meses`);
        if (response.ok) {
          const dates = await response.json();
          setHistoryDates(dates);
        }
      } catch (error) {
        console.error("Erro ao buscar datas", error);
      }
    };
    fetchDates();
  }, []);

  useEffect(() => {
    const fetchClusters = async () => {
      setLoading(true);
      try {
        const hostname = window.location.hostname;
        const response = await fetch(`http://${hostname}:3001/api/clusters/resumo?mes=${mesSelecionado}`);
        const data = await response.json();
        setClusters(data.filter(c => c.cluster !== 'OUTROS')); // Filter out unknown cities
      } catch (error) {
        console.error("Erro ao buscar dados dos clusters", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClusters();
  }, [mesSelecionado, tick]);

  // Calculate insights
  const topEficiencia = clusters.length > 0 ? [...clusters].sort((a, b) => (b.eficiencia || 0) - (a.eficiencia || 0))[0] : null;
  const piorSla = clusters.length > 0 ? [...clusters].sort((a, b) => b.total_falhas - a.total_falhas)[0] : null;
  const totalSlas = clusters.reduce((acc, curr) => acc + curr.total_falhas, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <Map className="text-blue-600" size={28} />
            Visão Consolidada por Clusters
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Comparativo Regional de Desempenho e Qualidade</p>
        </div>
        
        <div className="flex items-center gap-3 bg-blue-600/10 p-3 rounded-xl backdrop-blur-sm border border-blue-600/20">
          <label className="text-sm text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap">Mês Ref:</label>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700/50 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto font-medium"
          >
            <option value="Todos">Todos os Meses</option>
            {historyDates.map(dateStr => (
              <option key={dateStr} value={dateStr}>
                {formatarMesAno(dateStr)}
              </option>
            ))}
          </select>
          <ExportButtons 
              data={clusters}
              headers={['Cluster', 'Eficiência (%)', 'Total PU', 'Total OS', 'Falhas SLA']}
              mapRow={(row) => ({
                'Cluster': row.cluster,
                'Eficiência (%)': row.eficiencia,
                'Total PU': row.total_pu,
                'Total OS': row.total_os,
                'Falhas SLA': row.total_falhas
              })}
              filenamePrefix={`clusters_${mesSelecionado}`}
              chartsRef={chartsRef}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Atualizando visão macro dos clusters...</p>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 ${loading ? 'opacity-50' : ''}`}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Layers className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total de Clusters</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{clusters.length}</h3>
              <p className="text-xs text-blue-600 font-medium mt-1">Análise ativa</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-start gap-4 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5">
              <Trophy size={100} />
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Trophy className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Melhor Eficiência</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1 uppercase">
                {topEficiencia ? topEficiencia.cluster : '-'}
              </h3>
              <p className="text-xs text-green-600 font-medium mt-1">
                {topEficiencia ? topEficiencia.eficiencia : 0}% de score
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-start gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ofensor de SLAs</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1 uppercase">
                {piorSla ? piorSla.cluster : '-'}
              </h3>
              <p className="text-xs text-red-600 font-medium mt-1">
                {piorSla ? piorSla.total_falhas : 0} falhas registradas
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div ref={chartsRef} className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 ${loading ? 'opacity-50' : ''}`}>
          {/* Bar Chart: Efficiency & Productivity */}
          <div className="rounded-xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} />
              Eficiência vs Produtividade
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clusters} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="cluster" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} angle={-25} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b' }} domain={[0, 150]} />
                  <Tooltip 
                    cursor={{fill: isDark ? '#334155' : '#f1f5f9'}}
                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="eficiencia" name="Eficiência (%)" fill="#1d3575" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="produtividade" name="Produtividade (%)" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: SLAs */}
          <div className="rounded-xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
              <BarChart2 className="text-rose-500" size={20} />
              Distribuição de Falhas SLA
            </h3>
            <div className="h-72 flex flex-col items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clusters.filter(c => c.total_falhas > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="total_falhas"
                    nameKey="cluster"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {clusters.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                    formatter={(value) => [`${value} Falhas`, 'Volume']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                Total de <strong className="text-rose-500 dark:text-rose-400">{totalSlas}</strong> falhas computadas no mês
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${loading ? 'opacity-50' : ''}`}>
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Ranking Detalhado</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  <th className="p-4">Cluster</th>
                  <th className="p-4 text-center">Eficiência</th>
                  <th className="p-4 text-center">Produtividade</th>
                  <th className="p-4 text-center">IRT</th>
                  <th className="p-4 text-center">TDNA</th>
                  <th className="p-4 text-center">Chegada Slot</th>
                  <th className="p-4 text-center">Efetividade</th>
                  <th className="p-4 text-center">IFI</th>
                  <th className="p-4 text-center">IRR</th>
                  <th className="p-4 text-center">Falhas SLA</th>
                  <th className="p-4 text-center">Horas Excedidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {clusters.map((cluster, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {cluster.cluster}
                    </td>
                    <td className="p-4 text-center">
                      {cluster.eficiencia ? (
                         <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                           {cluster.eficiencia}%
                         </span>
                      ) : (
                         <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {cluster.produtividade ? (
                         <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                           {cluster.produtividade}%
                         </span>
                      ) : (
                         <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      {cluster.irt ? (
                         <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium ${cluster.irt >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                           {cluster.irt}%
                         </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      {cluster.tdna ? (
                         <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium ${cluster.tdna <= 85 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                           {cluster.tdna}%
                         </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      {cluster.chegada_slot ? (
                         <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium ${cluster.chegada_slot >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                           {cluster.chegada_slot}%
                         </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      {cluster.efetividade ? (
                         <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium ${cluster.efetividade >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                           {cluster.efetividade}%
                         </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      {cluster.ifi_premium ? (
                         <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium ${cluster.ifi_premium >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                           {cluster.ifi_premium}%
                         </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      {cluster.irr_premium ? (
                         <span className={`inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium ${cluster.irr_premium >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                           {cluster.irr_premium}%
                         </span>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-center font-medium text-rose-600 dark:text-rose-400">
                      {cluster.total_falhas}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                      {cluster.horas_perdidas.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardClusters;
