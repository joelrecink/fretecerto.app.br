import React, { useState } from 'react';
import { Truck, User } from 'lucide-react';
import IdentificationScreen from '@/components/frete/screens/IdentificationScreen';
import OperationalScreen from '@/components/frete/screens/OperationalScreen';
import CostsMaintenanceScreen from '@/components/frete/screens/CostsMaintenanceScreen';
import PickupScreen from '@/components/frete/screens/PickupScreen';
import DeliveryScreen from '@/components/frete/screens/DeliveryScreen';
import TripSummaryScreen from '@/components/frete/screens/TripSummaryScreen';
import DashboardScreen from '@/components/frete/screens/DashboardScreen';

type AppStep = 'identification' | 'operational' | 'costs' | 'pickup' | 'delivery' | 'summary' | 'dashboard';

interface VehicleData {
  driverName: string;
  licensePlate?: string;
  fuelConsumption: number;
  fuelPrice: number;
  axles: number;
  drivingHoursPerDay: number;
  driverCommissionPercentage: number;
  cargoCapacity: number;
  driverSalaryMonthly?: number;
  driverSalaryInclude13th?: boolean;
  assetValue?: number;
  annualDepreciationRate?: number;
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
  lastFilterChangeCost?: number;
  filterChangeIntervalKm?: number;
}

interface RoutePoint {
  id: string;
  address: string;
  value: number;
  weight?: number;
}

interface SimulationResult {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalDurationDays: number;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  driverCommissionCost: number;
  estimatedMaintenanceCost: number;
  estimatedFixedCost?: number;
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  routeSuggestions?: string;
}

const DEFAULT_VEHICLE: VehicleData = {
  driverName: '',
  fuelConsumption: 2.5,
  fuelPrice: 6.50,
  axles: 6,
  drivingHoursPerDay: 9,
  driverCommissionPercentage: 10,
  cargoCapacity: 32,
};

const Index = () => {
  const [step, setStep] = useState<AppStep>('identification');
  const [vehicle, setVehicle] = useState<VehicleData>(DEFAULT_VEHICLE);
  const [pickups, setPickups] = useState<RoutePoint[]>([{ id: '1', address: '', value: 0, weight: 0 }]);
  const [deliveries, setDeliveries] = useState<RoutePoint[]>([{ id: '1', address: '', value: 0 }]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVehicleUpdate = (field: string, value: number | string | boolean) => {
    setVehicle(prev => ({ ...prev, [field]: value }));
  };

  const addPickup = () => setPickups(prev => [...prev, { id: Date.now().toString(), address: '', value: 0, weight: 0 }]);
  const removePickup = (id: string) => setPickups(prev => prev.filter(p => p.id !== id));
  const updatePickup = (id: string, field: string, value: string | number) => {
    setPickups(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addDelivery = () => setDeliveries(prev => [...prev, { id: Date.now().toString(), address: '', value: 0 }]);
  const removeDelivery = (id: string) => setDeliveries(prev => prev.filter(d => d.id !== id));
  const updateDelivery = (id: string, field: string, value: string | number) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const totalFreight = [...pickups, ...deliveries].reduce((acc, p) => acc + (p.value || 0), 0);

  const handleCalculate = () => {
    setLoading(true);
    setTimeout(() => {
      const distance = 1500;
      const duration = 24;
      const days = Math.ceil(duration / vehicle.drivingHoursPerDay);
      const fuelCost = (distance / vehicle.fuelConsumption) * vehicle.fuelPrice;
      const tollCost = distance * 0.14 * vehicle.axles;
      const commission = totalFreight * (vehicle.driverCommissionPercentage / 100);
      const maintenance = distance * 0.20;
      const fixed = ((vehicle.insuranceYearly || 0) + (vehicle.registrationYearly || 0) + ((vehicle.driverSalaryMonthly || 0) * 13)) / 365 * days;
      const totalCost = fuelCost + tollCost + commission + maintenance + fixed;
      const netProfit = totalFreight - totalCost;

      setResult({
        totalDistanceKm: distance,
        totalDurationHours: duration,
        totalDurationDays: days,
        estimatedFuelCost: fuelCost,
        estimatedTollCost: tollCost,
        driverCommissionCost: commission,
        estimatedMaintenanceCost: maintenance,
        estimatedFixedCost: fixed,
        totalFreightIncome: totalFreight,
        netProfit,
        viabilityScore: netProfit < 0 ? 'low' : netProfit / totalFreight > 0.25 ? 'high' : 'medium',
        viabilityMessage: netProfit < 0 ? 'Atenção: Esta rota pode gerar prejuízo.' : 'Viagem com boa margem de lucro.',
        routeSuggestions: 'Verifique postos de combustível na rota para melhores preços.',
      });
      setStep('dashboard');
      setLoading(false);
    }, 1500);
  };

  const handleReset = () => {
    setStep('identification');
    setResult(null);
    setPickups([{ id: '1', address: '', value: 0, weight: 0 }]);
    setDeliveries([{ id: '1', address: '', value: 0 }]);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-[hsl(var(--border))]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              Frete<span className="text-blue-600">Certo</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] text-sm">
            <User size={16} />
            <span>{vehicle.driverName || 'Motorista'}</span>
          </div>
        </div>
      </header>

      {/* Screens */}
      {step === 'identification' && (
        <IdentificationScreen
          driverName={vehicle.driverName}
          onNameChange={(name) => handleVehicleUpdate('driverName', name)}
          onContinue={() => setStep('operational')}
        />
      )}
      {step === 'operational' && (
        <OperationalScreen
          data={vehicle}
          onUpdate={handleVehicleUpdate}
          onNext={() => setStep('costs')}
          onBack={() => setStep('identification')}
        />
      )}
      {step === 'costs' && (
        <CostsMaintenanceScreen
          data={vehicle}
          onUpdate={handleVehicleUpdate}
          onNext={() => setStep('pickup')}
          onBack={() => setStep('operational')}
        />
      )}
      {step === 'pickup' && (
        <PickupScreen
          pickups={pickups}
          cargoCapacity={vehicle.cargoCapacity}
          onAddPickup={addPickup}
          onRemovePickup={removePickup}
          onUpdatePickup={updatePickup}
          onNext={() => setStep('delivery')}
          onBack={() => setStep('costs')}
        />
      )}
      {step === 'delivery' && (
        <DeliveryScreen
          deliveries={deliveries}
          onAddDelivery={addDelivery}
          onRemoveDelivery={removeDelivery}
          onUpdateDelivery={updateDelivery}
          onCalculate={() => setStep('summary')}
          onBack={() => setStep('pickup')}
          loading={loading}
        />
      )}
      {step === 'summary' && (
        <TripSummaryScreen
          vehicleInfo={vehicle}
          pickups={pickups}
          deliveries={deliveries}
          totalFreight={totalFreight}
          onCalculate={handleCalculate}
          onBack={() => setStep('delivery')}
          onEditVehicle={() => setStep('operational')}
          loading={loading}
        />
      )}
      {step === 'dashboard' && result && (
        <DashboardScreen result={result} onReset={handleReset} />
      )}
    </div>
  );
};

export default Index;
