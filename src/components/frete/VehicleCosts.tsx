import React from 'react';
import { VehicleData } from '@/types';
import { DollarSign, ArrowRight, ArrowLeft, Wallet, CircleDashed } from 'lucide-react';
import SpeechInput from './SpeechInput';

interface VehicleCostsProps {
  data: VehicleData;
  onUpdate: (data: VehicleData) => void;
  onNext: () => void;
  onBack: () => void;
  onLogin?: () => void;
}

const safeFloat = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  const numVal = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(numVal) ? 0 : numVal;
};

const VehicleCosts: React.FC<VehicleCostsProps> = ({ data, onUpdate, onNext, onBack }) => {
  
  const handleChange = (field: keyof VehicleData, value: string) => {
    let clean = value.trim();
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    const numValue = parseFloat(clean);
    onUpdate({ ...data, [field]: isNaN(numValue) ? 0 : numValue });
  };

  // Calculate tire cost per km
  const priceNew = safeFloat(data.refTirePriceNew);
  const lifeNew = safeFloat(data.refTireLifespanNew) || 1;
  const priceRemold = safeFloat(data.refTirePriceRemold);
  const lifeRemold = safeFloat(data.refTireLifespanRemold) || 1;
  
  const totalNewQty = safeFloat(data.tireSteerQtyNew) + safeFloat(data.tireDriveQtyNew) + safeFloat(data.tireTrailerQtyNew);
  const totalRemoldQty = safeFloat(data.tireSteerQtyRemold) + safeFloat(data.tireDriveQtyRemold) + safeFloat(data.tireTrailerQtyRemold);
  
  const tireCostPerKm = 
    (totalNewQty * priceNew / lifeNew) + 
    (totalRemoldQty * priceRemold / lifeRemold);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-fade-in">
      
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-600 text-white shadow-xl mb-4">
          <DollarSign size={40} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Custos do Veículo
        </h1>
        <p className="text-slate-500 text-lg">
          Informe os custos fixos e variáveis
        </p>
      </div>

      {/* Fixed Costs */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <Wallet size={20} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Custos Fixos (Anuais/Mensais)</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <SpeechInput
            label="Salário Mensal (R$)"
            type="number"
            prefix="R$"
            value={data.driverSalaryMonthly || ''}
            onChange={(v) => handleChange('driverSalaryMonthly', v)}
            placeholder="Ex: 3.500"
          />
          
          <SpeechInput
            label="Seguro Anual (R$)"
            type="number"
            prefix="R$"
            value={data.insuranceYearly || ''}
            onChange={(v) => handleChange('insuranceYearly', v)}
            placeholder="Ex: 15.000"
          />
          
          <SpeechInput
            label="IPVA/Licenciamento Anual (R$)"
            type="number"
            prefix="R$"
            value={data.registrationYearly || ''}
            onChange={(v) => handleChange('registrationYearly', v)}
            placeholder="Ex: 5.000"
          />
          
          <SpeechInput
            label="Valor do Veículo (R$)"
            type="number"
            prefix="R$"
            value={data.assetValue || ''}
            onChange={(v) => handleChange('assetValue', v)}
            placeholder="Ex: 500.000"
          />
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            id="include13th"
            checked={data.driverSalaryInclude13th || false}
            onChange={(e) => onUpdate({ ...data, driverSalaryInclude13th: e.target.checked })}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="include13th" className="text-sm font-medium text-slate-700">
            Provisionar 13º salário no cálculo
          </label>
        </div>
      </section>

      {/* Tire Costs */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 p-2 rounded-xl">
            <CircleDashed size={20} className="text-orange-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Pneus - Preços de Referência</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-600 uppercase mb-3">Pneus Novos</p>
            <SpeechInput
              label="Preço Unitário (R$)"
              type="number"
              prefix="R$"
              value={data.refTirePriceNew || ''}
              onChange={(v) => handleChange('refTirePriceNew', v)}
              placeholder="Ex: 3.500"
            />
            <div className="mt-3">
              <SpeechInput
                label="Vida Útil (km)"
                type="number"
                value={data.refTireLifespanNew || ''}
                onChange={(v) => handleChange('refTireLifespanNew', v)}
                placeholder="Ex: 100.000"
              />
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <p className="text-xs font-bold text-orange-600 uppercase mb-3">Pneus Remold</p>
            <SpeechInput
              label="Preço Unitário (R$)"
              type="number"
              prefix="R$"
              value={data.refTirePriceRemold || ''}
              onChange={(v) => handleChange('refTirePriceRemold', v)}
              placeholder="Ex: 1.800"
            />
            <div className="mt-3">
              <SpeechInput
                label="Vida Útil (km)"
                type="number"
                value={data.refTireLifespanRemold || ''}
                onChange={(v) => handleChange('refTireLifespanRemold', v)}
                placeholder="Ex: 60.000"
              />
            </div>
          </div>
        </div>
        
        {/* Tire Quantities */}
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-xs font-bold text-slate-600 uppercase mb-3">Direcional</p>
            <div className="grid grid-cols-2 gap-2">
              <SpeechInput label="Novos" type="number" value={data.tireSteerQtyNew || ''} onChange={(v) => handleChange('tireSteerQtyNew', v)} placeholder="0" />
              <SpeechInput label="Remold" type="number" value={data.tireSteerQtyRemold || ''} onChange={(v) => handleChange('tireSteerQtyRemold', v)} placeholder="0" />
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-xs font-bold text-slate-600 uppercase mb-3">Tração</p>
            <div className="grid grid-cols-2 gap-2">
              <SpeechInput label="Novos" type="number" value={data.tireDriveQtyNew || ''} onChange={(v) => handleChange('tireDriveQtyNew', v)} placeholder="0" />
              <SpeechInput label="Remold" type="number" value={data.tireDriveQtyRemold || ''} onChange={(v) => handleChange('tireDriveQtyRemold', v)} placeholder="0" />
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-xs font-bold text-slate-600 uppercase mb-3">Carreta</p>
            <div className="grid grid-cols-2 gap-2">
              <SpeechInput label="Novos" type="number" value={data.tireTrailerQtyNew || ''} onChange={(v) => handleChange('tireTrailerQtyNew', v)} placeholder="0" />
              <SpeechInput label="Remold" type="number" value={data.tireTrailerQtyRemold || ''} onChange={(v) => handleChange('tireTrailerQtyRemold', v)} placeholder="0" />
            </div>
          </div>
        </div>
        
        {/* Cost Summary */}
        <div className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="font-bold">Custo de Pneus por Km</span>
            <span className="text-2xl font-black">R$ {tireCostPerKm.toFixed(4)}</span>
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
            Continuar <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleCosts;
