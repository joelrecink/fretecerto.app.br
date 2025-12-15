import { VehicleData, RouteData, CreditPackage } from './types';

export const DEFAULT_VEHICLE: VehicleData = {
  driverName: '',
  fuelConsumption: 0,
  fuelPrice: 0,
  axles: 6,
  drivingHoursPerDay: 9,
  driverCommissionPercentage: 10,
  
  driverSalaryMonthly: 0,
  driverSalaryInclude13th: true,

  cargoCapacity: 32,
  maintenanceCostPerKm: 0,
  
  licensePlate: '',
  assetValue: 0,
  annualDepreciationRate: 15,
  insuranceYearly: 0,
  registrationYearly: 0,
  
  refTirePriceNew: 0,
  refTireLifespanNew: 100000,
  refTirePriceRemold: 0,
  refTireLifespanRemold: 60000,

  tireSteerQtyNew: 2,
  tireSteerQtyRemold: 0,
  tireDriveQtyNew: 4,
  tireDriveQtyRemold: 0,
  tireTrailerQtyNew: 0,
  tireTrailerQtyRemold: 0,
  
  lastOilChangeKm: 0,
  lastOilChangeDate: '',
  lastOilChangeCost: 0,
  lastOilChangeLocation: '',
  oilChangeIntervalKm: 20000,
  
  lastTransOilChangeKm: 0,
  lastTransOilChangeCost: 0,
  transOilChangeIntervalKm: 100000,

  lastFilterChangeKm: 0,
  lastFilterChangeCost: 0,
  filterChangeIntervalKm: 20000,

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

export const DAILY_FREE_CREDITS = 1;

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
