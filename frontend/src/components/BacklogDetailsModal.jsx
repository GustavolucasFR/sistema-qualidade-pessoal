import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';

const BacklogDetailsModal = ({ isOpen, onClose, filters, viewMode }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !filters) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (filters.cluster) queryParams.append('cluster', filters.cluster);
        if (filters.mega_cluster) queryParams.append('mega_cluster', filters.mega_cluster);
        if (filters.status_reason) queryParams.append('status_reason', filters.status_reason);
        if (filters.faixa_aging) queryParams.append('faixa_aging', filters.faixa_aging);
        if (filters.snapshot) queryParams.append('snapshot', filters.snapshot);
        if (viewMode) queryParams.append('viewMode', viewMode);

        const token = localStorage.getItem('token');
        const res = await fetch(`http://${window.location.hostname}:3001/api/backlog/details?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Falha ao buscar detalhes');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, filters, viewMode]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // dateString usually comes as "DD/MM/YYYY HH:mm" or similar from the db
    return dateString;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              Detalhes dos Chamados
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-xs py-1 px-2 rounded-full ml-2">
                {data.length} registros
              </span>
            </h2>
            <div className="flex gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {filters.cluster && <span>Cluster: <strong className="text-slate-700 dark:text-slate-200">{filters.cluster}</strong></span>}
              {filters.status_reason !== 'ALL' && <span>• Motivo: <strong className="text-slate-700 dark:text-slate-200">{filters.status_reason}</strong></span>}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-medium">Buscando detalhes no banco de dados...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-rose-500">
              <p className="font-bold text-lg mb-2">Erro</p>
              <p>{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
              <p className="font-medium">Nenhum chamado encontrado para esse filtro.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SS</th>
                  <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Armário / PON</th>
                  <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Abertura</th>
                  <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vencimento</th>
                  <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Base</th>
                  <th className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{row.COD_SS}</span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold text-sm border border-indigo-100 dark:border-indigo-800/50">
                        {row.ARMARIO || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      {formatDate(row.DATA_ABERTURA)}
                    </td>
                    <td className="p-3 text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      {formatDate(row.DATA_VENCIMENTO)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${row.STATUS === 'PENDENTE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {row.STATUS || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {row.STATUS_REASON || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BacklogDetailsModal;
