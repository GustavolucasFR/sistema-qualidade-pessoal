import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Target, Users,
  Activity, ArrowUpRight, ArrowDownRight, MapPin, BarChart2, PieChart as PieChartIcon,
  Download, FileText, FileSpreadsheet, File
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell, PieChart, Pie, LineChart, Line, LabelList, ComposedChart } from 'recharts';
import ExportButtons from './ExportButtons';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

const StatCard = ({ title, value, icon: Icon, trend, trendValue, trendLabel = "vs Meta", isCurrency = false, color = "indigo" }) => {
  const isPositive = trend === 'up';

  return (
    <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl p-3 lg:p-5 flex flex-col justify-center">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <p className="text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 leading-tight">{title}</p>
          <h3 className={`text-base md:text-lg lg:text-xl font-black text-slate-800 dark:text-white tracking-tight break-all sm:break-normal`}>
            {isCurrency ? formatCurrency(value) : formatNumber(value)}
          </h3>
        </div>
        <div className={`shrink-0 p-2 lg:p-3 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>
          <Icon size={20} className="lg:w-6 lg:h-6" />
        </div>
      </div>

      {trendValue !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`flex items-center text-sm font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositive ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
            {isCurrency ? formatCurrency(Math.abs(trendValue)) : formatNumber(Math.abs(trendValue))}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

const DashboardProducaoBA = () => {
  const [dataCluster, setDataCluster] = useState([]);
  const [dataCidade, setDataCidade] = useState([]);
  const [viewMode, setViewMode] = useState('cluster'); // 'cluster' ou 'cidade'
  const [totais, setTotais] = useState(null);
  const [ciclo, setCiclo] = useState(null);
  const [ciclosDisponiveis, setCiclosDisponiveis] = useState([]);
  const [selectedMes, setSelectedMes] = useState('');
  const [evolutivoDiario, setEvolutivoDiario] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartsRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = new URL(`http://${window.location.hostname}:3001/api/producao-ba`);
        if (selectedMes) {
          url.searchParams.append('mes', selectedMes);
        }
        url.searchParams.append('t', new Date().getTime());
        const token = localStorage.getItem('token');
        const res = await fetch(url.toString(), {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (res.ok) {
          const json = await res.json();
          setDataCluster(json.data_cluster || []);
          setDataCidade(json.data_cidade || []);
          setTotais(json.totais || null);
          setCiclo(json.ciclo || null);
          if (json.ciclos_disponiveis) setCiclosDisponiveis(json.ciclos_disponiveis);
          if (json.evolutivo_diario) setEvolutivoDiario(json.evolutivo_diario);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMes]);





  const data = [...(viewMode === 'cluster' ? dataCluster : dataCidade)]
    .sort((a, b) => b.meta_orcada - a.meta_orcada)
    .map(d => {
      const meta = d.meta_orcada || 0;
      return {
        ...d,
        pct_producao: meta > 0 ? `${((d.producao_rs / meta) * 100).toFixed(0)}%` : '',
        pct_projecao: meta > 0 ? `${((d.projecao_producao / meta) * 100).toFixed(0)}%` : '',
      };
    });
  const gapGeral = totais ? totais.gap_producao_meta : 0;

  const dataEvolutivaProcessada = React.useMemo(() => {
    if (!ciclo || !ciclo.ciclo_inicio_raw || !ciclo.ciclo_fim_raw || !evolutivoDiario || !totais) return [];

    const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let acumulado = 0;

    // Tratamento de timezone removendo a parte do tempo para pegar os dias exatos
    const parseDate = (dateStr) => new Date(dateStr.split('T')[0] + 'T12:00:00Z');

    const inicio = parseDate(ciclo.ciclo_inicio_raw);
    const fim = parseDate(ciclo.ciclo_fim_raw);

    const diffTime = Math.abs(fim - inicio);
    const totalDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const metaTotal = totais.meta_orcada || 0;

    const result = [];
    const mapProd = {};
    evolutivoDiario.forEach(item => {
      const dataFormatada = item.data_execucao.split('T')[0];
      mapProd[dataFormatada] = parseFloat(item.producao_diaria) || 0;
    });

    let dayCount = 1;
    let ultimoDiaProducaoIndex = -1;
    const hoje = new Date();

    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const dataKey = d.toISOString().split('T')[0];
      const prodDiaria = mapProd[dataKey] || 0;
      acumulado += prodDiaria;

      const diaFormatado = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const diaSemanaStr = diasDaSemana[d.getUTCDay()];

      if (prodDiaria > 0 || d <= hoje) {
        ultimoDiaProducaoIndex = result.length;
      }

      result.push({
        label: diaFormatado,
        dia_semana: diaSemanaStr,
        producao_diaria: prodDiaria,
        acumulado: acumulado,
        meta_acumulada: metaTotal,
        projecao: null,
        is_future: d > hoje
      });
      dayCount++;
    }

    if (ultimoDiaProducaoIndex >= 0 && ultimoDiaProducaoIndex < result.length) {
      const valorBase = result[ultimoDiaProducaoIndex].acumulado;
      result[ultimoDiaProducaoIndex].projecao = valorBase;

      const projecaoTotal = totais.projecao_producao;
      const diasRestantes = result.length - 1 - ultimoDiaProducaoIndex;

      if (diasRestantes > 0) {
        const incrementoDiario = (projecaoTotal - valorBase) / diasRestantes;
        for (let i = ultimoDiaProducaoIndex + 1; i < result.length; i++) {
          result[i].projecao = valorBase + (incrementoDiario * (i - ultimoDiaProducaoIndex));
        }
      }
    }

    return result;
  }, [ciclo, evolutivoDiario, totais]);

  const monthNames = [null, 'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

  const exportHeaders = ['Local', 'Receita Produzida (R$)', 'Meta Orcada (R$)', 'Projecao (R$)', 'HCs Produtivos', 'Fat Medio/HC'];
  const mapRowExport = (row) => ({
    'Local': row.cluster,
    'Receita Produzida (R$)': row.producao_rs || 0,
    'Meta Orcada (R$)': row.meta_orcada || 0,
    'Projecao (R$)': row.projecao_producao || 0,
    'HCs Produtivos': row.hc_produtivos || 0,
    'Fat Medio/HC': row.faturamento_hc || 0
  });

  if (!totais) {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando dados financeiros...</p>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent h-full">
        <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum dado encontrado para este ciclo.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden print:overflow-visible print:h-auto bg-transparent">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-4 lg:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <DollarSign className="text-emerald-600" size={28} />
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white leading-tight flex items-center gap-4">
              Dashboard Financeiro & Produção
              {ciclosDisponiveis.length > 0 && (
                <select
                  value={selectedMes}
                  onChange={(e) => setSelectedMes(e.target.value)}
                  className="ml-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Ciclo Atual</option>
                  {ciclosDisponiveis.map(mes => (
                    <option key={mes} value={mes}>
                      Ciclo de {monthNames[mes] || mes}
                    </option>
                  ))}
                </select>
              )}
            </h1>
              {ciclo && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Exibindo Ciclo (de {ciclo.ciclo_inicio_raw ? new Date(ciclo.ciclo_inicio_raw + 'T12:00:00').toLocaleDateString('pt-BR') : ''} até {ciclo.ciclo_fim_raw ? new Date(ciclo.ciclo_fim_raw + 'T12:00:00').toLocaleDateString('pt-BR') : ''})
                </p>
              )}
          </div>
        </div>

        <div className="flex items-center gap-4 self-stretch sm:self-auto shrink-0">
          {/* Export Buttons */}
          <ExportButtons
            data={data}
            headers={exportHeaders}
            mapRow={mapRowExport}
            filenamePrefix={`producao_${viewMode}`}
            chartsRef={chartsRef}
          />

          {/* Toggle Button */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex-1 sm:flex-none">
            <button
              onClick={() => setViewMode('cidade')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'cidade' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Por Cidade
            </button>
            <button
              onClick={() => setViewMode('cluster')}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'cluster' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Por Cluster
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto print:overflow-visible p-4 lg:p-6">
        {/* KPIs and Charts or Empty State */}
        {(!totais || (dataCluster.length === 0 && dataCidade.length === 0)) ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
            <DollarSign size={64} className="text-slate-300 dark:text-slate-700 mb-4" />
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhum dado financeiro encontrado neste ciclo</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Importe um arquivo ProducaoBA atualizado ou selecione outro ciclo.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard
                title="Receita Produzida (R$)"
                value={totais.producao_rs}
                icon={DollarSign}
                color="emerald"
                isCurrency={true}
                trend={gapGeral >= 0 ? 'up' : 'down'}
                trendValue={gapGeral}
                trendLabel={gapGeral >= 0 ? 'acima da Meta' : 'de Gap'}
              />

              {/* Projeção Card */}
              <StatCard
                title="Projeção (R$)"
                value={totais.projecao_producao}
                icon={TrendingUp}
                color="purple"
                isCurrency={true}
                trend={totais.projecao_producao >= totais.meta_orcada ? 'up' : 'down'}
                trendValue={totais.projecao_producao - totais.meta_orcada}
                trendLabel={totais.projecao_producao >= totais.meta_orcada ? 'acima da Meta' : 'de Gap'}
              />

              <StatCard
                title="Meta Orçada (R$)"
                value={totais.meta_orcada}
                icon={Target}
                color="indigo"
                isCurrency={true}
              />

              {/* Mix Receita Card */}
              <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl p-3 lg:p-5 flex flex-col justify-center">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400 leading-tight flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#1d3575]"></span> Vivo
                      </p>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                        {formatCurrency(totais.receita_vivo)}
                      </h3>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400 leading-tight flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> FiBrasil
                      </p>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
                        {formatCurrency(totais.receita_fibrasil)}
                      </h3>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <PieChartIcon size={20} />
                  </div>
                </div>
              </div>

              {/* Combined Card: HCs Produtivos and Faturamento Médio / HC */}
              <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl p-3 lg:p-5 flex flex-col justify-center">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 flex flex-row gap-4 divide-x divide-slate-200 dark:divide-slate-700">
                    <div className="flex-1">
                      <p className="text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 leading-tight">HCs</p>
                      <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-white tracking-tight">
                        {formatNumber(totais.hc_produtivos)}
                      </h3>
                    </div>
                    <div className="flex-1 pl-4">
                      <p className="text-xs lg:text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 leading-tight">Fat/HC</p>
                      <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-white tracking-tight">
                        {formatCurrency(totais.faturamento_hc)}
                      </h3>
                    </div>
                  </div>
                  <div className="shrink-0 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                    <Users size={20} />
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div ref={chartsRef} className="flex flex-col gap-6 mb-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-xl overflow-hidden">
                  <div className="p-4 mb-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <BarChart2 size={20} className="text-indigo-500" />
                      Produção vs Meta por {viewMode === 'cluster' ? 'Cluster' : 'Cidade'}
                    </h2>
                  </div>
                  <div className="p-4 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="cluster" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, dataMax => Math.ceil(dataMax * 1.2)]} tickCount={7} />
                        <Tooltip
                          cursor={{ fill: '#f1f5f9' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="meta_orcada" name="Meta Orçada" fill="#1d3575" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="producao_rs" name="Produção" radius={[4, 4, 0, 0]}>
                          {
                            data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.producao_rs >= entry.meta_orcada ? '#2f529e' : '#dc2626'} />
                            ))
                          }

                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden">
                  <div className="p-4 mb-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <PieChartIcon size={20} className="text-emerald-500" />
                      Participação na Produção (Receita)
                    </h2>
                  </div>
                  <div className="p-4 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.filter(d => d.producao_rs > 0)}
                          dataKey="producao_rs"
                          nameKey="cluster"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={true}
                        >
                          {data.filter(d => d.producao_rs > 0).map((entry, index) => {
                            const colors = ['#1d3575', '#dc2626', '#2f529e', '#ef4444', '#698dd0', '#f87171', '#9cb5e1', '#fca5a5'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => formatCurrency(value)}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Composed Chart Evolutivo */}
              <div className="rounded-xl overflow-hidden">
                <div className="p-4 mb-2">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity size={20} className="text-purple-500" />
                    Receita | Evolutivo Dia
                  </h2>
                </div>
                <div className="p-4 h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={dataEvolutivaProcessada}
                      margin={{ top: 30, right: 40, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

                      <XAxis
                        dataKey="label"
                        xAxisId={0}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <XAxis
                        dataKey="dia_semana"
                        xAxisId={1}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        dy={15}
                      />

                      <YAxis
                        yAxisId="left"
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, dataMax => Math.ceil(dataMax * 1.1)]}
                      />

                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={false}
                        axisLine={false}
                        domain={[0, dataMax => Math.ceil(dataMax * 4)]}
                      />

                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value, name) => [formatCurrency(value), name]}
                        labelFormatter={(label, props) => {
                          const item = props[0]?.payload;
                          if (item) return `${label} (${item.dia_semana})`;
                          return label;
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px' }} />

                      {/* Barras flutuantes no eixo da direita (produção diária) */}
                      <Bar
                        yAxisId="right"
                        dataKey="producao_diaria"
                        name="Produção Diária"
                        fill="#1e3a8a"
                        barSize={8}
                        radius={[2, 2, 0, 0]}
                      />

                      {/* Meta */}
                      <Line
                        yAxisId="left"
                        type="linear"
                        dataKey="meta_acumulada"
                        name="Meta Total"
                        stroke="#94a3b8"
                        strokeWidth={3}
                        dot={false}
                        activeDot={false}
                      />

                      {/* Acumulado Produzido */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="acumulado"
                        name="Valor Acumulado"
                        stroke="#1d3575"
                        strokeWidth={3}
                        dot={(props) => {
                          const { cx, cy, payload, index } = props;
                          // Apenas desenha o ponto se for o ultimo dia de producao (ancora)
                          if (payload.projecao !== null && payload.producao_diaria > 0) {
                            // Este e o primeiro ponto com projecao? Nao, verificar se é o ponto de virada
                            const nextItem = dataEvolutivaProcessada[index + 1];
                            if (nextItem && nextItem.producao_diaria === 0 && nextItem.projecao !== null) {
                              return (
                                <g key={`dot-${index}`}>
                                  <circle cx={cx} cy={cy} r={6} fill="#1d3575" stroke="#fff" strokeWidth={2} />
                                  <text x={cx} y={cy - 15} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold" className="bg-slate-800" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }}>
                                    <tspan dx="0" dy="0" fill="#0f172a" stroke="#fff" strokeWidth={3} strokeLinejoin="round">{`${(payload.acumulado / 1000).toFixed(0)}k`}</tspan>
                                    <tspan x={cx} y={cy - 15} fill="#fff">{`${(payload.acumulado / 1000).toFixed(0)}k`}</tspan>
                                  </text>
                                </g>
                              );
                            }
                          }
                          return null;
                        }}
                        activeDot={{ r: 6 }}
                      />

                      {/* Projeção (Pontilhada) */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="projecao"
                        name="Projeção"
                        stroke="#dc2626"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detalhamento por Cluster */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden print:overflow-visible print:break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <MapPin size={20} className="text-indigo-500" />
                  Detalhamento por {viewMode === 'cluster' ? 'Cluster' : 'Cidade'}
                </h2>
              </div>
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse whitespace-nowrap" style={{ pageBreakInside: 'avoid' }}>
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-bold tracking-wider uppercase">
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">{viewMode === 'cluster' ? 'Cluster' : 'Cidade'}</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">HCs</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Meta (R$)</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Produção (R$)</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">GAP (R$)</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Ticket Médio</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Meta Diária (R$)</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Meta Diária (Ativ.)</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-right">Projeção (R$)</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Instalações</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">Mudanças</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {data.map((row, idx) => {
                      const isPositive = row.gap_producao_meta >= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{row.cluster}</td>
                          <td className="p-4 text-center font-semibold text-slate-600 dark:text-slate-400">{row.hc_produtivos}</td>
                          <td className="p-4 text-right font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(row.meta_orcada)}</td>
                          <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.producao_rs)}</td>
                          <td className={`p-4 text-right font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(row.gap_producao_meta)}
                          </td>
                          <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatCurrency(row.ticket_medio || 0)}</td>
                          <td className="p-4 text-right font-medium text-amber-600 dark:text-amber-400">{formatCurrency(row.meta_diaria_rs || 0)}</td>
                          <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400">{formatNumber(Math.ceil(row.meta_diaria_atividades || 0))}</td>
                          <td className="p-4 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(row.projecao_producao)}</td>
                          <td className="p-4 text-center font-medium text-slate-700 dark:text-slate-300">{row.instalacao}</td>
                          <td className="p-4 text-center font-medium text-slate-700 dark:text-slate-300">{row.mudanca}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/80">
                      <td className="p-4 font-black text-indigo-900 dark:text-indigo-300">TOTAL GERAL</td>
                      <td className="p-4 text-center font-black text-slate-800 dark:text-slate-200">{totais.hc_produtivos}</td>
                      <td className="p-4 text-right font-black text-slate-800 dark:text-slate-200">{formatCurrency(totais.meta_orcada)}</td>
                      <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totais.producao_rs)}</td>
                      <td className={`p-4 text-right font-black ${totais.gap_producao_meta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(totais.gap_producao_meta)}
                      </td>
                      <td className="p-4 text-right font-black text-slate-800 dark:text-slate-200">{formatCurrency(totais.ticket_medio || 0)}</td>
                      <td className="p-4 text-right font-black text-amber-600 dark:text-amber-400">{formatCurrency(totais.meta_diaria_rs || 0)}</td>
                      <td className="p-4 text-center font-black text-amber-600 dark:text-amber-400">{formatNumber(Math.ceil(totais.meta_diaria_atividades || 0))}</td>
                      <td className="p-4 text-right font-black text-blue-600 dark:text-blue-400">{formatCurrency(totais.projecao_producao)}</td>
                      <td className="p-4 text-center font-black text-slate-800 dark:text-slate-200">{totais.instalacao}</td>
                      <td className="p-4 text-center font-black text-slate-800 dark:text-slate-200">{totais.mudanca}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardProducaoBA;
