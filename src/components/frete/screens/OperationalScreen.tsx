import React from 'react';
import { Settings, Fuel, Clock, Package, Percent, ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react';

interface OperationalScreenProps {
  data: {
    fuelConsumption: number;
    fuelPrice: number;
    drivingHoursPerDay: number;
    axles: number;
    cargoCapacity: number;
    driverCommissionPercentage: number;
  };
  onUpdate: (field: string, value: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const OperationalScreen: React.FC<OperationalScreenProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
}) => {
  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    onUpdate(field, numValue);
  };

  const axleOptions = [
    { value: 2, label: '2' },
    { value: 3, label: '3' },
    { value: 4, label: '4' },
    { value: 5, label: '5' },
    { value: 6, label: '6' },
    { value: 7, label: '7' },
    { value: 9, label: '9' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header Card */}
        <div className="bg-[hsl(var(--primary))] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Operacional</h1>
              <p className="text-sm text-white/70">INFORMAÇÕES • 2/6 • ETAPAS</p>
            </div>
          </div>
        </div>

        {/* Combustível & Tempo */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-5">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Fuel size={18} />
            <span className="font-medium">Combustível & Tempo</span>
          </div>

          {/* Consumo Médio */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Consumo Médio (km/L)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={data.fuelConsumption || ''}
                onChange={(e) => handleInputChange('fuelConsumption', e.target.value)}
                placeholder="Ex: 2.5"
                className="w-full px-4 py-4 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[hsl(var(--muted-foreground))]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Preço do Diesel */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Preço do Diesel (R$/L)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] font-bold">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={data.fuelPrice || ''}
                onChange={(e) => handleInputChange('fuelPrice', e.target.value)}
                placeholder="6,50"
                className="w-full pl-12 pr-4 py-4 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Jornada de Trabalho */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-5">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Clock size={18} />
            <span className="font-medium">Jornada de Trabalho</span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Horas Rodadas por Dia
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onUpdate('drivingHoursPerDay', Math.max(1, data.drivingHoursPerDay - 1))}
                className="w-12 h-12 rounded-xl border-2 border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--secondary))] transition-colors"
              >
                <Minus size={20} />
              </button>
              <input
                type="text"
                value={data.drivingHoursPerDay}
                onChange={(e) => handleInputChange('drivingHoursPerDay', e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-center text-lg font-bold"
              />
              <button
                onClick={() => onUpdate('drivingHoursPerDay', Math.min(24, data.drivingHoursPerDay + 1))}
                className="w-12 h-12 rounded-xl border-2 border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--secondary))] transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Número de Eixos */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Número de Eixos
            </label>
            <div className="flex gap-2 flex-wrap">
              {axleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate('axles', opt.value)}
                  className={`w-12 h-12 rounded-xl font-bold text-lg transition-all ${
                    data.axles === opt.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] hover:bg-blue-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Capacidade de Carga */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-5">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Package size={18} />
            <span className="font-medium">Capacidade de Carga</span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Carga (Toneladas)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] font-bold">Ton.</span>
              <input
                type="text"
                inputMode="decimal"
                value={data.cargoCapacity || ''}
                onChange={(e) => handleInputChange('cargoCapacity', e.target.value)}
                placeholder="32"
                className="w-full pl-14 pr-4 py-4 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Comissão */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-5">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Percent size={18} />
            <span className="font-medium">Comissão</span>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Comissão do Motorista (%)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={data.driverCommissionPercentage || ''}
                onChange={(e) => handleInputChange('driverCommissionPercentage', e.target.value)}
                placeholder="10"
                className="w-full px-4 py-4 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] font-bold">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--border))] p-4 z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button
            onClick={onBack}
            className="w-14 h-14 rounded-xl border-2 border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--secondary))] transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            Definir Rota <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationalScreen;
