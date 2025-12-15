/**
 * ============================================================================
 * ARQUIVO MESTRE DE TIPAGEM - FreteCerto
 * ============================================================================
 */

export interface VehicleData {
  driverName: string; 
  fuelConsumption: number; // km/l
  fuelPrice: number; // currency/l
  axles: number;
  drivingHoursPerDay: number;
  driverCommissionPercentage: number;
  
  driverSalaryMonthly?: number;
  driverSalaryInclude13th?: boolean;
  
  cargoCapacity: number; // Tons
  maintenanceCostPerKm: number;
  
  licensePlate?: string;
  assetValue?: number;
  annualDepreciationRate?: number;
  insuranceYearly?: number;
  registrationYearly?: number;
  
  // Tire References
  refTirePriceNew?: number;
  refTireLifespanNew?: number;
  refTirePriceRemold?: number;
  refTireLifespanRemold?: number;

  // Detailed Tires (Split Quantity)
  tireSteerQtyNew?: number;
  tireSteerQtyRemold?: number;
  tireDriveQtyNew?: number;
  tireDriveQtyRemold?: number;
  tireTrailerQtyNew?: number;
  tireTrailerQtyRemold?: number;

  // Engine Oil
  lastOilChangeKm?: number;
  lastOilChangeDate?: string;
  lastOilChangeCost?: number;
  lastOilChangeLocation?: string;
  oilChangeIntervalKm?: number;
  
  // Transmission Oil
  lastTransOilChangeKm?: number;
  lastTransOilChangeDate?: string;
  lastTransOilChangeCost?: number;
  transOilChangeIntervalKm?: number;

  // Filters
  lastFilterChangeKm?: number;
  lastFilterChangeDate?: string;
  lastFilterChangeCost?: number;
  filterChangeIntervalKm?: number;

  currentOdometer?: number;

  // Telemetry
  telemetryProvider?: 'scania' | 'volvo' | 'mercedes' | 'omnilink' | 'manual';
  telemetryDeviceId?: string;
  lastTelemetrySync?: string;
}

export interface MaintenanceLog {
  id: string;
  license_plate: string;
  service_type: string;
  odometer: number;
  cost: number;
  location: string;
  service_date: string;
}

export interface SavedVehicle {
  id: string;
  license_plate: string;
  model_name?: string;
  axles: number;
  fuel_consumption: number;
  cargo_capacity: number;
  
  last_oil_change_km?: number;
  last_oil_change_date?: string;
  last_oil_change_cost?: number;
  last_oil_change_location?: string;
  oil_change_interval_km?: number;
  
  last_filter_change_km?: number;
  last_filter_change_cost?: number;
  filter_change_interval_km?: number;

  current_odometer?: number;
  maintenance_cost_per_km?: number;
  
  ref_tire_price_new?: number;
  ref_tire_lifespan_new?: number;
  ref_tire_price_remold?: number;
  ref_tire_lifespan_remold?: number;
  
  tire_steer_qty_new?: number;
  tire_steer_qty_remold?: number;
  tire_drive_qty_new?: number;
  tire_drive_qty_remold?: number;
  tire_trailer_qty_new?: number;
  tire_trailer_qty_remold?: number;

  fuel_price?: number;
  telemetry_provider?: string;
  driver_salary_monthly?: number;
  asset_value?: number;
  annual_depreciation_rate?: number;
  insurance_yearly?: number;
  registration_yearly?: number;
}

export type PointType = 'pickup' | 'delivery' | 'waypoint';

export interface RoutePoint {
  id: string;
  type: PointType;
  address: string;
  value: number;
  weight?: number;
}

export interface RouteData {
  pickups: RoutePoint[];
  deliveries: RoutePoint[];
  waypoints: RoutePoint[];
}

export interface TollPlaza {
  name: string;
  cost: number;
}

export interface SimulationResult {
  totalDistanceKm: number;
  totalDurationHours: number;
  totalDurationDays: number;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  driverCommissionCost: number;
  estimatedMaintenanceCost: number;
  estimatedFixedCost?: number;
  tollPlazas: TollPlaza[];
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  routeSuggestions: string;
  groundingUrls: Array<{ title: string; uri: string }>;
}

export interface UserCredits {
  freeCredits: number;
  premiumCredits: number;
  lastResetDate: string;
}

export interface User {
  email: string;
  phoneNumber?: string;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  isRoot?: boolean;
  isFleetManager?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  credits: number;
  method: 'PIX' | 'CREDIT_CARD';
  status: 'completed' | 'pending';
  date: string;
}

export interface CreditPackage {
  id: string;
  label: string;
  description?: string;
  price: number;
  credits: number;
  features: string[];
  is_active: boolean;
  is_recommended?: boolean;
}

export interface FinancialRecord {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: 'FREIGHT' | 'FUEL' | 'MAINTENANCE' | 'SALARY' | 'FINE' | 'TAX' | 'OTHER';
  description: string;
  amount: number;
  date: string;
  document_number?: string;
  status: 'paid' | 'pending';
  vehicle_plate?: string;
}

export interface AppState {
  step: 'login' | 'driver' | 'costs' | 'vehicle' | 'pickup' | 'delivery' | 'review' | 'dashboard';
  previousStep?: 'driver' | 'costs' | 'vehicle' | 'pickup' | 'delivery' | 'review';
  pendingAnalysis?: boolean;
  user: User | null;
  vehicle: VehicleData;
  route: RouteData;
  result: SimulationResult | null;
  loading: boolean;
  credits: UserCredits;
  showPurchaseModal: boolean;
}
