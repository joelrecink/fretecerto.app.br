import React from 'react';
import { MapPin, Plus, Trash2, ArrowLeft, Calculator } from 'lucide-react';
import AddressAutocomplete from '../AddressAutocomplete';
import NumericInput from '../NumericInput';


interface RoutePoint {
  id: string;
  address: string;
  value: number;
  lat?: number;
  lng?: number;
}

interface DeliveryScreenProps {
  deliveries: RoutePoint[];
  onAddDelivery: () => void;
  onRemoveDelivery: (id: string) => void;
  onUpdateDelivery: (id: string, field: string, value: string | number) => void;
  onSelectDeliveryAddress?: (id: string, address: string, lat: number, lng: number) => void;
  onCalculate: () => void;
  onBack: () => void;
  loading?: boolean;
}

const DeliveryScreen: React.FC<DeliveryScreenProps> = ({
  deliveries,
  onAddDelivery,
  onRemoveDelivery,
  onUpdateDelivery,
  onSelectDeliveryAddress,
  onCalculate,
  onBack,
  loading = false,
}) => {
  const handleNumericChange = (id: string, field: string, value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    onUpdateDelivery(id, field, numValue);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header Card */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Entrega</h1>
              <p className="text-sm text-white/70">Onde você vai entregar a carga?</p>
            </div>
          </div>
        </div>

        {/* Deliveries List */}
        {deliveries.map((delivery, index) => (
          <div key={delivery.id} className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
              </div>
              <span className="font-medium text-[hsl(var(--foreground))]">Endereço de Entrega</span>
              {deliveries.length > 1 && (
                <button
                  onClick={() => onRemoveDelivery(delivery.id)}
                  className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Address */}
            <AddressAutocomplete
              value={delivery.address}
              hasCoords={delivery.lat != null && delivery.lng != null}
              onTextChange={(text) => {
                onUpdateDelivery(delivery.id, 'address', text);
                if (delivery.lat != null) onUpdateDelivery(delivery.id, 'lat', 0);
                if (delivery.lng != null) onUpdateDelivery(delivery.id, 'lng', 0);
              }}
              onSelect={(addr, lat, lng) => {
                if (onSelectDeliveryAddress) onSelectDeliveryAddress(delivery.id, addr, lat, lng);
                else onUpdateDelivery(delivery.id, 'address', addr);
              }}
              placeholder="Ex: Praça da Saudade, SP"
              accent="blue"
              rightSlot={
                <button type="button" className="p-1 text-[hsl(var(--muted-foreground))] hover:text-blue-600 transition-colors">
                  <Mic size={18} />
                </button>
              }
            />


            {/* Additional Value */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Custo/Valor Adicional</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm font-bold">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={delivery.value || ''}
                  onChange={(e) => handleNumericChange(delivery.id, 'value', e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add Delivery Button */}
        <button
          onClick={onAddDelivery}
          className="w-full py-4 border-2 border-dashed border-blue-400 text-blue-600 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
        >
          <Plus size={20} />
          Adicionar entrega
        </button>
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
            onClick={onCalculate}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Calculando...
              </>
            ) : (
              <>
                <Calculator size={20} />
                Continuar Dados
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryScreen;
