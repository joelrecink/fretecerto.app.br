import React from 'react';
import { VehicleData } from '@/types';
import { Settings, ArrowRight, ArrowLeft, Droplet, Filter, Gauge } from 'lucide-react';
import SpeechInput from './SpeechInput';

interface VehicleSetupProps {
  data: VehicleData;
  onUpdate: (data: VehicleData) => void;
  onNext: () => void;
  onBack: () => void;
  onLogin?: () => void;
}

const VehicleSetup: React.FC<VehicleSetupProps> = ({ data, onUpdate, onNext, onBack }) => {
  
  const handleChange = (field: keyof VehicleData, value: string) => {
    let clean = value.trim();
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    const numValue = parseFloat(clean);
    onUpdate({ ...data, [field]: isNaN(numValue) ? 0 : numValue });
  };

  const handleDateChange = (field: keyof VehicleData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-fade-in">
      
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-600 text-white shadow-xl mb-4">
          <Settings size={40} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Manutenção do Veículo
        </h1>
        <p className="text-slate-500 text-lg">
          Registre os últimos serviços para cálculo preciso
        </p>
      </div>

      {/* Odometer */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-slate-100 p-2 rounded-xl">
            <Gauge size={20} className="text-slate-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Hodômetro Atual</h2>
        </div>
        
        <SpeechInput
          label="Quilometragem Atual (km)"
          type="number"
          value={data.currentOdometer || ''}
          onChange={(v) => handleChange('currentOdometer', v)}
          placeholder="Ex: 350.000"
        />
      </section>

      {/* Engine Oil */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 p-2 rounded-xl">
            <Droplet size={20} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Óleo do Motor (Cárter)</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <SpeechInput
            label="Custo da Troca (R$)"
            type="number"
            prefix="R$"
            value={data.lastOilChangeCost || ''}
            onChange={(v) => handleChange('lastOilChangeCost', v)}
            placeholder="Ex: 1.500"
          />
          
          <SpeechInput
            label="Intervalo de Troca (km)"
            type="number"
            value={data.oilChangeIntervalKm || ''}
            onChange={(v) => handleChange('oilChangeIntervalKm', v)}
            placeholder="Ex: 20.000"
          />
          
          <SpeechInput
            label="Última Troca (km)"
            type="number"
            value={data.lastOilChangeKm || ''}
            onChange={(v) => handleChange('lastOilChangeKm', v)}
            placeholder="Ex: 340.000"
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wide">
              Data da Última Troca
            </label>
            <input
              type="date"
              value={data.lastOilChangeDate || ''}
              onChange={(e) => handleDateChange('lastOilChangeDate', e.target.value)}
              className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-teal-100 p-2 rounded-xl">
            <Filter size={20} className="text-teal-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Kit de Filtros</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <SpeechInput
            label="Custo do Kit (R$)"
            type="number"
            prefix="R$"
            value={data.lastFilterChangeCost || ''}
            onChange={(v) => handleChange('lastFilterChangeCost', v)}
            placeholder="Ex: 800"
          />
          
          <SpeechInput
            label="Intervalo de Troca (km)"
            type="number"
            value={data.filterChangeIntervalKm || ''}
            onChange={(v) => handleChange('filterChangeIntervalKm', v)}
            placeholder="Ex: 20.000"
          />
          
          <SpeechInput
            label="Última Troca (km)"
            type="number"
            value={data.lastFilterChangeKm || ''}
            onChange={(v) => handleChange('lastFilterChangeKm', v)}
            placeholder="Ex: 340.000"
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wide">
              Data da Última Troca
            </label>
            <input
              type="date"
              value={data.lastFilterChangeDate || ''}
              onChange={(e) => handleDateChange('lastFilterChangeDate', e.target.value)}
              className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-3xl mx-auto flex gap-4 p-4">
          <button
            onClick={onBack}
            className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 transition-colors flex items-center justify-center"
          >
            <ArrowLeft size={24} />
          </button>
          
          <button
            onClick={onNext}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            Definir Rota <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleSetup;
