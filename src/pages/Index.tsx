import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Car, History } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useVehicles } from '@/hooks/useVehicles';
import { useTripHistory } from '@/hooks/useTripHistory';
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
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { vehicles, saveVehicle } = useVehicles();
  const { saveTrip } = useTripHistory();

  const [step, setStep] = useState<AppStep>('identification');
  const [vehicle, setVehicle] = useState<VehicleData>(DEFAULT_VEHICLE);
  const [pickups, setPickups] = useState<RoutePoint[]>([{ id: '1', address: '', value: 0, weight: 0 }]);
  const [deliveries, setDeliveries] = useState<RoutePoint[]>([{ id: '1', address: '', value: 0 }]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Load user profile name if logged in
  useEffect(() => {
    if (user?.user_metadata?.full_name && !vehicle.driverName) {
      setVehicle(prev => ({ ...prev, driverName: user.user_metadata.full_name }));
    }
  }, [user]);

  // Load first saved vehicle if available
  useEffect(() => {
    if (vehicles.length > 0 && !vehicle.licensePlate) {
      const v = vehicles[0];
      setVehicle(prev => ({
        ...prev,
        licensePlate: v.license_plate,
        fuelConsumption: v.fuel_consumption,
        fuelPrice: v.fuel_price,
        axles: v.axles,
        cargoCapacity: v.cargo_capacity,
        drivingHoursPerDay: v.driving_hours_per_day || 9,
        driverCommissionPercentage: v.driver_commission_percentage || 10,
        driverSalaryMonthly: v.driver_salary_monthly || undefined,
        insuranceYearly: v.insurance_yearly || undefined,
        registrationYearly: v.registration_yearly || undefined,
      }));
    }
  }, [vehicles]);

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

  const handleCalculate = async () => {
    setLoading(true);

    // Simulate calculation
    setTimeout(async () => {
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

      const simulationResult: SimulationResult = {
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
      };

      setResult(simulationResult);
      setStep('dashboard');

      if (user) {
        await saveTrip({
          license_plate: vehicle.licensePlate,
          pickups: JSON.parse(JSON.stringify(pickups)),
          deliveries: JSON.parse(JSON.stringify(deliveries)),
          total_distance_km: distance,
          total_duration_hours: duration,
          total_duration_days: days,
          estimated_fuel_cost: fuelCost,
          estimated_toll_cost: tollCost,
          driver_commission_cost: commission,
          estimated_maintenance_cost: maintenance,
          estimated_fixed_cost: fixed,
          total_freight_income: totalFreight,
          net_profit: netProfit,
          viability_score: simulationResult.viabilityScore,
          viability_message: simulationResult.viabilityMessage,
          route_suggestions: simulationResult.routeSuggestions,
        });
      }

      setLoading(false);
    }, 1500);
  };

  const handleSaveVehicle = async () => {
    if (!vehicle.licensePlate) return;
    
    await saveVehicle({
      license_plate: vehicle.licensePlate,
      fuel_consumption: vehicle.fuelConsumption,
      fuel_price: vehicle.fuelPrice,
      axles: vehicle.axles,
      cargo_capacity: vehicle.cargoCapacity,
      driving_hours_per_day: vehicle.drivingHoursPerDay,
      driver_commission_percentage: vehicle.driverCommissionPercentage,
      driver_salary_monthly: vehicle.driverSalaryMonthly,
      driver_salary_include_13th: vehicle.driverSalaryInclude13th,
      asset_value: vehicle.assetValue,
      annual_depreciation_rate: vehicle.annualDepreciationRate,
      insurance_yearly: vehicle.insuranceYearly,
      registration_yearly: vehicle.registrationYearly,
      ref_tire_price_new: vehicle.refTirePriceNew,
      ref_tire_lifespan_new: vehicle.refTireLifespanNew,
      ref_tire_price_remold: vehicle.refTirePriceRemold,
      ref_tire_lifespan_remold: vehicle.refTireLifespanRemold,
      tire_steer_qty_new: vehicle.tireSteerQtyNew,
      tire_steer_qty_remold: vehicle.tireSteerQtyRemold,
      tire_drive_qty_new: vehicle.tireDriveQtyNew,
      tire_drive_qty_remold: vehicle.tireDriveQtyRemold,
      tire_trailer_qty_new: vehicle.tireTrailerQtyNew,
      tire_trailer_qty_remold: vehicle.tireTrailerQtyRemold,
      oil_change_interval_km: vehicle.oilChangeIntervalKm,
      last_oil_change_cost: vehicle.lastOilChangeCost,
      filter_change_interval_km: vehicle.filterChangeIntervalKm,
      last_filter_change_cost: vehicle.lastFilterChangeCost,
    });
  };

  const handleReset = () => {
    setStep('identification');
    setResult(null);
    setPickups([{ id: '1', address: '', value: 0, weight: 0 }]);
    setDeliveries([{ id: '1', address: '', value: 0 }]);
  };

  const handleLogin = () => navigate('/auth');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] text-sm bg-[hsl(var(--secondary))] px-3 py-1.5 rounded-full">
                  <User size={14} />
                  <span>{vehicle.driverName || user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Screens */}
      {step === 'identification' && (
        <IdentificationScreen
          driverName={vehicle.driverName}
          onNameChange={(name) => handleVehicleUpdate('driverName', name)}
          onContinue={() => setStep('costs')}
          onLogin={handleLogin}
        />
      )}
      {step === 'costs' && (
        <CostsMaintenanceScreen
          data={vehicle}
          onUpdate={handleVehicleUpdate}
          onNext={() => setStep('operational')}
          onBack={() => setStep('identification')}
        />
      )}
      {step === 'operational' && (
        <OperationalScreen
          data={vehicle}
          onUpdate={handleVehicleUpdate}
          onNext={() => {
            if (user && vehicle.licensePlate) {
              handleSaveVehicle();
            }
            setStep('pickup');
          }}
          onBack={() => setStep('costs')}
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
