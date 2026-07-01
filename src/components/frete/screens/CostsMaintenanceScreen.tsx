import React, { useState } from 'react';
import { Wrench, Car, Droplets, Shield, ArrowLeft, ArrowRight, Check, Cog, Save, ChevronDown, Loader2, Filter, CircleDollarSign, Users, Plus, Truck, Calculator, Scale } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SavedVehicle } from '@/hooks/useVehicles';
import NumericInput from '../NumericInput';


interface CostsData {
  licensePlate?: string;
  modelName?: string;
  assetValue?: number;
  annualDepreciationRate?: number;
  insuranceYearly?: number;
  registrationYearly?: number;
  driverSalaryMonthly?: number;
  driverSalaryInclude13th?: boolean;
  payrollChargesPercentage?: number;
  maintenanceCostPerKm?: number;
  
  // Custos Fixos Adicionais (mensais)
  parkingMonthly?: number;
  trackingMonthly?: number;
  accountingMonthly?: number;
  otherFixedMonthly?: number;
  
  // Custos Variáveis Adicionais (por km)
  otherMaintenanceCostPerKm?: number;
  greaseCostPerKm?: number;
  washingCostPerKm?: number;
  
  // ARDA - Lei 13.103/2015
  ardaEnabled?: boolean;
  ardaPercentage?: number;
  estimatedWaitHoursPerDay?: number;
  
  // Dimensões do veículo (TomTom)
  vehicleWeight?: number;
  vehicleHeight?: number;
  vehicleWidth?: number;
  vehicleLength?: number;
  
  // Tire References
  refTirePriceNew?: number;
  refTireLifespanNew?: number;
  refTirePriceRemold?: number;
  refTireLifespanRemold?: number;
  
  // Tire Quantities
  tireSteerQtyNew?: number;
  tireSteerQtyRemold?: number;
  tireDriveQtyNew?: number;
  tireDriveQtyRemold?: number;
  tireTrailerQtyNew?: number;
  tireTrailerQtyRemold?: number;
  
  // Engine Oil
  lastOilChangeCost?: number;
  oilChangeIntervalKm?: number;
  lastOilChangeKm?: number;
  lastOilChangeDate?: string;
  lastOilChangeLocation?: string;
  
  // Transmission Oil
  lastTransOilChangeCost?: number;
  transOilChangeIntervalKm?: number;
  lastTransOilChangeKm?: number;
  lastTransOilChangeDate?: string;
  
  // Filters
  lastFilterChangeCost?: number;
  filterChangeIntervalKm?: number;
  lastFilterChangeKm?: number;
  lastFilterChangeDate?: string;
  
  currentOdometer?: number;
  axles?: number;
}

interface CostsMaintenanceScreenProps {
  data: CostsData;
  onUpdate: (field: string, value: number | string | boolean) => void;
  onNext: () => void;
  onBack: () => void;
  vehicles?: SavedVehicle[];
  onSelectVehicle?: (vehicle: SavedVehicle) => void;
  onSaveVehicle?: () => Promise<void>;
}

const CostsMaintenanceScreen: React.FC<CostsMaintenanceScreenProps> = ({
  data,
  onUpdate,
  onNext,
  onBack,
  vehicles = [],
  onSelectVehicle,
  onSaveVehicle,
}) => {
  const { user } = useAuth();
  const [tireMode, setTireMode] = useState<'new' | 'remold'>('new');
  const [oilSection, setOilSection] = useState<'engine' | 'transmission'>('engine');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: string, value: number | undefined) => {
    onUpdate(field, value ?? 0);
  };


  const formatCurrency = (val: number | undefined) => {
    if (!val) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Faça login para salvar veículos');
      return;
    }
    if (!data.licensePlate) {
      toast.error('Informe a placa do veículo');
      return;
    }
    if (onSaveVehicle) {
      setSaving(true);
      try {
        await onSaveVehicle();
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSelectVehicle = (vehicle: SavedVehicle) => {
    if (onSelectVehicle) {
      onSelectVehicle(vehicle);
      toast.success(`Veículo ${vehicle.license_plate} carregado!`);
    }
    setVehicleDropdownOpen(false);
  };

  // Calculate tire cost per km
  const calcTireCostPerKm = () => {
    const priceNew = data.refTirePriceNew || 0;
    const lifeNew = data.refTireLifespanNew || 1;
    const priceRemold = data.refTirePriceRemold || 0;
    const lifeRemold = data.refTireLifespanRemold || 1;
    const totalNew = (data.tireSteerQtyNew || 0) + (data.tireDriveQtyNew || 0) + (data.tireTrailerQtyNew || 0);
    const totalRemold = (data.tireSteerQtyRemold || 0) + (data.tireDriveQtyRemold || 0) + (data.tireTrailerQtyRemold || 0);
    return (totalNew * priceNew / lifeNew) + (totalRemold * priceRemold / lifeRemold);
  };

  // Calculate fluid cost per km
  const calcFluidCostPerKm = () => {
    let cost = 0;
    if (data.lastOilChangeCost && data.oilChangeIntervalKm) {
      cost += data.lastOilChangeCost / data.oilChangeIntervalKm;
    }
    if (data.lastTransOilChangeCost && data.transOilChangeIntervalKm) {
      cost += data.lastTransOilChangeCost / data.transOilChangeIntervalKm;
    }
    if (data.lastFilterChangeCost && data.filterChangeIntervalKm) {
      cost += data.lastFilterChangeCost / data.filterChangeIntervalKm;
    }
    return cost;
  };

  const totalTires = (data.tireSteerQtyNew || 0) + (data.tireDriveQtyNew || 0) + (data.tireTrailerQtyNew || 0) +
                     (data.tireSteerQtyRemold || 0) + (data.tireDriveQtyRemold || 0) + (data.tireTrailerQtyRemold || 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[hsl(var(--background))] pb-32">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full"></div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Custos & Manutenção</h1>
              <p className="text-sm text-white/70">INFORMAÇÕES • 2/6 • ETAPAS</p>
            </div>
          </div>
        </div>

        {/* Veículo & Resumo */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Car size={18} />
              <span className="font-medium">Veículo & Resumo</span>
            </div>
          </div>

          {/* Vehicle Selector - Show only if user is logged in */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Car size={18} className="text-emerald-600" />
                  <span className="font-medium text-[hsl(var(--foreground))]">
                    {data.licensePlate || 'Selecionar ou criar veículo'}
                  </span>
                </div>
                <ChevronDown size={18} className={`text-[hsl(var(--muted-foreground))] transition-transform ${vehicleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {vehicleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setVehicleDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[hsl(var(--border))] shadow-lg z-50 max-h-64 overflow-auto">
                    {/* Opção para criar novo veículo */}
                    <button
                      onClick={() => {
                        onUpdate('licensePlate', '');
                        setVehicleDropdownOpen(false);
                        toast.info('Digite a placa do novo veículo abaixo');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-[hsl(var(--border))]"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Plus size={16} className="text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-emerald-700">+ Criar novo veículo</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Cadastrar nova placa</p>
                      </div>
                    </button>
                    
                    {vehicles.length === 0 ? (
                      <div className="p-4 text-center text-[hsl(var(--muted-foreground))] text-sm">
                        Nenhum veículo salvo ainda
                      </div>
                    ) : (
                      vehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => handleSelectVehicle(v)}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--secondary))] transition-colors ${
                            v.license_plate === data.licensePlate ? 'bg-blue-50' : ''
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
                          {v.license_plate === data.licensePlate && (
                            <Check size={18} className="text-emerald-600" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Placa do Veículo (Obrigatório)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.licensePlate || ''}
                onChange={(e) => onUpdate('licensePlate', e.target.value.toUpperCase())}
                placeholder="ABC-1234"
                className="flex-1 px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
              />
              {user && data.licensePlate && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                </button>
              )}
            </div>
            {user && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                💾 Salve os dados para carregar automaticamente em futuras viagens
              </p>
            )}
          </div>

          {/* Hodômetro */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[hsl(var(--foreground))]">
              Hodômetro Atual (km)
            </label>
            <NumericInput
                        value={data.currentOdometer}
                        onChange={(v) => handleInputChange('currentOdometer', v)}
              placeholder="Ex: 450000"
              className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      />
          </div>

          {/* Cost Summary Cards */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-[hsl(var(--secondary))] rounded-xl p-4">
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Custo Pneu/km</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(calcTireCostPerKm())}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{totalTires} pneus instalados</p>
            </div>
            <div className="bg-[hsl(var(--secondary))] rounded-xl p-4">
              <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase">Custo Fluidos/km</p>
              <p className="text-lg font-bold text-blue-600">{formatCurrency(calcFluidCostPerKm())}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Óleo + Filtros</p>
            </div>
          </div>
        </div>

        {/* Seção de Pneus */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--border))] flex items-center gap-2">
            <span className="text-xl">🛞</span>
            <span className="font-medium">Seção de Pneus</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[hsl(var(--border))]">
            <button
              onClick={() => setTireMode('new')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tireMode === 'new'
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              🟢 PNEU NOVO
            </button>
            <button
              onClick={() => setTireMode('remold')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tireMode === 'remold'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                  : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              🟡 PNEU REMOLD
            </button>
          </div>

          <div className="p-4 space-y-4">
            {tireMode === 'new' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Preço Médio (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                      <NumericInput
                        value={data.refTirePriceNew}
                        onChange={(v) => handleInputChange('refTirePriceNew', v)}
                        placeholder="3500"
                        className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Vida Útil (KM)</label>
                    <NumericInput
                        value={data.refTireLifespanNew}
                        onChange={(v) => handleInputChange('refTireLifespanNew', v)}
                      placeholder="100000"
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                  </div>
                </div>

                {/* Tire positions - New */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Eixo Direcional</p>
                    <input
                      type="number"
                      value={data.tireSteerQtyNew || 0}
                      onChange={(e) => onUpdate('tireSteerQtyNew', parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 border-2 border-emerald-200 rounded-lg text-lg font-bold"
                    />
                    <p className="text-xs text-emerald-600 mt-1">pneus</p>
                  </div>
                  <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Eixo Tração</p>
                    <input
                      type="number"
                      value={data.tireDriveQtyNew || 0}
                      onChange={(e) => onUpdate('tireDriveQtyNew', parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 border-2 border-emerald-200 rounded-lg text-lg font-bold"
                    />
                    <p className="text-xs text-emerald-600 mt-1">pneus</p>
                  </div>
                  <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Carreta</p>
                    <input
                      type="number"
                      value={data.tireTrailerQtyNew || 0}
                      onChange={(e) => onUpdate('tireTrailerQtyNew', parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 border-2 border-emerald-200 rounded-lg text-lg font-bold"
                    />
                    <p className="text-xs text-emerald-600 mt-1">pneus</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Preço Médio (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                      <NumericInput
                        value={data.refTirePriceRemold}
                        onChange={(v) => handleInputChange('refTirePriceRemold', v)}
                        placeholder="1800"
                        className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--foreground))] uppercase">Vida Útil (KM)</label>
                    <NumericInput
                        value={data.refTireLifespanRemold}
                        onChange={(v) => handleInputChange('refTireLifespanRemold', v)}
                      placeholder="60000"
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                  </div>
                </div>

                {/* Tire positions - Remold */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Eixo Direcional</p>
                    <input
                      type="number"
                      value={data.tireSteerQtyRemold || 0}
                      onChange={(e) => onUpdate('tireSteerQtyRemold', parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 border-2 border-amber-200 rounded-lg text-lg font-bold"
                    />
                    <p className="text-xs text-amber-600 mt-1">pneus</p>
                  </div>
                  <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Eixo Tração</p>
                    <input
                      type="number"
                      value={data.tireDriveQtyRemold || 0}
                      onChange={(e) => onUpdate('tireDriveQtyRemold', parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 border-2 border-amber-200 rounded-lg text-lg font-bold"
                    />
                    <p className="text-xs text-amber-600 mt-1">pneus</p>
                  </div>
                  <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Carreta</p>
                    <input
                      type="number"
                      value={data.tireTrailerQtyRemold || 0}
                      onChange={(e) => onUpdate('tireTrailerQtyRemold', parseInt(e.target.value) || 0)}
                      className="w-full text-center py-2 border-2 border-amber-200 rounded-lg text-lg font-bold"
                    />
                    <p className="text-xs text-amber-600 mt-1">pneus</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lubrificação (Óleo Motor & Transmissão) */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--border))] flex items-center gap-2">
            <Droplets size={18} className="text-amber-600" />
            <span className="font-medium">Lubrificação</span>
          </div>

          {/* Oil Tabs */}
          <div className="flex border-b border-[hsl(var(--border))]">
            <button
              onClick={() => setOilSection('engine')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                oilSection === 'engine'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                  : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              <Cog size={14} className="inline mr-1" /> Óleo Motor
            </button>
            <button
              onClick={() => setOilSection('transmission')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                oilSection === 'transmission'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              <Cog size={14} className="inline mr-1" /> Óleo Câmbio/Diferencial
            </button>
          </div>

          <div className="p-4 space-y-4">
            {oilSection === 'engine' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Intervalo (KM)</label>
                    <NumericInput
                        value={data.oilChangeIntervalKm}
                        onChange={(v) => handleInputChange('oilChangeIntervalKm', v)}
                      placeholder="20000"
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo Troca (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                      <NumericInput
                        value={data.lastOilChangeCost}
                        onChange={(v) => handleInputChange('lastOilChangeCost', v)}
                        placeholder="1500"
                        className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Última Troca (KM)</label>
                    <NumericInput
                        value={data.lastOilChangeKm}
                        onChange={(v) => handleInputChange('lastOilChangeKm', v)}
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Data</label>
                    <input
                      type="date"
                      value={data.lastOilChangeDate || ''}
                      onChange={(e) => onUpdate('lastOilChangeDate', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Intervalo (KM)</label>
                    <NumericInput
                        value={data.transOilChangeIntervalKm}
                        onChange={(v) => handleInputChange('transOilChangeIntervalKm', v)}
                      placeholder="100000"
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo Troca (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                      <NumericInput
                        value={data.lastTransOilChangeCost}
                        onChange={(v) => handleInputChange('lastTransOilChangeCost', v)}
                        placeholder="2500"
                        className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Última Troca (KM)</label>
                    <NumericInput
                        value={data.lastTransOilChangeKm}
                        onChange={(v) => handleInputChange('lastTransOilChangeKm', v)}
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Data</label>
                    <input
                      type="date"
                      value={data.lastTransOilChangeDate || ''}
                      onChange={(e) => onUpdate('lastTransOilChangeDate', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Filter size={18} />
            <span className="font-medium">Kit de Filtros</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Intervalo (KM)</label>
              <NumericInput
                        value={data.filterChangeIntervalKm}
                        onChange={(v) => handleInputChange('filterChangeIntervalKm', v)}
                placeholder="20000"
                className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo do Kit (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.lastFilterChangeCost}
                        onChange={(v) => handleInputChange('lastFilterChangeCost', v)}
                  placeholder="800"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
          </div>
        </div>

        {/* Valor e Depreciação */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <CircleDollarSign size={18} />
              <span className="font-medium">Valor e Depreciação</span>
            </div>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs font-medium rounded-full">Opcional</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Valor do Veículo (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.assetValue}
                        onChange={(v) => handleInputChange('assetValue', v)}
                  placeholder="450000"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Depreciação Anual (%)</label>
              <div className="relative">
                <NumericInput
                        value={data.annualDepreciationRate}
                        onChange={(v) => handleInputChange('annualDepreciationRate', v)}
                  placeholder="15"
                  className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Motorista & Salário */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Users size={18} />
            <span className="font-medium">Motorista & Salário</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Salário Base Mensal (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
              <NumericInput
                        value={data.driverSalaryMonthly}
                        onChange={(v) => handleInputChange('driverSalaryMonthly', v)}
                placeholder="3500"
                className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
            </div>
          </div>

          <button
            onClick={() => onUpdate('driverSalaryInclude13th', !data.driverSalaryInclude13th)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              data.driverSalaryInclude13th
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              data.driverSalaryInclude13th ? 'border-blue-500 bg-blue-500' : 'border-[hsl(var(--border))]'
            }`}>
              {data.driverSalaryInclude13th && <Check size={14} className="text-white" />}
            </div>
            <span className="text-sm">Incluir proporcional de 13º e férias</span>
          </button>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">
              Encargos sobre a folha (%)
            </label>
            <div className="relative">
              <NumericInput
                value={data.payrollChargesPercentage}
                onChange={(v) => handleInputChange('payrollChargesPercentage', v)}
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">%</span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              FGTS (8%), INSS patronal, provisão rescisória, etc. CLT típico: 35–45%. Autônomo: 0%.
            </p>
          </div>
        </div>

        {/* Seguro & Licenciamento */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-3">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Shield size={18} />
              <span className="font-medium text-sm">Seguro Veicular</span>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo Anual (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.insuranceYearly}
                        onChange={(v) => handleInputChange('insuranceYearly', v)}
                  placeholder="15000"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
              <p className="text-xs text-blue-600 font-medium">
                = R$ {((data.insuranceYearly || 0) / 365).toFixed(2)}/dia
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-3">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Car size={18} />
              <span className="font-medium text-sm">IPVA & Licenciamento</span>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Custo Anual (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.registrationYearly}
                        onChange={(v) => handleInputChange('registrationYearly', v)}
                  placeholder="8000"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
              <p className="text-xs text-blue-600 font-medium">
                = R$ {((data.registrationYearly || 0) / 365).toFixed(2)}/dia
              </p>
            </div>
          </div>
        </div>

        {/* Custos Fixos Adicionais */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Calculator size={18} />
              <span className="font-medium">Outros Custos Fixos Mensais</span>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">Custo/Dia</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Estacionamento (R$/mês)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.parkingMonthly}
                        onChange={(v) => handleInputChange('parkingMonthly', v)}
                  placeholder="500"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Rastreador (R$/mês)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.trackingMonthly}
                        onChange={(v) => handleInputChange('trackingMonthly', v)}
                  placeholder="150"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Contador (R$/mês)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.accountingMonthly}
                        onChange={(v) => handleInputChange('accountingMonthly', v)}
                  placeholder="300"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Outros Fixos (R$/mês)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.otherFixedMonthly}
                        onChange={(v) => handleInputChange('otherFixedMonthly', v)}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
          </div>
          
          {/* Resumo custo fixo diário */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 uppercase font-bold mb-1">Total Custos Fixos/Dia</p>
            <p className="text-2xl font-bold text-blue-700">
              R$ {(
                ((data.insuranceYearly || 0) + (data.registrationYearly || 0)) / 365 +
                (((data.driverSalaryMonthly || 0) * (data.driverSalaryInclude13th ? 13.33 : 12)) / 365) * (1 + ((data.payrollChargesPercentage || 0) / 100)) +
                ((data.assetValue || 0) * ((data.annualDepreciationRate || 0) / 100)) / 365 +
                ((data.parkingMonthly || 0) + (data.trackingMonthly || 0) + (data.accountingMonthly || 0) + (data.otherFixedMonthly || 0)) / 30.44
              ).toFixed(2)}
            </p>
          </div>
        </div>

        {/* ARDA - Adicional de Remuneração de Descanso Assegurado */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Scale size={18} />
              <span className="font-medium">ARDA - Lei 13.103/2015</span>
            </div>
            <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">Legislação BR</span>
          </div>

          <div className="bg-purple-50 p-3 rounded-xl text-sm text-purple-700">
            <p>O ARDA (Adicional de Remuneração de Descanso Assegurado) é calculado sobre o tempo de espera do motorista durante carga/descarga.</p>
          </div>

          <button
            onClick={() => onUpdate('ardaEnabled', !data.ardaEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              data.ardaEnabled
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              data.ardaEnabled ? 'border-purple-500 bg-purple-500' : 'border-[hsl(var(--border))]'
            }`}>
              {data.ardaEnabled && <Check size={14} className="text-white" />}
            </div>
            <span className="text-sm">Incluir cálculo de ARDA</span>
          </button>

          {data.ardaEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Percentual ARDA (%)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data.ardaPercentage || 30}
                    onChange={(e) => handleInputChange('ardaPercentage', e.target.value)}
                    placeholder="30"
                    className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">%</span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Padrão: 30% sobre horas extras</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[hsl(var(--foreground))]">Horas de espera / dia</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={data.estimatedWaitHoursPerDay ?? 2}
                    onChange={(e) => handleInputChange('estimatedWaitHoursPerDay', e.target.value)}
                    placeholder="2"
                    className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]">h</span>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Estimativa carga/descarga</p>
              </div>
            </div>
          )}
        </div>

        {/* Dimensões do Veículo (TomTom) */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Truck size={18} />
              <span className="font-medium">Dimensões do Veículo</span>
            </div>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs font-medium rounded-full">TomTom Routing</span>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl text-sm text-emerald-700">
            <p>Usado para roteirização otimizada para caminhões, evitando vias com restrições de peso, altura ou largura.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Peso Total (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={data.vehicleWeight || ''}
                onChange={(e) => handleInputChange('vehicleWeight', e.target.value)}
                placeholder={`${7500 + ((data.axles || 6) - 2) * 8000}`}
                className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Altura (m)</label>
              <NumericInput
                        value={data.vehicleHeight}
                        onChange={(v) => handleInputChange('vehicleHeight', v)}
                placeholder="4.0"
                className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Largura (m)</label>
              <NumericInput
                        value={data.vehicleWidth}
                        onChange={(v) => handleInputChange('vehicleWidth', v)}
                placeholder="2.55"
                className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Comprimento (m)</label>
              <input
                type="text"
                inputMode="decimal"
                value={data.vehicleLength || ''}
                onChange={(e) => handleInputChange('vehicleLength', e.target.value)}
                placeholder={`${(data.axles || 6) <= 4 ? '14' : (data.axles || 6) <= 6 ? '18.15' : '19.8'}`}
                className="w-full px-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
              />
            </div>
          </div>
        </div>

        {/* Outros Custos por KM */}
        <div className="bg-white rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
              <Wrench size={18} />
              <span className="font-medium">Outras Manutenções</span>
            </div>
            <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-medium rounded-full">Custo/KM</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Graxa (R$/km)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.greaseCostPerKm}
                        onChange={(v) => handleInputChange('greaseCostPerKm', v)}
                  placeholder="0.01"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Lavagem (R$/km)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.washingCostPerKm}
                        onChange={(v) => handleInputChange('washingCostPerKm', v)}
                  placeholder="0.02"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase">Outros (R$/km)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] text-sm">R$</span>
                <NumericInput
                        value={data.otherMaintenanceCostPerKm}
                        onChange={(v) => handleInputChange('otherMaintenanceCostPerKm', v)}
                  placeholder="0.05"
                  className="w-full pl-10 pr-4 py-3 border-2 border-[hsl(var(--border))] rounded-xl text-base bg-white"
                      />
              </div>
            </div>
          </div>

          {/* Resumo custo por km */}
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
            <p className="text-xs text-orange-600 uppercase font-bold mb-1">Total Custos Variáveis/KM</p>
            <p className="text-2xl font-bold text-orange-700">
              R$ {(
                calcTireCostPerKm() + 
                calcFluidCostPerKm() +
                (data.greaseCostPerKm || 0) +
                (data.washingCostPerKm || 0) +
                (data.otherMaintenanceCostPerKm || 0)
              ).toFixed(4)}
            </p>
          </div>
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
            onClick={onNext}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]"
          >
            Próximo <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostsMaintenanceScreen;
