import React, { useState, useEffect } from 'react';
import { UserCheck, Users, Shield } from 'lucide-react';

const HierarchyFilterBar = ({ 
  gerenciaFilter, setGerenciaFilter, 
  coordenadorFilter, setCoordenadorFilter, 
  gestorFilter, setGestorFilter 
}) => {
  const [options, setOptions] = useState({
    gerencias: [],
    coordenadores: [],
    gestores: [],
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://${window.location.hostname}:3001/api/filtros-hierarquia`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOptions(data);
        }
      } catch (err) {
        console.error('Erro ao carregar filtros de hierarquia:', err);
      }
    };

    fetchOptions();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-4 py-2">
      {/* GERÊNCIA */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          GERÊNCIA
        </label>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 min-w-[200px]">
          <Shield size={16} className="text-slate-400" />
          <select 
            value={gerenciaFilter} 
            onChange={(e) => setGerenciaFilter(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
          >
            <option value="Todas">Todas</option>
            {options.gerencias.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* COORDENADOR JR */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          COORDENADOR JR
        </label>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 min-w-[220px]">
          <UserCheck size={16} className="text-slate-400" />
          <select 
            value={coordenadorFilter} 
            onChange={(e) => setCoordenadorFilter(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
          >
            <option value="Todas">Todas</option>
            {options.coordenadores.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GESTOR RESPONSÁVEL */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          GESTOR RESPONSÁVEL
        </label>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 min-w-[220px]">
          <Users size={16} className="text-slate-400" />
          <select 
            value={gestorFilter} 
            onChange={(e) => setGestorFilter(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none w-full cursor-pointer"
          >
            <option value="Todos">Todos</option>
            {options.gestores.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default HierarchyFilterBar;
