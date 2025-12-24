import React, { useState, useEffect } from 'react';
import { SimulationResult, RouteData, VehicleData } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Map, Truck, DollarSign } from 'lucide-react';

interface DashboardProps {
  result: SimulationResult;
  route: RouteData;
  vehicle: VehicleData;
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ result, route, vehicle, onReset }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const data = [
    { name: 'Combustível', value: result.estimatedFuelCost, color: '#EF4444' },
    { name: 'Pedágios', value: result.estimatedTollCost, color: '#F59E0B' },
    { name: 'Comissão', value: result.driverCommissionCost, color: '#8B5CF6' },
    { name: 'Manutenção', value: result.estimatedMaintenanceCost, color: '#F97316' },
    { name: 'Custos Fixos', value: result.estimatedFixedCost || 0, color: '#6366F1' },
  ];

  if (result.netProfit > 0) {
    data.push({ name: 'Lucro Líquido', value: result.netProfit, color: '#10B981' });
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className={`rounded-3xl p-8 text-white shadow-2xl ${
        result.viabilityScore === 'high' ? 'bg-gradient-to-br from-emerald-600 to-teal-800' :
        result.viabilityScore === 'medium' ? 'bg-gradient-to-br from-amber-500 to-orange-700' :
        'bg-gradient-to-br from-red-600 to-rose-800'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          {result.viabilityScore === 'high' ? <CheckCircle className="w-10 h-10"/> :
           result.viabilityScore === 'medium' ? <AlertTriangle className="w-10 h-10"/> :
           <XCircle className="w-10 h-10"/>}
          <h2 className="text-3xl font-extrabold">
            {result.viabilityScore === 'high' ? 'Alta Viabilidade' :
             result.viabilityScore === 'medium' ? 'Viabilidade Média' : 'Baixa Viabilidade'}
          </h2>
        </div>
        <p className="text-lg opacity-90">{result.viabilityMessage}</p>
        
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <p className="text-sm opacity-80">Distância</p>
            <p className="text-2xl font-bold">{result.totalDistanceKm.toFixed(0)} km</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <p className="text-sm opacity-80">Duração</p>
            <p className="text-2xl font-bold">{result.totalDurationDays} dias</p>
            <p className="text-xs opacity-70">{result.totalDurationHours.toFixed(1)}h de viagem</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <p className="text-sm opacity-80">Frete</p>
            <p className="text-2xl font-bold">{formatCurrency(result.totalFreightIncome)}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <p className="text-sm opacity-80">Lucro Líquido</p>
            <p className={`text-2xl font-bold ${result.netProfit < 0 ? 'text-red-200' : ''}`}>
              {formatCurrency(result.netProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <DollarSign size={24} className="text-blue-600" />
          Composição de Custos
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-slate-600">{item.name}: {formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      {result.routeSuggestions && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Map size={24} className="text-green-600" />
            Sugestões da Rota
          </h3>
          <p className="text-slate-600">{result.routeSuggestions}</p>
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg transition-all"
      >
        <RefreshCw size={24} /> Nova Simulação
      </button>
    </div>
  );
};

export default Dashboard;
