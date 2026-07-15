import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Activity, Clock, DollarSign, Target } from 'lucide-react';

const CORES_SEVERIDADE = {
  'A': '#ef4444', 
  'B': '#f97316', 
  'C': '#eab308', 
  'D': '#3b82f6', 
  'E': '#22c55e'
};

const RelatorioExecutivo = React.forwardRef(({ userRole }, ref) => {
  const [operacional, setOperacional] = useState([]);
  const [slas, setSlas] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hostname = window.location.hostname;
        const [opRes, slaRes, finRes] = await Promise.all([
          fetch(`http://${hostname}:3001/api/operacional/todos`),
          fetch(`http://${hostname}:3001/api/slas/ofensores`),
          userRole === 'TI' ? fetch(`http://${hostname}:3001/api/financeiro`) : Promise.resolve({ json: () => [] })
        ]);
        
        const opData = await opRes.json();
        const slaData = await slaRes.json();
        const finData = await finRes.json();

        setOperacional(Array.isArray(opData) ? opData : []);
        setSlas(Array.isArray(slaData) ? slaData : (slaData.ofensores || []));
        setFinanceiro(Array.isArray(finData) ? finData : []);
      } catch (err) {
        console.error("Erro carregando dados do relatorio", err);
      }
    };
    fetchData();
  }, [userRole]);

  // Cálculos Operacionais
  const totalOS = operacional.length;
  const osCanceladas = operacional.filter(os => os.status === 'Cancelada').length;
  const taxaCancelamento = totalOS ? ((osCanceladas / totalOS) * 100).toFixed(1) : 0;

  // Top 5 Técnicos Operacional
  const tecnicoCounts = {};
  operacional.forEach(os => {
    if (os.tecnico && os.tecnico !== 'Desconhecido') {
      tecnicoCounts[os.tecnico] = (tecnicoCounts[os.tecnico] || 0) + 1;
    }
  });
  const topTecnicosOp = Object.keys(tecnicoCounts)
    .map(key => ({ name: key, quantidade: tecnicoCounts[key] }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  // Cálculos SLAs
  const totalFalhas = slas.reduce((acc, curr) => acc + parseInt(curr.falhas, 10), 0);
  const totalHorasPerdidas = slas.reduce((acc, curr) => acc + parseFloat(curr.total_excedido), 0).toFixed(1);
  const topOfensoresSla = slas.slice(0, 5);

  // Cálculos Financeiro
  const totalPenalizacoes = financeiro.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const totalSeveridade = financeiro.reduce((acc, curr) => {
    const s = curr.severidade || 'D';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const dadosSeveridade = Object.keys(totalSeveridade).map(k => ({ name: k, value: totalSeveridade[k] }));

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  return (
    <div ref={ref} className="bg-white text-slate-800 w-[297mm] font-sans">
      
      {/* ===== SLIDE 1: CAPA ===== */}
      <div className="w-[297mm] h-[210mm] overflow-hidden page-break-after flex flex-col items-center justify-center bg-slate-900 text-white relative">
         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
         <div className="absolute bottom-0 left-0 w-full h-32 bg-slate-800 transform -skew-y-2 origin-bottom-right"></div>
         <div className="z-10 text-center space-y-6">
            <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              Tecnomulti Quality
            </h1>
            <h2 className="text-3xl font-light text-slate-300">Apresentação de Resultados Executivos</h2>
            <div className="w-24 h-1 bg-blue-500 mx-auto rounded-full my-8"></div>
            <p className="text-xl text-slate-400">Data de Geração: {dataAtual}</p>
            <p className="text-lg text-slate-500 mt-12 uppercase tracking-widest">Confidencial</p>
         </div>
      </div>

      {/* ===== SLIDE 2: RESUMO OPERACIONAL ===== */}
      <div className="w-[297mm] h-[210mm] overflow-hidden page-break-after p-12 flex flex-col bg-slate-50">
         <div className="border-b-2 border-blue-500 pb-4 mb-8 flex justify-between items-end">
            <div>
               <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Activity className="text-blue-600" size={32} /> Resumo Operacional</h2>
               <p className="text-slate-500">Métricas gerais de volume e execução</p>
            </div>
            <div className="text-sm text-slate-400 font-medium">Tecnomulti Quality • {dataAtual}</div>
         </div>

         <div className="flex gap-8 mb-8">
            <div className="flex-1 bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
               <p className="text-slate-500 uppercase font-bold text-sm">Volume Total de OS</p>
               <p className="text-5xl font-black text-slate-800 mt-2">{totalOS}</p>
            </div>
            <div className="flex-1 bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
               <p className="text-slate-500 uppercase font-bold text-sm">Total Canceladas</p>
               <p className="text-5xl font-black text-slate-800 mt-2">{osCanceladas}</p>
            </div>
            <div className="flex-1 bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
               <p className="text-slate-500 uppercase font-bold text-sm">Taxa de Cancelamento</p>
               <p className="text-5xl font-black text-slate-800 mt-2">{taxaCancelamento}%</p>
            </div>
         </div>

         <div className="flex-1 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Top 5 Técnicos Produtivos (Volumetria)</h3>
            <BarChart width={1000} height={250} data={topTecnicosOp} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="name" stroke="#64748b" />
               <YAxis stroke="#64748b" />
               <RechartsTooltip formatter={(val) => [val, 'Atividades']} cursor={{fill: '#f1f5f9'}} />
               <Bar dataKey="quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={60} isAnimationActive={false}>
                 {topTecnicosOp.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#60a5fa'} />
                 ))}
               </Bar>
            </BarChart>
         </div>
      </div>

      {/* ===== SLIDE 3: SLAs E QUALIDADE ===== */}
      <div className="w-[297mm] h-[210mm] overflow-hidden page-break-after p-12 flex flex-col bg-slate-50">
         <div className="border-b-2 border-red-500 pb-4 mb-8 flex justify-between items-end">
            <div>
               <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><Clock className="text-red-600" size={32} /> Qualidade e SLAs</h2>
               <p className="text-slate-500">Auditoria de estouramento de tempo e falhas de compromisso</p>
            </div>
            <div className="text-sm text-slate-400 font-medium">Tecnomulti Quality • {dataAtual}</div>
         </div>

         <div className="flex gap-8 mb-8">
            <div className="flex-1 bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
               <p className="text-slate-500 uppercase font-bold text-sm">Total de Falhas (Quebra de SLA)</p>
               <p className="text-5xl font-black text-red-600 mt-2">{totalFalhas}</p>
            </div>
            <div className="flex-1 bg-white p-6 rounded-xl shadow-md border-l-4 border-orange-500">
               <p className="text-slate-500 uppercase font-bold text-sm">Horas Úteis Perdidas</p>
               <p className="text-5xl font-black text-orange-600 mt-2">{totalHorasPerdidas}h</p>
            </div>
         </div>

         <div className="flex-1 bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Top 5 Ofensores de SLA (Técnicos)</h3>
            <BarChart width={1000} height={250} data={topOfensoresSla} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
               <XAxis dataKey="tecnico" stroke="#64748b" />
               <YAxis stroke="#64748b" />
               <RechartsTooltip formatter={(val) => [val, 'Falhas']} cursor={{fill: '#fef2f2'}} />
               <Bar dataKey="falhas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={60} isAnimationActive={false}>
                 {topOfensoresSla.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={index < 2 ? '#dc2626' : '#f87171'} />
                 ))}
               </Bar>
            </BarChart>
         </div>
      </div>

      {/* ===== SLIDE 4: FINANCEIRO (TI ONLY) ===== */}
      {userRole === 'TI' && (
        <div className="w-[297mm] h-[210mm] overflow-hidden page-break-after p-12 flex flex-col bg-slate-50">
           <div className="border-b-2 border-emerald-500 pb-4 mb-8 flex justify-between items-end">
              <div>
                 <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><DollarSign className="text-emerald-600" size={32} /> Impacto Financeiro</h2>
                 <p className="text-slate-500">Análise de penalizações aplicadas a contratadas</p>
              </div>
              <div className="text-sm text-slate-400 font-medium">Tecnomulti Quality • {dataAtual}</div>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-emerald-500 mb-8 inline-block">
               <p className="text-slate-500 uppercase font-bold text-sm">Volume Total de Penalização</p>
               <p className="text-5xl font-black text-emerald-600 mt-2">
                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPenalizacoes)}
               </p>
           </div>

           <div className="flex gap-8 flex-1">
              <div className="flex-1 bg-white p-6 rounded-xl shadow-md">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Distribuição por Severidade</h3>
                  <div className="flex justify-center">
                    <PieChart width={400} height={300}>
                      <Pie
                        data={dadosSeveridade}
                        cx={200}
                        cy={130}
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {dadosSeveridade.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CORES_SEVERIDADE[entry.name] || '#3b82f6'} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </div>
              </div>
              <div className="flex-[2] bg-white p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-bold text-slate-800 mb-6">Top 8 Últimas Penalizações (Amostra)</h3>
                 <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-600">
                        <th className="py-2 px-4">Técnico</th>
                        <th className="py-2 px-4">Empresa</th>
                        <th className="py-2 px-4">Sev</th>
                        <th className="py-2 px-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeiro.slice(0, 8).map((fin, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                           <td className="py-3 px-4 font-medium">{fin.tecnico}</td>
                           <td className="py-3 px-4 text-slate-500">{fin.empresa}</td>
                           <td className="py-3 px-4">
                             <span className="font-bold px-2 py-1 bg-slate-100 rounded text-xs" style={{ color: CORES_SEVERIDADE[fin.severidade] || '#000' }}>
                               {fin.severidade}
                             </span>
                           </td>
                           <td className="py-3 px-4 text-right font-bold text-emerald-600">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(fin.valor))}
                           </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* Global CSS for Print Page Breaks */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          .page-break-after { page-break-after: always; break-after: page; }
        }
      `}} />
    </div>
  );
});

RelatorioExecutivo.displayName = 'RelatorioExecutivo';

export default RelatorioExecutivo;
