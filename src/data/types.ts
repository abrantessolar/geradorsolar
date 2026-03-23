export interface ClientData {
  id: string;
  name: string;
  city: string;
  networkType: 'monofasica' | 'bifasica' | 'trifasica';
  kwhPrice: number;
  seller: string;
}

export const UC_COLORS = [
  '#4A5A2A', '#E8B84B', '#2E86AB', '#E84855', '#7B2D8B',
  '#F4845F', '#3BB273', '#1B4F72', '#C0392B', '#717D7E',
];

export interface MonthlyConsumption {
  jan: number; feb: number; mar: number; apr: number;
  may: number; jun: number; jul: number; aug: number;
  sep: number; oct: number; nov: number; dec: number;
}

export type ConsumptionMode = 'average' | 'monthly';

export interface ConsumerUnit {
  id: string;
  name: string;
  averageKwh: number;
}

export interface EquipmentItem {
  id: string;
  type: string;
  label: string;
  dailyKwh: number;
  daysPerMonth: number;
  hoursPerDay: number;
  unit: 'day' | 'use' | 'km';
  value: number; // km/month for EV, or hours/day
}

export interface Kit {
  id: string;
  line: 'acesso' | 'excellence' | 'premium';
  type: 'inversor' | 'placa' | 'estrutura' | 'cabo' | 'stringbox';
  brand: string;
  model: string;
  power: number; // Wp for panels, kW for inverters
  warranty: number;
  costPrice: number;
  minPower: number;
  maxPower: number;
  active: boolean;
}

export interface AdminSettings {
  profitMargin: number; // percentage
  defaultCET: number; // % monthly
  defaultKwhPrice: Record<string, number>;
  irradiation: Record<string, number>;
  proposalValidity: number;
  installationDays: number;
  systemLoss: number;
  company: {
    name: string; cnpj: string; phone: string; email: string; site: string; social: string;
  };
  sellers: string[];
}

export interface SocialProof {
  id: string;
  type: 'video' | 'photo';
  url: string;
  title: string;
  active: boolean;
  order: number;
}

export interface Proposal {
  id: string;
  clientData: ClientData;
  consumption: MonthlyConsumption;
  consumerUnits: ConsumerUnit[];
  equipment: EquipmentItem[];
  selectedLine: 'acesso' | 'excellence' | 'premium';
  selectedKit: { inverter: Kit | null; panel: Kit | null; panelCount: number };
  totalPrice: number;
  installmentValues: Record<number, number>;
  cetApplied: number | null;
  status: 'enviada' | 'visualizada' | 'aprovada' | 'financiamento' | 'fechada';
  createdAt: string;
  dimensioning: DimensioningResult;
}

export interface DimensioningResult {
  avgMonthlyKwh: number;
  avgDailyKwh: number;
  powerKwp: number;
  panelCount: number;
  monthlyGeneration: number;
  surplus: number;
  availabilityFee: number;
  monthlySavings: number;
  paybackYears: number;
  return10: number;
  return15: number;
  return25: number;
}

export const SEASONAL_FACTORS: Record<string, number> = {
  jan: 1.15, feb: 1.16, mar: 1.06, apr: 0.94,
  may: 0.80, jun: 0.74, jul: 0.78, aug: 0.96,
  sep: 0.96, oct: 1.09, nov: 1.17, dec: 1.24,
};

export const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;

export const AVAILABILITY_FEE: Record<string, number> = {
  monofasica: 30, bifasica: 50, trifasica: 100,
};

export const EQUIPMENT_CATALOG = [
  { type: 'ac_10k', label: 'Ar-condicionado até 10.000 BTU', dailyKwh: 4.74, unit: 'day' as const },
  { type: 'ac_15k', label: 'Ar-condicionado 10.001–15.000 BTU', dailyKwh: 6.46, unit: 'day' as const },
  { type: 'ac_20k', label: 'Ar-condicionado 15.001–20.000 BTU', dailyKwh: 9.79, unit: 'day' as const },
  { type: 'ac_30k', label: 'Ar-condicionado 20.001–30.000 BTU', dailyKwh: 14.64, unit: 'day' as const },
  { type: 'ac_30kp', label: 'Ar-condicionado acima 30.000 BTU', dailyKwh: 22.64, unit: 'day' as const },
  { type: 'freezer_s', label: 'Freezer pequeno', dailyKwh: 1.17, unit: 'day' as const },
  { type: 'freezer_m', label: 'Freezer médio', dailyKwh: 1.67, unit: 'day' as const },
  { type: 'freezer_l', label: 'Freezer grande', dailyKwh: 2.33, unit: 'day' as const },
  { type: 'ev', label: 'Veículo elétrico', dailyKwh: 0.20, unit: 'km' as const },
  { type: 'fridge', label: 'Geladeira 2 portas', dailyKwh: 0.53, unit: 'day' as const },
  { type: 'washer', label: 'Lavadora de roupas', dailyKwh: 0.60, unit: 'use' as const },
  { type: 'shower', label: 'Chuveiro elétrico', dailyKwh: 5.40, unit: 'day' as const },
  { type: 'pump', label: 'Bomba d\'água 1/2 cv', dailyKwh: 0.48, unit: 'use' as const },
  { type: 'notebook', label: 'Notebook', dailyKwh: 0.06, unit: 'day' as const },
];

export const CA_MATERIAL_TABLE = [
  { maxKw: 3, cost: 700 }, { maxKw: 4, cost: 700 }, { maxKw: 5, cost: 900 },
  { maxKw: 6, cost: 900 }, { maxKw: 7, cost: 1150 }, { maxKw: 8, cost: 1150 },
  { maxKw: 10, cost: 1500 }, { maxKw: 15, cost: 2000 }, { maxKw: 25, cost: 2700 },
  { maxKw: 38, cost: 4500 }, { maxKw: 50, cost: 6000 }, { maxKw: 75, cost: 10000 },
];

export const INSTALLMENT_OPTIONS = [72, 60, 48, 36, 24];
