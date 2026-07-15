import React, { useState, useEffect } from 'react';
import { formatarMesAno } from '../utils/dateFormatter';
import { Target, Trophy, Award, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import ExportButtons from './ExportButtons';

const DashboardConsolidadoPesos = () => {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState('Todos');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const chartsRef = React.useRef(null);

  useEffect(() => {
    const fetchMeses = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/api/meses`);
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
        const res = await fetch(`http://${window.location.hostname}:3001/api/kpis/consolidado?mes=${mesSelecionado}`);
        const json = await res.json();
        setDados(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, [mesSelecionado]);

  return (
    <div className="space-y-8 p-4">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Ranking de Pesos</h2>
            <p className="text-emerald-100 mt-1 font-medium text-sm md:text-base">
              Produtividade Consolidada dos Técnicos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-blue-600/10 p-3 rounded-xl backdrop-blur-sm border border-blue-600/20">
          <label className="text-sm text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap">Mês Ref:</label>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700/50 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto font-medium"
          >
            <option value="Todos">Todos os Meses</option>
            {mesesDisponiveis.map(m => (
              <option key={m} value={m}>{formatarMesAno(m)}</option>
            ))}
          </select>
          <ExportButtons 
              data={dados}
              headers={['Técnico', 'Empresa', 'Volume Atividades', 'Pontuação Total (pts)']}
              mapRow={(row) => ({
                'Técnico': row.tecnico,
                'Empresa': row.empresa || '-',
                'Volume Atividades': row.atividades_concluidas,
                'Pontuação Total (pts)': Number(row.peso_total).toFixed(2)
              })}
              filenamePrefix={`consolidado_pesos_${mesSelecionado}`}
              chartsRef={chartsRef}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando pesos de produtividade...</div>
      ) : (
        <div ref={chartsRef} className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Gráfico TOP 10 */}
          <div className="rounded-2xl overflow-hidden transition-shadow">
            <div className="p-5 mb-2 flex items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-4">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Top 10 Técnicos (Pontuação)</h3>
            </div>
            <div className="p-6 h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dados.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="tecnico" type="category" width={130} tick={{fill: '#64748b', fontSize: 10}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    formatter={(value) => [`${Number(value).toFixed(2)} pts`, 'Pontuação']}
                  />
                  <Bar dataKey="peso_total" radius={[0, 4, 4, 0]} barSize={20}>
                    {dados.slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#1d3575' : index === 1 ? '#2f529e' : index === 2 ? '#698dd0' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Completa */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex items-center">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center mr-4">
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Tabela Geral de Produtividade</h3>
            </div>
            <div className="overflow-x-auto flex-1 p-2 max-h-[500px]">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Pos</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Técnico</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Volume</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Pontuação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dados.map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-sm
                          ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white' : 
                           idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' : 
                           idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors'}`}>
                          {idx === 0 ? <Trophy className="w-4 h-4" /> : 
                           idx === 1 ? <Award className="w-4 h-4" /> : 
                           idx === 2 ? <Award className="w-4 h-4" /> : idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-700 text-sm">{row.tecnico || 'Sem Nome'}</div>
                        <div className="text-xs text-gray-400">{row.empresa || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full group-hover:bg-white transition-colors">
                          {row.atividades_concluidas}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                          {Number(row.peso_total).toFixed(2)} pts
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardConsolidadoPesos;
