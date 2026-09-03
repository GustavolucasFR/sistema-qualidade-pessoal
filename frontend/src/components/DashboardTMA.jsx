import React, { useState, useEffect } from 'react';
import { formatarMesAno } from '../utils/dateFormatter';
import { Clock, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import ExportButtons from './ExportButtons';
import HierarchyFilterBar from './HierarchyFilterBar';

const DashboardTMA = () => {
  const [dados, setDados] = useState({ por_cluster: [], por_dia: [] });
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState('Todos');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const [gerenciaFilter, setGerenciaFilter] = useState('Todas');
  const [coordenadorFilter, setCoordenadorFilter] = useState('Todas');
  const [gestorFilter, setGestorFilter] = useState('Todos');

  useEffect(() => {
    const fetchMeses = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://${window.location.hostname}:3001/api/meses`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if(res.ok) {
            const json = await res.json();
            setMesesDisponiveis(json);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMeses();
  }, []);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://${window.location.hostname}:3001/api/kpis/tma?mes=${mesSelecionado}&gerencia=${gerenciaFilter}&coordenador_jr=${coordenadorFilter}&gestor=${gestorFilter}`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const json = await res.json();
        setDados(json || { por_cluster: [], por_dia: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, [mesSelecionado, gerenciaFilter, coordenadorFilter, gestorFilter]);

  return (
    <div className="space-y-8 p-4">
      <HierarchyFilterBar 
        gerenciaFilter={gerenciaFilter} setGerenciaFilter={setGerenciaFilter}
        coordenadorFilter={coordenadorFilter} setCoordenadorFilter={setCoordenadorFilter}
        gestorFilter={gestorFilter} setGestorFilter={setGestorFilter}
      />
      <div className="bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Análise de TMA</h2>
            <p className="text-blue-100 mt-1 font-medium text-sm md:text-base">
              Tempo Médio de Atendimento por Cluster
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm w-full md:w-auto border border-white/20">
          <label className="text-sm text-blue-50 font-semibold whitespace-nowrap">Mês Ref:</label>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="px-3 py-2 bg-white text-blue-900 border border-blue-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto font-medium"
          >
            <option value="Todos">Todos os Meses</option>
            {mesesDisponiveis.map(m => (
              <option key={m} value={m}>{formatarMesAno(m)}</option>
            ))}
          </select>
          <ExportButtons 
            data={dados.por_cluster || []} 
            headers={['Cluster', 'Volume', 'TMA (H)']} 
            mapRow={(row) => ({
              'Cluster': row.cluster || 'Sem Cluster',
              'Volume': row.total_atividades || 0,
              'TMA (H)': Number(row.tma_medio).toFixed(2)
            })} 
            filenamePrefix={`tma_${mesSelecionado}`} 
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Carregando métricas de TMA...
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Gráfico de TMA por Dia */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 mb-2 flex items-center border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Evolução do TMA por Dia (Horas)</h3>
            </div>
            <div className="p-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.por_dia} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="dia" tick={{fill: '#64748b', fontSize: 11}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fill: '#64748b', fontSize: 11}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value) => [`${Number(value).toFixed(2)}h`, 'TMA Médio']}
                  />
                  <Line type="monotone" dataKey="tma_medio" stroke="#1d3575" strokeWidth={3} dot={{r:4, fill:'#1d3575', strokeWidth:2, stroke:'#fff'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Gráfico de TMA por Cluster */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-shadow">
              <div className="p-5 mb-2 flex items-center border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">TMA por Cluster (Horas)</h3>
              </div>
              <div className="p-6 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dados.por_cluster}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="cluster" type="category" width={90} tick={{fill: '#64748b', fontSize: 11}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      formatter={(value) => [`${Number(value).toFixed(2)}h`, 'TMA Médio']}
                    />
                    <Bar dataKey="tma_medio" radius={[0, 4, 4, 0]} barSize={24}>
                      {dados.por_cluster && dados.por_cluster.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#8b5cf6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela de Dados */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-4">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Detalhamento por Cluster</h3>
              </div>
              <div className="overflow-x-auto flex-1 p-2">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Cluster</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Volume</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">TMA (H)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dados.por_cluster && dados.por_cluster.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-700">{row.cluster || 'Sem Cluster'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full group-hover:bg-white transition-colors">
                            {row.total_atividades}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                            {Number(row.tma_medio).toFixed(2)}h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTMA;
