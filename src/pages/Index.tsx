import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Menu, X, Truck, MapPin, Settings, Shield, Coins } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useVehicles, SavedVehicle } from '@/hooks/useVehicles';
import { useTripHistory } from '@/hooks/useTripHistory';
import { useRouteCalculation } from '@/hooks/useRouteCalculation';
import { useCredits } from '@/hooks/useCredits';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  modelName?: string;
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
  currentOdometer?: number;
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
  // Filters
  lastFilterChangeCost?: number;
  filterChangeIntervalKm?: number;
}

interface RoutePoint {
  id: string;
  address: string;
  value: number;
  weight?: number;
}

interface AIAnalysis {
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  profitMargin: number;
  alerts: string[];
  optimizationTips: string[];
  marketAnalysis: string;
  returnAnalysis?: {
    hasReturnLoad: boolean;
    estimatedReturnCost: number;
    recommendation: string;
  };
  suggestedFreightValue?: number;
  summary: string;
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
  returnCost?: number;
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  routeSuggestions?: string;
  aiAnalysis?: AIAnalysis;
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
  const { isAdmin } = useUserRole();
  const { vehicles, saveVehicle, updateVehicle } = useVehicles();
  const { saveTrip } = useTripHistory();
  const { calculateRoute, loading: routeLoading, result: routeResult } = useRouteCalculation();
  const { balance: userCredits, refreshBalance } = useCredits();

  const [step, setStep] = useState<AppStep>('identification');
  const [vehicle, setVehicle] = useState<VehicleData>(DEFAULT_VEHICLE);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [pickups, setPickups] = useState<RoutePoint[]>([{ id: '1', address: '', value: 0, weight: 0 }]);
  const [deliveries, setDeliveries] = useState<RoutePoint[]>([{ id: '1', address: '', value: 0 }]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [estimatedDistance, setEstimatedDistance] = useState<number | undefined>(undefined);

  // Load user profile name if logged in
  useEffect(() => {
    if (user?.user_metadata?.full_name && !vehicle.driverName) {
      setVehicle(prev => ({ ...prev, driverName: user.user_metadata.full_name }));
    }
  }, [user]);

  // Function to load vehicle data from SavedVehicle
  const loadVehicleData = useCallback((v: SavedVehicle) => {
    setSelectedVehicleId(v.id);
    setVehicle(prev => ({
      ...prev,
      licensePlate: v.license_plate,
      modelName: v.model_name || undefined,
      fuelConsumption: v.fuel_consumption,
      fuelPrice: v.fuel_price,
      axles: v.axles,
      cargoCapacity: v.cargo_capacity,
      drivingHoursPerDay: v.driving_hours_per_day || 9,
      driverCommissionPercentage: v.driver_commission_percentage || 10,
      driverSalaryMonthly: v.driver_salary_monthly || undefined,
      driverSalaryInclude13th: v.driver_salary_include_13th ?? true,
      assetValue: v.asset_value || undefined,
      annualDepreciationRate: v.annual_depreciation_rate || undefined,
      insuranceYearly: v.insurance_yearly || undefined,
      registrationYearly: v.registration_yearly || undefined,
      currentOdometer: v.current_odometer || undefined,
      // Tire References
      refTirePriceNew: v.ref_tire_price_new || undefined,
      refTireLifespanNew: v.ref_tire_lifespan_new || undefined,
      refTirePriceRemold: v.ref_tire_price_remold || undefined,
      refTireLifespanRemold: v.ref_tire_lifespan_remold || undefined,
      // Tire Quantities
      tireSteerQtyNew: v.tire_steer_qty_new || undefined,
      tireSteerQtyRemold: v.tire_steer_qty_remold || undefined,
      tireDriveQtyNew: v.tire_drive_qty_new || undefined,
      tireDriveQtyRemold: v.tire_drive_qty_remold || undefined,
      tireTrailerQtyNew: v.tire_trailer_qty_new || undefined,
      tireTrailerQtyRemold: v.tire_trailer_qty_remold || undefined,
      // Engine Oil
      lastOilChangeCost: v.last_oil_change_cost || undefined,
      oilChangeIntervalKm: v.oil_change_interval_km || undefined,
      // Filters
      lastFilterChangeCost: v.last_filter_change_cost || undefined,
      filterChangeIntervalKm: v.filter_change_interval_km || undefined,
    }));
  }, []);

  // Load first saved vehicle if available
  useEffect(() => {
    if (vehicles.length > 0 && !vehicle.licensePlate) {
      loadVehicleData(vehicles[0]);
    }
  }, [vehicles, vehicle.licensePlate, loadVehicleData]);

  const handleVehicleUpdate = (field: string, value: number | string | boolean) => {
    setVehicle(prev => ({ ...prev, [field]: value }));
  };

  // Handle selecting a saved vehicle
  const handleSelectVehicle = (savedVehicle: SavedVehicle) => {
    loadVehicleData(savedVehicle);
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

  // Pre-calculate route to get estimated distance for return cost calculation
  const preCalculateRoute = async () => {
    try {
      const routeRes = await calculateRoute(pickups, deliveries, vehicle.axles, vehicle.cargoCapacity);
      if (routeRes) {
        setEstimatedDistance(routeRes.totalDistanceKm);
      }
    } catch (error) {
      console.error('Error pre-calculating route:', error);
    }
  };

  // Pre-calculate when moving to summary step
  useEffect(() => {
    if (step === 'summary') {
      preCalculateRoute();
    }
  }, [step]);

  const handleCalculate = async (includeReturn: boolean = false, returnCost: number = 0) => {
    setCalculating(true);

    try {
      // Call Google Maps API + TollGuru via edge function
      const routeCalcResult = await calculateRoute(pickups, deliveries, vehicle.axles, vehicle.cargoCapacity);
      
      if (!routeCalcResult) {
        setCalculating(false);
        return;
      }

      const distance = routeCalcResult.totalDistanceKm;
      const durationHours = routeCalcResult.totalDurationHours;
      const days = Math.ceil(durationHours / vehicle.drivingHoursPerDay);
      
      // Calculate costs based on real distance
      const fuelCost = (distance / vehicle.fuelConsumption) * vehicle.fuelPrice;
      const tollCost = routeCalcResult.estimatedTollCost;
      const commission = totalFreight * (vehicle.driverCommissionPercentage / 100);
      const maintenance = distance * 0.20;
      const fixed = ((vehicle.insuranceYearly || 0) + (vehicle.registrationYearly || 0) + ((vehicle.driverSalaryMonthly || 0) * 13)) / 365 * days;
      const totalCost = fuelCost + tollCost + commission + maintenance + fixed + (includeReturn ? returnCost : 0);
      const netProfit = totalFreight - totalCost;

      // Get origin and destination cities for AI analysis
      const originCity = pickups[0]?.address || 'Origem não informada';
      const destinationCity = deliveries[deliveries.length - 1]?.address || 'Destino não informado';

      // Call AI analysis
      let aiAnalysis: AIAnalysis | undefined;
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('analyze-route-ai', {
          body: {
            routeData: {
              totalDistanceKm: distance,
              totalDurationHours: durationHours,
              totalDurationDays: days,
              estimatedFuelCost: fuelCost,
              estimatedTollCost: tollCost,
              driverCommissionCost: commission,
              estimatedMaintenanceCost: maintenance,
              estimatedFixedCost: fixed,
              totalFreightIncome: totalFreight,
              netProfit,
              originCity,
              destinationCity,
            },
            vehicleData: {
              axles: vehicle.axles,
              fuelConsumption: vehicle.fuelConsumption,
              cargoCapacity: vehicle.cargoCapacity,
            },
            includeReturn,
            returnCost,
          },
        });

        if (aiError) {
          console.error('AI analysis error:', aiError);
          if (aiError.message?.includes('INSUFFICIENT_CREDITS')) {
            toast.error('Créditos insuficientes para análise com IA');
            setCalculating(false);
            return;
          }
          toast.error('Erro na análise com IA. Usando análise básica.');
        } else if (aiData?.success) {
          aiAnalysis = aiData.analysis;
          toast.success('Análise com IA concluída! (1 crédito usado)');
          refreshBalance();
        }
      } catch (aiErr) {
        console.error('AI call failed:', aiErr);
        toast.error('Erro ao chamar serviço de IA. Usando análise básica.');
      }

      const simulationResult: SimulationResult = {
        totalDistanceKm: distance,
        totalDurationHours: durationHours,
        totalDurationDays: days,
        estimatedFuelCost: fuelCost,
        estimatedTollCost: tollCost,
        driverCommissionCost: commission,
        estimatedMaintenanceCost: maintenance,
        estimatedFixedCost: fixed,
        returnCost: includeReturn ? returnCost : undefined,
        totalFreightIncome: totalFreight,
        netProfit,
        viabilityScore: aiAnalysis?.viabilityScore || (netProfit < 0 ? 'low' : netProfit / totalFreight > 0.25 ? 'high' : 'medium'),
        viabilityMessage: aiAnalysis?.viabilityMessage || (netProfit < 0 ? 'Atenção: Esta rota pode gerar prejuízo.' : 'Viagem com boa margem de lucro.'),
        routeSuggestions: aiAnalysis?.summary || (routeCalcResult.summary ? `Rota via ${routeCalcResult.summary}` : undefined),
        aiAnalysis,
      };

      setResult(simulationResult);
      setStep('dashboard');

      if (user) {
        await saveTrip({
          license_plate: vehicle.licensePlate,
          pickups: JSON.parse(JSON.stringify(pickups)),
          deliveries: JSON.parse(JSON.stringify(deliveries)),
          total_distance_km: distance,
          total_duration_hours: durationHours,
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
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error('Erro ao calcular rota');
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!vehicle.licensePlate) return;
    
    const vehiclePayload = {
      license_plate: vehicle.licensePlate,
      model_name: vehicle.modelName,
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
      current_odometer: vehicle.currentOdometer,
      // Tire References
      ref_tire_price_new: vehicle.refTirePriceNew,
      ref_tire_lifespan_new: vehicle.refTireLifespanNew,
      ref_tire_price_remold: vehicle.refTirePriceRemold,
      ref_tire_lifespan_remold: vehicle.refTireLifespanRemold,
      // Tire Quantities
      tire_steer_qty_new: vehicle.tireSteerQtyNew,
      tire_steer_qty_remold: vehicle.tireSteerQtyRemold,
      tire_drive_qty_new: vehicle.tireDriveQtyNew,
      tire_drive_qty_remold: vehicle.tireDriveQtyRemold,
      tire_trailer_qty_new: vehicle.tireTrailerQtyNew,
      tire_trailer_qty_remold: vehicle.tireTrailerQtyRemold,
      // Engine Oil
      oil_change_interval_km: vehicle.oilChangeIntervalKm,
      last_oil_change_cost: vehicle.lastOilChangeCost,
      // Filters
      filter_change_interval_km: vehicle.filterChangeIntervalKm,
      last_filter_change_cost: vehicle.lastFilterChangeCost,
    };

    // Check if updating existing or creating new
    if (selectedVehicleId) {
      await updateVehicle(selectedVehicleId, vehiclePayload);
    } else {
      const result = await saveVehicle(vehiclePayload);
      if (result) {
        setSelectedVehicleId(result.id);
      }
    }
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
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg transition-colors"
                >
                  {menuOpen ? <X size={20} /> : <Menu size={20} />}
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

      {/* Mobile Menu */}
      {menuOpen && user && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  {vehicle.driverName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{vehicle.driverName || 'Usuário'}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{user.email}</p>
                </div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-[hsl(var(--secondary))] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[hsl(var(--secondary))] transition-colors text-left"
              >
                <User size={20} className="text-blue-600" />
                <span>Meu Perfil</span>
              </button>
              <button
                onClick={() => { navigate('/vehicles'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[hsl(var(--secondary))] transition-colors text-left"
              >
                <Truck size={20} className="text-emerald-600" />
                <span>Meus Veículos</span>
              </button>
              <button
                onClick={() => { navigate('/history'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[hsl(var(--secondary))] transition-colors text-left"
              >
                <MapPin size={20} className="text-purple-600" />
                <span>Histórico de Viagens</span>
              </button>
              <button
                onClick={() => { navigate('/credits'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-50 transition-colors text-left"
              >
                <Coins size={20} className="text-amber-600" />
                <span>Comprar Créditos</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => { navigate('/admin'); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 transition-colors text-left text-purple-700"
                >
                  <Shield size={20} />
                  <span>Painel Admin</span>
                </button>
              )}
            </nav>

            <div className="absolute bottom-4 left-4 right-4">
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
          vehicles={vehicles}
          onSelectVehicle={handleSelectVehicle}
          onSaveVehicle={handleSaveVehicle}
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
          vehicles={vehicles}
          onSelectVehicle={handleSelectVehicle}
          onSaveVehicle={handleSaveVehicle}
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
          loading={calculating || routeLoading}
        />
      )}
      {step === 'summary' && (
        <TripSummaryScreen
          vehicleInfo={{
            ...vehicle,
            fuelConsumption: vehicle.fuelConsumption,
            fuelPrice: vehicle.fuelPrice,
          }}
          pickups={pickups}
          deliveries={deliveries}
          totalFreight={totalFreight}
          estimatedDistance={estimatedDistance}
          onCalculate={handleCalculate}
          onBack={() => setStep('delivery')}
          onEditVehicle={() => setStep('operational')}
          loading={calculating || routeLoading}
          userCredits={userCredits}
        />
      )}
      {step === 'dashboard' && result && (
        <DashboardScreen result={result} onReset={handleReset} />
      )}
    </div>
  );
};

export default Index;
