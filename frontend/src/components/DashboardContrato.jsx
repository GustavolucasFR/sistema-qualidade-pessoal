import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Calculator, ChevronDown, Activity, DollarSign } from 'lucide-react';
import ExportButtons from './ExportButtons';

const DashboardContrato = ({ userRole, isDark }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [faturamentoBase, setFaturamentoBase] = useState(100000); // 100k padrao
  const [meses, setMeses] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('Todos');

  useEffect(() => {
    fetchMeses();
  }, []);

  useEffect(() => {
    fetchData();
  }, [mesSelecionado]);

  const fetchMeses = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/meses');
      const data = await res.json();
      setMeses(data);
      if (data.length > 0) {
        setMesSelecionado(data[0].mes);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:3001/api/simulador-contrato?mes=${mesSelecionado}`);
      const data = await res.json();
      setData(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className={`p-8 min-h-screen flex items-center justify-center ${isDark ? 'bg-zinc-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const fcb = parseFloat(data.fcb_perc) || 0;
  const isBonus = fcb > 0;
  const isPenalty = fcb < 0;
  const financialImpact = (faturamentoBase * (Math.abs(fcb) / 100)).toFixed(2);
  const totalReceber = (faturamentoBase * (1 + fcb/100)).toFixed(2);

  return (
    <div className={`p-8 font-sans min-h-screen ${isDark ? 'bg-zinc-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-emerald-500" />
          Simulador Executivo (Anexo 09)
        </h1>
        <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Simulação de impacto financeiro baseado nas métricas extraídas do Zeus e nas regras do contrato.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className={`p-6 rounded-2xl flex-1 flex flex-col justify-center ${isDark ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-white shadow-lg border border-gray-100'}`}>
           <label className={`text-sm font-semibold mb-2 block ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Faturamento Base Projetado (R$)</label>
           <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
              <input 
                type="number" 
                value={faturamentoBase}
                onChange={(e) => setFaturamentoBase(Number(e.target.value))}
                className={`w-full pl-12 pr-4 py-3 rounded-xl text-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
           </div>
        </div>

        <div className={`p-6 rounded-2xl flex-1 flex flex-col justify-center ${isDark ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-white shadow-lg border border-gray-100'}`}>
           <label className={`text-sm font-semibold mb-2 block ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Mês de Apuração</label>
           <div className="relative">
              <select 
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-3 rounded-xl text-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              >
                <option value="Todos">Todos os Períodos</option>
                {meses.map(m => (
                  <option key={m.mes} value={m.mes}>{m.mes}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
           </div>
        </div>
        
        <div className={`p-6 rounded-2xl flex items-center justify-center ${isDark ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-white shadow-lg border border-gray-100'}`}>
          <ExportButtons 
              data={[data]}
              headers={['Mês', 'Nota SLA (%)', 'TDNA (%)', 'Pontuação Final', 'Conceito', 'FCB (%)']}
              mapRow={(row) => ({
                'Mês': mesSelecionado,
                'Nota SLA (%)': row.cumprimento_sla,
                'TDNA (%)': row.tdna,
                'Pontuação Final': row.pontuacao_final,
                'Conceito': row.conceito,
                'FCB (%)': row.fcb_perc
              })}
              filenamePrefix={`contrato_${mesSelecionado}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-white shadow-sm border border-gray-100'}`}>
           <h3 className={`text-sm mb-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Nota SLA</h3>
           <div className="text-3xl font-black text-emerald-500">{data.cumprimento_sla}%</div>
        </div>
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-white shadow-sm border border-gray-100'}`}>
           <h3 className={`text-sm mb-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>TDNA (Reincidência)</h3>
           <div className="text-3xl font-black text-rose-500">{data.tdna}%</div>
        </div>
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-white shadow-sm border border-gray-100'}`}>
           <h3 className={`text-sm mb-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Pontuação Final (0-110)</h3>
           <div className="text-3xl font-black text-indigo-500">{data.pontuacao_final} <span className="text-sm">pts</span></div>
        </div>
        <div className={`p-6 rounded-2xl ${isDark ? 'bg-zinc-800/80 border border-zinc-700' : 'bg-white shadow-sm border border-gray-100'}`}>
           <h3 className={`text-sm mb-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Conceito</h3>
           <div className={`text-3xl font-black ${data.conceito === 'A' ? 'text-emerald-500' : data.conceito === 'B' ? 'text-blue-500' : data.conceito === 'C' ? 'text-amber-500' : 'text-rose-500'}`}>{data.conceito}</div>
        </div>
      </div>

      <div className={`p-8 rounded-3xl ${isDark ? 'bg-zinc-800/50 border border-zinc-700/50' : 'bg-white shadow-xl border border-gray-100'} overflow-hidden relative`}>
        <div className={`absolute top-0 left-0 w-full h-1 ${isBonus ? 'bg-emerald-500' : isPenalty ? 'bg-rose-500' : 'bg-gray-300'}`}></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Projeção Fator Fcb</h2>
            <div className={`inline-flex items-center px-4 py-2 rounded-full font-bold text-lg ${isBonus ? 'bg-emerald-100 text-emerald-700' : isPenalty ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'}`}>
              {fcb > 0 ? '+' : ''}{fcb}% 
              {isBonus && " (Bônus)"}
              {isPenalty && " (Penalização)"}
              {!isBonus && !isPenalty && " (Neutro)"}
            </div>
          </div>
          
          <div className="flex gap-12">
            <div>
              <p className={`text-sm mb-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Impacto no Faturamento</p>
              <div className={`text-4xl font-black ${isBonus ? 'text-emerald-500' : isPenalty ? 'text-rose-500' : 'text-gray-400'}`}>
                {isBonus ? '+' : isPenalty ? '-' : ''} R$ {financialImpact}
              </div>
            </div>
            <div>
              <p className={`text-sm mb-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Total a Receber Projetado</p>
              <div className="text-4xl font-black text-indigo-500">
                R$ {totalReceber}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardContrato;
