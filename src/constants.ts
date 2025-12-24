import { VehicleData, RouteData, CreditPackage } from './types';

export const DEFAULT_VEHICLE: VehicleData = {
  driverName: '',
  fuelConsumption: 0, // Reset to 0 (Real data required)
  fuelPrice: 0, // Reset to 0 (Real data required)
  axles: 6, // Common setup for heavy trucks
  drivingHoursPerDay: 9,
  driverCommissionPercentage: 10,
  
  driverSalaryMonthly: 0,
  driverSalaryInclude13th: true,

  cargoCapacity: 32, // Standard approximate capacity for Bi-trem/Rodotrem (tons)
  maintenanceCostPerKm: 0, // General variable costs
  
  // Advanced defaults (0 = optional/not used)
  licensePlate: '',
  assetValue: 0,
  annualDepreciationRate: 15, // Default 15% per year
  insuranceYearly: 0,
  registrationYearly: 0,
  
  // TIRE REFERENCE PRICES & LIFESPAN (Defaults reset to 0 to avoid fictitious data)
  refTirePriceNew: 0,
  refTireLifespanNew: 100000, 
  refTirePriceRemold: 0,
  refTireLifespanRemold: 60000, 

  // Detailed Tires (Split Quantity)
  tireSteerQtyNew: 2,
  tireSteerQtyRemold: 0,

  tireDriveQtyNew: 4,
  tireDriveQtyRemold: 0,

  tireTrailerQtyNew: 0,
  tireTrailerQtyRemold: 0,
  
  // Engine Oil (Cárter)
  lastOilChangeKm: 0,
  lastOilChangeDate: '',
  lastOilChangeCost: 0,
  lastOilChangeLocation: '',
  oilChangeIntervalKm: 20000, // Standard for heavy duty oil
  
  // Transmission Oil
  lastTransOilChangeKm: 0,
  lastTransOilChangeDate: '',
  lastTransOilChangeCost: 0,
  transOilChangeIntervalKm: 100000,

  // Filters (Kit)
  lastFilterChangeKm: 0,
  lastFilterChangeDate: '',
  lastFilterChangeCost: 0,
  filterChangeIntervalKm: 20000, // Usually matches oil change

  currentOdometer: 0
};

export const DEFAULT_ROUTE: RouteData = {
  pickups: [
    { id: 'start', type: 'pickup', address: '', value: 0, weight: 0 }
  ],
  deliveries: [
    { id: 'end', type: 'delivery', address: '', value: 0 }
  ],
  waypoints: []
};

// Credit System Constants
export const DAILY_FREE_CREDITS = 1; // 1 Free AI calculation per day to hook them

// Subscription/Package definitions
export const CREDIT_PACKAGES: CreditPackage[] = [
  { 
    id: 'basic_pack', 
    credits: 5, 
    price: 9.90, 
    label: 'Plano Básico', 
    description: 'Para experimentação rápida.',
    features: ['5 Análises de Lucro com IA', 'Registro de Viagens', 'Suporte Básico'],
    is_active: true
  },
  { 
    id: 'economic_pack', 
    credits: 20, 
    price: 29.90, 
    label: 'Plano Econômico', 
    description: 'Melhor custo-benefício inicial.',
    features: ['20 Análises de Lucro', 'Histórico Financeiro', 'Sem Anúncios'],
    is_active: true,
    is_recommended: true
  },
  { 
    id: 'pro_driver', 
    credits: 50, 
    price: 49.90, 
    label: 'Motorista Pro', 
    description: 'Para quem vive na estrada.',
    features: ['50 Análises/Mês', 'Relatórios de Inteligência', 'Suporte Prioritário'],
    is_active: true
  },
  { 
    id: 'fleet_manager', 
    credits: 200, 
    price: 149.90, 
    label: 'Gestor de Frota', 
    description: 'Controle total para empresas.',
    features: ['Múltiplos Veículos', 'Análise de Custos', 'Integração API'],
    is_active: true
  },
];
