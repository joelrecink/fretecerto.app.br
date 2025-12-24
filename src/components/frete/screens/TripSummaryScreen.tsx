import React from 'react';
import { FileText, Truck, MapPin, Package, Navigation, ArrowLeft, Calculator, Edit3, Mic } from 'lucide-react';

interface RoutePoint {
  id: string;
  address: string;
  value: number;
  weight?: number;
}

interface TripSummaryScreenProps {
  vehicleInfo: {
    licensePlate?: string;
    axles: number;
    driverName: string;
  };
  pickups: RoutePoint[];
  deliveries: RoutePoint[];
  totalFreight: number;
  onCalculate: () => void;
  onBack: () => void;
  onEditVehicle: () => void;
  loading?: boolean;
}

const TripSummaryScreen: React.FC<TripSummaryScreenProps> = ({
  vehicleInfo,
  pickups,
  deliveries,
  totalFreight,
  onCalculate,
  onBack,
  onEditVehicle,
  loading = false,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">CONFIRMAÇÃO FINAL</span>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Resumo da Viagem</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Confira os detalhes da viagem antes de calcular a simulação</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Frete estimado</span>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalFreight)}</p>
          </div>
        </div>

        {/* Vehicle Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-[hsl(var(--muted-foreground))]" />
              <span className="font-medium text-[hsl(var(--muted-foreground))]">Dados do Veículo</span>
            </div>
            <button
              onClick={onEditVehicle}
              className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1"
            >
              <Edit3 size={14} />
              Editar
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[hsl(var(--border))]">
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Placa</p>
              <p className="font-bold text-[hsl(var(--foreground))]">{vehicleInfo.licensePlate || 'Não informada'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Eixos</p>
              <p className="font-bold text-[hsl(var(--foreground))]">{vehicleInfo.axles || '-'} Eixo(s)</p>
            </div>
          </div>
        </div>

        {/* Route Points Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-[hsl(var(--muted-foreground))]" />
            <span className="font-medium text-[hsl(var(--muted-foreground))]">Pontos da Rota</span>
          </div>

          {/* Pickups */}
          {pickups.map((pickup, index) => (
            <div key={pickup.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase">
                  Coleta {pickups.length > 1 ? index + 1 : ''}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">ORIGEM / COLETA</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--secondary))]">
                <MapPin size={18} className="text-emerald-600" />
                <div className="flex-1">
                  <p className={`font-medium ${pickup.address ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}>
                    {pickup.address || 'Endereço não informado'}
                  </p>
                </div>
                <button className="p-2 text-[hsl(var(--muted-foreground))] hover:text-blue-600">
                  <Mic size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Deliveries */}
          {deliveries.map((delivery, index) => (
            <div key={delivery.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase">
                  Entrega {deliveries.length > 1 ? index + 1 : ''}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">DESTINO / ENTREGA</span>
              </div>
              <div className="flex items-center gap-3 p-3 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--secondary))]">
                <MapPin size={18} className="text-blue-600" />
                <div className="flex-1">
                  <p className={`font-medium ${delivery.address ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] italic'}`}>
                    {delivery.address || 'Endereço não informado'}
                  </p>
                </div>
                <button className="p-2 text-[hsl(var(--muted-foreground))] hover:text-blue-600">
                  <Mic size={16} />
                </button>
              </div>
            </div>
          ))}
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
                Calcular Frete Final
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripSummaryScreen;
