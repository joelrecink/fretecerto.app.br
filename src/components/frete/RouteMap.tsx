import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';
import { Download, RotateCcw, Map as MapIcon, FileJson, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toGPX, toKML, toJSON, download, ExportPoint } from '@/lib/routeExport';

export function buildHereWeGoUrl(points: ExportPoint[]): string {
  const segs = points
    .filter(Boolean)
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)},${encodeURIComponent(p.address || 'Ponto')}`);
  return `https://wego.here.com/directions/mix/${segs.join('/')}`;
}

function openInHereMaps(points: ExportPoint[]) {
  const url = buildHereWeGoUrl(points);
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile) {
    // Try app deep link; fall back to web after short delay
    const fallback = window.setTimeout(() => {
      window.open(url, '_blank');
    }, 800);
    try {
      window.location.href = url.replace('https://', 'heremaps://');
    } catch {
      window.clearTimeout(fallback);
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

const TILE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/here-tile-proxy?z={z}&x={x}&y={y}`;

interface RouteMapProps {
  coordinates: [number, number][];
  points: ExportPoint[];
  /** Fired (debounced) when the user drags a base marker or edits its coords. */
  onPointsChange?: (points: ExportPoint[], waypoints: ExportPoint[]) => void;
  loading?: boolean;
}

// Colored circle div icons (no external image dependencies)
const makeIcon = (color: string, label?: string) =>
  L.divIcon({
    className: 'route-map-marker',
    html: `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;">${label ?? ''}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

const ICON_START = makeIcon('#10b981');
const ICON_END = makeIcon('#ef4444');
const ICON_MID = makeIcon('#2563eb');
const ICON_WAYPOINT = makeIcon('#8b5cf6', 'W');

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

function ClickToAdd({ onAdd, enabled }: { onAdd: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const RouteMap: React.FC<RouteMapProps> = ({ coordinates, points, onPointsChange, loading }) => {
  const [livePoints, setLivePoints] = useState<ExportPoint[]>(points);
  const [waypoints, setWaypoints] = useState<ExportPoint[]>([]);
  const [addMode, setAddMode] = useState(false);
  const originalPoints = useRef<ExportPoint[]>(points);
  const debounceRef = useRef<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setLivePoints(points);
    originalPoints.current = points;
  }, [points]);

  const allCoords: [number, number][] = useMemo(() => {
    if (coordinates && coordinates.length) return coordinates;
    return livePoints.map((p) => [p.lat, p.lng]);
  }, [coordinates, livePoints]);

  const bounds: LatLngBoundsExpression | null = useMemo(() => {
    if (!allCoords.length) return null;
    const lats = allCoords.map((c) => c[0]);
    const lngs = allCoords.map((c) => c[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [allCoords]);

  const scheduleChange = (nextPoints: ExportPoint[], nextWaypoints: ExportPoint[]) => {
    setLivePoints(nextPoints);
    setWaypoints(nextWaypoints);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onPointsChange?.(nextPoints, nextWaypoints);
    }, 500);
  };

  const recalcNow = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    onPointsChange?.(livePoints, waypoints);
  };

  const handleDragEnd = (index: number, lat: number, lng: number) => {
    const next = livePoints.map((p, i) => (i === index ? { ...p, lat, lng } : p));
    scheduleChange(next, waypoints);
  };

  const handleEditCoord = (index: number, field: 'lat' | 'lng', raw: string) => {
    const v = parseFloat(raw);
    if (Number.isNaN(v)) return;
    const next = livePoints.map((p, i) => (i === index ? { ...p, [field]: v } : p));
    scheduleChange(next, waypoints);
  };

  const addWaypoint = (lat: number, lng: number) => {
    if (waypoints.length >= 5) {
      // eslint-disable-next-line no-alert
      alert('Máximo 5 pontos intermediários.');
      return;
    }
    const wp: ExportPoint = {
      address: `Ponto intermediário ${waypoints.length + 1}`,
      lat,
      lng,
    };
    const next = [...waypoints, wp];
    setAddMode(false);
    scheduleChange(livePoints, next);
  };

  const dragWaypoint = (index: number, lat: number, lng: number) => {
    const next = waypoints.map((w, i) => (i === index ? { ...w, lat, lng } : w));
    scheduleChange(livePoints, next);
  };

  const removeWaypoint = (index: number) => {
    const next = waypoints.filter((_, i) => i !== index);
    scheduleChange(livePoints, next);
  };

  const resetCoords = () => {
    setWaypoints([]);
    setLivePoints(originalPoints.current);
    onPointsChange?.(originalPoints.current, []);
  };

  const exportPNG = async () => {
    window.print();
  };

  const exportPoints: ExportPoint[] = [
    livePoints[0],
    ...waypoints,
    ...livePoints.slice(1),
  ].filter(Boolean) as ExportPoint[];

  const iconFor = (i: number) =>
    i === 0 ? ICON_START : i === livePoints.length - 1 ? ICON_END : ICON_MID;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          <MapIcon size={18} className="text-blue-600" />
          <span className="font-bold text-sm">Mapa da Rota</span>
          {loading && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600">
              <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              recalculando…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <button
            onClick={() => openInHereMaps(exportPoints)}
            title="Abrir rota no HERE WeGo"
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
          >
            <Navigation size={14} /> HERE
          </button>
          <button
            onClick={recalcNow}
            title="Recalcular rota agora"
            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
          >
            <RefreshCw size={14} /> Recalcular
          </button>
          <button
            onClick={() => setAddMode((v) => !v)}
            title={addMode ? 'Cancelar adição' : 'Adicionar ponto intermediário'}
            className={`p-2 rounded-lg text-xs font-bold ${addMode ? 'bg-violet-600 text-white' : 'hover:bg-slate-100 text-violet-600'}`}
          >
            <Plus size={16} />
          </button>
          <button
            onClick={resetCoords}
            title="Resetar coordenadas originais"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => download('rota-frete.gpx', 'application/gpx+xml', toGPX(allCoords, exportPoints))}
            title="Exportar GPX"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold"
          >
            GPX
          </button>
          <button
            onClick={() =>
              download('rota-frete.kml', 'application/vnd.google-earth.kml+xml', toKML(allCoords, exportPoints))
            }
            title="Exportar KML"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold"
          >
            KML
          </button>
          <button
            onClick={() => download('rota-frete.json', 'application/json', toJSON(allCoords, exportPoints))}
            title="Exportar JSON"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <FileJson size={16} />
          </button>
          <button
            onClick={exportPNG}
            title="Exportar imagem do mapa"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {addMode && (
        <div className="px-3 py-2 text-[11px] text-violet-700 bg-violet-50 border-b border-violet-200 font-medium">
          Clique no mapa para adicionar um ponto intermediário. Arraste-o depois para ajustar. Máx. 5.
        </div>
      )}

      <div className="relative" style={{ height: 360 }}>
        {bounds && (
          <MapContainer
            ref={(m) => {
              mapRef.current = m as unknown as L.Map;
            }}
            bounds={bounds}
            style={{ height: '100%', width: '100%', cursor: addMode ? 'crosshair' : '' }}
            scrollWheelZoom
          >
            <TileLayer
              url={TILE_URL}
              attribution='&copy; <a href="https://here.com">HERE</a>'
              tileSize={256}
              maxZoom={19}
            />
            <ClickToAdd enabled={addMode} onAdd={addWaypoint} />
            {coordinates && coordinates.length > 1 ? (
              <>
                <Polyline positions={coordinates} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.9 }} />
                <Polyline positions={coordinates} pathOptions={{ color: '#dc2626', weight: 6, opacity: 0.95 }} />
              </>
            ) : (
              exportPoints.length > 1 && (
                <Polyline
                  positions={exportPoints.map((p) => [p.lat, p.lng]) as [number, number][]}
                  pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.8, dashArray: '6 8' }}
                />
              )
            )}
            {livePoints.map((p, i) => (
              <Marker
                key={`base-${i}-${p.address}`}
                position={[p.lat, p.lng]}
                icon={iconFor(i)}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const ll = m.getLatLng();
                    handleDragEnd(i, ll.lat, ll.lng);
                  },
                }}
              >
                <Popup>
                  <div className="text-xs space-y-2 min-w-[200px]">
                    <p className="font-semibold">
                      {i === 0 ? '🟢 Origem' : i === livePoints.length - 1 ? '🔴 Destino' : `🔵 Parada ${i}`}
                    </p>
                    <p className="text-slate-600">{p.address}</p>
                    <div className="grid grid-cols-2 gap-1">
                      <label className="text-[10px] text-slate-500">Lat
                        <input
                          type="number"
                          step="0.000001"
                          defaultValue={p.lat}
                          onBlur={(e) => handleEditCoord(i, 'lat', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-[11px]"
                        />
                      </label>
                      <label className="text-[10px] text-slate-500">Lng
                        <input
                          type="number"
                          step="0.000001"
                          defaultValue={p.lng}
                          onBlur={(e) => handleEditCoord(i, 'lng', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-[11px]"
                        />
                      </label>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            {waypoints.map((w, i) => (
              <Marker
                key={`wp-${i}`}
                position={[w.lat, w.lng]}
                icon={ICON_WAYPOINT}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const ll = m.getLatLng();
                    dragWaypoint(i, ll.lat, ll.lng);
                  },
                }}
              >
                <Popup>
                  <div className="text-xs space-y-2 min-w-[180px]">
                    <p className="font-semibold">🟣 Ponto intermediário {i + 1}</p>
                    <p className="text-slate-500 text-[11px]">
                      {w.lat.toFixed(5)}, {w.lng.toFixed(5)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Arraste para ajustar a rota; os custos serão recalculados.
                    </p>
                    <button
                      onClick={() => removeWaypoint(i)}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-[11px] font-medium hover:bg-red-100"
                    >
                      <Trash2 size={12} /> Remover
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            <FitBounds bounds={bounds} />
          </MapContainer>
        )}
      </div>
      <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-[hsl(var(--border))]">
        Dica: clique em <b>+</b> e depois no mapa para adicionar um trecho por onde a rota deve passar. Arraste marcadores para ajustar. Recálculo automático em ~1s.
      </div>
    </div>
  );
};

export default RouteMap;
