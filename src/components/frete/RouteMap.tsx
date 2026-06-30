import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';
import { Download, RotateCcw, Map as MapIcon, FileJson, FileText } from 'lucide-react';
import { toGPX, toKML, toJSON, download, ExportPoint } from '@/lib/routeExport';

const TILE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/here-tile-proxy?z={z}&x={x}&y={y}`;

interface RouteMapProps {
  coordinates: [number, number][];
  points: ExportPoint[];
  /** Triggered (debounced) when a marker is dragged or coords are edited. Receives ALL points. */
  onPointsChange?: (points: ExportPoint[]) => void;
  loading?: boolean;
}

// Colored circle div icons (no external image dependencies)
const makeIcon = (color: string) =>
  L.divIcon({
    className: 'route-map-marker',
    html: `<div style="background:${color};width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

const ICON_START = makeIcon('#10b981');
const ICON_END = makeIcon('#ef4444');
const ICON_MID = makeIcon('#2563eb');

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30] });
  }, [bounds, map]);
  return null;
}

const RouteMap: React.FC<RouteMapProps> = ({ coordinates, points, onPointsChange, loading }) => {
  const [livePoints, setLivePoints] = useState<ExportPoint[]>(points);
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

  const scheduleChange = (next: ExportPoint[]) => {
    setLivePoints(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onPointsChange?.(next);
    }, 800);
  };

  const handleDragEnd = (index: number, lat: number, lng: number) => {
    const next = livePoints.map((p, i) => (i === index ? { ...p, lat, lng } : p));
    scheduleChange(next);
  };

  const handleEditCoord = (index: number, field: 'lat' | 'lng', raw: string) => {
    const v = parseFloat(raw);
    if (Number.isNaN(v)) return;
    const next = livePoints.map((p, i) => (i === index ? { ...p, [field]: v } : p));
    scheduleChange(next);
  };

  const resetCoords = () => {
    setLivePoints(originalPoints.current);
    onPointsChange?.(originalPoints.current);
  };

  const exportPNG = async () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      // dynamic import to avoid bundling if unused
      const mod = await import('leaflet-image' /* @vite-ignore */ as string).catch(() => null);
      if (!mod) {
        // fallback: open native browser print of map area
        window.print();
        return;
      }
      const leafletImage = (mod as any).default || (mod as any);
      leafletImage(map, (err: any, canvas: HTMLCanvasElement) => {
        if (err || !canvas) return;
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'rota-frete.png';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      });
    } catch {
      window.print();
    }
  };

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
        <div className="flex items-center gap-1">
          <button
            onClick={resetCoords}
            title="Resetar coordenadas originais"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => download('rota-frete.gpx', 'application/gpx+xml', toGPX(allCoords, livePoints))}
            title="Exportar GPX"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold"
          >
            GPX
          </button>
          <button
            onClick={() =>
              download('rota-frete.kml', 'application/vnd.google-earth.kml+xml', toKML(allCoords, livePoints))
            }
            title="Exportar KML"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-bold"
          >
            KML
          </button>
          <button
            onClick={() => download('rota-frete.json', 'application/json', toJSON(allCoords, livePoints))}
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

      <div className="relative" style={{ height: 360 }}>
        {bounds && (
          <MapContainer
            ref={(m) => {
              mapRef.current = m as unknown as L.Map;
            }}
            bounds={bounds}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url={TILE_URL}
              attribution='&copy; <a href="https://here.com">HERE</a>'
              tileSize={256}
              maxZoom={19}
            />
            {coordinates && coordinates.length > 1 && (
              <Polyline positions={coordinates} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />
            )}
            {livePoints.map((p, i) => (
              <Marker
                key={`${i}-${p.address}`}
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
                    <p className="text-[10px] text-slate-400">
                      Arraste o marcador no mapa ou edite as coordenadas — os custos serão recalculados.
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
            <FitBounds bounds={bounds} />
          </MapContainer>
        )}
      </div>
      <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-[hsl(var(--border))]">
        Dica: arraste qualquer marcador para corrigir a rota. O recálculo é automático após ~1 segundo.
      </div>
    </div>
  );
};

export default RouteMap;
