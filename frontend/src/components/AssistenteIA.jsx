import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Database, Loader2, Sparkles } from 'lucide-react';

const AssistenteIA = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Olá! Sou seu assistente de inteligência artificial. Posso gerar relatórios dinâmicos, extrair KPIs e fazer consultas diretas no banco de dados. O que você gostaria de analisar hoje?',
      dados: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), sender: 'user', text: input, dados: null };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage.text })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Falha na comunicação com a IA');
      }

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.explicacao,
        dados: data.dados,
        tipo_visualizacao: data.tipo_visualizacao,
        sql: data.sql_executado
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Desculpe, encontrei um erro: ${error.message}`,
        dados: null
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderVisualizacao = (dados, tipo) => {
    if (!dados || dados.length === 0) return null;

    if (tipo === 'table' || !tipo) {
      const colunas = Object.keys(dados[0]);
      return (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-800">
              <tr>
                {colunas.map(col => (
                  <th key={col} className="px-4 py-2 font-medium">{col.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((row, i) => (
                <tr key={i} className="border-b border-gray-700 bg-gray-900 hover:bg-gray-800">
                  {colunas.map(col => (
                    <td key={col} className="px-4 py-2">{row[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    // Gráficos podem ser implementados no futuro com Recharts aqui
    return (
      <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700 text-sm text-gray-300">
        <p className="text-indigo-400 mb-2 font-medium">Visualização '{tipo}' solicitada (renderizando como tabela temporária):</p>
        <pre className="overflow-x-auto">{JSON.stringify(dados, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-gray-900 p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white font-medium">Assistente de IA</h2>
            <p className="text-xs text-indigo-300">Geração de relatórios com linguagem natural</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-full border border-gray-700">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-gray-300">Online</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-950 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.sender === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-br from-purple-600 to-indigo-600'
              }`}>
                {msg.sender === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>

              {/* Message Bubble */}
              <div className="flex flex-col gap-1">
                <div className={`p-3 rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
                
                {/* Visualizations / Data */}
                {msg.dados && renderVisualizacao(msg.dados, msg.tipo_visualizacao)}
                
                {/* SQL Badge */}
                {msg.sql && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                    <Database size={12} />
                    <span className="font-mono bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800 truncate max-w-sm">
                      {msg.sql}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 rounded-tl-sm flex items-center gap-2">
                <Loader2 size={16} className="text-indigo-400 animate-spin" />
                <span className="text-sm text-gray-400">Processando os dados...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ex: Quais técnicos tiveram a pior performance de SLA no mês?"
            className="w-full bg-gray-950 border border-gray-700 text-gray-200 text-sm rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white rounded-full transition-colors flex items-center justify-center"
          >
            <Send size={16} className={input.trim() && !isLoading ? 'ml-0.5' : ''} />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-500 mt-2">
          A Inteligência Artificial pode cometer erros. Verifique os dados quando importante.
        </p>
      </div>
    </div>
  );
};

export default AssistenteIA;
