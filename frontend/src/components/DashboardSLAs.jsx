import React, { useState, useEffect, useContext } from 'react';
import { formatarMesAno } from '../utils/dateFormatter';
import { Clock, AlertOctagon, TrendingDown, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { usePersistentState } from '../hooks/usePersistentState';
import { RefreshContext } from '../context/RefreshContext';
import ExportButtons from './ExportButtons';

export default function DashboardSLAs() {
  const [ofensores, setOfensores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTecnico, setSelectedTecnico] = useState(null);
  const [perfilTecnico, setPerfilTecnico] = useState(null);
  const [falhasTecnico, setFalhasTecnico] = useState([]);
  const [loadingFalhas, setLoadingFalhas] = useState(false);
  const [selectedOS, setSelectedOS] = useState(null);
  const [mesSelecionado, setMesSelecionado] = usePersistentState('sla_mes', 'Todos');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const { tick } = useContext(RefreshContext);

  const fetchOfensores = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/slas/ofensores?mes=${mesSelecionado}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      setOfensores(data.ofensores || []);
      setMesesDisponiveis(data.meses_disponiveis || []);
    } catch (err) {
      console.error('Erro ao buscar ofensores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfensores();
  }, [mesSelecionado, tick]);

  const handleTecnicoClick = async (tecnico) => {
    setSelectedTecnico(tecnico);
    setSelectedOS(null);
    setPerfilTecnico(null);
    setLoadingFalhas(true);
    try {
      // Busca as falhas
      const token = localStorage.getItem('token');
      const resFalhas = await fetch(`http://${window.location.hostname}:3001/api/slas/falhas/${encodeURIComponent(tecnico)}?mes=${mesSelecionado}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const dataFalhas = await resFalhas.json();
      setFalhasTecnico(dataFalhas);

      // Busca o perfil (SLA + Indicadores Adicionais)
      const resPerfil = await fetch(`http://${window.location.hostname}:3001/api/tecnico/perfil/${encodeURIComponent(tecnico)}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (resPerfil.ok) {
        const dataPerfil = await resPerfil.json();
        setPerfilTecnico(dataPerfil);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do técnico:', err);
    } finally {
      setLoadingFalhas(false);
    }
  };

  const totalFalhas = ofensores.reduce((acc, curr) => acc + parseInt(curr.falhas, 10), 0);
  const totalHorasPerdidas = ofensores.reduce((acc, curr) => acc + parseFloat(curr.total_excedido), 0).toFixed(1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
            <Clock className="text-red-500" />
            Auditoria de SLAs (Parada de Relógio)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Visão geral de técnicos e empresas com pior performance (Anexo 09)</p>
        </div>
        {mesesDisponiveis.length > 0 && (
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
              data={ofensores}
              headers={['Técnico', 'Empresa', 'Falhas', 'Tempo Excedido']}
              mapRow={(row) => ({
                'Técnico': row.tecnico,
                'Empresa': row.empresa || '-',
                'Falhas': row.falhas,
                'Tempo Excedido': row.total_excedido
              })}
              filenamePrefix={`slas_ofensores_${mesSelecionado}`}
            />
          </div>
        )}
      </div>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-4">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertOctagon className="text-red-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total de Falhas (SLA)</p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{loading ? '...' : totalFalhas}</h2>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-4">
          <div className="bg-orange-100 p-4 rounded-full">
            <TrendingDown className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Horas Úteis Perdidas</p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{loading ? '...' : totalHorasPerdidas}h</h2>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-full">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Técnicos Penalizados</p>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">{loading ? '...' : ofensores.length}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Ofensores */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Ranking de Ofensores (Top 50)</h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-transparent sticky top-0 z-10">
                <tr className="text-slate-600 dark:text-slate-300 text-sm border-b border-slate-200 dark:border-slate-700">
                  <th className="p-4 font-semibold">Técnico</th>
                  <th className="p-4 font-semibold">Empresa</th>
                  <th className="p-4 font-semibold text-center">Falhas</th>
                  <th className="p-4 font-semibold text-center">Tempo Excedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ofensores.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500 dark:text-slate-400">
                      Nenhuma falha registrada.
                    </td>
                  </tr>
                ) : (
                  ofensores.slice(0, 50).map((tec, idx) => (
                    <tr key={idx} className="hover:bg-transparent transition-colors">
                      <td 
                        className="p-4 text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline" 
                        onClick={() => handleTecnicoClick(tec.tecnico)}
                      >
                        {tec.tecnico}
                      </td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{tec.empresa}</td>
                      <td className="p-4 text-center">
                        <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          {tec.falhas}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium text-slate-600 dark:text-slate-300 text-center">
                        {parseFloat(tec.total_excedido).toFixed(1)}h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico */}
        <div className="rounded-xl overflow-hidden p-5 flex flex-col h-[500px]">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Top 10 Técnicos por Volume de Falhas</h2>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ofensores.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                <YAxis dataKey="tecnico" type="category" width={100} stroke="#94A3B8" fontSize={11} />
                <Tooltip 
                  cursor={{fill: '#F1F5F9'}} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="falhas" radius={[0, 4, 4, 0]}>
                  {ofensores.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#dc2626' : '#1d3575'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal de Falhas por Técnico */}
      {selectedTecnico && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Perfil Analítico - {selectedTecnico}</h2>
                <p className="text-sm text-slate-500">Histórico de Falhas e Indicadores de Desempenho</p>
              </div>
              <button onClick={() => setSelectedTecnico(null)} className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full font-bold text-xl">
                &times;
              </button>
            </div>
            
            {/* Cards do Perfil do Técnico */}
            {perfilTecnico && (
              <div className="p-5 bg-transparent border-b border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="bg-red-100 p-3 rounded-full">
                      <AlertOctagon className="text-red-600" size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Falhas SLA</p>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{perfilTecnico.sla.total_falhas}</h3>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Eficiência</p>
                    {perfilTecnico.indicadores_adicionais.nota_eficiencia ? (
                        <h3 className="text-xl font-bold text-green-600">{perfilTecnico.indicadores_adicionais.nota_eficiencia}%</h3>
                    ) : (
                        <span className="text-sm font-medium text-slate-400 mt-1">Aguardando Mapeamento</span>
                    )}
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Produtividade</p>
                    {perfilTecnico.indicadores_adicionais.nota_produtividade ? (
                        <h3 className="text-xl font-bold text-blue-600">{perfilTecnico.indicadores_adicionais.nota_produtividade}%</h3>
                    ) : (
                        <span className="text-sm font-medium text-slate-400 mt-1">Aguardando Mapeamento</span>
                    )}
                  </div>
                </div>
                {perfilTecnico.indicadores_adicionais.aviso && (
                  <div className="mt-3 text-xs text-orange-600 bg-orange-50 border border-orange-200 p-2 rounded">
                    <strong>Aviso:</strong> {perfilTecnico.indicadores_adicionais.aviso}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-auto p-5 flex flex-col md:flex-row gap-6">
              {/* Lista de Falhas */}
              <div className={`flex-1 overflow-y-auto ${selectedOS ? 'hidden md:block' : 'block'}`}>
                {loadingFalhas ? (
                  <p className="text-center text-slate-500 py-10">Carregando falhas...</p>
                ) : (
                  <div className="space-y-3">
                    {falhasTecnico.length === 0 ? (
                       <p className="text-slate-500">Nenhuma falha encontrada.</p>
                    ) : falhasTecnico.map((falha, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedOS(falha)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedOS?.os === falha.os ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">OS: {falha.os}</span>
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">+{falha.tempo_excedido_horas}h</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                           <p><strong>Atividade:</strong> {falha.atividade}</p>
                           <p><strong>SLA (Alvo):</strong> {falha.sla_alvo || 'N/D'}</p>
                           <p><strong>Tempo Executado:</strong> {falha.tempo_execucao || 'N/D'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Detalhes da OS */}
              {selectedOS && (
                <div className="flex-1 bg-transparent p-5 rounded-lg border border-slate-200 dark:border-slate-700 overflow-y-auto relative">
                   <button onClick={() => setSelectedOS(null)} className="md:hidden absolute top-2 right-2 p-2 bg-slate-200 rounded-full text-slate-600 dark:bg-slate-700 dark:text-slate-300">&times; Voltar</button>
                   <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Detalhes da Ordem de Serviço</h3>
                   <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="block text-xs text-slate-500 font-bold uppercase">Cliente</span>
                        <span>{selectedOS.cliente}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 font-bold uppercase">Localidade</span>
                        <span>{selectedOS.cidade} - {selectedOS.bairro}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700">
                        <div>
                          <span className="block text-xs text-slate-500 font-bold uppercase">SLA (Alvo)</span>
                          <span className="text-red-600 dark:text-red-400 font-medium">{selectedOS.sla_alvo || 'N/D'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-500 font-bold uppercase">Tempo Executado</span>
                          <span className="font-medium">{selectedOS.tempo_execucao || 'N/D'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 font-bold uppercase">Data de Execução</span>
                        <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                          {selectedOS.data_execucao ? new Date(selectedOS.data_execucao).toLocaleDateString() : 'N/D'}
                        </p>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 font-bold uppercase">Motivo de Cancelamento / Razão</span>
                        <p className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded text-slate-800 dark:text-slate-200 mt-1">
                          {selectedOS.motivo_cancelamento || selectedOS.razao_1 || 'Sem justificativa preenchida.'}
                        </p>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
