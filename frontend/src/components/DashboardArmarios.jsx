import React, { useState, useEffect, useContext } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Server, AlertTriangle } from 'lucide-react';
import { RefreshContext } from '../context/RefreshContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { formatarMesAno } from '../utils/dateFormatter';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const HeatmapLayer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heat = L.heatLayer(points, {
      radius: 12,
      blur: 15,
      maxZoom: 12,
      max: 5.0, // Higher max so it takes more density to become completely red
      gradient: {
        0.3: 'blue',
        0.5: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);
  return null;
};

// Fix for leaflet default markers in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DashboardArmarios({ isDark }) {
  const [dados, setDados] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mesSelecionado, setMesSelecionado] = usePersistentState('armarios_mes', 'Todos');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);
  const [filtroMapa, setFiltroMapa] = useState('Todos'); // 'Todos', 'Reparos', 'Instalacoes'
  const [rawHeatmapData, setRawHeatmapData] = useState([]);
  const { tick } = useContext(RefreshContext);

  useEffect(() => {
    carregarMeses();
  }, []);

  useEffect(() => {
    carregarDados();
  }, [tick, mesSelecionado]);

  const carregarMeses = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('@tecnomulti:user') || '{}');
      const token = user?.token || localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/meses`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        const data = await res.json();
        setMesesDisponiveis(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar meses:', err);
    }
  };

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const user = JSON.parse(localStorage.getItem('@tecnomulti:user') || '{}');
      const token = user?.token || localStorage.getItem('token');
      
      const [resArmarios, resHeatmap] = await Promise.all([
        fetch(`http://${window.location.hostname}:3001/api/armarios-reparos?mes=${mesSelecionado}`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        }),
        fetch(`http://${window.location.hostname}:3001/api/heatmap?mes=${mesSelecionado}`, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        })
      ]);
      
      if (!resArmarios.ok) throw new Error('Falha na resposta do servidor');
      const dataArmarios = await resArmarios.json();
      
      let dataHeatmap = [];
      if (resHeatmap.ok) {
         dataHeatmap = await resHeatmap.json();
      }
      
      const parseCoordinate = (val, isLat) => {
        if (!val) return null;
        // Extract all digits
        let str = val.toString().replace(/[^0-9]/g, '');
        if (str.length === 0) return null;
        
        // For Northeast Brazil, lat is always 1 digit (5-9), lon is always 2 digits (34-38)
        if (isLat) {
          str = str.substring(0, 1) + '.' + str.substring(1);
        } else {
          str = str.substring(0, 2) + '.' + str.substring(2);
        }
        
        return -parseFloat(str); // Northeast Brazil is always negative lat/lon
      };

      const formatado = dataArmarios.map(item => ({
        name: item.armario,
        reparos: parseInt(item.qtd_reparos, 10),
        lat: parseCoordinate(item.lat, true),
        lon: parseCoordinate(item.lon, false)
      }));

      setDados(formatado);
      setRawHeatmapData(dataHeatmap);
      setErro(null);
    } catch (err) {
      console.error(err);
      setErro('Erro ao carregar dados dos armários.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const parseCoordinate = (val, isLat) => {
      if (!val) return null;
      let str = val.toString().replace(/[^0-9]/g, '');
      if (str.length === 0) return null;
      if (isLat) {
        str = str.substring(0, 1) + '.' + str.substring(1);
      } else {
        str = str.substring(0, 2) + '.' + str.substring(2);
      }
      return -parseFloat(str);
    };

    const heatPoints = rawHeatmapData.filter(item => {
      const tipo = (item.tipo_de_atividade || '').toLowerCase();
      if (filtroMapa === 'Reparos' && !tipo.includes('defeito')) return false;
      if (filtroMapa === 'Instalacoes' && tipo.includes('defeito')) return false;
      return true;
    }).map(item => {
      const lat = parseCoordinate(item.latitude, true);
      const lon = parseCoordinate(item.longitude, false);
      const tipo = (item.tipo_de_atividade || '').toLowerCase();
      const weight = tipo.includes('defeito') ? 1.0 : 0.3;
      if (lat && lon) return [lat, lon, weight];
      return null;
    }).filter(Boolean);

    setHeatmapData(heatPoints);
  }, [rawHeatmapData, filtroMapa]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg">
          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{label}</p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Reparos: <strong>{payload[0].value}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg m-6">
        <AlertTriangle className="inline-block mr-2" />
        {erro}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Server className="text-red-500" />
            Top Armários Ofensores (Reparos)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Visualização dos 20 armários com maior volume de atividades de defeito.
          </p>
        </div>
        {mesesDisponiveis.length > 0 && (
          <div className="flex items-center gap-3 bg-red-600/10 p-3 rounded-xl backdrop-blur-sm border border-red-600/20">
            <label className="text-sm text-red-700 dark:text-red-300 font-semibold whitespace-nowrap">Mês Ref:</label>
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-700/50 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 outline-none w-full md:w-auto font-medium"
            >
              <option value="Todos">Todos os Meses</option>
              {mesesDisponiveis.map(m => (
                <option key={m} value={m}>{formatarMesAno(m)}</option>
              ))}
            </select>
            <select
              value={filtroMapa}
              onChange={(e) => setFiltroMapa(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto text-sm font-medium"
            >
              <option value="Todos">Todas as Atividades</option>
              <option value="Reparos">Apenas Reparos</option>
              <option value="Instalacoes">Apenas Instalações</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Volume de Reparos por Armário</h3>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dados}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: 12 }} 
                  width={120} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="reparos" radius={[0, 4, 4, 0]}>
                  {dados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#ef4444' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col relative z-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Localização dos Armários</h3>
          <div className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 isolate relative">
            
            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-4 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 pointer-events-none">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">Densidade no Mapa</h4>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]"></div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Crítica (Alta qtde. Reparos)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Atenção (Média qtde. Reparos)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Leve (Baixa qtde. Reparos)</span>
                </div>
                <div className="flex items-center gap-3 mt-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="w-4 h-4 rounded-full bg-blue-600/60 shadow-sm"></div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Malha Base (Instalações)</span>
                </div>
              </div>
            </div>

            {dados.filter(d => d.lat !== null && d.lon !== null).length > 0 ? (
              <MapContainer 
                center={[
                  dados.filter(d => d.lat !== null)[0]?.lat || -8.0476, 
                  dados.filter(d => d.lon !== null)[0]?.lon || -34.8770
                ]} 
                zoom={7} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <HeatmapLayer points={heatmapData} />
                {/* Render markers for top armarios */}
                {dados.filter(d => d.lat !== null && d.lon !== null).map((armario, idx) => (
                  <Marker key={`marker-${idx}`} position={[armario.lat, armario.lon]}>
                    <Popup>
                      <div className="font-semibold text-slate-800">Armário: {armario.name}</div>
                      <div className="text-red-600 text-sm">{armario.reparos} reparos neste mês</div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                Nenhuma coordenada encontrada para os armários no período.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
