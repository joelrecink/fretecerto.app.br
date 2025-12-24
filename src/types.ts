/**
 * ============================================================================
 * ARQUIVO MESTRE DE TIPAGEM - FreteCerto
 * ============================================================================
 * ATENÇÃO: Esta estrutura de dados foi validada e aprovada como a versão final
 * para a arquitetura do FreteCerto. 
 * 
 * STATUS DOS MÓDULOS:
 * [V] PNEUS: FINALIZADO E BLOQUEADO (Lógica Split New/Remold + Referência).
 * [V] CUSTOS FIXOS: Rateio diário implementado.
 * [V] ÓLEOS: Monitoramento por KM implementado.
 * [V] FILTROS: Adicionado novo campo para Kit de Filtros.
 * ============================================================================
 */

export interface VehicleData {
  driverName: string; 
  fuelConsumption: number; // km/l
  fuelPrice: number; // currency/l
  axles: number;
  drivingHoursPerDay: number; // Average driving hours per day (Lei do Motorista)
  driverCommissionPercentage: number; // % commission based on total freight
  
  driverSalaryMonthly?: number; // Fixed monthly salary
  driverSalaryInclude13th?: boolean; // Provision for 13th salary
  
  cargoCapacity: number; // Capacity in Tons
  maintenanceCostPerKm: number; // General variable costs (Grease, washing, small repairs)
  
  // Advanced Cost Fields (Optional)
  licensePlate?: string;
  assetValue?: number; // Valor do Bem (para depreciação/uso)
  annualDepreciationRate?: number; // Depreciação Anual (%)
  insuranceYearly?: number; // Seguro Anual
  registrationYearly?: number; // IPVA/Licenciamento Anual
  
  // ========================================================================
  // TIRE MANAGEMENT - GOLDEN MASTER (DO NOT MODIFY)
  // Logic: Reference Prices * Quantity (New/Remold) / Reference Lifespan
  // ========================================================================
  refTirePriceNew?: number;       // Preço de referência NOVO
  refTireLifespanNew?: number;    // Vida Útil referência NOVO (km)
  
  refTirePriceRemold?: number;    // Preço de referência REMOLD
  refTireLifespanRemold?: number; // Vida Útil referência REMOLD (km)

  // Detailed Tire Management (DEFINITIVE MODEL - SPLIT QTY)
  // Steer (Direcional)
  tireSteerQtyNew?: number;
  tireSteerQtyRemold?: number;
  
  // Drive (Tração)
  tireDriveQtyNew?: number;
  tireDriveQtyRemold?: number;
  
  // Trailer (Carreta)
  tireTrailerQtyNew?: number;
  tireTrailerQtyRemold?: number;
  // ========================================================================

  // Oil Change Tracking - Engine (Cárter)
  lastOilChangeKm?: number; 
  lastOilChangeDate?: string; 
  lastOilChangeCost?: number; 
  lastOilChangeLocation?: string; 
  oilChangeIntervalKm?: number; 
  
  // Oil Change Tracking - Transmission (Caixa/Diferencial)
  lastTransOilChangeKm?: number;
  lastTransOilChangeDate?: string;
  lastTransOilChangeCost?: number;
  transOilChangeIntervalKm?: number;

  // Filter Replacement (New)
  lastFilterChangeKm?: number;
  lastFilterChangeDate?: string;
  lastFilterChangeCost?: number;
  filterChangeIntervalKm?: number;

  currentOdometer?: number; // Hodômetro atual

  // Telemetry / API Integration (New)
  telemetryProvider?: 'scania' | 'volvo' | 'mercedes' | 'omnilink' | 'manual';
  telemetryDeviceId?: string; // VIN or Tracker ID
  lastTelemetrySync?: string; // ISO Date
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
  
  // Engine Oil
  last_oil_change_km?: number;
  last_oil_change_date?: string;
  last_oil_change_cost?: number;
  last_oil_change_location?: string;
  oil_change_interval_km?: number;
  
  // Transmission Oil
  last_trans_oil_change_km?: number;
  last_trans_oil_change_date?: string;
  last_trans_oil_change_cost?: number;
  trans_oil_change_interval_km?: number;
  
  // Filters
  last_filter_change_km?: number;
  last_filter_change_cost?: number;
  filter_change_interval_km?: number;

  current_odometer?: number;
  
  maintenance_cost_per_km?: number;
  
  // Tire References
  ref_tire_price_new?: number;
  ref_tire_lifespan_new?: number;
  ref_tire_price_remold?: number;
  ref_tire_lifespan_remold?: number;
  
  // Detailed Tires
  tire_steer_qty_new?: number;
  tire_steer_qty_remold?: number;

  tire_drive_qty_new?: number;
  tire_drive_qty_remold?: number;

  tire_trailer_qty_new?: number;
  tire_trailer_qty_remold?: number;

  fuel_price?: number;
  telemetry_provider?: string;
  driver_salary_monthly?: number;
  driver_salary_include_13th?: boolean;
  driver_commission_percentage?: number;
  driving_hours_per_day?: number;
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
  value: number; // Freight value (Income) or specific cost
  weight?: number; // Weight in tons for this specific point
}

export interface RouteData {
  pickups: RoutePoint[];
  deliveries: RoutePoint[];
  waypoints: RoutePoint[]; // New field for route modification (vias)
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
  estimatedMaintenanceCost: number; // Pure Variable costs (Tires + Fluids)
  estimatedFixedCost?: number; // New: Prorated Fixed Costs (Salary, Insurance, etc)
  tollPlazas: TollPlaza[]; 
  totalFreightIncome: number;
  netProfit: number;
  viabilityScore: 'high' | 'medium' | 'low';
  viabilityMessage: string;
  routeSuggestions: string;
  groundingUrls: Array<{ title: string; uri: string }>;
}

export interface UserCredits {
  freeCredits: number;     // Resets daily
  premiumCredits: number;  // Purchased, never expires
  lastResetDate: string;   // ISO Date string to track daily reset
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

// --- COST CENTER / ERP TYPES ---
export interface Employee {
  id: string;
  name: string;
  role: 'Motorista' | 'Administrativo' | 'Mecânico';
  salary: number;
  cnh_number?: string;
  cnh_expiration?: string;
  admission_date: string;
  status: 'active' | 'inactive';
}

export interface FinancialRecord {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: 'FREIGHT' | 'FUEL' | 'MAINTENANCE' | 'SALARY' | 'FINE' | 'TAX' | 'OTHER';
  description: string;
  amount: number;
  date: string;
  document_number?: string; // NFe / Nota Fiscal / Multa ID
  status: 'paid' | 'pending';
  vehicle_plate?: string; // Optional link to vehicle
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
