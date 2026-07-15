import React, { useState, useEffect } from 'react';
import { formatarMesAno } from '../utils/dateFormatter';
import { XCircle, UserX, AlertOctagon, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import ExportButtons from './ExportButtons';

const DashboardTDNA = () => {
  const [dados, setDados] = useState({ motivos: [], tecnicos: [] });
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState('Todos');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);

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
        const res = await fetch(`http://${window.location.hostname}:3001/api/kpis/tdna?mes=${mesSelecionado}`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        const json = await res.json();
        setDados(json.motivos ? json : { motivos: [], tecnicos: [] });
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
      <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <AlertOctagon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Análise de TDNA</h2>
            <p className="text-red-100 mt-1 font-medium text-sm md:text-base">
              Taxa de Deslocamento Não Atendido - Motivos e Ofensores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm w-full md:w-auto border border-white/20">
          <label className="text-sm text-red-50 font-semibold whitespace-nowrap">Mês Ref:</label>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="px-3 py-2 bg-white text-red-900 border border-red-200 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 outline-none w-full md:w-auto font-medium"
          >
            <option value="Todos">Todos os Meses</option>
            {mesesDisponiveis.map(m => (
              <option key={m} value={m}>{formatarMesAno(m)}</option>
            ))}
          </select>
          <ExportButtons 
              data={dados.tecnicos}
              headers={['Técnico', 'Empresa', 'Canceladas TDNA']}
              mapRow={(row) => ({
                'Técnico': row.tecnico,
                'Empresa': row.empresa || '-',
                'Canceladas TDNA': row.falhas_tdna
              })}
              filenamePrefix={`tdna_ofensores_${mesSelecionado}`}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando métricas de TDNA...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Motivos */}
          <div className="rounded-2xl overflow-hidden transition-shadow">
            <div className="p-5 mb-2 flex items-center">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mr-4">
                <BarChart2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Top 10 Motivos</h3>
            </div>
            <div className="p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dados.motivos}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="motivo" type="category" width={110} tick={{fill: '#64748b', fontSize: 11}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                    {dados.motivos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#dc2626' : '#1d3575'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking Ofensores */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="bg-gray-50/50 p-5 border-b border-gray-100 flex items-center">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Técnicos Ofensores (Top 20)</h3>
            </div>
            <div className="overflow-x-auto flex-1 p-2">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Técnico</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Empresa</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">Canceladas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dados.tecnicos.map((t, i) => (
                    <tr key={i} className="hover:bg-red-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                           <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold mr-3 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                             {i + 1}
                           </div>
                           <span className="text-sm font-semibold text-gray-700">{t.tecnico}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{t.empresa}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold">
                          {t.falhas_tdna}
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

export default DashboardTDNA;
