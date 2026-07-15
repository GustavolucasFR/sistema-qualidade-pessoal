import React, { createContext, useState, useEffect } from 'react';

export const RefreshContext = createContext();

export const RefreshProvider = ({ children }) => {
  const [autoRefresh, setAutoRefresh] = useState(() => {
    try {
      const item = window.localStorage.getItem('qualidade_auto_refresh');
      return item ? JSON.parse(item) : false;
    } catch {
      return false;
    }
  });
  const [tick, setTick] = useState(0);

  // Salva no localStorage quando mudar o estado do autoRefresh
  useEffect(() => {
    try {
      window.localStorage.setItem('qualidade_auto_refresh', JSON.stringify(autoRefresh));
    } catch (e) {
      console.warn('Não foi possível salvar o estado do AutoRefresh', e);
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    // Auto atualiza a cada 5 minutos
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <RefreshContext.Provider value={{ autoRefresh, setAutoRefresh, tick }}>
      {children}
    </RefreshContext.Provider>
  );
};
