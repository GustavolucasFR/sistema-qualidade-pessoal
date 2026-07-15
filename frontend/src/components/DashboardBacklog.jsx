import React, { useState, useEffect, useContext } from 'react';
import { Layers, ChevronDown, ChevronRight, Clock, RefreshCw, TrendingUp, TrendingDown, Calendar, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts';
import BacklogDetailsModal from './BacklogDetailsModal';
import { usePersistentState } from '../hooks/usePersistentState';
import { RefreshContext } from '../context/RefreshContext';
import ExportButtons from './ExportButtons';

const DashboardBacklog = ({ isDark }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [d1Data, setD1Data] = useState(null);
  const [d1LastUpdate, setD1LastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartsRef = React.useRef(null);


  const [historyDates, setHistoryDates] = useState([]);
  const [selectedDate, setSelectedDate] = usePersistentState('backlogSelectedDate', 'atual');
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, filters: null, viewMode: null });

  const formatTMR = (horas) => {
    if (!horas || horas === 0) return '-';
    return `${Math.round(horas)}h`;
  };

  const getTMRColor = (horas) => {
    if (!horas || horas === 0) return 'text-slate-500';
    if (horas < 21) return 'text-emerald-600 dark:text-emerald-400';
    if (horas < 24) return 'text-amber-500 dark:text-amber-400';
    if (horas < 48) return 'text-rose-600 dark:text-rose-500';
    return 'text-rose-800 dark:text-rose-400 font-extrabold';
  };

  const handleCellClick = (cluster, mega_cluster, status_reason, faixa_aging, snapshotDateStr, e) => {
    e.stopPropagation(); // prevent toggling the row
    setDetailsModal({
      isOpen: true,
      viewMode,
      filters: { cluster, mega_cluster, status_reason, faixa_aging, snapshot: snapshotDateStr }
    });
  };


  const [expandedClusters, setExpandedClusters] = useState(() => {
    const saved = localStorage.getItem('backlogExpanded');
    return saved ? JSON.parse(saved) : {};
  });

  const [viewMode, setViewMode] = usePersistentState('backlogViewMode', 'cidade');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { tick } = useContext(RefreshContext);

  // Buscar datas disponiveis no historico
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3001/api/backlog/datas`);
        if (res.ok) {
          const dates = await res.json();
          setHistoryDates(dates);
        }
      } catch (err) {
        console.error("Erro ao buscar datas historicas:", err);
      }
    };
    fetchDates();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `http://${window.location.hostname}:3001/api/backlog?groupBy=${viewMode}`;
        if (selectedDate !== 'atual') {
          // Encode the slash if needed, but normally it's fine in query params, encodeURIComponent is safer
          url += `&date=${encodeURIComponent(selectedDate)}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            setSnapshots(json);
            setComparison(null);
            setD1Data(null);
            setD1LastUpdate(null);
          } else {
            setSnapshots([{ lastUpdate: json.lastUpdate || null, data: json.data || [] }]);
            setComparison(json.comparison || null);
            setD1Data(json.d1_data || null);
            setD1LastUpdate(json.d1_lastUpdate || null);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados de backlog", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [viewMode, refreshTrigger, selectedDate, tick]);

  const toggleCluster = (clusterName) => {
    setExpandedClusters(prev => ({
      ...prev,
      [clusterName]: !prev[clusterName]
    }));
  };

  const formatarDataLocal = (dataString) => {
    if (!dataString) return '';
    try {
      const parts = dataString.split(/[\s/:-T]/);
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          return `${parts[2]}/${parts[1]}/${parts[0]} às ${parts[3] || '00'}:${parts[4] || '00'}`;
        } else {
          return `${parts[0]}/${parts[1]}/${parts[2]} às ${parts[3] || '00'}:${parts[4] || '00'}`;
        }
      }
      return dataString;
    } catch (e) {
      return dataString;
    }
  };

  const renderRows = (rowsToRender, updateTime) => rowsToRender.map((row, idx) => (
    <React.Fragment key={`${row.cluster}-${idx}`}>
      <tr
        className="hover:bg-white/40 dark:hover:bg-slate-700/50 transition-colors cursor-pointer bg-transparent dark:bg-slate-800/50"
        onClick={() => toggleCluster(row.cluster)}
      >
        <td className="p-3 font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 border-r border-slate-200 dark:border-slate-700">
          {expandedClusters[row.cluster] ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
          <span className={viewMode === 'cidade' ? "pl-2" : ""}>{row.cluster}</span>
        </td>
        <td
          className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/20 hover:opacity-75 cursor-pointer transition-opacity"
          onClick={(e) => row.agenda_hoje > 0 && handleCellClick(row.cluster, row.mega_cluster, 'ALL', 'agenda_hoje', updateTime, e)}
          title={row.agenda_hoje > 0 ? 'Clique para ver os detalhes' : ''}
        >
          {row.agenda_hoje > 0 ? <span className="underline decoration-dotted underline-offset-4">{row.agenda_hoje > 0 ? row.agenda_hoje : '-'}</span> : '-'}
        </td>
        <td
          className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 hover:opacity-75 cursor-pointer transition-opacity"
          onClick={(e) => row.menor_24h > 0 && handleCellClick(row.cluster, row.mega_cluster, 'ALL', 'menor_24h', updateTime, e)}
          title={row.menor_24h > 0 ? 'Clique para ver os detalhes' : ''}
        >
          {row.menor_24h > 0 ? <span className="underline decoration-dotted underline-offset-4">{row.menor_24h > 0 ? row.menor_24h : '-'}</span> : '-'}
        </td>
        <td
          className="p-3 text-center font-bold text-slate-700 dark:text-slate-300 hover:opacity-75 cursor-pointer transition-opacity"
          onClick={(e) => row.entre_24_48h > 0 && handleCellClick(row.cluster, row.mega_cluster, 'ALL', 'entre_24_48h', updateTime, e)}
          title={row.entre_24_48h > 0 ? 'Clique para ver os detalhes' : ''}
        >
          {row.entre_24_48h > 0 ? <span className="underline decoration-dotted underline-offset-4">{row.entre_24_48h > 0 ? row.entre_24_48h : '-'}</span> : '-'}
        </td>
        <td
          className="p-3 text-center font-bold text-[#660099] dark:text-[#c084fc] hover:opacity-75 cursor-pointer transition-opacity"
          onClick={(e) => row.entre_48_72h > 0 && handleCellClick(row.cluster, row.mega_cluster, 'ALL', 'entre_48_72h', updateTime, e)}
          title={row.entre_48_72h > 0 ? 'Clique para ver os detalhes' : ''}
        >
          {row.entre_48_72h > 0 ? <span className="underline decoration-dotted underline-offset-4">{row.entre_48_72h > 0 ? row.entre_48_72h : '-'}</span> : '-'}
        </td>
        <td
          className="p-3 text-center font-black text-rose-600 hover:opacity-75 cursor-pointer transition-opacity"
          onClick={(e) => row.maior_3_dias > 0 && handleCellClick(row.cluster, row.mega_cluster, 'ALL', 'maior_3_dias', updateTime, e)}
          title={row.maior_3_dias > 0 ? 'Clique para ver os detalhes' : ''}
        >
          {row.maior_3_dias > 0 ? <span className="underline decoration-dotted underline-offset-4">{row.maior_3_dias > 0 ? row.maior_3_dias : '-'}</span> : '-'}
        </td>
        <td
          className="p-3 text-center font-black text-rose-700 border-r border-slate-200 dark:border-slate-700 hover:opacity-75 cursor-pointer transition-opacity"
          onClick={(e) => row.maior_5_dias > 0 && handleCellClick(row.cluster, row.mega_cluster, 'ALL', 'maior_5_dias', updateTime, e)}
          title={row.maior_5_dias > 0 ? 'Clique para ver os detalhes' : ''}
        >
          {row.maior_5_dias > 0 ? <span className="underline decoration-dotted underline-offset-4">{row.maior_5_dias > 0 ? row.maior_5_dias : '-'}</span> : '-'}
        </td>
        <td
          className="p-3 text-center font-black text-indigo-900 dark:text-indigo-300 bg-indigo-50/30 hover:opacity-75 cursor-pointer transition-opacity"
          onClick={(e) => row.total_abertas > 0 && handleCellClick(row.cluster, row.mega_cluster, 'ALL', 'total_abertas', updateTime, e)}
          title={row.total_abertas > 0 ? 'Clique para ver os detalhes' : ''}
        >
          {row.total_abertas > 0 ? <span className="underline decoration-dotted underline-offset-4">{row.total_abertas > 0 ? row.total_abertas : '-'}</span> : '-'}
        </td>
        <td className={`p-3 text-center font-bold ${getTMRColor(row.tmr_horas)}`}>
          {formatTMR(row.tmr_horas)}
        </td>
      </tr>

      {expandedClusters[row.cluster] && row.servicos.map((svc, svcIdx) => (
        <React.Fragment key={`svc-${row.cluster}-${svcIdx}`}>
          <tr className="bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/30">
            <td className="p-2 pl-12 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center gap-2 border-r border-slate-200 dark:border-slate-700">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></div>
              {svc.status_reason}
            </td>
            <td
              className="p-2 text-center text-xs font-bold text-emerald-600/80 bg-emerald-50/20 hover:opacity-75 cursor-pointer transition-opacity"
              onClick={(e) => svc.agenda_hoje > 0 && handleCellClick(row.cluster, row.mega_cluster, svc.status_reason, 'agenda_hoje', updateTime, e)}
              title={svc.agenda_hoje > 0 ? 'Clique para ver os detalhes' : ''}
            >
              {svc.agenda_hoje > 0 ? <span className="underline decoration-dotted underline-offset-4">{svc.agenda_hoje > 0 ? svc.agenda_hoje : '-'}</span> : '-'}
            </td>
            <td
              className="p-2 text-center text-xs font-medium text-slate-600 dark:text-slate-400 hover:opacity-75 cursor-pointer transition-opacity"
              onClick={(e) => svc.menor_24h > 0 && handleCellClick(row.cluster, row.mega_cluster, svc.status_reason, 'menor_24h', updateTime, e)}
              title={svc.menor_24h > 0 ? 'Clique para ver os detalhes' : ''}
            >
              {svc.menor_24h > 0 ? <span className="underline decoration-dotted underline-offset-4">{svc.menor_24h > 0 ? svc.menor_24h : '-'}</span> : '-'}
            </td>
            <td
              className="p-2 text-center text-xs font-medium text-slate-600 dark:text-slate-400 hover:opacity-75 cursor-pointer transition-opacity"
              onClick={(e) => svc.entre_24_48h > 0 && handleCellClick(row.cluster, row.mega_cluster, svc.status_reason, 'entre_24_48h', updateTime, e)}
              title={svc.entre_24_48h > 0 ? 'Clique para ver os detalhes' : ''}
            >
              {svc.entre_24_48h > 0 ? <span className="underline decoration-dotted underline-offset-4">{svc.entre_24_48h > 0 ? svc.entre_24_48h : '-'}</span> : '-'}
            </td>
            <td
              className="p-2 text-center text-xs font-bold text-[#660099] dark:text-[#c084fc] hover:opacity-75 cursor-pointer transition-opacity"
              onClick={(e) => svc.entre_48_72h > 0 && handleCellClick(row.cluster, row.mega_cluster, svc.status_reason, 'entre_48_72h', updateTime, e)}
              title={svc.entre_48_72h > 0 ? 'Clique para ver os detalhes' : ''}
            >
              {svc.entre_48_72h > 0 ? <span className="underline decoration-dotted underline-offset-4">{svc.entre_48_72h > 0 ? svc.entre_48_72h : '-'}</span> : '-'}
            </td>
            <td
              className="p-2 text-center text-xs font-bold text-rose-600/80 hover:opacity-75 cursor-pointer transition-opacity"
              onClick={(e) => svc.maior_3_dias > 0 && handleCellClick(row.cluster, row.mega_cluster, svc.status_reason, 'maior_3_dias', updateTime, e)}
              title={svc.maior_3_dias > 0 ? 'Clique para ver os detalhes' : ''}
            >
              {svc.maior_3_dias > 0 ? <span className="underline decoration-dotted underline-offset-4">{svc.maior_3_dias > 0 ? svc.maior_3_dias : '-'}</span> : '-'}
            </td>
            <td
              className="p-2 text-center text-xs font-bold text-rose-700/80 border-r border-slate-200 dark:border-slate-700 hover:opacity-75 cursor-pointer transition-opacity"
              onClick={(e) => svc.maior_5_dias > 0 && handleCellClick(row.cluster, row.mega_cluster, svc.status_reason, 'maior_5_dias', updateTime, e)}
              title={svc.maior_5_dias > 0 ? 'Clique para ver os detalhes' : ''}
            >
              {svc.maior_5_dias > 0 ? <span className="underline decoration-dotted underline-offset-4">{svc.maior_5_dias > 0 ? svc.maior_5_dias : '-'}</span> : '-'}
            </td>
            <td
              className="p-2 text-center text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100/50 dark:bg-slate-800/50 hover:opacity-75 cursor-pointer transition-opacity"
              onClick={(e) => svc.total_abertas > 0 && handleCellClick(row.cluster, row.mega_cluster, svc.status_reason, 'total_abertas', updateTime, e)}
              title={svc.total_abertas > 0 ? 'Clique para ver os detalhes' : ''}
            >
              {svc.total_abertas > 0 ? <span className="underline decoration-dotted underline-offset-4">{svc.total_abertas > 0 ? svc.total_abertas : '-'}</span> : '-'}
            </td>
            <td className="p-2 text-center text-xs font-bold text-emerald-500/80">
              -
            </td>
          </tr>
        </React.Fragment>
      ))}
    </React.Fragment>
  ));

  const renderTableBlock = (dataset, title, updateTime) => {
    let agenda_hoje = 0, menor_24h = 0, entre_24_48h = 0, entre_48_72h = 0;
    let maior_3_dias = 0, maior_5_dias = 0, total_abertas = 0;
    let tmr_horas_sum = 0, tmr_horas_count = 0;
    let tmr_fechadas = 0;

    dataset.forEach(row => {
      agenda_hoje += row.agenda_hoje;
      menor_24h += row.menor_24h;
      entre_24_48h += row.entre_24_48h;
      entre_48_72h += row.entre_48_72h;
      maior_3_dias += row.maior_3_dias;
      maior_5_dias += row.maior_5_dias;
      total_abertas += row.total_abertas;

      if (row.tmr_horas > 0) {
        tmr_horas_sum += (row.tmr_horas * row.total_abertas);
        tmr_horas_count += row.total_abertas;
      }
      if (row.tmr_fechadas > 0) {
        tmr_fechadas = row.tmr_fechadas;
      }
    });

    const global_tmr_horas = tmr_horas_count > 0 ? (tmr_horas_sum / tmr_horas_count) : 0;
    const totais = { agenda_hoje, menor_24h, entre_24_48h, entre_48_72h, maior_3_dias, maior_5_dias, total_abertas, global_tmr_horas, tmr_fechadas };

    const groupedData = dataset.reduce((acc, row) => {
      const mc = viewMode === 'cidade' ? (row.mega_cluster || 'DESCONHECIDO') : 'ALL';
      if (!acc[mc]) acc[mc] = [];
      acc[mc].push(row);
      return acc;
    }, {});

    return (
      <div className="bg-white/60 backdrop-blur-sm dark:bg-slate-800/60 rounded-lg shadow-sm overflow-hidden border-2 border-indigo-400 dark:border-indigo-600 flex-1 flex flex-col">
        <div className="p-3 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-indigo-50/70 dark:bg-indigo-900/30">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            {title}
          </h2>
          {updateTime && (
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock size={12} />
              Corte: {formatarDataLocal(updateTime)}
            </div>
          )}
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#4f46e5] text-white text-xs font-bold tracking-wider uppercase">
                <th className="p-3 text-left">CIDADE / SERVIÇO</th>
                <th className="p-3 text-center">AGENDA HOJE</th>
                <th className="p-3 text-center">&lt; 24H</th>
                <th className="p-3 text-center">&gt; 24H</th>
                <th className="p-3 text-center bg-[#660099]">&gt; 48H</th>
                <th className="p-3 text-center bg-[#e11d48]">&gt; 3 DIAS</th>
                <th className="p-3 text-center bg-[#be123c]">&gt; 5 DIAS</th>
                <th className="p-3 text-center bg-[#1e293b]">TOTAL REGIONAL</th>
                <th className="p-3 text-center bg-emerald-700">TMR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {dataset.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma ordem em aberto encontrada.
                  </td>
                </tr>
              ) : viewMode === 'cluster' ? (
                renderRows(dataset, updateTime)
              ) : (
                Object.keys(groupedData).sort().map((megaCluster) => {
                  const clusterRows = groupedData[megaCluster];
                  let agenda_hoje = 0, menor_24h = 0, entre_24_48h = 0, entre_48_72h = 0;
                  let maior_3_dias = 0, maior_5_dias = 0, total_abertas = 0;
                  let tmr_horas_sum = 0, tmr_horas_count = 0;
                  let tmr_fechadas_sum = 0, tmr_fechadas_count = 0;

                  clusterRows.forEach(row => {
                    agenda_hoje += row.agenda_hoje;
                    menor_24h += row.menor_24h;
                    entre_24_48h += row.entre_24_48h;
                    entre_48_72h += row.entre_48_72h;
                    maior_3_dias += row.maior_3_dias;
                    maior_5_dias += row.maior_5_dias;
                    total_abertas += row.total_abertas;

                    if (row.tmr_horas > 0) {
                      tmr_horas_sum += (row.tmr_horas * row.total_abertas);
                      tmr_horas_count += row.total_abertas;
                    }
                    if (row.tmr_fechadas > 0) {
                      tmr_fechadas_sum += (row.tmr_fechadas * row.total_abertas);
                      tmr_fechadas_count += row.total_abertas;
                    }
                  });

                  const mc_tmr_horas = tmr_horas_count > 0 ? (tmr_horas_sum / tmr_horas_count) : 0;
                  const mc_tmr_fechadas = tmr_fechadas_count > 0 ? (tmr_fechadas_sum / tmr_fechadas_count) : 0;

                  return (
                    <React.Fragment key={`group-${megaCluster}`}>
                      <tr className="bg-[#3730a3] border-indigo-700 dark:border-indigo-800 text-white font-bold border-y">
                        <td className="p-2 pl-4 text-xs tracking-wider uppercase">
                          {megaCluster}
                        </td>
                        <td className="p-2 text-center text-xs">{agenda_hoje > 0 ? agenda_hoje : '-'}</td>
                        <td className="p-2 text-center text-xs">{menor_24h > 0 ? menor_24h : '-'}</td>
                        <td className="p-2 text-center text-xs">{entre_24_48h > 0 ? entre_24_48h : '-'}</td>
                        <td className="p-2 text-center text-xs">{entre_48_72h > 0 ? entre_48_72h : '-'}</td>
                        <td className="p-2 text-center text-xs">{maior_3_dias > 0 ? maior_3_dias : '-'}</td>
                        <td className="p-2 text-center text-xs">{maior_5_dias > 0 ? maior_5_dias : '-'}</td>
                        <td className="p-2 text-center text-xs">{total_abertas > 0 ? total_abertas : '-'}</td>
                        <td className="p-2 text-center text-xs bg-slate-800/20">{mc_tmr_horas > 0 ? mc_tmr_horas.toFixed(2) : '-'}h</td>
                      </tr>
                      {renderRows(clusterRows, updateTime)}
                    </React.Fragment>
                  );
                })
              )}
              {dataset.length > 0 && (
                <tr className="bg-[#e0e7ff] dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 border-t-2 sticky bottom-0">
                  <td className="p-4 font-black text-indigo-900 dark:text-indigo-300">TOTAL REGIONAL</td>
                  <td className="p-4 text-center font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/20">{totais.agenda_hoje > 0 ? totais.agenda_hoje : '-'}</td>
                  <td className="p-4 text-center font-black text-slate-800 dark:text-slate-200">{totais.menor_24h > 0 ? totais.menor_24h : '-'}</td>
                  <td className="p-4 text-center font-black text-slate-800 dark:text-slate-200">{totais.entre_24_48h > 0 ? totais.entre_24_48h : '-'}</td>
                  <td className="p-4 text-center font-black text-[#660099] dark:text-[#c084fc]">{totais.entre_48_72h > 0 ? totais.entre_48_72h : '-'}</td>
                  <td className="p-4 text-center font-black text-rose-600">{totais.maior_3_dias > 0 ? totais.maior_3_dias : '-'}</td>
                  <td className="p-4 text-center font-black text-rose-700">{totais.maior_5_dias > 0 ? totais.maior_5_dias : '-'}</td>
                  <td className="p-4 text-center font-black text-indigo-900 dark:text-indigo-300">{totais.total_abertas}</td>
                  <td className="p-4 text-center font-black bg-slate-50/20 dark:bg-slate-800/20 text-emerald-500">{totais.global_tmr_horas > 0 ? totais.global_tmr_horas.toFixed(2) + 'h' : '-'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderComparisonChart = () => {
    if (!snapshots.length || !d1Data || selectedDate !== 'atual') return null;

    const grouped = {};
    const processSet = (dataset, labelKey) => {
      dataset.forEach(row => {
        const key = viewMode === 'cidade' ? (row.mega_cluster || 'DESCONHECIDO') : row.cluster;
        if (!grouped[key]) grouped[key] = {
          name: key,
          'D-1': 0, 'D0': 0,
          'D-1_Aging': 0, 'D0_Aging': 0,
          'D-1_48_72h': 0, 'D0_48_72h': 0,
          'D-1_maior_3d': 0, 'D0_maior_3d': 0,
          'D-1_maior_5d': 0, 'D0_maior_5d': 0,
          'Op_D-1': 0, 'Op_D0': 0,
          'Op_D-1_48_72h': 0, 'Op_D0_48_72h': 0,
          'Op_D-1_maior_3d': 0, 'Op_D0_maior_3d': 0,
          'Op_D-1_maior_5d': 0, 'Op_D0_maior_5d': 0
        };
        grouped[key][labelKey] += row.total_abertas;

        grouped[key][`${labelKey}_48_72h`] += (Number(row.entre_48_72h) || 0);
        grouped[key][`${labelKey}_maior_3d`] += (Number(row.maior_3_dias) || 0);
        grouped[key][`${labelKey}_maior_5d`] += (Number(row.maior_5_dias) || 0);

        const agingSum = (Number(row.entre_48_72h) || 0) + (Number(row.maior_3_dias) || 0) + (Number(row.maior_5_dias) || 0);
        grouped[key][`${labelKey}_Aging`] += agingSum;

        let oper_total = 0;
        let oper_48_72h = 0;
        let oper_3d = 0;
        let oper_5d = 0;

        if (row.servicos) {
          row.servicos.forEach(svc => {
            const reason = (svc.status_reason || '').toLowerCase();
            const isExcluded = reason.includes('aberta massiva') ||
              reason.includes('massiva em an') ||
              reason.includes('triagem');
            if (!isExcluded) {
              oper_total += (Number(svc.total_abertas) || 0);
              oper_48_72h += (Number(svc.entre_48_72h) || 0);
              oper_3d += (Number(svc.maior_3_dias) || 0);
              oper_5d += (Number(svc.maior_5_dias) || 0);
            }
          });
        }

        grouped[key][`Op_${labelKey}`] += oper_total;
        grouped[key][`Op_${labelKey}_48_72h`] += oper_48_72h;
        grouped[key][`Op_${labelKey}_maior_3d`] += oper_3d;
        grouped[key][`Op_${labelKey}_maior_5d`] += oper_5d;
      });
    };

    processSet(d1Data, 'D-1');
    processSet(snapshots[0].data, 'D0');

    const chartData = Object.values(grouped).sort((a, b) => b['D0'] - a['D0']);

    return (
      <div ref={chartsRef} className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="rounded-lg overflow-hidden p-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <BarChart2 className="text-indigo-600" size={20} />
            Comparativo de Volume Total: Ontem (D-1) vs Hoje (D0)
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="D-1" fill="#698dd0" radius={[4, 4, 0, 0]} name="Volume D-1 (Ontem)">
                  <LabelList dataKey="D-1" position="top" fill="#64748b" fontSize={11} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="D0" fill="#1d3575" radius={[4, 4, 0, 0]} name="Volume D0 (Hoje)">
                  <LabelList dataKey="D0" position="top" fill="#1d3575" fontSize={11} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden p-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="text-rose-600" size={20} />
            Comparativo Crítico (&gt; 48H): Ontem (D-1) vs Hoje (D0)
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} maxBarSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                {/* D-1 Stack */}
                <Bar dataKey="D-1_48_72h" stackId="d1" fill="#9cb5e1" name="&gt; 48H (D-1)">
                  <LabelList dataKey="D-1_48_72h" position="center" fill="#1e293b" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="D-1_maior_3d" stackId="d1" fill="#fca5a5" name="&gt; 3 Dias (D-1)">
                  <LabelList dataKey="D-1_maior_3d" position="center" fill="#1e293b" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="D-1_maior_5d" stackId="d1" fill="#f87171" name="&gt; 5 Dias (D-1)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="D-1_maior_5d" position="center" fill="#1e293b" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>

                {/* D0 Stack */}
                <Bar dataKey="D0_48_72h" stackId="d0" fill="#2f529e" name="&gt; 48H (Hoje)">
                  <LabelList dataKey="D0_48_72h" position="center" fill="#ffffff" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="D0_maior_3d" stackId="d0" fill="#dc2626" name="&gt; 3 Dias (Hoje)">
                  <LabelList dataKey="D0_maior_3d" position="center" fill="#ffffff" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="D0_maior_5d" stackId="d0" fill="#991b1b" name="&gt; 5 Dias (Hoje)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="D0_maior_5d" position="center" fill="#ffffff" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Total Chart */}
        <div className="rounded-lg overflow-hidden p-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4" title="Exclui Aberta Massiva, Massiva em Análise e Triagem">
            <BarChart2 className="text-emerald-600" size={20} />
            Volume Operacional: Ontem (D-1) vs Hoje (D0)
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Op_D-1" fill="#698dd0" radius={[4, 4, 0, 0]} name="Op. D-1 (Ontem)">
                  <LabelList dataKey="Op_D-1" position="top" fill="#64748b" fontSize={11} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Op_D0" fill="#dc2626" radius={[4, 4, 0, 0]} name="Op. D0 (Hoje)">
                  <LabelList dataKey="Op_D0" position="top" fill="#dc2626" fontSize={11} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Critical Chart */}
        <div className="rounded-lg overflow-hidden p-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4" title="Exclui Aberta Massiva, Massiva em Análise e Triagem">
            <Clock className="text-orange-500" size={20} />
            Crítico Operacional (&gt; 48H): D-1 vs Hoje
          </h3>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} maxBarSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />

                {/* D-1 Stack */}
                <Bar dataKey="Op_D-1_48_72h" stackId="op_d1" fill="#9cb5e1" name="&gt; 48H (D-1)">
                  <LabelList dataKey="Op_D-1_48_72h" position="center" fill="#1e293b" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Op_D-1_maior_3d" stackId="op_d1" fill="#fca5a5" name="&gt; 3 Dias (D-1)">
                  <LabelList dataKey="Op_D-1_maior_3d" position="center" fill="#1e293b" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Op_D-1_maior_5d" stackId="op_d1" fill="#f87171" name="&gt; 5 Dias (D-1)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Op_D-1_maior_5d" position="center" fill="#1e293b" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>

                {/* D0 Stack */}
                <Bar dataKey="Op_D0_48_72h" stackId="op_d0" fill="#2f529e" name="&gt; 48H (Hoje)">
                  <LabelList dataKey="Op_D0_48_72h" position="center" fill="#ffffff" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Op_D0_maior_3d" stackId="op_d0" fill="#dc2626" name="&gt; 3 Dias (Hoje)">
                  <LabelList dataKey="Op_D0_maior_3d" position="center" fill="#ffffff" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
                <Bar dataKey="Op_D0_maior_5d" stackId="op_d0" fill="#991b1b" name="&gt; 5 Dias (Hoje)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Op_D0_maior_5d" position="center" fill="#ffffff" fontSize={10} fontWeight={600} formatter={(val) => val > 0 ? val : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  if (loading && snapshots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Analisando Backlog Diário...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">

      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <Layers className="text-indigo-600" size={28} />
              Visão de Backlog Diário
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 h-6">
              {comparison && selectedDate === 'atual' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200 dark:border-emerald-800/50" title="Serviços finalizados ou retirados do backlog em aberto desde a última carga">
                    <TrendingDown size={14} />
                    <span>{comparison.finalizados} Finalizados</span>
                  </div>
                  <div className="flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded text-xs font-bold border border-rose-200 dark:border-rose-800/50" title="Novos serviços que entraram no backlog em aberto desde a última carga">
                    <TrendingUp size={14} />
                    <span>{comparison.novos} Novos</span>
                  </div>
                </div>
              )}
              {selectedDate !== 'atual' && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2 py-1 rounded">Modo de Visualização Histórica (Apenas Leitura)</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Data do Historico */}
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 shadow-sm">
              <Calendar size={16} className="text-slate-400 mr-2" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="atual" className="bg-white dark:bg-slate-900">Hoje (Atual)</option>
                {historyDates.map(dateStr => (
                  <option key={dateStr} value={dateStr} className="bg-white dark:bg-slate-900">
                    Histórico: {dateStr}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="text-slate-400 ml-2" />
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('cidade')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'cidade' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Cidade
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'cluster' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Cluster
              </button>
            </div>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-800 transition-colors"
              title="Recarregar Dados"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
            <ExportButtons
              data={snapshots[0]?.data || []}
              headers={['Agrupador', 'Mega Cluster', 'Agenda Hoje', '< 24H', '24H-48H', '48H-72H', '> 3 Dias', '> 5 Dias', 'Total', 'TMR (Horas)']}
              mapRow={(row) => ({
                'Agrupador': row.cluster,
                'Mega Cluster': row.mega_cluster || '-',
                'Agenda Hoje': row.agenda_hoje,
                '< 24H': row.menor_24h,
                '24H-48H': row.entre_24_48h,
                '48H-72H': row.entre_48_72h,
                '> 3 Dias': row.maior_3_dias,
                '> 5 Dias': row.maior_5_dias,
                'Total': row.total_abertas,
                'TMR (Horas)': row.tmr_horas
              })}
              filenamePrefix={`backlog_${viewMode}`}
              chartsRef={chartsRef}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-6 flex flex-col relative">
        {loading && snapshots.length > 0 && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-20 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
          </div>
        )}
        <div className="flex flex-col gap-6 w-full">
          {renderComparisonChart()}
          {d1Data && selectedDate === 'atual' && (
            <div className="flex-1 w-full flex flex-col mb-4 opacity-90">
              {renderTableBlock(d1Data, "Backlog Anterior (Ontem D-1)", d1LastUpdate)}
            </div>
          )}
          {snapshots.map((snap, idx) => (
            <div key={idx} className="flex-1 w-full flex flex-col">
              {renderTableBlock(snap.data, selectedDate === 'atual' ? "Backlog Atual" : `Corte: ${formatarDataLocal(snap.lastUpdate)}`, snap.lastUpdate)}
            </div>
          ))}
        </div>
      </div>

      <BacklogDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ ...detailsModal, isOpen: false })}
        filters={detailsModal.filters}
        viewMode={detailsModal.viewMode}
      />
    </div>
  );
};

export default DashboardBacklog;
