import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, MapPin, Fuel, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SimulationResult {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalDurationDays: number;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  driverCommissionCost: number;
  estimatedMaintenanceCost: number;
  estimatedFixedCost?: number;
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  routeSuggestions?: string;
}

interface DashboardScreenProps {
  result: SimulationResult;
  onReset: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ result, onReset }) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

  const chartData = [
    { name: 'Combustível', value: result.estimatedFuelCost, color: '#3b82f6' },
    { name: 'Pedágio', value: result.estimatedTollCost, color: '#f59e0b' },
    { name: 'Comissão', value: result.driverCommissionCost, color: '#10b981' },
    { name: 'Manutenção', value: result.estimatedMaintenanceCost, color: '#8b5cf6' },
    { name: 'Custos Fixos', value: result.estimatedFixedCost || 0, color: '#ec4899' },
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
              <span className="text-[hsl(var(--muted-foreground))]">Manutenção</span>
              <span className="font-medium">{formatCurrency(result.estimatedMaintenanceCost)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[hsl(var(--muted-foreground))]">Custos Fixos</span>
              <span className="font-medium">{formatCurrency(result.estimatedFixedCost || 0)}</span>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {result.routeSuggestions && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-800 mb-2">💡 Sugestões</h3>
            <p className="text-sm text-blue-700">{result.routeSuggestions}</p>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--border))] p-4 z-50">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onReset}
            className="w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
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
