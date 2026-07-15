import React from 'react';
import { Activity, Target, DollarSign, BarChart2 } from 'lucide-react';
import DashboardProdutividade from './DashboardProdutividade';
import DashboardOperacional from './DashboardOperacional';
import DashboardRemuneracao from './DashboardRemuneracao';
import DashboardProducaoBA from './DashboardProducaoBA';
import DashboardTMA from './DashboardTMA';
import DashboardTDNA from './DashboardTDNA';
import DashboardTMR from './DashboardTMR';
import DashboardConsolidadoPesos from './DashboardConsolidadoPesos';

const CentralProdutividade = ({ userRole, isDark }) => {
  const isAdmin = userRole === 'admin' || userRole === 'TI';

  const tabs = [
    {
      id: 'produtividade',
      label: 'Produtividade Geral',
      icon: <Activity size={18} />,
      component: <DashboardProdutividade userRole={userRole} isDark={isDark} />
    },
    {
      id: 'operacao',
      label: 'Painel Operacional',
      icon: <Target size={18} />,
      component: <DashboardOperacional userRole={userRole} isDark={isDark} />
    },
    {
      id: 'tma',
      label: 'Análise TMA',
      icon: <Activity size={18} />,
      component: <DashboardTMA userRole={userRole} isDark={isDark} />
    },
    {
      id: 'tdna',
      label: 'Análise TDNA',
      icon: <Target size={18} />,
      component: <DashboardTDNA userRole={userRole} isDark={isDark} />
    }
  ];

  if (isAdmin) {
    tabs.push({
      id: 'producao_ba',
      label: 'Produção & Financeiro',
      icon: <BarChart2 size={18} />,
      component: <DashboardProducaoBA isDark={isDark} />
    });
  }

  const [activeTab, setActiveTab] = React.useState('produtividade');
  const [mountedTabs, setMountedTabs] = React.useState(['produtividade']);

  React.useEffect(() => {
    if (!mountedTabs.includes(activeTab)) {
      setMountedTabs(prev => [...prev, activeTab]);
    }
  }, [activeTab, mountedTabs]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-4 overflow-x-auto shrink-0 shadow-sm z-10">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' 
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6">
        {tabs.map(tab => {
            if (!mountedTabs.includes(tab.id)) return null;
            
            return (
              <div 
                key={tab.id} 
                className={`flex-1 overflow-y-auto flex-col ${activeTab === tab.id ? 'flex' : 'hidden'}`}
              >
                  {tab.component}
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default CentralProdutividade;
