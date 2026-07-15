import React, { useState, useEffect, useContext } from 'react';
import { Target, AlertCircle, CheckCircle, ClipboardList, PlusCircle, Activity } from 'lucide-react';
import { RefreshContext } from '../context/RefreshContext';
import ExportButtons from './ExportButtons';
import PlanoAcaoDetailsModal from './PlanoAcaoDetailsModal';

const DashboardAcoes = ({ userRole, isDark }) => {
  const [planos, setPlanos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoPlano, setNovoPlano] = useState({
    titulo: '', problema: '', causa_raiz: '', acao_proposta: '',
    responsavel: '', cluster: '', kpi_foco: '', prazo: ''
  });
  const [saving, setSaving] = useState(false);
  const [selectedPlano, setSelectedPlano] = useState(null);
  const { tick } = useContext(RefreshContext);

  const fetchData = async () => {
    try {
      const hostname = window.location.hostname;
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': token ? `Bearer ${token}` : '' };

      const [resPlanos, resAlertas] = await Promise.all([
        fetch(`http://${hostname}:3001/api/planos-acao`, { headers }),
        fetch(`http://${hostname}:3001/api/alertas`, { headers })
      ]);
      
      if(resPlanos.ok) {
        setPlanos(await resPlanos.json());
      }
      if(resAlertas.ok) {
        setAlertas(await resAlertas.json());
      }
    } catch (error) {
      console.error("Erro ao buscar dados de ações", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tick]);

  const handleSavePlano = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/planos-acao`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(novoPlano)
      });
      if(res.ok) {
        setIsModalOpen(false);
        setNovoPlano({ titulo: '', problema: '', causa_raiz: '', acao_proposta: '', responsavel: '', cluster: '', kpi_foco: '', prazo: '' });
        fetchData();
      } else {
        alert("Falha ao salvar plano de ação.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-600 mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando painel de ações...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-6">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <Target className="text-emerald-600" size={28} />
          Gestão de Ações e Alertas
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitorização ativa de anomalias e acompanhamento de planos de ação (PDCA).
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        
        {/* Alertas Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="text-rose-500" size={20} />
              Alertas Recentes
            </h2>
          </div>
          
          {alertas.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 text-center">
              <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum alerta crítico detetado no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alertas.map(alerta => (
                <div key={alerta.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border-l-4 border-rose-500 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                      {alerta.severidade}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(alerta.data_geracao).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">{alerta.tipo_alerta}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{alerta.mensagem}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Planos de Ação Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ClipboardList className="text-blue-500" size={20} />
              Planos de Ação Abertos
            </h2>
            <div className="flex items-center gap-2">
              <ExportButtons 
                data={planos}
                headers={['Título', 'Cluster', 'KPI Foco', 'Responsável', 'Prazo', 'Status']}
                mapRow={(row) => ({
                  'Título': row.titulo,
                  'Cluster': row.cluster,
                  'KPI Foco': row.kpi_foco,
                  'Responsável': row.responsavel,
                  'Prazo': row.prazo ? new Date(row.prazo).toLocaleDateString() : '-',
                  'Status': row.status
                })}
                filenamePrefix="planos_acao"
              />
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <PlusCircle size={18} />
                Novo Plano
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="p-4">Título</th>
                    <th className="p-4">Cluster / KPI</th>
                    <th className="p-4">Responsável</th>
                    <th className="p-4">Prazo</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {planos.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum plano de ação registado.
                      </td>
                    </tr>
                  ) : (
                    planos.map(plano => (
                      <tr 
                        key={plano.id} 
                        onClick={() => setSelectedPlano(plano)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                      >
                        <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{plano.titulo}</td>
                        <td className="p-4">
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{plano.cluster}</div>
                          <div className="text-xs text-slate-500">{plano.kpi_foco}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{plano.responsavel}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                          {plano.prazo ? new Date(plano.prazo).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            plano.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : 
                            plano.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {plano.status}
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

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <PlusCircle size={20} className="text-blue-500" />
                Novo Plano de Ação
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl leading-none">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSavePlano} className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                  <input type="text" required value={novoPlano.titulo} onChange={e => setNovoPlano({...novoPlano, titulo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200" placeholder="Ex: Treinamento NR35" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Responsável</label>
                  <input type="text" required value={novoPlano.responsavel} onChange={e => setNovoPlano({...novoPlano, responsavel: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200" placeholder="Nome do técnico ou supervisor" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cluster</label>
                  <input type="text" required value={novoPlano.cluster} onChange={e => setNovoPlano({...novoPlano, cluster: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200" placeholder="Ex: JOAO PESSOA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">KPI Foco</label>
                  <input type="text" required value={novoPlano.kpi_foco} onChange={e => setNovoPlano({...novoPlano, kpi_foco: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200" placeholder="Ex: Efetividade" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prazo</label>
                  <input type="date" required value={novoPlano.prazo} onChange={e => setNovoPlano({...novoPlano, prazo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Problema</label>
                <textarea required value={novoPlano.problema} onChange={e => setNovoPlano({...novoPlano, problema: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 h-20" placeholder="Descreva o problema identificado..."></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Causa Raiz</label>
                <textarea required value={novoPlano.causa_raiz} onChange={e => setNovoPlano({...novoPlano, causa_raiz: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 h-20" placeholder="Descreva a causa raiz do problema..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ação Proposta</label>
                <textarea required value={novoPlano.acao_proposta} onChange={e => setNovoPlano({...novoPlano, acao_proposta: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 h-20" placeholder="Ação que será tomada para corrigir o problema..."></textarea>
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPlano && (
        <PlanoAcaoDetailsModal 
          plano={selectedPlano}
          userRole={userRole}
          onClose={() => setSelectedPlano(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

export default DashboardAcoes;
