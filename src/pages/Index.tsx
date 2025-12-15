import React, { useState } from 'react';
import { Truck, User, ArrowRight, ArrowLeft, Gauge, DollarSign, Settings, MapPin, Plus, Trash2, FileCheck, Scale, AlertTriangle, Droplet, Filter, Car, CheckCircle, XCircle, RefreshCw, Map } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ============= TYPES =============
interface VehicleData {
  driverName: string;
  fuelConsumption: number;
  fuelPrice: number;
  axles: number;
  drivingHoursPerDay: number;
  driverCommissionPercentage: number;
  driverSalaryMonthly?: number;
  driverSalaryInclude13th?: boolean;
  cargoCapacity: number;
  maintenanceCostPerKm: number;
  licensePlate?: string;
  assetValue?: number;
  insuranceYearly?: number;
  registrationYearly?: number;
  refTirePriceNew?: number;
  refTireLifespanNew?: number;
  refTirePriceRemold?: number;
  refTireLifespanRemold?: number;
  tireSteerQtyNew?: number;
  tireSteerQtyRemold?: number;
  tireDriveQtyNew?: number;
  tireDriveQtyRemold?: number;
  tireTrailerQtyNew?: number;
  tireTrailerQtyRemold?: number;
  lastOilChangeCost?: number;
  oilChangeIntervalKm?: number;
  lastOilChangeKm?: number;
  lastOilChangeDate?: string;
  lastFilterChangeCost?: number;
  filterChangeIntervalKm?: number;
  lastFilterChangeKm?: number;
  lastFilterChangeDate?: string;
  currentOdometer?: number;
}

interface RoutePoint {
  id: string;
  type: 'pickup' | 'delivery';
  address: string;
  value: number;
  weight?: number;
}

interface RouteData {
  pickups: RoutePoint[];
  deliveries: RoutePoint[];
}

interface SimulationResult {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalDurationDays: number;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  driverCommissionCost: number;
  estimatedMaintenanceCost: number;
  estimatedFixedCost: number;
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  routeSuggestions: string;
}

type AppStep = 'driver' | 'costs' | 'vehicle' | 'pickup' | 'delivery' | 'dashboard';

// ============= CONSTANTS =============
const DEFAULT_VEHICLE: VehicleData = {
  driverName: '',
  fuelConsumption: 2.5,
  fuelPrice: 6.50,
  axles: 6,
  drivingHoursPerDay: 9,
  driverCommissionPercentage: 10,
  driverSalaryMonthly: 0,
  driverSalaryInclude13th: true,
  cargoCapacity: 32,
  maintenanceCostPerKm: 0,
  licensePlate: '',
  assetValue: 0,
  insuranceYearly: 0,
  registrationYearly: 0,
  refTirePriceNew: 3500,
  refTireLifespanNew: 100000,
  refTirePriceRemold: 1800,
  refTireLifespanRemold: 60000,
  tireSteerQtyNew: 2,
  tireSteerQtyRemold: 0,
  tireDriveQtyNew: 4,
  tireDriveQtyRemold: 0,
  tireTrailerQtyNew: 0,
  tireTrailerQtyRemold: 0,
  lastOilChangeCost: 1500,
  oilChangeIntervalKm: 20000,
  lastOilChangeKm: 0,
  lastFilterChangeCost: 800,
  filterChangeIntervalKm: 20000,
  lastFilterChangeKm: 0,
  currentOdometer: 0,
};

const DEFAULT_ROUTE: RouteData = {
  pickups: [{ id: 'start', type: 'pickup', address: '', value: 0, weight: 0 }],
  deliveries: [{ id: 'end', type: 'delivery', address: '', value: 0 }],
};

// ============= HELPER FUNCTIONS =============
const safeFloat = (val: string | number | undefined): number => {
  if (val === undefined || val === null || val === '') return 0;
  const numVal = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(numVal) ? 0 : numVal;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// ============= SPEECH INPUT COMPONENT =============
interface SpeechInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  prefix?: string;
}

const SpeechInput: React.FC<SpeechInputProps> = ({
  label, value, onChange, type = 'text', placeholder, className = '', prefix
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toString());

  React.useEffect(() => {
    const stringVal = value === 0 && inputValue === '' ? '' : value.toString();
    if (inputValue !== stringVal) {
      setInputValue(stringVal);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-slate-600 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 text-slate-500 font-bold text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : 'text'}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-4 py-4 border-2 border-slate-200 rounded-xl text-base font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 ${prefix ? 'pl-12' : ''}`}
        />
      </div>
    </div>
  );
};

// ============= SIMULATION FUNCTION =============
const simulateRoute = (vehicle: VehicleData, route: RouteData): SimulationResult => {
  const totalFreight = [...route.pickups, ...route.deliveries].reduce((acc, p) => acc + safeFloat(p.value), 0);
  const estimatedDistance = 1500;
  const estimatedDuration = 24;
  const days = Math.ceil(estimatedDuration / (vehicle.drivingHoursPerDay || 9));
  const fuelCost = (estimatedDistance / (vehicle.fuelConsumption || 2.5)) * (vehicle.fuelPrice || 6.5);
  const tollCost = estimatedDistance * 0.14 * (vehicle.axles || 6);
  const commission = totalFreight * ((vehicle.driverCommissionPercentage || 10) / 100);
  const tireCost = estimatedDistance * 0.15;
  const oilCost = estimatedDistance * 0.05;
  const maintenanceCost = tireCost + oilCost;
  const yearlyFixed = safeFloat(vehicle.insuranceYearly) + safeFloat(vehicle.registrationYearly) + (safeFloat(vehicle.driverSalaryMonthly) * 13);
  const dailyFixed = yearlyFixed / 365;
  const fixedCost = dailyFixed * days;
  const totalCost = fuelCost + tollCost + commission + maintenanceCost + fixedCost;
  const netProfit = totalFreight - totalCost;

  let viabilityScore: 'high' | 'medium' | 'low' = 'medium';
  if (netProfit < 0) viabilityScore = 'low';
  else if (totalFreight > 0 && (netProfit / totalFreight) > 0.25) viabilityScore = 'high';

  return {
    totalDistanceKm: estimatedDistance,
    totalDurationHours: estimatedDuration,
    totalDurationDays: days,
    estimatedFuelCost: fuelCost,
    estimatedTollCost: tollCost,
    driverCommissionCost: commission,
    estimatedMaintenanceCost: maintenanceCost,
    estimatedFixedCost: fixedCost,
    totalFreightIncome: totalFreight,
    netProfit,
    viabilityScore,
    viabilityMessage: viabilityScore === 'high'
      ? 'Excelente! Esta rota apresenta boa margem de lucro.'
      : viabilityScore === 'medium'
        ? 'Viabilidade aceitável. Revise custos para melhorar margem.'
        : 'Atenção! Esta rota pode gerar prejuízo.',
    routeSuggestions: 'Verifique os postos de combustível na rota para melhores preços. Evite horários de pico nas praças de pedágio.',
  };
};

// ============= MAIN APP =============
const Index = () => {
  const [step, setStep] = useState<AppStep>('driver');
  const [vehicle, setVehicle] = useState<VehicleData>(DEFAULT_VEHICLE);
  const [route, setRoute] = useState<RouteData>(DEFAULT_ROUTE);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof VehicleData, value: string | number | boolean) => {
    if (typeof value === 'string') {
      let clean = value.trim();
      if (clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      }
      const numValue = parseFloat(clean);
      if (!isNaN(numValue)) {
        setVehicle(prev => ({ ...prev, [field]: numValue }));
        return;
      }
    }
    setVehicle(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => {
      const res = simulateRoute(vehicle, route);
      setResult(res);
      setStep('dashboard');
      setLoading(false);
    }, 1500);
  };

  const handleReset = () => {
    setStep('driver');
    setResult(null);
    setRoute(DEFAULT_ROUTE);
  };

  // Route helpers
  const addPoint = (type: 'pickups' | 'deliveries') => {
    const newPoint: RoutePoint = {
      id: Math.random().toString(36).substr(2, 9),
      type: type === 'pickups' ? 'pickup' : 'delivery',
      address: '',
      value: 0,
      weight: 0,
    };
    setRoute(prev => ({ ...prev, [type]: [...prev[type], newPoint] }));
  };

  const removePoint = (type: 'pickups' | 'deliveries', id: string) => {
    setRoute(prev => ({ ...prev, [type]: prev[type].filter(p => p.id !== id) }));
  };

  const updatePoint = (type: 'pickups' | 'deliveries', id: string, field: string, value: string | number) => {
    setRoute(prev => ({
      ...prev,
      [type]: prev[type].map(p => p.id === id ? { ...p, [field]: value } : p),
    }));
  };

  const handleNumericUpdate = (type: 'pickups' | 'deliveries', id: string, field: string, value: string) => {
    let clean = value.trim();
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    const numValue = parseFloat(clean);
    updatePoint(type, id, field, isNaN(numValue) ? 0 : numValue);
  };

  const totalWeightUsed = route.pickups.reduce((acc, p) => acc + safeFloat(p.weight), 0);
  const isOverweight = totalWeightUsed > vehicle.cargoCapacity;

  const axleOptions = [
    { value: 2, label: '2 Eixos', description: 'Toco / 3/4' },
    { value: 3, label: '3 Eixos', description: 'Truck' },
    { value: 4, label: '4 Eixos', description: 'Bi-Truck' },
    { value: 5, label: '5 Eixos', description: 'Carreta' },
    { value: 6, label: '6 Eixos', description: 'Carreta LS' },
    { value: 7, label: '7 Eixos', description: 'Bi-Trem' },
    { value: 9, label: '9 Eixos', description: 'Rodotrem' },
  ];

  // Calculate tire cost
  const priceNew = safeFloat(vehicle.refTirePriceNew);
  const lifeNew = safeFloat(vehicle.refTireLifespanNew) || 1;
  const priceRemold = safeFloat(vehicle.refTirePriceRemold);
  const lifeRemold = safeFloat(vehicle.refTireLifespanRemold) || 1;
  const totalNewQty = safeFloat(vehicle.tireSteerQtyNew) + safeFloat(vehicle.tireDriveQtyNew) + safeFloat(vehicle.tireTrailerQtyNew);
  const totalRemoldQty = safeFloat(vehicle.tireSteerQtyRemold) + safeFloat(vehicle.tireDriveQtyRemold) + safeFloat(vehicle.tireTrailerQtyRemold);
  const tireCostPerKm = (totalNewQty * priceNew / lifeNew) + (totalRemoldQty * priceRemold / lifeRemold);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Frete<span className="text-blue-600">Certo</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <User size={14} className="text-blue-500" />
            <span className="text-sm">{vehicle.driverName || 'Motorista'}</span>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        
        {/* STEP: Driver Setup */}
        {step === 'driver' && (
          <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 text-white shadow-xl mb-4">
                <Truck size={40} />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Configurar Veículo</h1>
              <p className="text-slate-500 text-lg">Dados básicos do seu caminhão para cálculo preciso</p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-xl"><User size={20} className="text-blue-600" /></div>
                <h2 className="text-lg font-bold text-slate-800">Identificação</h2>
              </div>
              <SpeechInput label="Nome do Motorista" value={vehicle.driverName} onChange={(v) => handleChange('driverName', v)} placeholder="Ex: João Silva" />
              <div className="mt-4">
                <SpeechInput label="Placa do Veículo" value={vehicle.licensePlate || ''} onChange={(v) => handleChange('licensePlate', v.toUpperCase())} placeholder="ABC-1234" />
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-amber-100 p-2 rounded-xl"><Car size={20} className="text-amber-600" /></div>
                <h2 className="text-lg font-bold text-slate-800">Tipo de Veículo</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {axleOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setVehicle(prev => ({ ...prev, axles: opt.value }))}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${vehicle.axles === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                    <div className="font-bold text-lg">{opt.label}</div>
                    <div className="text-xs opacity-70">{opt.description}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-2 rounded-xl"><Gauge size={20} className="text-green-600" /></div>
                <h2 className="text-lg font-bold text-slate-800">Capacidade e Consumo</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <SpeechInput label="Capacidade de Carga (Toneladas)" type="number" value={vehicle.cargoCapacity} onChange={(v) => handleChange('cargoCapacity', v)} placeholder="Ex: 32" />
                <SpeechInput label="Consumo Médio (km/L)" type="number" value={vehicle.fuelConsumption} onChange={(v) => handleChange('fuelConsumption', v)} placeholder="Ex: 2.5" />
                <SpeechInput label="Preço do Diesel (R$/L)" type="number" prefix="R$" value={vehicle.fuelPrice} onChange={(v) => handleChange('fuelPrice', v)} placeholder="Ex: 6,50" />
                <SpeechInput label="Comissão do Motorista (%)" type="number" value={vehicle.driverCommissionPercentage} onChange={(v) => handleChange('driverCommissionPercentage', v)} placeholder="Ex: 10" />
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <div className="max-w-3xl mx-auto flex gap-4 p-4">
                <button onClick={() => setStep('costs')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg transition-all active:scale-[0.98]">
                  Continuar <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Costs */}
        {step === 'costs' && (
          <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-600 text-white shadow-xl mb-4">
                <DollarSign size={40} />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Custos do Veículo</h1>
              <p className="text-slate-500 text-lg">Informe os custos fixos e de pneus</p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Custos Fixos (Anuais/Mensais)</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <SpeechInput label="Salário Mensal (R$)" type="number" prefix="R$" value={vehicle.driverSalaryMonthly || ''} onChange={(v) => handleChange('driverSalaryMonthly', v)} placeholder="Ex: 3.500" />
                <SpeechInput label="Seguro Anual (R$)" type="number" prefix="R$" value={vehicle.insuranceYearly || ''} onChange={(v) => handleChange('insuranceYearly', v)} placeholder="Ex: 15.000" />
                <SpeechInput label="IPVA/Licenciamento Anual (R$)" type="number" prefix="R$" value={vehicle.registrationYearly || ''} onChange={(v) => handleChange('registrationYearly', v)} placeholder="Ex: 5.000" />
                <SpeechInput label="Valor do Veículo (R$)" type="number" prefix="R$" value={vehicle.assetValue || ''} onChange={(v) => handleChange('assetValue', v)} placeholder="Ex: 500.000" />
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Pneus - Preços de Referência</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-3">Pneus Novos</p>
                  <SpeechInput label="Preço Unitário (R$)" type="number" prefix="R$" value={vehicle.refTirePriceNew || ''} onChange={(v) => handleChange('refTirePriceNew', v)} placeholder="Ex: 3.500" />
                  <div className="mt-3">
                    <SpeechInput label="Vida Útil (km)" type="number" value={vehicle.refTireLifespanNew || ''} onChange={(v) => handleChange('refTireLifespanNew', v)} placeholder="Ex: 100.000" />
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs font-bold text-orange-600 uppercase mb-3">Pneus Remold</p>
                  <SpeechInput label="Preço Unitário (R$)" type="number" prefix="R$" value={vehicle.refTirePriceRemold || ''} onChange={(v) => handleChange('refTirePriceRemold', v)} placeholder="Ex: 1.800" />
                  <div className="mt-3">
                    <SpeechInput label="Vida Útil (km)" type="number" value={vehicle.refTireLifespanRemold || ''} onChange={(v) => handleChange('refTireLifespanRemold', v)} placeholder="Ex: 60.000" />
                  </div>
                </div>
              </div>
              <div className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Custo de Pneus por Km</span>
                  <span className="text-2xl font-black">R$ {tireCostPerKm.toFixed(4)}</span>
                </div>
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50">
              <div className="max-w-3xl mx-auto flex gap-4 p-4">
                <button onClick={() => setStep('driver')} className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold"><ArrowLeft size={24} /></button>
                <button onClick={() => setStep('vehicle')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg">
                  Continuar <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Vehicle Maintenance */}
        {step === 'vehicle' && (
          <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-600 text-white shadow-xl mb-4">
                <Settings size={40} />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Manutenção</h1>
              <p className="text-slate-500 text-lg">Dados de óleo e filtros para cálculo</p>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Gauge size={20} /> Hodômetro</h2>
              <SpeechInput label="Quilometragem Atual (km)" type="number" value={vehicle.currentOdometer || ''} onChange={(v) => handleChange('currentOdometer', v)} placeholder="Ex: 350.000" />
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Droplet size={20} className="text-amber-500" /> Óleo do Motor</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <SpeechInput label="Custo da Troca (R$)" type="number" prefix="R$" value={vehicle.lastOilChangeCost || ''} onChange={(v) => handleChange('lastOilChangeCost', v)} placeholder="Ex: 1.500" />
                <SpeechInput label="Intervalo de Troca (km)" type="number" value={vehicle.oilChangeIntervalKm || ''} onChange={(v) => handleChange('oilChangeIntervalKm', v)} placeholder="Ex: 20.000" />
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Filter size={20} className="text-teal-500" /> Kit de Filtros</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <SpeechInput label="Custo do Kit (R$)" type="number" prefix="R$" value={vehicle.lastFilterChangeCost || ''} onChange={(v) => handleChange('lastFilterChangeCost', v)} placeholder="Ex: 800" />
                <SpeechInput label="Intervalo de Troca (km)" type="number" value={vehicle.filterChangeIntervalKm || ''} onChange={(v) => handleChange('filterChangeIntervalKm', v)} placeholder="Ex: 20.000" />
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50">
              <div className="max-w-3xl mx-auto flex gap-4 p-4">
                <button onClick={() => setStep('costs')} className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold"><ArrowLeft size={24} /></button>
                <button onClick={() => setStep('pickup')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg">
                  Definir Rota <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Pickup */}
        {step === 'pickup' && (
          <div className="max-w-3xl mx-auto space-y-8 pb-40 animate-fade-in">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-green-50 p-4 md:p-6 border-l-8 border-green-600">
                <h2 className="text-xl md:text-2xl font-bold text-green-900 flex items-center gap-3">
                  <div className="bg-green-600 text-white p-2 rounded-lg"><MapPin size={20} /></div>
                  Coleta
                </h2>
                <p className="text-green-800 text-sm md:text-lg mt-1 font-medium opacity-80">De onde você vai buscar a carga?</p>
              </div>
              <div className="space-y-4 p-4">
                {route.pickups.map((point, index) => (
                  <div key={point.id} className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">{index + 1}</div>
                      {route.pickups.length > 1 && (
                        <button onClick={() => removePoint('pickups', point.id)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm font-semibold">
                          <Trash2 size={18} /> Remover
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4">
                      <SpeechInput label="Endereço de Coleta" value={point.address} onChange={(v) => updatePoint('pickups', point.id, 'address', v)} placeholder="Ex: Fazenda Santa Maria, Sorriso-MT" />
                      <div className="grid grid-cols-2 gap-4">
                        <SpeechInput label="Peso (Ton)" type="number" value={point.weight || ''} onChange={(v) => handleNumericUpdate('pickups', point.id, 'weight', v)} placeholder="Ex: 28" />
                        <SpeechInput label="Valor do Frete (R$)" type="number" prefix="R$" value={point.value || ''} onChange={(v) => handleNumericUpdate('pickups', point.id, 'value', v)} placeholder="Ex: 15.000" />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => addPoint('pickups')} className="w-full py-4 border-2 border-dashed border-green-300 bg-green-50 rounded-xl text-green-700 hover:bg-green-100 font-bold flex items-center justify-center gap-2">
                  <Plus size={20} /> Adicionar coleta
                </button>
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50">
              {vehicle.cargoCapacity > 0 && (
                <div className="max-w-3xl mx-auto pt-3 px-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-700 flex items-center gap-1"><Scale size={14} /> Capacidade</span>
                      <span className={isOverweight ? 'text-red-600' : 'text-green-700'}>{totalWeightUsed} / {vehicle.cargoCapacity} Ton</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className={`h-full transition-all duration-500 rounded-full ${isOverweight ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((totalWeightUsed / vehicle.cargoCapacity) * 100, 100)}%` }}></div>
                    </div>
                    {isOverweight && <div className="flex items-center gap-2 mt-2 text-red-600 font-bold text-xs animate-pulse"><AlertTriangle size={14} /> Excesso!</div>}
                  </div>
                </div>
              )}
              <div className="max-w-3xl mx-auto flex gap-4 p-4">
                <button onClick={() => setStep('vehicle')} className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold"><ArrowLeft size={24} /></button>
                <button onClick={() => setStep('delivery')} disabled={isOverweight} className={`flex-1 font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg ${isOverweight ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  Continuar <ArrowRight size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Delivery */}
        {step === 'delivery' && (
          <div className="max-w-3xl mx-auto space-y-8 pb-32 animate-fade-in">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-50 p-4 md:p-6 border-l-8 border-blue-600">
                <h2 className="text-xl md:text-2xl font-bold text-blue-900 flex items-center gap-3">
                  <div className="bg-blue-600 text-white p-2 rounded-lg"><Truck size={20} /></div>
                  Entrega
                </h2>
                <p className="text-blue-800 text-sm md:text-lg mt-1 font-medium opacity-80">Onde você vai deixar a carga?</p>
              </div>
              <div className="space-y-4 p-4">
                {route.deliveries.map((point, index) => (
                  <div key={point.id} className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">{index + 1}</div>
                      {route.deliveries.length > 1 && (
                        <button onClick={() => removePoint('deliveries', point.id)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm font-semibold">
                          <Trash2 size={18} /> Remover
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4">
                      <SpeechInput label="Endereço de Entrega" value={point.address} onChange={(v) => updatePoint('deliveries', point.id, 'address', v)} placeholder="Ex: Porto de Santos, SP" />
                      <SpeechInput label="Custo Adicional (R$)" type="number" prefix="R$" value={point.value || ''} onChange={(v) => handleNumericUpdate('deliveries', point.id, 'value', v)} placeholder="0,00" />
                    </div>
                  </div>
                ))}
                <button onClick={() => addPoint('deliveries')} className="w-full py-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 font-bold flex items-center justify-center gap-2">
                  <Plus size={20} /> Adicionar entrega
                </button>
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50">
              <div className="max-w-3xl mx-auto flex gap-4 p-4">
                <button onClick={() => setStep('pickup')} className="px-6 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-bold"><ArrowLeft size={24} /></button>
                <button onClick={handleAnalyze} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg">
                  <FileCheck size={24} /> CALCULAR LUCRO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Dashboard */}
        {step === 'dashboard' && result && (
          <div className="max-w-4xl mx-auto pb-10 space-y-8 animate-fade-in">
            <div className={`rounded-3xl p-8 text-white shadow-2xl ${result.viabilityScore === 'high' ? 'bg-gradient-to-br from-emerald-600 to-teal-800' : result.viabilityScore === 'medium' ? 'bg-gradient-to-br from-amber-500 to-orange-700' : 'bg-gradient-to-br from-red-600 to-rose-800'}`}>
              <div className="flex items-center gap-3 mb-4">
                {result.viabilityScore === 'high' ? <CheckCircle className="w-10 h-10" /> : result.viabilityScore === 'medium' ? <AlertTriangle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                <h2 className="text-3xl font-extrabold">
                  {result.viabilityScore === 'high' ? 'Alta Viabilidade' : result.viabilityScore === 'medium' ? 'Viabilidade Média' : 'Baixa Viabilidade'}
                </h2>
              </div>
              <p className="text-lg opacity-90">{result.viabilityMessage}</p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                  <p className="text-sm opacity-80">Distância</p>
                  <p className="text-2xl font-bold">{result.totalDistanceKm.toFixed(0)} km</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                  <p className="text-sm opacity-80">Duração</p>
                  <p className="text-2xl font-bold">{result.totalDurationDays} dias</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                  <p className="text-sm opacity-80">Frete</p>
                  <p className="text-2xl font-bold">{formatCurrency(result.totalFreightIncome)}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                  <p className="text-sm opacity-80">Lucro Líquido</p>
                  <p className={`text-2xl font-bold ${result.netProfit < 0 ? 'text-red-200' : ''}`}>{formatCurrency(result.netProfit)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign size={24} className="text-blue-600" /> Composição de Custos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Combustível', value: result.estimatedFuelCost, color: '#EF4444' },
                      { name: 'Pedágios', value: result.estimatedTollCost, color: '#F59E0B' },
                      { name: 'Comissão', value: result.driverCommissionCost, color: '#8B5CF6' },
                      { name: 'Manutenção', value: result.estimatedMaintenanceCost, color: '#F97316' },
                      { name: 'Fixos', value: result.estimatedFixedCost, color: '#6366F1' },
                      ...(result.netProfit > 0 ? [{ name: 'Lucro', value: result.netProfit, color: '#10B981' }] : []),
                    ]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {[
                        { color: '#EF4444' }, { color: '#F59E0B' }, { color: '#8B5CF6' }, { color: '#F97316' }, { color: '#6366F1' },
                        ...(result.netProfit > 0 ? [{ color: '#10B981' }] : []),
                      ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Map size={24} className="text-green-600" /> Sugestões</h3>
              <p className="text-slate-600">{result.routeSuggestions}</p>
            </div>

            <button onClick={handleReset} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 text-lg">
              <RefreshCw size={24} /> Nova Simulação
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl font-bold text-slate-800">Calculando...</p>
              <p className="text-slate-500">Analisando custos e viabilidade</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
