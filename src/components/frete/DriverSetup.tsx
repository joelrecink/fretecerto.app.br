import React, { useState, useEffect } from 'react';
import { VehicleData, SavedVehicle } from '@/types';
import { Truck, User, ArrowRight, Gauge, Save, Check, Car, AlertCircle } from 'lucide-react';
import SpeechInput from './SpeechInput';

interface DriverSetupProps {
  data: VehicleData;
  onUpdate: (data: VehicleData) => void;
  onNext: () => void;
  onLogin?: () => void;
}

const safeFloat = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  const numVal = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(numVal) ? 0 : numVal;
};

const DriverSetup: React.FC<DriverSetupProps> = ({ data, onUpdate, onNext, onLogin }) => {
  const [plateError, setPlateError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof VehicleData, value: string | number) => {
    if (field === 'licensePlate') setPlateError(false);
    
    if (typeof value === 'string') {
      let clean = value.trim();
      if (clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      }
      const numValue = parseFloat(clean);
      if (!isNaN(numValue)) {
        onUpdate({ ...data, [field]: numValue });
        return;
      }
    }
    onUpdate({ ...data, [field]: value });
  };

  const axleOptions = [
    { value: 2, label: '2 Eixos', description: 'Toco / 3/4' },
    { value: 3, label: '3 Eixos', description: 'Truck' },
    { value: 4, label: '4 Eixos', description: 'Bi-Truck' },
    { value: 5, label: '5 Eixos', description: 'Carreta' },
    { value: 6, label: '6 Eixos', description: 'Carreta LS' },
    { value: 7, label: '7 Eixos', description: 'Bi-Trem' },
    { value: 9, label: '9 Eixos', description: 'Rodotrem' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-fade-in">
      
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 text-white shadow-xl mb-4">
          <Truck size={40} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Configurar Veículo
        </h1>
        <p className="text-slate-500 text-lg">
          Dados básicos do seu caminhão para cálculo preciso
        </p>
      </div>

      {/* Driver Name */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-xl">
            <User size={20} className="text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Identificação</h2>
        </div>
        
        <SpeechInput
          label="Nome do Motorista"
          value={data.driverName}
          onChange={(v) => handleChange('driverName', v)}
          placeholder="Ex: João Silva"
        />
        
        <div className="mt-4">
          <SpeechInput
            label="Placa do Veículo"
            value={data.licensePlate || ''}
            onChange={(v) => handleChange('licensePlate', v.toUpperCase())}
            placeholder="ABC-1234"
            className={plateError ? 'ring-2 ring-red-500' : ''}
          />
          {plateError && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm font-medium">
              <AlertCircle size={14} />
              Placa obrigatória para salvar veículo
            </div>
          )}
        </div>
      </section>

      {/* Axles Selection */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-amber-100 p-2 rounded-xl">
            <Car size={20} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Tipo de Veículo</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {axleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ ...data, axles: opt.value })}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                data.axles === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="font-bold text-lg">{opt.label}</div>
              <div className="text-xs opacity-70">{opt.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Cargo & Fuel */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-xl">
            <Gauge size={20} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Capacidade e Consumo</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <SpeechInput
            label="Capacidade de Carga (Toneladas)"
            type="number"
            value={data.cargoCapacity}
            onChange={(v) => handleChange('cargoCapacity', v)}
            placeholder="Ex: 32"
          />
          
          <SpeechInput
            label="Consumo Médio (km/L)"
            type="number"
            value={data.fuelConsumption}
            onChange={(v) => handleChange('fuelConsumption', v)}
            placeholder="Ex: 2.5"
          />
          
          <SpeechInput
            label="Preço do Diesel (R$/L)"
            type="number"
            prefix="R$"
            value={data.fuelPrice}
            onChange={(v) => handleChange('fuelPrice', v)}
            placeholder="Ex: 6,50"
          />
          
          <SpeechInput
            label="Comissão do Motorista (%)"
            type="number"
            value={data.driverCommissionPercentage}
            onChange={(v) => handleChange('driverCommissionPercentage', v)}
            placeholder="Ex: 10"
          />
        </div>
      </section>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-3xl mx-auto flex gap-4 p-4">
          <button
            onClick={onNext}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            Continuar <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverSetup;
