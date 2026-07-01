import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, MapPin, Fuel, DollarSign, Clock, TrendingUp, Map, MessageCircle, Lightbulb, AlertCircle, Target, Truck, FileDown, Navigation } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import RouteMap, { buildHereWeGoUrl, buildGoogleMapsUrlFromRoute, buildHereWeGoTruckUrl } from '@/components/frete/RouteMap';
import { toGPX, download, type ExportPoint } from '@/lib/routeExport';
import { exportDriverRoutePdf } from '@/lib/tripExport';

interface RoadRestriction {
  road: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
  alternative?: string;
}

interface AIAnalysis {
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  profitMargin: number;
  alerts: string[];
  optimizationTips: string[];
  marketAnalysis: string;
  returnAnalysis?: {
    hasReturnLoad: boolean;
    estimatedReturnCost: number;
    recommendation: string;
  };
  suggestedFreightValue?: number;
  summary: string;
  roadRestrictions?: RoadRestriction[];
}

interface GeocodedPoint {
  address: string;
  lat: number;
  lng: number;
}

interface VehicleRestrictions {
  axles: number;
  warnings: string[];
  avoidedRoads: string[];
}

interface SimulationResult {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalDurationDays: number;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  driverCommissionCost: number;
  estimatedMaintenanceCost: number;
  estimatedFixedCost?: number;
  estimatedArdaCost?: number;
  returnCost?: number;
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  routeSuggestions?: string;
  aiAnalysis?: AIAnalysis;
  polyline?: string;
  routeCoordinates?: [number, number][];
  geocodedPoints?: GeocodedPoint[];
  originCity?: string;
  destinationCity?: string;
  vehicleRestrictions?: VehicleRestrictions;
  routingEngine?: 'here' | 'tomtom' | 'google';
  costBreakdown?: {
    dailyCosts: {
      insurance: number;
      registration: number;
      depreciation: number;
      salary: number;
      parking: number;
      tracking: number;
      accounting: number;
      otherFixed: number;
      total: number;
    };
    perKmCosts: {
      fuel: number;
      tires: number;
      oil: number;
      transOil: number;
      filters: number;
      grease: number;
      washing: number;
      otherMaintenance: number;
      total: number;
    };
    tripCosts: {
      tolls: number;
      commission: number;
      arda: number;
    };
  };
}

interface DashboardScreenProps {
  result: SimulationResult;
  onReset: () => void;
  onRecalculateRoute?: (editedPoints: ExportPoint[], waypoints: ExportPoint[]) => Promise<void> | void;
  recalculating?: boolean;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ result, onReset, onRecalculateRoute, recalculating }) => {
  const [driverWaypoints, setDriverWaypoints] = useState<ExportPoint[]>([]);
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const chartData = [
    { name: 'Combustível', value: result.estimatedFuelCost, color: '#3b82f6' },
    { name: 'Pedágio', value: result.estimatedTollCost, color: '#f59e0b' },
    { name: 'Comissão', value: result.driverCommissionCost, color: '#10b981' },
    { name: 'Manutenção', value: result.estimatedMaintenanceCost, color: '#8b5cf6' },
    { name: 'Custos Fixos', value: result.estimatedFixedCost || 0, color: '#ec4899' },
    ...(result.returnCost ? [{ name: 'Retorno Vazio', value: result.returnCost, color: '#f97316' }] : []),
  ].filter(d => d.value > 0);

  const ViabilityIcon = result.viabilityScore === 'high' 
    ? CheckCircle 
    : result.viabilityScore === 'medium' 
      ? AlertTriangle 
      : XCircle;

  const viabilityColors = {
    high: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
    medium: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
    low: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  };

  const colors = viabilityColors[result.viabilityScore];


  // Build WhatsApp share message
  const handleShareWhatsApp = () => {
    const origin = result.originCity || result.geocodedPoints?.[0]?.address || 'Origem';
    const destination = result.destinationCity || result.geocodedPoints?.[result.geocodedPoints.length - 1]?.address || 'Destino';
    
    const viabilityEmoji = result.viabilityScore === 'high' ? '✅' : result.viabilityScore === 'medium' ? '⚠️' : '❌';
    const viabilityText = result.viabilityScore === 'high' ? 'ALTA' : result.viabilityScore === 'medium' ? 'MÉDIA' : 'BAIXA';

    const message = `🚚 *ANÁLISE DE FRETE - FreteCerto*

📍 *Rota:* ${origin} → ${destination}
📏 *Distância:* ${result.totalDistanceKm.toLocaleString('pt-BR')} km
⏱️ *Duração:* ${result.totalDurationDays} dia(s) (${result.totalDurationHours.toFixed(1)}h)

💰 *VALORES:*
• Frete: ${formatCurrency(result.totalFreightIncome)}
• Combustível: ${formatCurrency(result.estimatedFuelCost)}
• Pedágios: ${formatCurrency(result.estimatedTollCost)}
• Comissão: ${formatCurrency(result.driverCommissionCost)}
• Manutenção: ${formatCurrency(result.estimatedMaintenanceCost)}
${result.returnCost ? `• Retorno Vazio: ${formatCurrency(result.returnCost)}` : ''}

${viabilityEmoji} *Viabilidade:* ${viabilityText}
💵 *Lucro Líquido:* ${formatCurrency(result.netProfit)}

${result.aiAnalysis?.marketAnalysis ? `📊 *Análise de Mercado:* ${result.aiAnalysis.marketAnalysis}` : ''}

_Calculado com FreteCerto - Seu frete mais lucrativo!_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp para compartilhar...');
  };

  const handleExportDriverPdf = () => {
    exportDriverRoutePdf({
      vehicle: {
        driverName: undefined,
        licensePlate: undefined,
        axles: result.vehicleRestrictions?.axles,
      },
      originCity: result.originCity,
      destinationCity: result.destinationCity,
      geocodedPoints: result.geocodedPoints,
      waypoints: driverWaypoints,
      totalDistanceKm: result.totalDistanceKm,
      totalDurationHours: result.totalDurationHours,
      totalDurationDays: result.totalDurationDays,
      estimatedFuelCost: result.estimatedFuelCost,
      estimatedTollCost: result.estimatedTollCost,
      driverCommissionCost: result.driverCommissionCost,
      estimatedMaintenanceCost: result.estimatedMaintenanceCost,
      estimatedFixedCost: result.estimatedFixedCost,
      returnCost: result.returnCost,
      totalFreightIncome: result.totalFreightIncome,
      netProfit: result.netProfit,
      viabilityScore: result.viabilityScore,
      viabilityMessage: result.viabilityMessage,
      aiAnalysis: result.aiAnalysis,
      vehicleRestrictions: result.vehicleRestrictions,
    });
    toast.success('PDF do roteiro gerado');
  };

  const handleMapChange = (pts: ExportPoint[], wps: ExportPoint[]) => {
    setDriverWaypoints(wps);
    onRecalculateRoute?.(pts, wps);
  };

  

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Viability Card */}
        <div className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-6`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center`}>
              <ViabilityIcon size={40} className={colors.text} />
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-bold ${colors.text}`}>
                {result.viabilityScore === 'high' ? 'Viagem Viável!' : 
                 result.viabilityScore === 'medium' ? 'Viabilidade Média' : 'Atenção: Baixa Viabilidade'}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {result.viabilityMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Vehicle Restrictions Warning */}
        {result.vehicleRestrictions?.warnings && result.vehicleRestrictions.warnings.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
              <Truck size={18} />
              Restrições do Veículo ({result.vehicleRestrictions.axles} eixos)
            </h3>
            <ul className="space-y-2">
              {result.vehicleRestrictions.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-orange-700 flex items-start gap-2">
                  {warning}
                </li>
              ))}
            </ul>
            {result.vehicleRestrictions.avoidedRoads.length > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-xs text-orange-600">
                  🛣️ Trechos considerados: {result.vehicleRestrictions.avoidedRoads.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Interactive Route Map (Leaflet + HERE) */}
        {result.geocodedPoints && result.geocodedPoints.length >= 2 && (
          <div className="space-y-3">
            <RouteMap
              coordinates={result.routeCoordinates || []}
              points={result.geocodedPoints.map((p) => ({ address: p.address, lat: p.lat, lng: p.lng }))}
              onPointsChange={handleMapChange}
              loading={recalculating}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const base = result.geocodedPoints!.map((p) => ({ address: p.address, lat: p.lat, lng: p.lng }));
                  if (base.length < 2) { toast.error('Rota incompleta.'); return; }
                  const full: ExportPoint[] = [base[0], ...base.slice(1, -1), ...driverWaypoints, base[base.length - 1]];
                  const gmapsUrl = buildGoogleMapsUrlFromRoute(full, result.routeCoordinates);
                  window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
                  toast.success('Abrindo Google Maps travado na rota do caminhão…');
                }}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg active:scale-[0.98] transition"
              >
                <Navigation size={18} />
                Navegar (Google Maps)
              </button>
              <button
                onClick={() => {
                  const base = result.geocodedPoints!.map((p) => ({ address: p.address, lat: p.lat, lng: p.lng }));
                  if (base.length < 2) { toast.error('Rota incompleta.'); return; }
                  const full: ExportPoint[] = [base[0], ...base.slice(1, -1), ...driverWaypoints, base[base.length - 1]];
                  window.open(buildHereWeGoTruckUrl(full), '_blank', 'noopener,noreferrer');
                  toast.success('Abrindo HERE WeGo (modo caminhão)…');
                }}
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-lg active:scale-[0.98] transition"
              >
                <Truck size={18} />
                Navegar (HERE Caminhão)
              </button>
            </div>
            <button
              onClick={() => {
                const base = result.geocodedPoints!.map((p) => ({ address: p.address, lat: p.lat, lng: p.lng }));
                if (base.length < 2) { toast.error('Rota incompleta.'); return; }
                const full: ExportPoint[] = [base[0], ...base.slice(1, -1), ...driverWaypoints, base[base.length - 1]];
                const coords = result.routeCoordinates && result.routeCoordinates.length > 1
                  ? result.routeCoordinates
                  : full.map((p) => [p.lat, p.lng] as [number, number]);
                const gpx = toGPX(coords, full);
                const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
                download(`rota-fretecerto-${stamp}.gpx`, 'application/gpx+xml', gpx);
                toast.success('GPX baixado. Importe no HERE WeGo (Coleções → Importar) ou em outro app de navegação.');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white border-2 border-emerald-500 text-emerald-700 font-bold shadow-sm hover:bg-emerald-50 active:scale-[0.98] transition"
            >
              <FileDown size={18} />
              Baixar rota em GPX (HERE WeGo / outros)
            </button>
            <button
              onClick={() => {
                const base = result.geocodedPoints!.map((p) => ({ address: p.address, lat: p.lat, lng: p.lng }));
                if (base.length < 2) { toast.error('Rota incompleta.'); return; }
                const origin = base[0];
                const destination = base[base.length - 1];
                const middle = base.slice(1, -1);
                const full: ExportPoint[] = [origin, ...middle, ...driverWaypoints, destination];
                const gmapsUrl = buildGoogleMapsUrlFromRoute(full, result.routeCoordinates);
                const hereUrl = buildHereWeGoTruckUrl(full);
                const distancia = result.totalDistanceKm.toLocaleString('pt-BR');
                const paradas = full
                  .map((p, i) => {
                    const tipo = i === 0 ? '📍 Origem' : i === full.length - 1 ? '🏁 Destino' : `➡️ Parada ${i}`;
                    return `${tipo}: ${p.address}`;
                  })
                  .join('\n');
                const msg =
                  `🚚 *Rota pronta para navegação*\n\n${paradas}\n\n` +
                  `📏 Distância total: ${distancia} km\n\n` +
                  `🗺️ *Google Maps* (travado na rota do caminhão):\n${gmapsUrl}\n\n` +
                  `🚛 *HERE WeGo* (modo caminhão, respeita restrições):\n${hereUrl}`;
                const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                window.open(waUrl, '_blank', 'noopener,noreferrer');
                toast.success('Abrindo WhatsApp com os links da rota…');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition"
            >
              <MessageCircle size={18} />
              Compartilhar rota no WhatsApp
            </button>

          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-4">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] mb-2">
              <MapPin size={16} />
              <span className="text-sm">Distância</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {result.totalDistanceKm.toLocaleString('pt-BR')} km
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-4">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] mb-2">
              <Clock size={16} />
              <span className="text-sm">Duração</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {result.totalDurationDays} dia(s)
            </p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {result.totalDurationHours.toFixed(1)} horas de viagem
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-4">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] mb-2">
              <DollarSign size={16} />
              <span className="text-sm">Receita Bruta</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(result.totalFreightIncome)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-4">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] mb-2">
              <TrendingUp size={16} />
              <span className="text-sm">Lucro Líquido</span>
            </div>
            <p className={`text-2xl font-bold ${result.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(result.netProfit)}
            </p>
          </div>
        </div>

        {/* AI Road Restrictions */}
        {result.aiAnalysis?.roadRestrictions && result.aiAnalysis.roadRestrictions.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
              <Truck size={18} />
              Restrições Identificadas pela IA
            </h3>
            <ul className="space-y-3">
              {result.aiAnalysis.roadRestrictions.map((restriction, index) => (
                <li key={index} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 ${
                      restriction.severity === 'critical' ? 'text-red-600' : 
                      restriction.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      {restriction.severity === 'critical' ? '🚫' : 
                       restriction.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div>
                      <p className="font-semibold text-orange-800">{restriction.road}</p>
                      <p className="text-orange-700">{restriction.reason}</p>
                      {restriction.alternative && (
                        <p className="text-orange-600 mt-1 text-xs">
                          ➡️ Alternativa: {restriction.alternative}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Analysis - Alerts */}
        {result.aiAnalysis?.alerts && result.aiAnalysis.alerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
              <AlertCircle size={18} />
              Alertas
            </h3>
            <ul className="space-y-2">
              {result.aiAnalysis.alerts.map((alert, index) => (
                <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Analysis - Optimization Tips */}
        {result.aiAnalysis?.optimizationTips && result.aiAnalysis.optimizationTips.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
              <Lightbulb size={18} />
              Dicas de Otimização
            </h3>
            <ul className="space-y-2">
              {result.aiAnalysis.optimizationTips.map((tip, index) => (
                <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-500 mt-1">💡</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Analysis - Market Analysis */}
        {result.aiAnalysis?.marketAnalysis && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <Target size={18} />
              Análise de Mercado
            </h3>
            <p className="text-sm text-blue-700">{result.aiAnalysis.marketAnalysis}</p>
            {result.aiAnalysis.suggestedFreightValue && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm text-blue-600">
                  💰 Valor sugerido para este frete: <span className="font-bold">{formatCurrency(result.aiAnalysis.suggestedFreightValue)}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cost Breakdown Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6">
          <h3 className="font-bold text-[hsl(var(--foreground))] mb-4">Composição dos Custos</h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 24px rgba(0,0,0,0.1)' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-[hsl(var(--muted-foreground))]">{item.name}</span>
                <span className="text-sm font-medium text-[hsl(var(--foreground))] ml-auto">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <h3 className="font-bold text-[hsl(var(--foreground))]">Detalhamento</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <Fuel size={16} className="text-blue-500" />
                <span className="text-[hsl(var(--muted-foreground))]">Combustível</span>
              </div>
              <span className="font-medium">{formatCurrency(result.estimatedFuelCost)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Pedágios</span>
              <span className="font-medium">{formatCurrency(result.estimatedTollCost)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Comissão Motorista</span>
              <span className="font-medium">{formatCurrency(result.driverCommissionCost)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Manutenção (por km)</span>
              <span className="font-medium">{formatCurrency(result.estimatedMaintenanceCost)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
              <span className="text-[hsl(var(--muted-foreground))]">Custos Fixos (por dia)</span>
              <span className="font-medium">{formatCurrency(result.estimatedFixedCost || 0)}</span>
            </div>
            {result.estimatedArdaCost && result.estimatedArdaCost > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">ARDA (Lei 13.103)</span>
                <span className="font-medium text-purple-600">{formatCurrency(result.estimatedArdaCost)}</span>
              </div>
            )}
            {result.returnCost && (
              <div className="flex justify-between items-center py-2 border-b border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Retorno Vazio</span>
                <span className="font-medium text-amber-600">{formatCurrency(result.returnCost)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Cost Breakdown - Daily Costs */}
        {result.costBreakdown && (
          <>
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-blue-800">📅 Custos por DIA (Anexados na Placa)</h3>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(result.costBreakdown.dailyCosts.total)}/dia</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.costBreakdown.dailyCosts.insurance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">Seguro</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.dailyCosts.insurance)}</span>
                  </div>
                )}
                {result.costBreakdown.dailyCosts.registration > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">IPVA/Licenc.</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.dailyCosts.registration)}</span>
                  </div>
                )}
                {result.costBreakdown.dailyCosts.depreciation > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">Depreciação</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.dailyCosts.depreciation)}</span>
                  </div>
                )}
                {result.costBreakdown.dailyCosts.salary > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">Salário</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.dailyCosts.salary)}</span>
                  </div>
                )}
                {result.costBreakdown.dailyCosts.parking > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">Estacionam.</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.dailyCosts.parking)}</span>
                  </div>
                )}
                {result.costBreakdown.dailyCosts.tracking > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-600">Rastreador</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.dailyCosts.tracking)}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-600">
                  Total para {result.totalDurationDays} dia(s): <span className="font-bold">{formatCurrency(result.costBreakdown.dailyCosts.total * result.totalDurationDays)}</span>
                </p>
              </div>
            </div>

            {/* Per KM Costs */}
            <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-orange-800">🛣️ Custos por KM (Resumo da Viagem)</h3>
                <span className="text-lg font-bold text-orange-700">{formatCurrency(result.costBreakdown.perKmCosts.total)}/km</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {result.costBreakdown.perKmCosts.fuel > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-600">Combustível</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.perKmCosts.fuel)}</span>
                  </div>
                )}
                {result.costBreakdown.perKmCosts.tires > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-600">Pneus</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.perKmCosts.tires)}</span>
                  </div>
                )}
                {result.costBreakdown.perKmCosts.oil > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-600">Óleo Motor</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.perKmCosts.oil)}</span>
                  </div>
                )}
                {result.costBreakdown.perKmCosts.filters > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-600">Filtros</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.perKmCosts.filters)}</span>
                  </div>
                )}
                {result.costBreakdown.perKmCosts.grease > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-600">Graxa</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.perKmCosts.grease)}</span>
                  </div>
                )}
                {result.costBreakdown.perKmCosts.washing > 0 && (
                  <div className="flex justify-between">
                    <span className="text-orange-600">Lavagem</span>
                    <span className="font-medium">{formatCurrency(result.costBreakdown.perKmCosts.washing)}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-orange-200">
                <p className="text-xs text-orange-600">
                  Total para {result.totalDistanceKm.toLocaleString('pt-BR')} km: <span className="font-bold">{formatCurrency(result.costBreakdown.perKmCosts.total * result.totalDistanceKm)}</span>
                </p>
              </div>
            </div>
          </>
        )}

        {/* Routing Engine Info */}
        {result.routingEngine && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm text-emerald-700">
              🛰️ Rota calculada via <span className="font-bold">{result.routingEngine === 'here' ? 'HERE Maps' : result.routingEngine === 'tomtom' ? 'TomTom Truck Routing' : 'Google Maps'}</span>
              {(result.routingEngine === 'here' || result.routingEngine === 'tomtom') && ' (otimizada para caminhões)'}
            </p>
          </div>
        )}

        {/* Suggestions */}
        {result.routeSuggestions && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
            <h3 className="font-bold text-violet-800 mb-2">✨ Resumo da IA</h3>
            <p className="text-sm text-violet-700">{result.routeSuggestions}</p>
          </div>
        )}

        {/* Export Driver Route PDF */}
        <button
          onClick={handleExportDriverPdf}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold shadow-lg transition-all active:scale-[0.98]"
        >
          <FileDown size={20} />
          Exportar Roteiro para Motorista (PDF)
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--border))] p-4 z-50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={handleShareWhatsApp}
            className="w-14 h-14 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-[0.98]"
            title="Compartilhar no WhatsApp"
          >
            <MessageCircle size={24} />
          </button>
          <button
            onClick={handleExportDriverPdf}
            className="w-14 h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-[0.98]"
            title="Exportar PDF para motorista"
          >
            <FileDown size={22} />
          </button>
          <button
            onClick={onReset}
            className="flex-1 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            <RefreshCw size={20} />
            Nova Simulação
          </button>
        </div>
      </div>

    </div>
  );
};

export default DashboardScreen;
