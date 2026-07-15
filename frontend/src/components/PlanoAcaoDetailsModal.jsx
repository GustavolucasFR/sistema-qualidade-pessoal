import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip, Clock, CheckCircle, Edit2, User, AlertCircle, Camera, Trash2 } from 'lucide-react';

const PlanoAcaoDetailsModal = ({ plano, userRole, onClose, onUpdate }) => {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    prazo: plano.prazo ? new Date(plano.prazo).toISOString().split('T')[0] : '',
    responsavel: plano.responsavel || '',
    status: plano.status || 'Pendente'
  });

  const fetchHistorico = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/planos-acao/${plano.id}/historico`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        setHistorico(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorico();
  }, [plano.id]);

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/planos-acao/${plano.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setIsEditing(false);
        fetchHistorico();
        onUpdate();
      } else {
        alert("Erro ao atualizar plano.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendComentario = async () => {
    if (!comentario.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/planos-acao/${plano.id}/comentario`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ comentario })
      });
      if (res.ok) {
        setComentario('');
        fetchHistorico();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('foto', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/planos-acao/${plano.id}/foto`, {
        method: 'POST',
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });
      if (res.ok) {
        fetchHistorico();
      } else {
        alert("Falha ao enviar foto.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlano = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este Plano de Ação? Esta ação não pode ser desfeita e todo o histórico será apagado.")) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/planos-acao/${plano.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        onUpdate();
        onClose();
      } else {
        alert("Erro ao excluir plano de ação.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão ao excluir plano.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="text-blue-500">#{plano.id}</span> {plano.titulo}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium text-xs">{plano.cluster}</span>
              <span>•</span>
              <span>KPI Foco: <strong className="text-slate-700 dark:text-slate-300">{plano.kpi_foco}</strong></span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(userRole === 'admin' || userRole === 'TI') && (
              <button onClick={handleDeletePlano} className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" title="Excluir Plano">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Lado Esquerdo: Detalhes do Plano */}
          <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto p-5 flex flex-col gap-6">
            
            {/* Status e Edição */}
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Edit2 size={16} /> Gestão do Plano
                </h3>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {isEditing ? 'Cancelar Edição' : 'Editar'}
                </button>
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select 
                      value={editForm.status} 
                      onChange={e => setEditForm({...editForm, status: e.target.value})}
                      className="w-full text-sm rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 p-2 text-slate-800 dark:text-slate-200"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Em Atraso">Em Atraso</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Prazo</label>
                    <input 
                      type="date" 
                      value={editForm.prazo} 
                      onChange={e => setEditForm({...editForm, prazo: e.target.value})}
                      className="w-full text-sm rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 p-2 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Responsável</label>
                    <input 
                      type="text" 
                      value={editForm.responsavel} 
                      onChange={e => setEditForm({...editForm, responsavel: e.target.value})}
                      className="w-full text-sm rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 p-2 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <button onClick={handleSaveEdit} className="mt-2 bg-blue-600 text-white p-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    Salvar Alterações
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Status</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      plano.status === 'Concluído' ? 'bg-emerald-100 text-emerald-800' : 
                      plano.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' : 
                      plano.status === 'Em Atraso' ? 'bg-rose-100 text-rose-800' : 
                      'bg-slate-200 text-slate-800'
                    }`}>
                      {plano.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Clock size={16} className="text-slate-400" />
                    <span className="font-medium">Prazo:</span> {plano.prazo ? new Date(plano.prazo).toLocaleDateString() : '-'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <User size={16} className="text-slate-400" />
                    <span className="font-medium">Responsável:</span> {plano.responsavel}
                  </div>
                </div>
              )}
            </div>

            {/* Descrição Detalhada */}
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Problema</h4>
                <p className="text-sm text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">{plano.problema}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Causa Raiz</h4>
                <p className="text-sm text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">{plano.causa_raiz}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ação Proposta</h4>
                <p className="text-sm text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">{plano.acao_proposta}</p>
              </div>
            </div>

          </div>

          {/* Lado Direito: Histórico / Chat */}
          <div className="w-full md:w-2/3 bg-slate-50 dark:bg-slate-900 flex flex-col relative">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {loading ? (
                <div className="flex justify-center my-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>
              ) : historico.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <AlertCircle size={48} className="mb-4 opacity-50" />
                  <p>Nenhum acompanhamento registado ainda.</p>
                </div>
              ) : (
                historico.map(h => (
                  <div key={h.id} className={`flex flex-col ${h.tipo === 'MUDANCA_STATUS' || h.tipo === 'EDICAO' ? 'items-center my-4' : 'items-start'}`}>
                    
                    {/* Log do Sistema */}
                    {(h.tipo === 'MUDANCA_STATUS' || h.tipo === 'EDICAO') && (
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                        {h.tipo === 'MUDANCA_STATUS' ? <CheckCircle size={14} className="text-emerald-500"/> : <Edit2 size={14} className="text-blue-500"/>}
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          <strong>{h.usuario}</strong> {h.conteudo}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2">{new Date(h.criado_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    )}

                    {/* Comentário / Foto */}
                    {(h.tipo === 'TEXTO' || h.tipo === 'FOTO') && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-200 dark:border-slate-700 max-w-[85%]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{h.usuario}</span>
                          <span className="text-[10px] text-slate-400 ml-4">{new Date(h.criado_em).toLocaleString()}</span>
                        </div>
                        {h.tipo === 'TEXTO' ? (
                          <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{h.conteudo}</p>
                        ) : (
                          <a href={`http://${window.location.hostname}:3001${h.conteudo}`} target="_blank" rel="noopener noreferrer">
                            <img src={`http://${window.location.hostname}:3001${h.conteudo}`} alt="Anexo" className="rounded-lg max-h-64 object-cover border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity" />
                          </a>
                        )}
                      </div>
                    )}

                  </div>
                ))
              )}
            </div>

            {/* Input Box */}
            <div className="bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-end gap-2">
                <label className="cursor-pointer p-3 text-slate-400 hover:text-blue-500 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
                  <Camera size={20} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                <textarea 
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComentario();
                    }
                  }}
                  placeholder="Digite uma atualização ou acompanhamento..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-200 max-h-32 min-h-[50px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  rows={2}
                />
                <button 
                  onClick={handleSendComentario}
                  disabled={!comentario.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors flex-shrink-0"
                >
                  <Send size={20} className={!comentario.trim() ? "opacity-50" : ""} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlanoAcaoDetailsModal;
