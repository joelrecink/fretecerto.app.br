import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, TrendingUp, TrendingDown, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTripHistory } from '@/hooks/useTripHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TripHistory = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { trips, loading } = useTripHistory();

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-[hsl(var(--border))]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Histórico de Viagens</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {trips.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[hsl(var(--border))] text-center">
            <div className="w-16 h-16 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-[hsl(var(--muted-foreground))]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Nenhuma viagem registrada</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Suas viagens calculadas aparecerão aqui.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Calcular Viagem
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} formatCurrency={formatCurrency} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

interface TripCardProps {
  trip: any;
  formatCurrency: (value: number) => string;
}

const TripCard: React.FC<TripCardProps> = ({ trip, formatCurrency }) => {
  const isProfit = trip.net_profit >= 0;
  const viabilityColors = {
    high: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[hsl(var(--border))]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isProfit ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {isProfit ? (
              <TrendingUp size={24} className="text-emerald-600" />
            ) : (
              <TrendingDown size={24} className="text-red-600" />
            )}
          </div>
          <div>
            <h3 className={`font-bold text-lg ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(trip.net_profit)}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">Lucro líquido</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${viabilityColors[trip.viability_score as keyof typeof viabilityColors]}`}>
          {trip.viability_score === 'high' ? 'Alta' : trip.viability_score === 'medium' ? 'Média' : 'Baixa'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
        <div className="bg-[hsl(var(--secondary))] rounded-lg p-3">
          <p className="text-[hsl(var(--muted-foreground))] text-xs">Distância</p>
          <p className="font-semibold">{trip.total_distance_km} km</p>
        </div>
        <div className="bg-[hsl(var(--secondary))] rounded-lg p-3">
          <p className="text-[hsl(var(--muted-foreground))] text-xs">Duração</p>
          <p className="font-semibold">{trip.total_duration_days} dias</p>
        </div>
        <div className="bg-[hsl(var(--secondary))] rounded-lg p-3">
          <p className="text-[hsl(var(--muted-foreground))] text-xs">Receita</p>
          <p className="font-semibold">{formatCurrency(trip.total_freight_income)}</p>
        </div>
        <div className="bg-[hsl(var(--secondary))] rounded-lg p-3">
          <p className="text-[hsl(var(--muted-foreground))] text-xs">Custos</p>
          <p className="font-semibold">{formatCurrency(trip.estimated_fuel_cost + trip.estimated_toll_cost + trip.driver_commission_cost)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>{format(new Date(trip.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
        </div>
        {trip.license_plate && (
          <div className="flex items-center gap-2">
            <Truck size={14} />
            <span>{trip.license_plate}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripHistory;
