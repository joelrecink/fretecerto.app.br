import React from 'react';
import { RouteData, VehicleData } from '@/types';
import { MapPin, Truck, Plus, Trash2, ArrowRight, ArrowLeft, FileCheck, Scale, AlertTriangle } from 'lucide-react';
import SpeechInput from './SpeechInput';

interface RoutePlannerProps {
  step: 'pickup' | 'delivery';
  data: RouteData;
  vehicle: VehicleData;
  onUpdate: (data: RouteData) => void;
  onNext: () => void;
  onBack: () => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const safeFloat = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  const numVal = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(numVal) ? 0 : numVal;
};

const RoutePlanner: React.FC<RoutePlannerProps> = ({ 
  step, 
  data, 
  vehicle,
  onUpdate, 
  onNext, 
  onBack 
}) => {
  
  const addPoint = (type: 'pickups' | 'deliveries') => {
    const newPoint = {
      id: Math.random().toString(36).substr(2, 9),
      type: type === 'pickups' ? 'pickup' as const : 'delivery' as const,
      address: '',
      value: 0,
      weight: 0
    };
    onUpdate({ ...data, [type]: [...data[type], newPoint] });
  };

  const removePoint = (type: 'pickups' | 'deliveries', id: string) => {
    onUpdate({ ...data, [type]: data[type].filter(p => p.id !== id) });
  };

  const updatePoint = (type: 'pickups' | 'deliveries', id: string, field: string, value: string | number) => {
    onUpdate({
      ...data,
      [type]: data[type].map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const handleNumericUpdate = (type: 'pickups' | 'deliveries', id: string, field: string, value: string) => {
    let clean = value.trim();
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    const numValue = parseFloat(clean);
    updatePoint(type, id, field, isNaN(numValue) ? 0 : numValue);
  };

  // Calculate total weight
  const totalWeightUsed = data.pickups.reduce((acc, p) => acc + safeFloat(p.weight), 0);
  const maxCapacity = vehicle.cargoCapacity || 32;
  const isOverweight = totalWeightUsed > maxCapacity;
  const remainingCapacity = maxCapacity - totalWeightUsed;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-40 animate-fade-in">
      
      {/* Pickups Section */}
      {step === 'pickup' && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-green-50 p-4 md:p-6 border-l-8 border-green-600">
            <h2 className="text-xl md:text-2xl font-bold text-green-900 flex items-center gap-3">
              <div className="bg-green-600 text-white p-2 rounded-lg">
                <MapPin size={20} />
              </div>
              Coleta
            </h2>
            <p className="text-green-800 text-sm md:text-lg mt-1 font-medium opacity-80">
              De onde você vai buscar a carga?
            </p>
          </div>

          <div className="space-y-4 md:space-y-6 p-4 md:pb-6">
            {data.pickups.map((point, index) => (
              <div key={point.id} className="bg-slate-50 p-4 md:p-6 rounded-2xl border-2 border-slate-200 transition-all hover:border-green-300 hover:shadow-md">
                
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-green-700 shadow-sm">
                    {index + 1}
                  </div>
                  {data.pickups.length > 1 && (
                    <button 
                      onClick={() => removePoint('pickups', point.id)}
                      className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                      <Trash2 size={18} /> Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <SpeechInput
                    label="Endereço de Coleta"
                    value={point.address}
                    onChange={(v) => updatePoint('pickups', point.id, 'address', v)}
                    placeholder="Ex: Fazenda Santa Maria, Sorriso-MT"
                    className="md:col-span-3"
                  />
                  
                  <SpeechInput
                    label="Peso da Carga (Toneladas)"
                    type="number"
                    value={point.weight || ''}
                    onChange={(v) => handleNumericUpdate('pickups', point.id, 'weight', v)}
                    placeholder="Ex: 28"
                    className="md:col-span-1"
                  />
                  
                  <SpeechInput
                    label="Valor Total do Frete (R$)"
                    prefix="R$"
                    type="number"
                    value={point.value || ''}
                    onChange={(v) => handleNumericUpdate('pickups', point.id, 'value', v)}
                    placeholder="0,00"
                    className="md:col-span-2"
                  />
                </div>
              </div>
            ))}
            
            <button
              onClick={() => addPoint('pickups')}
              className="w-full py-3 md:py-4 border-2 border-dashed border-green-300 bg-green-50 rounded-xl text-green-700 hover:bg-green-100 hover:border-green-400 font-bold text-base md:text-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Adicionar coleta
            </button>
          </div>
        </section>
      )}

      {/* Deliveries Section */}
      {step === 'delivery' && (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-50 p-4 md:p-6 border-l-8 border-blue-600">
            <h2 className="text-xl md:text-2xl font-bold text-blue-900 flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Truck size={20} />
              </div>
              Entrega
            </h2>
            <p className="text-blue-800 text-sm md:text-lg mt-1 font-medium opacity-80">
              Onde você vai deixar a carga?
            </p>
          </div>

          <div className="space-y-4 md:space-y-6 p-4 md:pb-6">
            {data.deliveries.map((point, index) => (
              <div key={point.id} className="bg-slate-50 p-4 md:p-6 rounded-2xl border-2 border-slate-200 transition-all hover:border-blue-300 hover:shadow-md">
                
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-blue-700 shadow-sm">
                    {index + 1}
                  </div>
                  {data.deliveries.length > 1 && (
                    <button 
                      onClick={() => removePoint('deliveries', point.id)}
                      className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                      <Trash2 size={18} /> Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  <SpeechInput
                    label="Endereço de Entrega"
                    value={point.address}
                    onChange={(v) => updatePoint('deliveries', point.id, 'address', v)}
                    placeholder="Ex: Porto de Santos, SP"
                  />
                  <SpeechInput
                    label="Custo/Valor Adicional"
                    prefix="R$"
                    type="number"
                    value={point.value || ''}
                    onChange={(v) => handleNumericUpdate('deliveries', point.id, 'value', v)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() => addPoint('deliveries')}
              className="w-full py-3 md:py-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 hover:border-blue-400 font-bold text-base md:text-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Adicionar entrega
            </button>
          </div>
        </section>
      )}

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        
        {/* Capacity Progress Bar */}
        {step === 'pickup' && vehicle.cargoCapacity > 0 && (
          <div className="max-w-3xl mx-auto pt-3 px-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 flex items-center gap-1">
                  <Scale size={14}/> Capacidade Utilizada
                </span>
                <span className={`${isOverweight ? 'text-red-600' : 'text-green-700'}`}>
                  {totalWeightUsed} / {maxCapacity} Ton
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isOverweight ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min((totalWeightUsed / maxCapacity) * 100, 100)}%` }}
                ></div>
              </div>
              {isOverweight && (
                <div className="flex items-center gap-2 mt-2 text-red-600 font-bold text-xs animate-pulse">
                  <AlertTriangle size={14} />
                  Excesso de {(totalWeightUsed - maxCapacity).toFixed(1)} toneladas!
                </div>
              )}
              {!isOverweight && remainingCapacity > 0 && (
                <p className="text-[10px] text-green-700 mt-1 font-medium text-right">
                  Disponível: {remainingCapacity.toFixed(1)} ton
                </p>
              )}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto flex gap-4 p-4">
          <button
            onClick={onBack}
            className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-lg hover:bg-slate-50 transition-colors flex items-center justify-center"
          >
            <ArrowLeft size={24} />
          </button>
          
          {step === 'pickup' ? (
            <button
              onClick={onNext}
              disabled={isOverweight}
              className={`flex-1 font-bold py-4 md:py-5 rounded-xl md:rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg md:text-xl transition-all active:scale-[0.98] ${
                isOverweight 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isOverweight ? 'Excesso de Peso!' : <>Continuar para Entrega <ArrowRight size={24} /></>}
            </button>
          ) : (
            <button
              onClick={onNext} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 md:py-5 rounded-xl md:rounded-2xl shadow-xl flex items-center justify-center gap-3 text-lg md:text-xl transition-all active:scale-[0.98]"
            >
              <FileCheck size={24} /> REVISAR DADOS
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
