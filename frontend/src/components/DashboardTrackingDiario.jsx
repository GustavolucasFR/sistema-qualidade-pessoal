import React, { useState, useEffect } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import ExportButtons from './ExportButtons';

const DashboardTrackingDiario = ({ isDark }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clusterFilter, setClusterFilter] = useState('Todos');
  const [availableClusters, setAvailableClusters] = useState([]);

  useEffect(() => {
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
        const res = await fetch(`http://${window.location.hostname}:3001/api/tracking_diario?cluster=${clusterFilter}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Erro ao buscar tracking diário", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clusterFilter]);

  if (loading && data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Processando matriz temporal executiva...</p>
      </div>
    );
  }

  // Identificar colunas disponíveis (Meses e Dias)
  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'kpi') : [];

  // Definir Formatação e Cores Condicionais com base no KPI
  const getCellClass = (kpi, value) => {
    if (value === null || value === undefined || value === '-') return '';
    const num = parseFloat(value);
    if (isNaN(num)) return '';

    // Regras de Formatação baseadas na imagem Excel (Simplificadas)
    if (kpi === 'Chegada no Slot' || kpi === 'Efetividade') {
      if (num >= 90) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-bold';
      if (num < 80) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 font-bold';
    }
    
    if (kpi === 'TDNA') {
      if (num <= 5 && num > 0) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-bold';
      if (num > 7) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 font-bold';
    }
    
    if (kpi === 'IFI' || kpi === 'IRR') {
       if (num <= 5 && num > 0) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 font-bold';
       if (num > 10) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 font-bold';
    }

    return 'text-slate-700 dark:text-slate-300';
  };

  const formatValue = (kpi, value) => {
      if (value === null || value === undefined || value === '-') return '-';
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      
      if (kpi.includes('Produção') || kpi.includes('Ofensores')) return num.toFixed(0);
      return num.toFixed(1);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-6 shrink-0">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                    <CalendarDays className="text-indigo-600" size={28} />
                    Tracking Diário Executivo
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Matriz temporal de KPIs com agregação Mensal e Diária.
                </p>
            </div>
            
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
            
            <div className="flex items-center gap-2 ml-4">
              <ExportButtons 
                data={data}
                headers={['KPI', ...columns]}
                mapRow={(row) => {
                  const res = { 'KPI': row.kpi };
                  columns.forEach(col => { res[col] = formatValue(row.kpi, row[col]); });
                  return res;
                }}
                filenamePrefix={`tracking_diario_${clusterFilter}`}
              />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 relative">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-full overflow-hidden flex flex-col">
            
            {/* Table Container with scrollbars */}
            <div className="flex-1 overflow-auto relative custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#1e293b] text-white">
                    <th className="p-3 border-b border-r border-slate-600 sticky left-0 z-30 bg-[#1e293b] font-black uppercase text-xs tracking-wider shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                      Tipo
                    </th>
                    {columns.map(col => (
                        <th key={col} className="p-3 border-b border-r border-slate-600 text-center font-bold min-w-[60px] whitespace-nowrap">
                            {col}
                        </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum dado encontrado para o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 border-r border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                            {row.kpi}
                        </td>
                        {columns.map(col => (
                            <td key={col} className={`p-3 border-r border-slate-200 dark:border-slate-700 text-center transition-colors ${getCellClass(row.kpi, row[col])}`}>
                                {formatValue(row.kpi, row[col])}
                            </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
        </div>
      </div>
      
      {/* CSS For custom scrollbar in this view */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.5); 
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5); 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}} />

    </div>
  );
};

export default DashboardTrackingDiario;
