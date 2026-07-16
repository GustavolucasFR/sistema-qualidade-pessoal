import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Clock, Database, Activity } from 'lucide-react';
import DashboardSLAs from './components/DashboardSLAs';
import DashboardETL from './components/DashboardETL';
import DashboardOperacional from './components/DashboardOperacional';
import DashboardClusters from './components/DashboardClusters';
import RelatorioExecutivo from './components/RelatorioExecutivo';
import DashboardAcoes from './components/DashboardAcoes';
import CentralProdutividade from './components/CentralProdutividade';
import DashboardBacklog from './components/DashboardBacklog';
import DashboardContrato from './components/DashboardContrato';
import DashboardArmarios from './components/DashboardArmarios';
import DashboardTI from './components/DashboardTI';

import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import { LogOut, User, ChevronDown, Moon, Sun, Presentation, Map, Target, Layers, Menu, X, RefreshCw, Settings } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { RefreshContext } from './context/RefreshContext';
import { useContext } from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-600 font-sans">
          <h2 className="text-2xl font-bold mb-4">Oops, deu erro no React!</h2>
          <pre className="whitespace-pre-wrap bg-red-50 p-4 rounded-lg">{this.state.error?.toString()}</pre>
          <pre className="whitespace-pre-wrap bg-red-50 p-4 rounded-lg mt-4 text-xs">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('clusters');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('@tecnomulti:user');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Erro ao ler user do localStorage", e);
      return null;
    }
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { autoRefresh, setAutoRefresh } = useContext(RefreshContext);
  const [isDark, setIsDark] = useState(() => {
    const savedDark = localStorage.getItem('@tecnomulti:dark');
    return savedDark ? JSON.parse(savedDark) : false;
  });
  const relatorioRef = useRef();
  const sidebarTimeoutRef = useRef(null);

  const startSidebarTimer = () => {
    if (sidebarTimeoutRef.current) clearTimeout(sidebarTimeoutRef.current);
    sidebarTimeoutRef.current = setTimeout(() => {
      setIsSidebarOpen(false);
    }, 5000);
  };

  const clearSidebarTimer = () => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
      sidebarTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (isSidebarOpen) {
      startSidebarTimer();
    } else {
      clearSidebarTimer();
    }
    return () => clearSidebarTimer();
  }, [isSidebarOpen]);

  const handlePrintRelatorio = useReactToPrint({
    contentRef: relatorioRef,
    documentTitle: 'Apresentacao_Executiva_Quality',
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('@tecnomulti:dark', JSON.stringify(isDark));
  }, [isDark]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('@tecnomulti:user', JSON.stringify(user));
    } else {
      localStorage.removeItem('@tecnomulti:user');
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('@tecnomulti:user', JSON.stringify(userData));
    // Se for tecnico e nao precisar trocar senha, vai direto pra produtividade, ou o que quiser
    if (userData.role === 'TECNICO' && !userData.must_change_password) {
      setActiveTab('produtividade_central');
    }
  };

  const handlePasswordChanged = () => {
    const updatedUser = { ...user, must_change_password: false };
    setUser(updatedUser);
    localStorage.setItem('@tecnomulti:user', JSON.stringify(updatedUser));
    if (updatedUser.role === 'TECNICO') {
      setActiveTab('produtividade_central');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('@tecnomulti:user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.must_change_password) {
    return <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} />;
  }

  const isTI = user.role === 'TI';
  const isAdmin = user.role === 'admin' || user.role === 'TI';

  const renderTabContent = () => {
    switch(activeTab) {
      case 'clusters':
        return <DashboardClusters userRole={user.role} isDark={isDark} />;
      case 'slas':
        return <DashboardSLAs userRole={user.role} isDark={isDark} />;
      case 'acoes':
        return <DashboardAcoes userRole={user.role} isDark={isDark} />;
      case 'produtividade_central':
        return <CentralProdutividade userRole={user.role} isDark={isDark} />;
      case 'etl':
        return <DashboardETL userRole={user.role} isDark={isDark} />;
      case 'backlog':
        return <DashboardBacklog isDark={isDark} />;
      case 'armarios':
        return <DashboardArmarios isDark={isDark} />;
      case 'ti':
        return <DashboardTI isDark={isDark} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex print:block print:h-auto">
      {/* Sidebar Desktop */}
      <div 
        onMouseEnter={clearSidebarTimer}
        onMouseLeave={startSidebarTimer}
        className={`bg-slate-900 text-white flex flex-col shadow-xl z-20 hidden md:flex border-r border-transparent dark:border-slate-800 transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 opacity-0 overflow-hidden'}`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="w-full">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-red-500 whitespace-nowrap">
              Tecnomulti Quality
            </h1>
            <p className="text-xs text-slate-400 mt-1 whitespace-nowrap">E2E Analytics Pipeline</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {user.role !== 'TECNICO' && (
            <button
              onClick={() => setActiveTab('clusters')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'clusters' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              title="Visão por Clusters"
            >
              <Map size={20} className="shrink-0" />
              <span className="font-medium whitespace-nowrap">Visão por Clusters</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('slas')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'slas' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            title="Auditoria de SLAs"
          >
            <Clock size={20} className="shrink-0" />
            <span className="font-medium whitespace-nowrap">Auditoria de SLAs</span>
          </button>
          
          {user.role !== 'TECNICO' && (
            <button
              onClick={() => setActiveTab('acoes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'acoes' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              title="Gestão de Qualidade"
            >
              <Target size={20} className="shrink-0" />
              <span className="font-medium whitespace-nowrap">Gestão de Qualidade</span>
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('produtividade_central')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'produtividade_central' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            title="Central de Produtividade"
          >
            <Activity size={20} className="shrink-0" />
            <span className="font-medium whitespace-nowrap">Central de Produtividade</span>
          </button>
          
          {user.role !== 'TECNICO' && (
            <button
              onClick={() => setActiveTab('backlog')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'backlog' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              title="Backlog Diário"
            >
              <Layers size={20} className="shrink-0" />
              <span className="font-medium whitespace-nowrap">Backlog Diário</span>
            </button>
          )}

          {user.role !== 'TECNICO' && (
            <button
              onClick={() => setActiveTab('armarios')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'armarios' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              title="Armários e Reparos"
            >
              <Database size={20} className="shrink-0" />
              <span className="font-medium whitespace-nowrap">Armários Ofensores</span>
            </button>
          )}

          {isTI && (
            <button
              onClick={() => setActiveTab('ti')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'ti' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              title="Administração TI"
            >
              <Settings size={20} className="shrink-0" />
              <span className="font-medium whitespace-nowrap">Administração TI</span>
            </button>
          )}
          
          {isTI && (
            <button
              onClick={() => setActiveTab('etl')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'etl' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              title="Data Observability"
            >
              <Database size={20} className="shrink-0" />
              <span className="font-medium whitespace-nowrap">Data Observability</span>
            </button>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:h-auto relative bg-white dark:bg-slate-900">
        
        {/* Marca d'água Tecnomulti */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-10 dark:opacity-20 z-40">
          <img src="/logo-tecnomulti.png" alt="Tecnomulti Watermark" className="w-[600px] max-w-[80%] object-contain mix-blend-multiply dark:grayscale dark:contrast-200 dark:invert dark:mix-blend-screen" style={{ maskImage: 'radial-gradient(circle, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)' }} />
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex justify-between items-center p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 relative z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors"
              title="Alternar Menu"
            >
              <Menu size={24} />
            </button>
            {!isSidebarOpen && (
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-red-600 dark:from-blue-400 dark:to-red-500">
                Tecnomulti Quality
              </h1>
            )}
          </div>
          <div className="relative flex items-center gap-4">
            <button
              onClick={handlePrintRelatorio}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-full font-medium transition-all shadow-md shadow-blue-500/20"
              title="Gerar PDF de Apresentação"
            >
              <Presentation size={18} />
              <span>Gerar Apresentação</span>
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-medium transition-all text-sm border ${autoRefresh ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200 dark:border-emerald-800' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border-transparent'}`}
              title="Auto-Atualizar (20 seg)"
            >
              <RefreshCw size={16} className={autoRefresh ? "animate-[spin_4s_linear_infinite]" : ""} />
              <span className="hidden lg:inline">{autoRefresh ? 'TV ON' : 'TV OFF'}</span>
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button 
              onClick={() => setIsDark(!isDark)} 
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors focus:outline-none"
              title={isDark ? "Modo Claro" : "Modo Escuro"}
            >
              {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={16} className="text-slate-500" />
            </button>
            
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                   <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                     <User size={20} />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">{user.username}</p>
                     <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Perfil: {user.role}</p>
                   </div>
                </div>
                <button
                  onClick={() => setUser(null)}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3 transition-colors"
                >
                  <LogOut size={18} />
                  <strong>Sair do Sistema</strong>
                </button>
              </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
           <h1 className="text-lg font-bold">Tecnomulti Quality</h1>
           <div className="flex items-center gap-2">
             <select 
                value={activeTab} 
                onChange={(e) => setActiveTab(e.target.value)}
                className="bg-slate-800 text-white border-none rounded p-1"
              >
               <option value="clusters">Visão Clusters</option>
               <option value="slas">Auditoria SLAs</option>
               <option value="acoes">Gestão de Qualidade</option>
               <option value="produtividade_central">Central de Produtividade</option>
               <option value="backlog">Backlog Diário</option>
               <option value="armarios">Armários Ofensores</option>

               {isTI && <option value="etl">Data Observability</option>}
             </select>
             <button
               onClick={() => setUser(null)}
               className="p-1 text-slate-400 hover:text-white"
               title="Sair"
             >
               <LogOut size={18} />
             </button>
           </div>
        </div>

        {/* Dynamic View */}
        <main ref={relatorioRef} className="flex-1 overflow-auto print:overflow-visible print:h-auto print:block print:bg-white print:p-4">
          <ErrorBoundary>
            {renderTabContent()}
          </ErrorBoundary>
        </main>

        {/* Hidden Presentation Component (Kept for reference, but no longer the print target) */}
        <div className="hidden">
          <RelatorioExecutivo userRole={user.role} />
        </div>
      </div>
    </div>
  );
}

export default App;
