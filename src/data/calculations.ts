import {
  MonthlyConsumption, EquipmentItem, Kit, DimensioningResult,
  SEASONAL_FACTORS, MONTH_KEYS, AVAILABILITY_FEE, INSTALLMENT_OPTIONS
} from './types';
import { getSettings, getKits } from './store';

export function estimateFullConsumption(partial: Partial<MonthlyConsumption>): MonthlyConsumption {
  const filled = MONTH_KEYS.filter(k => partial[k] && partial[k]! > 0);
  if (filled.length === 0) {
    const result = {} as any;
    MONTH_KEYS.forEach(k => result[k] = 0);
    return result;
  }
  const totalFilled = filled.reduce((s, k) => s + partial[k]!, 0);
  const totalFactorFilled = filled.reduce((s, k) => s + SEASONAL_FACTORS[k], 0);
  const baseAvg = totalFilled / totalFactorFilled;

  const result = {} as any;
  MONTH_KEYS.forEach(k => {
    result[k] = partial[k] && partial[k]! > 0 ? partial[k] : Math.round(baseAvg * SEASONAL_FACTORS[k]);
  });
  return result;
}

export function calcEquipmentMonthly(eq: EquipmentItem): number {
  if (eq.unit === 'km') return eq.dailyKwh * eq.value;
  if (eq.unit === 'use') return eq.dailyKwh * eq.value * eq.daysPerMonth;
  return eq.dailyKwh * (eq.hoursPerDay / 24) * eq.daysPerMonth;
}

export function calcDimensioning(
  consumption: MonthlyConsumption,
  equipment: EquipmentItem[],
  networkType: string,
  irradiation: number,
  kwhPrice: number,
  investmentTotal: number,
  systemLoss?: number,
): DimensioningResult {
  const settings = getSettings();
  const loss = (systemLoss ?? settings.systemLoss) / 100;

  const monthValues = MONTH_KEYS.map(k => consumption[k]);
  const avgBase = monthValues.reduce((a, b) => a + b, 0) / 12;
  const eqTotal = equipment.reduce((s, e) => s + calcEquipmentMonthly(e), 0);
  const avgMonthlyKwh = avgBase + eqTotal;
  const avgDailyKwh = avgMonthlyKwh / 30;
  const powerKwp = avgDailyKwh / (irradiation * (1 - loss));
  const panelCount = Math.ceil(powerKwp / 0.570);
  const monthlyGeneration = powerKwp * irradiation * 30 * (1 - loss);
  const surplus = monthlyGeneration - avgMonthlyKwh;
  const availabilityFee = AVAILABILITY_FEE[networkType] || 30;
  const monthlySavings = (avgMonthlyKwh - availabilityFee) * kwhPrice;
  const paybackYears = investmentTotal > 0 ? investmentTotal / (monthlySavings * 12) : 0;

  const calcReturn = (years: number) => {
    let total = 0;
    for (let y = 0; y < years; y++) total += monthlySavings * 12 * Math.pow(1.10, y);
    return total - investmentTotal;
  };

  return {
    avgMonthlyKwh, avgDailyKwh, powerKwp, panelCount,
    monthlyGeneration, surplus, availabilityFee, monthlySavings, paybackYears,
    return10: calcReturn(10), return15: calcReturn(15), return25: calcReturn(25),
  };
}

export function findBestInverter(line: string, powerKwp: number): Kit | null {
  const kits = getKits().filter(k => k.line === line && k.type === 'inversor' && k.active);
  kits.sort((a, b) => a.power - b.power);
  return kits.find(k => powerKwp >= k.minPower && powerKwp <= k.maxPower)
    || kits.find(k => k.maxPower >= powerKwp) || kits[kits.length - 1] || null;
}

/** Find the smallest inverter that supports panelCount panels using the 1.5x rule */
export function findInverterForPanels(line: string, panelCount: number, panelPowerKwp: number = 0.570): Kit | null {
  if (line === 'premium') {
    // Premium uses micro inverters - return the single micro inverter
    const micros = getKits().filter(k => k.line === 'premium' && k.type === 'inversor' && k.active);
    return micros[0] || null;
  }
  const kits = getKits().filter(k => k.line === line && k.type === 'inversor' && k.active);
  kits.sort((a, b) => a.power - b.power);
  const totalPanelKwp = panelCount * panelPowerKwp;
  return kits.find(k => k.power * 1.5 >= totalPanelKwp) || kits[kits.length - 1] || null;
}

/** Max panels an inverter can support with 1.5x rule */
export function maxPanelsForInverter(inverterKw: number, panelPowerKwp: number = 0.570): number {
  return Math.floor((inverterKw * 1.5) / panelPowerKwp);
}

/** Premium: how many micro inverters needed (1 micro per 4 panels) */
export function calcMicroInverterCount(panelCount: number): number {
  return Math.ceil(panelCount / 4);
}

/** Premium: trunk cable cost (R$300 per additional micro beyond the first) */
export function calcTrunkCableCost(panelCount: number): number {
  const settings = getSettings();
  const micros = calcMicroInverterCount(panelCount);
  return Math.max(0, micros - 1) * settings.trunkCablePrice;
}

export function findPanel(line: string): Kit | null {
  return getKits().find(k => k.line === line && k.type === 'placa' && k.active) || null;
}

export function getInvertersList(line: string): Kit[] {
  return getKits().filter(k => k.line === line && k.type === 'inversor' && k.active).sort((a, b) => a.power - b.power);
}

export function getCaMaterialCost(inverterKw: number): number {
  const settings = getSettings();
  const table = settings.caMaterialTable || [];
  const entry = table.find(e => inverterKw <= e.maxKw);
  return entry?.cost || table[table.length - 1]?.cost || 0;
}

export function calcTotalPrice(inverter: Kit | null, panel: Kit | null, panelCount: number, line?: string): number {
  const settings = getSettings();
  const isPremium = line === 'premium';

  let eqCost: number;
  if (isPremium) {
    const microCount = calcMicroInverterCount(panelCount);
    eqCost = (inverter?.costPrice || 0) * microCount + (panel?.costPrice || 0) * panelCount;
  } else {
    eqCost = (inverter?.costPrice || 0) + (panel?.costPrice || 0) * panelCount;
  }

  const installation = settings.installationPricePerPanel * panelCount;
  const homologation = settings.homologationPrice;

  let caMaterial: number;
  if (isPremium) {
    const microCount = calcMicroInverterCount(panelCount);
    const totalMicroPower = (inverter?.power || 2) * microCount;
    caMaterial = getCaMaterialCost(totalMicroPower);
  } else {
    caMaterial = getCaMaterialCost(inverter?.power || 5);
  }

  const trunkCable = isPremium ? calcTrunkCableCost(panelCount) : 0;
  const totalCost = eqCost + installation + homologation + caMaterial + trunkCable;
  return totalCost / (1 - settings.profitMargin / 100);
}

export function calcInstallments(totalPrice: number, cetMonthly?: number | null): Record<number, number> {
  const result: Record<number, number> = {};
  INSTALLMENT_OPTIONS.forEach(n => {
    if (cetMonthly && cetMonthly > 0) {
      const r = cetMonthly / 100;
      result[n] = totalPrice * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    } else {
      result[n] = totalPrice / n;
    }
  });
  return result;
}

export function formatCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(v: number, decimals = 1): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
