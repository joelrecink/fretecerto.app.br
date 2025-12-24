import React, { useState } from 'react';
import { Car, Save, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { useVehicles, SavedVehicle } from '@/hooks/useVehicles';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VehicleSelectorProps {
  currentPlate?: string;
  onSelectVehicle: (vehicle: SavedVehicle) => void;
  onSaveVehicle: () => Promise<void>;
  hasChanges?: boolean;
}

const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  currentPlate,
  onSelectVehicle,
  onSaveVehicle,
  hasChanges = false,
}) => {
  const { user } = useAuth();
  const { vehicles, loading } = useVehicles();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) {
      toast.error('Faça login para salvar veículos');
      return;
    }
    if (!currentPlate) {
      toast.error('Informe a placa do veículo');
      return;
    }
    
    setSaving(true);
    try {
      await onSaveVehicle();
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = (vehicle: SavedVehicle) => {
    onSelectVehicle(vehicle);
    setIsOpen(false);
    toast.success(`Veículo ${vehicle.license_plate} carregado!`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-200">
      <div className="flex items-center justify-between gap-3">
        {/* Vehicle Selector Dropdown */}
        <div className="relative flex-1">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white rounded-xl border-2 border-[hsl(var(--border))] hover:border-blue-400 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Car size={18} className="text-blue-600" />
              <span className="font-medium text-[hsl(var(--foreground))]">
                {currentPlate || 'Selecionar veículo'}
              </span>
            </div>
            <ChevronDown size={18} className={`text-[hsl(var(--muted-foreground))] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[hsl(var(--border))] shadow-lg z-50 max-h-64 overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-[hsl(var(--muted-foreground))]">
                  <Loader2 size={20} className="animate-spin mx-auto" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="p-4 text-center text-[hsl(var(--muted-foreground))] text-sm">
                  Nenhum veículo salvo
                </div>
              ) : (
                vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--secondary))] transition-colors ${
                      v.license_plate === currentPlate ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Car size={16} className="text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-[hsl(var(--foreground))]">{v.license_plate}</p>
                        {v.model_name && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">{v.model_name}</p>
                        )}
                      </div>
                    </div>
                    {v.license_plate === currentPlate && (
                      <Check size={18} className="text-emerald-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || !currentPlate}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
            hasChanges
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
              : 'bg-white border-2 border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:border-emerald-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          <span className="hidden sm:inline">Salvar</span>
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 text-center">
        💡 Salve os dados do veículo para usar em futuras viagens
      </p>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default VehicleSelector;
