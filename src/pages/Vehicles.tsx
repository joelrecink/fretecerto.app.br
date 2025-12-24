import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Plus, Edit2, Trash2, Fuel, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useVehicles, SavedVehicle } from '@/hooks/useVehicles';
import { toast } from 'sonner';

const Vehicles = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { vehicles, loading, deleteVehicle } = useVehicles();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    
    setDeletingId(id);
    await deleteVehicle(id);
    toast.success('Veículo excluído com sucesso!');
    setDeletingId(null);
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
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Meus Veículos</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Novo
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-[hsl(var(--border))] text-center">
            <div className="w-16 h-16 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck size={32} className="text-[hsl(var(--muted-foreground))]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Nenhum veículo cadastrado</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Cadastre seu primeiro veículo para começar a calcular fretes.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Cadastrar Veículo
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onDelete={() => handleDelete(vehicle.id)}
                deleting={deletingId === vehicle.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

interface VehicleCardProps {
  vehicle: SavedVehicle;
  onDelete: () => void;
  deleting: boolean;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onDelete, deleting }) => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[hsl(var(--border))]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{vehicle.license_plate}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {vehicle.model_name || 'Veículo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
          <Fuel size={16} />
          <span>{vehicle.fuel_consumption} km/l</span>
        </div>
        <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
          <Settings size={16} />
          <span>{vehicle.axles} eixos</span>
        </div>
        <div className="col-span-2 text-[hsl(var(--muted-foreground))]">
          Capacidade: {vehicle.cargo_capacity} ton
        </div>
      </div>
    </div>
  );
};

export default Vehicles;
