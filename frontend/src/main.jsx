import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Interceptador global do fetch para injetar o Token JWT em todas as requisições API
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  
  if (typeof resource === 'string' && resource.includes('/api/')) {
    try {
      const saved = localStorage.getItem('@tecnomulti:user');
      const user = saved && saved !== 'undefined' ? JSON.parse(saved) : null;
      
      if (user && user.token) {
        const newConfig = config || {};
        newConfig.headers = {
          ...newConfig.headers,
          'Authorization': `Bearer ${user.token}`
        };
        const response = await originalFetch(resource, newConfig);
        
        if (response.status === 401) {
          localStorage.removeItem('@tecnomulti:user');
          window.location.reload();
        }
        
        return response;
      }
    } catch (e) {
      console.warn('Erro ao ler token no fetch', e);
    }
  }
  
  return originalFetch(...args);
};

import { RefreshProvider } from './context/RefreshContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RefreshProvider>
      <App />
    </RefreshProvider>
  </StrictMode>,
)
