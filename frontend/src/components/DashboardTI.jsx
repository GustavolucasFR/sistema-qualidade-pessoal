import React, { useState } from 'react';
import { Upload, Database, Settings, Calendar, Play, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const DashboardTI = () => {
  const [loading, setLoading] = useState({});
  const [success, setSuccess] = useState({});
  const [error, setError] = useState({});

  const handleUpload = async (type, file) => {
    if (!file) return;
    
    setLoading(prev => ({ ...prev, [type]: true }));
    setSuccess(prev => ({ ...prev, [type]: null }));
    setError(prev => ({ ...prev, [type]: null }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    try {
      const url = new URL(`http://${window.location.hostname}:3001/api/admin/upload`);
      const token = localStorage.getItem('token');
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(prev => ({ ...prev, [type]: data.message || 'Atualizado com sucesso!' }));
      } else {
        setError(prev => ({ ...prev, [type]: data.error || 'Erro ao processar arquivo.' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, [type]: err.message || 'Erro de conexão.' }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const uploadCards = [
    {
      id: 'tecnicos',
      title: 'Atualizar Técnicos',
      description: 'Faça o upload da planilha Técnicos Automático.xlsx',
      icon: <Database className="w-8 h-8 text-blue-500" />
    },
    {
      id: 'producao_ba',
      title: 'Atualizar DRE & Feriados',
      description: 'Faça o upload da Planilha Consolidada Produção BA (xlsb)',
      icon: <Calendar className="w-8 h-8 text-purple-500" />
    },
    {
      id: 'regras_extra',
      title: 'Atualizar Regras Extra',
      description: 'Faça o upload da Planilha de Regras (Aba Extra)',
      icon: <Settings className="w-8 h-8 text-orange-500" />
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 z-10 p-4 lg:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <Settings className="text-slate-600 dark:text-slate-300" size={28} />
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              Administração de TI
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Atualize as planilhas base do sistema (Técnicos, Metas, Regras e Feriados)
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {uploadCards.map((card) => (
            <div key={card.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center">
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-full">
                {card.icon}
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{card.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
                {card.description}
              </p>
              
              <div className="w-full">
                {loading[card.id] ? (
                  <div className="w-full py-3 flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Loader className="animate-spin" size={20} />
                    <span className="font-semibold text-sm">Processando arquivo...</span>
                  </div>
                ) : (
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg cursor-pointer transition-colors border border-indigo-200 dark:border-indigo-800">
                    <Upload size={18} />
                    Selecionar Arquivo
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx, .xlsb, .xls, .csv" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUpload(card.id, e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              
              {success[card.id] && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg flex items-start gap-2 text-left w-full">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-medium whitespace-pre-wrap">{success[card.id]}</span>
                </div>
              )}
              
              {error[card.id] && (
                <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-sm rounded-lg flex items-start gap-2 text-left w-full overflow-hidden">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-medium break-words overflow-hidden" style={{wordBreak: 'break-word'}}>{error[card.id]}</span>
                </div>
              )}
            </div>
          ))}
          
        </div>
      </div>
    </div>
  );
};

export default DashboardTI;
