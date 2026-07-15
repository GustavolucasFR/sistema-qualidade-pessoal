import React, { useState, useEffect, useContext } from 'react';
import { RefreshContext } from '../context/RefreshContext';
import { DollarSign, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

const DRE = ({ isDark }) => {
    const { refreshKey } = useContext(RefreshContext);
    const [dreData, setDreData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDre = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('@tecnomulti:user') ? JSON.parse(localStorage.getItem('@tecnomulti:user')).token : '';
                const headers = { 'Authorization': `Bearer ${token}` };

                const res = await fetch(`http://${window.location.hostname}:3001/api/dre?mes=07`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    setDreData(data);
                } else {
                    console.error("Erro na resposta da API");
                }
            } catch (err) {
                console.error("Erro ao buscar DRE", err);
            }
            setLoading(false);
        };
        fetchDre();
    }, [refreshKey]);

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const formatPercent = (value) => new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format((value || 0) / 100);

    const gerencias = [...new Set(dreData.map(d => d.gerencia))];

    return (
        <div className={`p-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <DollarSign size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-red-600 dark:from-blue-400 dark:to-red-500">
                        Demonstrativo do Resultado do Exercício
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhamento financeiro por gerência e cidade (Mês Atual)</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="space-y-8">
                    {gerencias.map(gerencia => {
                        const items = dreData.filter(d => d.gerencia === gerencia);
                        const totalOrcamento = items.reduce((acc, curr) => acc + parseFloat(curr.orcamento || 0), 0);
                        const totalRealizado = items.reduce((acc, curr) => acc + parseFloat(curr.realizado || 0), 0);
                        const totalDeficit = items.reduce((acc, curr) => acc + parseFloat(curr.deficit || 0), 0);
                        
                        return (
                            <div key={gerencia} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{gerencia}</h2>
                                </div>

                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        {/* Orcamento Card */}
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingDown size={18} className="text-blue-500" />
                                                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Orçamento Total</h3>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(totalOrcamento)}</p>
                                        </div>

                                        {/* Realizado Card */}
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle size={18} className="text-emerald-500" />
                                                <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Realizado Total</h3>
                                            </div>
                                            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(totalRealizado)}</p>
                                        </div>

                                        {/* Deficit Card */}
                                        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertCircle size={18} className="text-red-500" />
                                                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Déficit Total</h3>
                                            </div>
                                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalDeficit)}</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Cidade</th>
                                                    <th className="px-4 py-3 font-semibold text-right">Orçamento</th>
                                                    <th className="px-4 py-3 font-semibold text-right">Realizado</th>
                                                    <th className="px-4 py-3 font-semibold text-right">Déficit</th>
                                                    <th className="px-4 py-3 font-semibold text-right">% Realizado</th>
                                                    <th className="px-4 py-3 font-semibold text-right">% Déficit</th>
                                                    <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Ticket Médio</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {items.map((row, idx) => (
                                                    <tr key={row.cidade} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                                            {row.cidade}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">{formatCurrency(row.orcamento)}</td>
                                                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                                            {formatCurrency(row.realizado)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-medium ${parseFloat(row.deficit) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            {formatCurrency(row.deficit)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                {formatPercent(row.pct_realizado)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                                {formatPercent(row.pct_deficit)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                                            {formatCurrency(row.ticket_medio)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DRE;
