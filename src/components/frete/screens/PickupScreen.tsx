import React from 'react';
import { Package, Scale, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import AddressAutocomplete from '../AddressAutocomplete';
import NumericInput from '../NumericInput';


interface RoutePoint {
  id: string;
  address: string;
  value: number;
  weight?: number;
  valuePerTon?: number;
  lat?: number;
  lng?: number;
}

interface PickupScreenProps {
  pickups: RoutePoint[];
  cargoCapacity: number;
  onAddPickup: () => void;
  onRemovePickup: (id: string) => void;
  onUpdatePickup: (id: string, field: string, value: string | number) => void;
  onSelectPickupAddress?: (id: string, address: string, lat: number, lng: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const PickupScreen: React.FC<PickupScreenProps> = ({
  pickups,
  cargoCapacity,
  onAddPickup,
  onRemovePickup,
  onUpdatePickup,
  onSelectPickupAddress,
  onNext,
  onBack,
}) => {
  const totalWeight = pickups.reduce((acc, p) => acc + (p.weight || 0), 0);
  const isOverweight = totalWeight > cargoCapacity;

  const handleNumericChange = (id: string, field: string, value: number | undefined, pickup: RoutePoint) => {
    const numValue = value ?? 0;

    if (field === 'weight') {
      onUpdatePickup(id, 'weight', numValue);
      if (pickup.valuePerTon && numValue > 0) {
        onUpdatePickup(id, 'value', numValue * pickup.valuePerTon);
      }
    } else if (field === 'valuePerTon') {
      onUpdatePickup(id, 'valuePerTon', numValue);
      if (pickup.weight && numValue > 0) {
        onUpdatePickup(id, 'value', pickup.weight * numValue);
      }
    } else if (field === 'value') {
      onUpdatePickup(id, 'value', numValue);
      if (pickup.weight && pickup.weight > 0) {
        onUpdatePickup(id, 'valuePerTon', numValue / pickup.weight);
      }
    } else {
      onUpdatePickup(id, field, numValue);
    }
  };


  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header Card */}
        <div className="bg-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Carregamento e Carga</h1>
              <p className="text-sm text-white/70">Onde você vai carregar as cargas.</p>
            </div>
          </div>
        </div>

        {/* Pickups List */}
        {pickups.map((pickup, index) => (
          <div key={pickup.id} className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 font-bold text-sm">{index + 1}</span>
              </div>
              <span className="font-medium text-[hsl(var(--foreground))]">Endereço de Coleta</span>
              {pickups.length > 1 && (
                <button
                  onClick={() => onRemovePickup(pickup.id)}
                  className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Address */}
            <AddressAutocomplete
              value={pickup.address}
              hasCoords={pickup.lat != null && pickup.lng != null}
              onTextChange={(text) => {
                onUpdatePickup(pickup.id, 'address', text);
                if (pickup.lat != null) onUpdatePickup(pickup.id, 'lat', 0);
                if (pickup.lng != null) onUpdatePickup(pickup.id, 'lng', 0);
              }}
              onSelect={(addr, lat, lng) => {
                if (onSelectPickupAddress) onSelectPickupAddress(pickup.id, addr, lat, lng);
                else onUpdatePickup(pickup.id, 'address', addr);
              }}
              placeholder="Ex: Paranavaí, Santo Inácio, SP"
              accent="emerald"
              enableVoice
            />


            {/* Weight and Value */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Peso (Ton)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">Ton.</span>
                  <NumericInput
                    value={pickup.weight}
                    onChange={(v) => handleNumericChange(pickup.id, 'weight', v, pickup)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Valor por Ton</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                  <NumericInput
                    value={pickup.valuePerTon}
                    onChange={(v) => handleNumericChange(pickup.id, 'valuePerTon', v, pickup)}
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Valor Total</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                  <NumericInput
                    value={pickup.value}
                    onChange={(v) => handleNumericChange(pickup.id, 'value', v, pickup)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

          </div>
        ))}

        {/* Add Pickup Button */}
        <button
          onClick={onAddPickup}
          className="w-full py-4 border-2 border-dashed border-emerald-400 text-emerald-600 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
        >
          <Plus size={20} />
          Adicionar coleta
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--border))] z-50">
        {/* Weight Indicator */}
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <Scale size={16} className="text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm text-[hsl(var(--muted-foreground))]">Capacidade Utilizada</span>
          </div>
          <span className={`font-bold text-sm ${isOverweight ? 'text-red-500' : 'text-emerald-600'}`}>
            {totalWeight.toFixed(1)} / {cargoCapacity} Ton
          </span>
        </div>

        <div className="max-w-2xl mx-auto flex gap-4 p-4">
          <button
            onClick={onBack}
            className="w-14 h-14 rounded-xl border-2 border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--secondary))] transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            Continuar para Entrega <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PickupScreen;
