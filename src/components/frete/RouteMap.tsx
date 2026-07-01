import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';
import { RotateCcw, Map as MapIcon, Plus, Trash2, RefreshCw, MoreVertical, X } from 'lucide-react';
import { toGPX, toKML, toJSON, download, ExportPoint } from '@/lib/routeExport';

function buildGoogleMapsFallbackUrl(points: ExportPoint[]): string {
  const valid = points.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length < 2) return 'https://www.google.com/maps';
  const origin = `${valid[0].lat.toFixed(6)},${valid[0].lng.toFixed(6)}`;
  const destination = `${valid[valid.length - 1].lat.toFixed(6)},${valid[valid.length - 1].lng.toFixed(6)}`;
  const mids = valid.slice(1, -1).map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`);
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin,
    destination,
  });
  if (mids.length) params.set('waypoints', mids.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Google Maps só tem modo "carro" no link universal, então pode sugerir atalhos
// proibidos para caminhão. Para forçar o Maps a seguir o traçado calculado pela
// HERE para o perfil de caminhão, injetamos waypoints amostrados ao longo do
// polyline navegável. Isso "trava" o Maps na rota do caminhão.
// Limite prático de waypoints no link do Google: 9.
// Amostragem inteligente: escolhe pontos nos maiores DESVIOS do polyline (curvas
// e entroncamentos), usando o algoritmo Ramer-Douglas-Peucker invertido. Isso
// "trava" o Google Maps nos pontos onde ele mais tende a sugerir atalho de carro.
function pickDeviationPoints(
  coords: [number, number][],
  count: number,
): Array<{ lat: number; lng: number }> {
  if (coords.length <= 2 || count <= 0) return [];
  // Perpendicular distance (approx planar — suficiente em escalas rodoviárias).
  const perpDist = (p: [number, number], a: [number, number], b: [number, number]) => {
    const [x, y] = [p[1], p[0]];
    const [x1, y1] = [a[1], a[0]];
    const [x2, y2] = [b[1], b[0]];
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
    const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    return Math.hypot(x - px, y - py);
  };
  // Segments as [startIdx, endIdx]; pick max-deviation index inside, split, repeat.
  const chosen = new Set<number>();
  const segments: Array<[number, number]> = [[0, coords.length - 1]];
  while (chosen.size < count && segments.length) {
    // pick segment with largest max deviation
    let bestSegIdx = -1;
    let bestPtIdx = -1;
    let bestDist = -1;
    for (let s = 0; s < segments.length; s++) {
      const [i0, i1] = segments[s];
      if (i1 - i0 < 2) continue;
      const a = coords[i0];
      const b = coords[i1];
      for (let k = i0 + 1; k < i1; k++) {
        if (chosen.has(k)) continue;
        const d = perpDist(coords[k], a, b);
        if (d > bestDist) {
          bestDist = d;
          bestPtIdx = k;
          bestSegIdx = s;
        }
      }
    }
    if (bestSegIdx < 0 || bestPtIdx < 0) break;
    chosen.add(bestPtIdx);
    const [i0, i1] = segments[bestSegIdx];
    segments.splice(bestSegIdx, 1, [i0, bestPtIdx], [bestPtIdx, i1]);
  }
  return [...chosen]
    .sort((a, b) => a - b)
    .map((i) => ({ lat: coords[i][0], lng: coords[i][1] }));
}

export function buildGoogleMapsUrlFromRoute(
  points: ExportPoint[],
  routeCoordinates: [number, number][] | undefined,
  maxWaypoints = 3,
): string {
  const valid = points.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length < 2) return buildHereWeGoUrl(points);
  const origin = valid[0];
  const destination = valid[valid.length - 1];
  const userMids = valid.slice(1, -1);

  // Só amostra âncoras se a rota for razoavelmente longa (>= 20 pontos no
  // polyline). Em rotas curtas, o risco de um ponto amostrado cair em local
  // irrotável (canteiro, viaduto, sentido único) supera o benefício.
  const remaining = Math.max(0, maxWaypoints - userMids.length);
  const sampled =
    routeCoordinates && routeCoordinates.length >= 20 && remaining > 0
      ? pickDeviationPoints(routeCoordinates, remaining)
      : [];

  const fmt = (lat: number, lng: number) => `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const waypoints = [
    ...userMids.map((p) => fmt(p.lat, p.lng)),
    ...sampled.map((p) => fmt(p.lat, p.lng)),
  ];

  const params = new URLSearchParams({
    api: '1',
    travelmode: 'driving',
    origin: fmt(origin.lat, origin.lng),
    destination: fmt(destination.lat, destination.lng),
  });
  // Waypoints sem prefixo "via:" — permitem que o Google faça pequeno snap à
  // rua mais próxima em vez de rejeitar a rota inteira. Sem dir_action=navigate
  // para não travar a reotimização.
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}



// Link do HERE WeGo em modo caminhão (respeita restrições de eixos/altura/peso).
export function buildHereWeGoTruckUrl(points: ExportPoint[]): string {
  const valid = points.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length < 2) return 'https://wego.here.com';
  const segs = valid.map(
    (p, i) =>
      `${p.lat.toFixed(6)},${p.lng.toFixed(6)},${encodeURIComponent(
        p.address || (i === 0 ? 'Origem' : i === valid.length - 1 ? 'Destino' : `Parada ${i}`),
      )}`,
  );
  return `https://wego.here.com/directions/mix/${segs.join('/')}?m=t`;
}

export function openInHereMaps(points: ExportPoint[]) {
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

// Teardrop-shaped pin icons (HERE WeGo style)
const makePin = (color: string, label?: string) =>
  L.divIcon({
    className: 'route-map-pin',
    html: `<div style="position:relative;width:32px;height:42px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
      <svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" fill="${color}"/>
        <circle cx="16" cy="16" r="6" fill="#ffffff"/>
      </svg>
      ${label ? `<span style="position:absolute;top:8px;left:0;right:0;text-align:center;color:${color};font-size:10px;font-weight:800;">${label}</span>` : ''}
    </div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });

const ICON_START = makePin('#16a34a', 'A');
const ICON_END = makePin('#dc2626', 'B');
const ICON_MID = makePin('#0ea5a5');
const ICON_WAYPOINT = makePin('#8b5cf6', 'W');

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
  const [menuOpen, setMenuOpen] = useState(false);
  const originalPoints = useRef<ExportPoint[]>(points);
  const debounceRef = useRef<number | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setLivePoints(points);
    originalPoints.current = points;
  }, [points]);

  const navigationCoords: [number, number][] = useMemo(
    () => (coordinates || []).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)),
    [coordinates],
  );

  const exportPoints: ExportPoint[] = [
    livePoints[0],
    ...waypoints,
    ...livePoints.slice(1),
  ].filter(Boolean) as ExportPoint[];

  const markerCoords: [number, number][] = useMemo(
    () => exportPoints.map((p) => [p.lat, p.lng] as [number, number]),
    [exportPoints],
  );

  const allCoords: [number, number][] = useMemo(() => {
    if (navigationCoords.length > 1) return navigationCoords;
    return markerCoords;
  }, [navigationCoords, markerCoords]);

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

  const hasNavigationRoute = navigationCoords.length > 1;

  const iconFor = (i: number) =>
    i === 0 ? ICON_START : i === livePoints.length - 1 ? ICON_END : ICON_MID;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2 min-w-0">
          <MapIcon size={18} className="text-emerald-600 shrink-0" />
          <span className="font-bold text-sm truncate">Mapa da Rota</span>
          {loading && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-emerald-600">
              <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              recalculando…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAddMode((v) => !v)}
            title={addMode ? 'Cancelar' : 'Adicionar parada'}
            aria-label="Adicionar parada"
            className={`h-9 w-9 flex items-center justify-center rounded-full transition ${
              addMode ? 'bg-violet-600 text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-violet-600'
            }`}
          >
            {addMode ? <X size={16} /> : <Plus size={18} />}
          </button>
          <button
            onClick={recalcNow}
            title="Recalcular agora"
            aria-label="Recalcular"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow"
          >
            <RefreshCw size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title="Mais opções"
              aria-label="Mais opções"
              className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
                  <button
                    onClick={() => { resetCoords(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
                  >
                    <RotateCcw size={14} /> Resetar rota original
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Exportar</p>
                  <button
                    onClick={() => { download('rota-frete.gpx', 'application/gpx+xml', toGPX(allCoords, exportPoints)); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
                  >
                    GPX (navegadores)
                  </button>
                  <button
                    onClick={() => { download('rota-frete.kml', 'application/vnd.google-earth.kml+xml', toKML(allCoords, exportPoints)); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
                  >
                    KML (Google Earth)
                  </button>
                  <button
                    onClick={() => { download('rota-frete.json', 'application/json', toJSON(allCoords, exportPoints)); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700"
                  >
                    JSON (dados)
                  </button>
                </div>
              </>
            )}
          </div>
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
            {hasNavigationRoute ? (
              <>
                <Polyline positions={navigationCoords} pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
                <Polyline positions={navigationCoords} pathOptions={{ color: '#16a34a', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
              </>
            ) : null}
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
        {!hasNavigationRoute && exportPoints.length > 1 && (
          <div className="absolute inset-x-3 bottom-3 z-[500] rounded-xl bg-white/95 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800 shadow-sm">
            Traçado navegável ainda não carregado. Use recalcular para buscar a rota real nas estradas.
          </div>
        )}
      </div>
      <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-[hsl(var(--border))] flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-600" /> Origem</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600" /> Destino</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-600" /> Parada</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-[3px] bg-emerald-600 rounded" /> Rota</span>
      </div>
    </div>
  );
};

export default RouteMap;
