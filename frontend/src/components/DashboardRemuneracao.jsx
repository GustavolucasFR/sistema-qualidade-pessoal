import React, { useState, useEffect, useContext } from 'react';
import { formatarMesAno } from '../utils/dateFormatter';
import { DollarSign, Medal, Award, Star, Search, Download, ChevronDown, ChevronUp, Info, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { usePersistentState } from '../hooks/usePersistentState';
import { RefreshContext } from '../context/RefreshContext';
import ExportButtons from './ExportButtons';

const CORES_CATEGORIA = {
  'Em Desenvolvimento': { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
  'Prata': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', icon: 'text-slate-400' },
  'Ouro': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-500', border: 'border-amber-300 dark:border-amber-700/50', icon: 'text-amber-500' },
  'Diamante': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-700 dark:text-cyan-500', border: 'border-cyan-300 dark:border-cyan-700/50', icon: 'text-cyan-500' }
};

const DashboardRemuneracao = ({ isDark }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });
  const [mesSelecionado, setMesSelecionado] = usePersistentState('remun_mes', 'Todos');
  const { tick } = useContext(RefreshContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hostname = window.location.hostname;
        const res = await fetch(`http://${hostname}:3001/api/remuneracao?mes=${mesSelecionado}`);
        const result = await res.json();
        setData(result);
      } catch (e) {
        console.error("Erro ao buscar dados de remuneracao", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mesSelecionado, tick]);

  if (loading || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-600 mb-4"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Calculando Remuneração Variável...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
        <AlertTriangle className="text-red-500 w-16 h-16 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Erro ao carregar dados</h2>
        <p className="text-slate-500 dark:text-slate-400">{data.error}</p>
      </div>
    );
  }

  const totais = data.totais;
  let tecnicosFiltrados = data.tecnicos || [];
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    tecnicosFiltrados = tecnicosFiltrados.filter(t => 
      t.tecnico.toLowerCase().includes(term) || 
      (t.matricula && t.matricula.toLowerCase().includes(term))
    );
  }

  tecnicosFiltrados.sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortHeader = ({ label, sortKey, align = 'left', extraClass = '' }) => (
    <th 
      className={`p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'} ${extraClass}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <ArrowUpDown size={14} className={`text-slate-400 ${sortConfig.key === sortKey ? 'text-emerald-500' : 'opacity-50'}`} />
      </div>
    </th>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
            <DollarSign className="text-emerald-600" size={28} />
            Remuneração Variável
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Simulador de Folha Salarial e Distribuição de Bónus</p>
        </div>
        <div className="flex items-center gap-3">
          {data && data.totais && data.totais.meses_disponiveis && data.totais.meses_disponiveis.length > 0 && (
            <div className="flex items-center gap-3 bg-blue-600/10 p-3 rounded-xl backdrop-blur-sm border border-blue-600/20">
              <label className="text-sm text-blue-700 dark:text-blue-300 font-semibold whitespace-nowrap">Mês Ref:</label>
              <select
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-700/50 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto font-medium"
              >
                <option value="Todos">Todos os Meses</option>
                {data.totais.meses_disponiveis.map(m => (
                  <option key={m} value={m}>{formatarMesAno(m)}</option>
                ))}
              </select>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou matrícula..." 
              className="pl-10 pr-4 py-2 w-64 bg-slate-100 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ExportButtons 
            data={tecnicosFiltrados}
            headers={['Matrícula', 'Técnico', 'Dias Trab.', 'Pts Total', 'Média Pts/Dia', 'Categoria', 'Valor Categoria', 'Valor Plus', 'Bônus IFI', 'Bônus IRR', 'Concluídas SLA', 'Canceladas SLA', 'SLA Estourado', 'Saldo SLA', 'Total (R$)']}
            mapRow={(row) => ({
              'Matrícula': row.matricula || '',
              'Técnico': row.tecnico,
              'Dias Trab.': row.dias_trabalhados,
              'Pts Total': row.total_pts,
              'Média Pts/Dia': row.media_pts_dia,
              'Categoria': row.categoria,
              'Valor Categoria': row.valor_categoria,
              'Valor Plus': row.valor_plus,
              'Bônus IFI': row.bonus_ifi,
              'Bônus IRR': row.bonus_irr,
              'Concluídas SLA': row.os_concluidas || 0,
              'Canceladas SLA': row.os_canceladas || 0,
              'SLA Estourado': row.sla_estourado || 0,
              'Saldo SLA': row.saldo_sla || 0,
              'Total (R$)': row.total
            })}
            filenamePrefix={`remuneracao_${mesSelecionado}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Ambiente de Simulação de Dados</h4>
            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
              Este painel encontra-se calibrado com as <strong>regras oficiais</strong> do motor de cálculo. No entanto, uma vez que a base de dados ainda não contém algumas métricas originais, os valores de <em>Dias Trabalhados, Pontos, IFI e IRR</em> estão a ser gerados aleatoriamente para todos os técnicos (exceto os exemplos do PDF).
            </p>
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center overflow-hidden">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Produção (R$)</p>
            <h2 className="text-3xl lg:text-3xl xl:text-4xl font-black text-emerald-600 truncate" title={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.total_producao)}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.total_producao)}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium truncate" title={`Produção Base: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.producao_base)}`}>
              Produção Base: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totais.producao_base)}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
              <span className="font-bold text-slate-800 dark:text-white">{totais.total_tecnicos}</span> técnicos na folha
            </div>
          </div>

          <div className={`rounded-xl p-6 shadow-sm border ${CORES_CATEGORIA['Prata'].bg} ${CORES_CATEGORIA['Prata'].border} flex flex-col justify-between relative overflow-hidden`}>
            <div className="z-10">
              <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${CORES_CATEGORIA['Prata'].text}`}>Prata</p>
              <h2 className={`text-4xl font-black ${CORES_CATEGORIA['Prata'].text}`}>{totais.categorias['Prata']}</h2>
              <p className={`text-sm mt-1 font-medium ${CORES_CATEGORIA['Prata'].text} opacity-80`}>técnicos atingiram</p>
            </div>
            <Award className={`absolute -bottom-4 -right-4 w-24 h-24 ${CORES_CATEGORIA['Prata'].icon} opacity-20`} />
          </div>

          <div className={`rounded-xl p-6 shadow-sm border ${CORES_CATEGORIA['Ouro'].bg} ${CORES_CATEGORIA['Ouro'].border} flex flex-col justify-between relative overflow-hidden`}>
            <div className="z-10">
              <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${CORES_CATEGORIA['Ouro'].text}`}>Ouro</p>
              <h2 className={`text-4xl font-black ${CORES_CATEGORIA['Ouro'].text}`}>{totais.categorias['Ouro']}</h2>
              <p className={`text-sm mt-1 font-medium ${CORES_CATEGORIA['Ouro'].text} opacity-80`}>técnicos atingiram</p>
            </div>
            <Medal className={`absolute -bottom-4 -right-4 w-24 h-24 ${CORES_CATEGORIA['Ouro'].icon} opacity-20`} />
          </div>

          <div className={`rounded-xl p-6 shadow-sm border ${CORES_CATEGORIA['Diamante'].bg} ${CORES_CATEGORIA['Diamante'].border} flex flex-col justify-between relative overflow-hidden`}>
            <div className="z-10">
              <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${CORES_CATEGORIA['Diamante'].text}`}>Diamante</p>
              <h2 className={`text-4xl font-black ${CORES_CATEGORIA['Diamante'].text}`}>{totais.categorias['Diamante']}</h2>
              <p className={`text-sm mt-1 font-medium ${CORES_CATEGORIA['Diamante'].text} opacity-80`}>técnicos atingiram</p>
            </div>
            <Star className={`absolute -bottom-4 -right-4 w-24 h-24 ${CORES_CATEGORIA['Diamante'].icon} opacity-20`} />
          </div>
        </div>

        {/* Table Analitica */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Extrato por Técnico</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-transparent border-b-2 border-slate-200 dark:border-slate-700">
                <tr className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <SortHeader label="Técnico" sortKey="tecnico" />
                  <SortHeader label="Dias Trab." sortKey="dias_trabalhados" align="center" />
                  <SortHeader label="Pts Total" sortKey="total_pts" align="center" />
                  <SortHeader label="Média Pts/Dia" sortKey="media_pts_dia" align="center" />
                  <SortHeader label="Categoria" sortKey="categoria" align="center" />
                  <SortHeader label="Valor Categoria" sortKey="valor_categoria" align="right" extraClass="border-l border-slate-200 dark:border-slate-700" />
                  <SortHeader label="Valor Plus" sortKey="valor_plus" align="right" extraClass="text-emerald-600" />
                  <SortHeader label="Bônus IFI" sortKey="bonus_ifi" align="right" />
                  <SortHeader label="Bônus IRR" sortKey="bonus_irr" align="right" />
                  <SortHeader label="Saldo SLA" sortKey="saldo_sla" align="right" />
                  <SortHeader label="Total (R$)" sortKey="total" align="right" extraClass="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-500 font-black" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {tecnicosFiltrados.map((tec, idx) => (
                  <React.Fragment key={idx}>
                    <tr 
                      onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          {expandedRow === idx ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0"/> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0"/>}
                          <div>
                            <span className="block truncate max-w-[200px] md:max-w-[300px]" title={tec.tecnico}>
                              {tec.tecnico}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                              Matrícula: {tec.matricula || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-slate-600 dark:text-slate-300">{tec.dias_trabalhados}</td>
                      <td className="p-4 text-center font-medium text-slate-700 dark:text-slate-300">{tec.total_pts}</td>
                      <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-200">{tec.media_pts_dia}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[100px] px-2 py-1 rounded-full text-xs font-bold border ${CORES_CATEGORIA[tec.categoria].bg} ${CORES_CATEGORIA[tec.categoria].text} ${CORES_CATEGORIA[tec.categoria].border}`}>
                          {tec.categoria}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-600 dark:text-slate-300 border-l border-slate-100 dark:border-slate-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.valor_categoria || 0)}
                      </td>
                      <td className="p-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.bonus_irr || 0)}</td>
                      <td className={`p-4 text-right font-bold ${tec.saldo_sla >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.saldo_sla || 0)}</td>
                      <td className="p-4 text-right bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-500 font-black">
                        {tec.bonus_ifi > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.bonus_ifi)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {tec.bonus_irr > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.bonus_irr)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right bg-emerald-50/50 dark:bg-emerald-900/5 font-black text-emerald-700 dark:text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.total)}
                      </td>
                    </tr>
                    {expandedRow === idx && (
                      <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <td colSpan="10" className="p-6">
                          <div className="flex items-start gap-3">
                            <Info className="text-emerald-500 mt-1" size={20} />
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase text-xs tracking-wider">Receita Detalhada - Motor de Cálculo</h4>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                  <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400">1. BASE & PROPORÇÃO</h5>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Dias Trabalhados: <strong>{tec.dias_trabalhados}</strong> <span className="text-slate-500 text-xs">{tec.dias_trabalhados < 24 ? '(Proporcional)' : '(Integral)'}</span></p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Mín. Categoria/Dia: <strong>{tec.categoria === 'Diamante' ? '6.8' : tec.categoria === 'Ouro' ? '6.4' : tec.categoria === 'Prata' ? '5.7' : 'N/A'} pts</strong></p>
                                </div>
                                <div className="space-y-2">
                                  <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400">2. PRODUÇÃO & PLUS</h5>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Total de Pontos: <strong>{tec.total_pts}</strong></p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Valor Categoria (Base): <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.valor_categoria || 0)}</strong></p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Valor Produção Extra (Plus): <strong className="text-emerald-600">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tec.valor_plus || 0)}</strong></p>
                                </div>
                                <div className="space-y-2">
                                  <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400">3. QUALIDADE (BÔNUS IFI/IRR)</h5>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">IFI: <strong>{parseFloat(tec.ifi_pct).toFixed(1)}%</strong> {tec.ifi_pct <= 3 ? <span className="text-emerald-600 font-bold text-xs">(Atingido)</span> : <span className="text-red-500 font-bold text-xs">(Perdeu)</span>}</p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">IRR: <strong>{parseFloat(tec.irr_pct).toFixed(1)}%</strong> {tec.irr_pct <= 13 ? <span className="text-emerald-600 font-bold text-xs">(Atingido)</span> : <span className="text-red-500 font-bold text-xs">(Perdeu)</span>}</p>
                                </div>
                                <div className="space-y-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                                  <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400">4. SLA OPERACIONAL (+/-)</h5>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Concluídas: <strong>{tec.os_concluidas || 0}</strong> <span className="text-emerald-600 text-xs">(+ R$ {(tec.os_concluidas || 0) * 15})</span></p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Canceladas: <strong>{tec.os_canceladas || 0}</strong> <span className="text-red-500 text-xs">(- R$ {(tec.os_canceladas || 0) * 30})</span></p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">Falhas SLA: <strong>{tec.sla_estourado || 0}</strong> <span className="text-red-500 text-xs">(- R$ {(tec.sla_estourado || 0) * 5})</span></p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardRemuneracao;
