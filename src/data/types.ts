export interface Seller {
  id: string;
  name: string;
  phone: string;
  email: string;
  active: boolean;
}

export interface IrradiationEntry {
  id: string;
  state: string;
  city: string;
  value: number;
}

export interface ClientData {
  id: string;
  name: string;
  state: string;
  city: string;
  networkType: 'monofasica' | 'bifasica' | 'trifasica';
  kwhPrice: number;
  seller: string;
}

export const UC_COLORS = [
  '#E8B84B', '#2E86AB', '#E84855', '#7B2D8B',
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
  monthlyValues?: MonthlyConsumption;
}

export interface EquipmentItem {
  id: string;
  type: string;
  label: string;
  dailyKwh: number;
  daysPerMonth: number;
  hoursPerDay: number;
  unit: 'day' | 'use' | 'km';
  value: number;
  powerKw: number;
}

export interface Kit {
  id: string;
  line: 'acesso' | 'essencial' | 'excellence' | 'premium';
  type: 'inversor' | 'placa' | 'estrutura' | 'cabo' | 'stringbox';
  brand: string;
  model: string;
  power: number;
  warranty: number;
  costPrice: number;
  minPower: number;
  maxPower: number;
  active: boolean;
}

export interface Distributor {
  name: string;
  kwhPrice: number;
}

export interface AdminSettings {
  profitMargin: number;
  defaultCET: number;
  surplusFactor: number;
  defaultKwhPrice: Record<string, number>;
  irradiationEntries: IrradiationEntry[];
  proposalValidity: number;
  installationDays: number;
  homologationDays: number;
  systemLoss: number;
  installationPricePerPanel: number;
  homologationPrice: number;
  trunkCablePrice: number;
  caMaterialTable: { maxKw: number; cost: number }[];
  creditCardRates: { installments: number; rate: number }[];
  distributors: Distributor[];
  defaultDistributor: string;
  company: {
    name: string; cnpj: string; phone: string; email: string; site: string; social: string;
  };
  sellers: Seller[];
}

export interface PriceTableLineDetails {
  inverterBrand?: string;
  inverterPower?: string;
  panelBrand?: string;
  panelPower?: string;
}

export interface PriceTableEntry {
  panels: number;
  acesso: number | null;
  essencial: number | null;
  excellence: number | null;
  premium: number | null;
  estimated?: { acesso?: boolean; essencial?: boolean; excellence?: boolean; premium?: boolean };
  details?: {
    acesso?: PriceTableLineDetails;
    essencial?: PriceTableLineDetails;
    excellence?: PriceTableLineDetails;
    premium?: PriceTableLineDetails;
  };
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
  selectedLine: 'acesso' | 'essencial' | 'excellence' | 'premium';
  selectedKit: { inverter: Kit | null; panel: Kit | null; panelCount: number };
  totalPrice: number;
  installmentValues: Record<number, number>;
  cardInstallments?: Record<number, { total: number; perMonth: number }>;
  costBreakdown?: import('./calculations').CostBreakdown;
  cetApplied: number | null;
  status: 'enviada' | 'visualizada' | 'aprovada' | 'financiamento' | 'fechada';
  createdAt: string;
  dimensioning: DimensioningResult;
  irradiation?: number;
  monthlyIrradiation?: number[];
  sellerPhone?: string;
  sellerEmail?: string;
  microInverterCount?: number;
  inverterBrand?: string;
  inverterModel?: string;
  panelBrand?: string;
  panelPowerLabel?: string;
  customKit?: any;
  numero_proposta?: string;
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

export const LINE_NAMES: Record<string, string> = {
  essencial: 'TLS Essencial — Opção 1',
  excellence: 'TLS Plus — Opção 2',
  premium: 'TLS Prime Micro — Opção 3',
};

export const LINE_SUBS: Record<string, string> = {
  essencial: 'Linha econômica — Custo-benefício',
  excellence: 'Importados intermediários',
  premium: 'Micro inversores — Top de linha',
};

export interface EquipmentCatalogItem {
  type: string;
  label: string;
  category: string;
  powerKw: number;
  defaultHoursPerDay: number;
  defaultDaysPerMonth: number;
  unit: 'day' | 'use' | 'km';
  fatorServico: number;
}

export const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  // AR-CONDICIONADO
  { type: 'ac_9k_inv', label: 'Ar 9.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 0.86, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_9k_trad', label: 'Ar 9.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 1.05, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_12k_inv', label: 'Ar 12.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 1.10, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_12k_trad', label: 'Ar 12.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 1.35, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_18k_inv', label: 'Ar 18.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 1.60, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_18k_trad', label: 'Ar 18.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 2.05, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_24k_inv', label: 'Ar 24.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 2.00, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_24k_trad', label: 'Ar 24.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 2.80, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_30k_inv', label: 'Ar 30.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 2.80, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_30k_trad', label: 'Ar 30.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 3.80, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_36k_inv', label: 'Ar 36.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 3.30, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_36k_trad', label: 'Ar 36.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 4.40, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_48k_inv', label: 'Ar 48.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 4.20, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_48k_trad', label: 'Ar 48.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 5.80, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_60k_inv', label: 'Ar 60.000 BTU Inverter', category: 'Ar-condicionado', powerKw: 5.20, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  { type: 'ac_60k_trad', label: 'Ar 60.000 BTU Tradicional', category: 'Ar-condicionado', powerKw: 7.20, defaultHoursPerDay: 8, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.80 },
  // COZINHA
  { type: 'airfryer', label: 'Air Fryer', category: 'Cozinha', powerKw: 1.5, defaultHoursPerDay: 0.5, defaultDaysPerMonth: 25, unit: 'day', fatorServico: 0.75 },
  { type: 'forno_embutir', label: 'Forno de embutir elétrico', category: 'Cozinha', powerKw: 2.5, defaultHoursPerDay: 1, defaultDaysPerMonth: 20, unit: 'day', fatorServico: 0.75 },
  { type: 'fogao_inducao', label: 'Fogão de indução', category: 'Cozinha', powerKw: 3.5, defaultHoursPerDay: 1.5, defaultDaysPerMonth: 25, unit: 'day', fatorServico: 0.70 },
  // REFRIGERAÇÃO
  { type: 'geladeira_1p', label: 'Geladeira pequena 1 porta', category: 'Refrigeração', powerKw: 0.10, defaultHoursPerDay: 24, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.70 },
  { type: 'geladeira_2p', label: 'Geladeira grande 2 portas', category: 'Refrigeração', powerKw: 0.17, defaultHoursPerDay: 24, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.70 },
  { type: 'freezer_1p', label: 'Freezer horizontal 1 porta', category: 'Refrigeração', powerKw: 0.12, defaultHoursPerDay: 24, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.70 },
  { type: 'freezer_2p', label: 'Freezer horizontal 2 portas', category: 'Refrigeração', powerKw: 0.20, defaultHoursPerDay: 24, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.70 },
  { type: 'cervejeira', label: 'Cervejeira', category: 'Refrigeração', powerKw: 0.09, defaultHoursPerDay: 24, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.70 },
  { type: 'adega', label: 'Adega climatizada', category: 'Refrigeração', powerKw: 0.11, defaultHoursPerDay: 24, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.70 },
  // LAVANDERIA
  { type: 'secadora', label: 'Secadora de roupas', category: 'Lavanderia', powerKw: 3.0, defaultHoursPerDay: 1, defaultDaysPerMonth: 15, unit: 'day', fatorServico: 0.85 },
  { type: 'lava_seca', label: 'Lava e Seca', category: 'Lavanderia', powerKw: 2.5, defaultHoursPerDay: 1, defaultDaysPerMonth: 15, unit: 'day', fatorServico: 0.85 },
  // PISCINA
  { type: 'bomba_1_4cv', label: 'Bomba de piscina 1/4 CV', category: 'Piscina', powerKw: 0.18, defaultHoursPerDay: 1, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.85 },
  { type: 'bomba_1_3cv', label: 'Bomba de piscina 1/3 CV', category: 'Piscina', powerKw: 0.25, defaultHoursPerDay: 1, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.85 },
  { type: 'bomba_1_2cv', label: 'Bomba de piscina 1/2 CV', category: 'Piscina', powerKw: 0.37, defaultHoursPerDay: 1, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.85 },
  { type: 'bomba_3_4cv', label: 'Bomba de piscina 3/4 CV', category: 'Piscina', powerKw: 0.55, defaultHoursPerDay: 1, defaultDaysPerMonth: 30, unit: 'day', fatorServico: 0.85 },
  { type: 'aquec_15k', label: 'Aquecedor de piscina 15.000L', category: 'Piscina', powerKw: 6.0, defaultHoursPerDay: 4, defaultDaysPerMonth: 20, unit: 'day', fatorServico: 0.90 },
  { type: 'aquec_25k', label: 'Aquecedor de piscina 25.000L', category: 'Piscina', powerKw: 9.0, defaultHoursPerDay: 4, defaultDaysPerMonth: 20, unit: 'day', fatorServico: 0.90 },
  // VEÍCULO ELÉTRICO
  { type: 'ev', label: 'Veículo elétrico', category: 'Veículo Elétrico', powerKw: 0.20, defaultHoursPerDay: 0, defaultDaysPerMonth: 30, unit: 'km', fatorServico: 1.00 },
];

export const CA_MATERIAL_TABLE_DEFAULT = [
  { maxKw: 3, cost: 700 }, { maxKw: 4, cost: 700 }, { maxKw: 5, cost: 900 },
  { maxKw: 6, cost: 900 }, { maxKw: 7, cost: 1150 }, { maxKw: 8, cost: 1150 },
  { maxKw: 10, cost: 1500 }, { maxKw: 15, cost: 2000 }, { maxKw: 25, cost: 2700 },
  { maxKw: 38, cost: 4500 }, { maxKw: 50, cost: 6000 }, { maxKw: 75, cost: 10000 },
];

export const INSTALLMENT_OPTIONS = [72, 60, 48, 36, 24];

export const BRAZILIAN_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export const DEFAULT_CARD_RATES = [
  { installments: 1, rate: 3.20 },
  { installments: 2, rate: 4.30 },
  { installments: 3, rate: 5.40 },
  { installments: 4, rate: 6.50 },
  { installments: 5, rate: 7.60 },
  { installments: 6, rate: 8.70 },
  { installments: 7, rate: 9.80 },
  { installments: 8, rate: 10.90 },
  { installments: 9, rate: 12.00 },
  { installments: 10, rate: 13.10 },
  { installments: 11, rate: 14.20 },
  { installments: 12, rate: 15.30 },
  { installments: 13, rate: 16.40 },
  { installments: 14, rate: 17.50 },
  { installments: 15, rate: 18.60 },
  { installments: 16, rate: 19.70 },
  { installments: 17, rate: 20.80 },
  { installments: 18, rate: 21.90 },
];
