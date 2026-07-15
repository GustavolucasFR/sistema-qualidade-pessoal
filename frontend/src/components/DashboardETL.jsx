import React, { useState, useEffect } from 'react';
import { Activity, Database, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardETL() {
  const [etlStatus, setEtlStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consolidando, setConsolidando] = useState(false);

  const fetchETLStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://${window.location.hostname}:3001/api/etl/status`);
      const data = await res.json();
      setEtlStatus(data);
    } catch (err) {
      console.error('Erro ao buscar status do ETL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsolidarZeus = async () => {
    if (!window.confirm('Tem certeza que deseja consolidar os dados do Zeus do dia para o consolidado? Isso limpará a tabela diária.')) {
      return;
    }
    try {
      setConsolidando(true);
      const res = await fetch(`http://${window.location.hostname}:3001/api/etl/consolidar-zeus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assumindo uso de token
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Sucesso! ${data.registrosMovidos} registros foram consolidados.`);
        fetchETLStatus();
      } else {
        alert(`Erro: ${data.error || 'Falha ao consolidar'}`);
      }
    } catch (err) {
      console.error('Erro ao consolidar zeus:', err);
      alert('Erro de conexão ao tentar consolidar.');
    } finally {
      setConsolidando(false);
    }
  };

  useEffect(() => {
    fetchETLStatus();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
            <Database className="text-blue-600" />
            Data Observability & ETL Status
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Monitoramento do pipeline de importação do PostgreSQL</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleConsolidarZeus}
            disabled={consolidando}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <Database className={consolidando ? "animate-pulse" : ""} size={18} />
            {consolidando ? 'Consolidando...' : 'Consolidar Zeus'}
          </button>
          <button 
            onClick={fetchETLStatus}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-transparent border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">
                <th className="p-4 font-semibold">Arquivo</th>
                <th className="p-4 font-semibold">Competência</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Registros</th>
                <th className="p-4 font-semibold">Erros</th>
                <th className="p-4 font-semibold">Data da Importação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {etlStatus.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum registro de importação encontrado.
                  </td>
                </tr>
              ) : (
                etlStatus.map((job) => (
                  <tr key={job.id} className="hover:bg-transparent transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-700">{job.nome_arquivo}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      <span className="bg-slate-100 px-2 py-1 rounded-md">{job.competencia}</span>
                    </td>
                    <td className="p-4 text-sm">
                      {job.status === 'SUCESSO' || job.status === 'concluido' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle size={14} /> Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          <AlertTriangle size={14} /> Erro
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{job.total_registros?.toLocaleString()}</td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      {job.total_erros > 0 ? (
                        <span className="text-red-600 font-bold">{job.total_erros}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(job.data_importacao).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
