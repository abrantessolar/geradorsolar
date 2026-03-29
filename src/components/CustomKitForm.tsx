import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getSettings } from '@/data/store';
import { getCaMaterialCost, calcMicroInverterCount, formatCurrency, formatNumber } from '@/data/calculations';

export interface CustomKitData {
  enabled: boolean;
  inverterBrand: string;
  inverterModel: string;
  inverterPower: number;
  panelBrand: string;
  panelModel: string;
  panelPowerWp: number;
  panelCount: number;
  costMode: 'kit_cost' | 'sale_price';
  kitCost: number;
  salePrice: number;
}

export const defaultCustomKit = (panelCount: number): CustomKitData => ({
  enabled: false,
  inverterBrand: '',
  inverterModel: '',
  inverterPower: 5,
  panelBrand: '',
  panelModel: '',
  panelPowerWp: 570,
  panelCount,
  costMode: 'kit_cost',
  kitCost: 0,
  salePrice: 0,
});

export interface CustomKitBreakdown {
  equipmentCost: number;
  installationCost: number;
  homologationCost: number;
  caMaterialCost: number;
  trunkCableCost: number;
  totalCost: number;
  profitMargin: number;
  salePrice: number;
  grossProfit: number;
  effectiveMargin: number;
}

export function calcCustomBreakdown(data: CustomKitData, line: string): CustomKitBreakdown {
  const settings = getSettings();
  const isPremium = line === 'premium';
  const equipmentCost = data.kitCost;
  const installationCost = settings.installationPricePerPanel * data.panelCount;
  const homologationCost = settings.homologationPrice;

  let caMaterialCost: number;
  if (isPremium) {
    const microCount = calcMicroInverterCount(data.panelCount);
    const totalMicroPower = data.inverterPower * microCount;
    caMaterialCost = getCaMaterialCost(totalMicroPower);
  } else {
    caMaterialCost = getCaMaterialCost(data.inverterPower);
  }

  const trunkCableCost = isPremium ? Math.max(0, calcMicroInverterCount(data.panelCount) - 1) * settings.trunkCablePrice : 0;
  const totalCost = equipmentCost + installationCost + homologationCost + caMaterialCost + trunkCableCost;
  const profitMargin = settings.profitMargin;

  if (data.costMode === 'kit_cost') {
    const salePrice = totalCost / (1 - profitMargin / 100);
    return {
      equipmentCost, installationCost, homologationCost, caMaterialCost, trunkCableCost,
      totalCost, profitMargin, salePrice, grossProfit: salePrice - totalCost, effectiveMargin: profitMargin,
    };
  } else {
    const salePrice = data.salePrice;
    const grossProfit = salePrice - totalCost;
    const effectiveMargin = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;
    return {
      equipmentCost, installationCost, homologationCost, caMaterialCost, trunkCableCost,
      totalCost, profitMargin, salePrice, grossProfit, effectiveMargin,
    };
  }
}

interface Props {
  data: CustomKitData;
  onChange: (data: CustomKitData) => void;
  line: string;
  isAuthenticated: boolean;
}

export default function CustomKitForm({ data, onChange, line, isAuthenticated }: Props) {
  const isPremium = line === 'premium';
  const panelKwp = (data.panelPowerWp / 1000) * data.panelCount;
  const inverterLimit = data.inverterPower * 1.5;
  const microCount = isPremium ? calcMicroInverterCount(data.panelCount) : 0;
  const effectiveInverterKw = isPremium ? data.inverterPower * microCount : data.inverterPower;
  const effectiveLimit = effectiveInverterKw * 1.5;
  const exceeds = !isPremium && panelKwp > inverterLimit;
  const maxPanels = isPremium ? 999 : Math.floor(inverterLimit / (data.panelPowerWp / 1000));

  const breakdown = useMemo(() => calcCustomBreakdown(data, line), [data, line]);

  const update = (partial: Partial<CustomKitData>) => onChange({ ...data, ...partial });

  if (!data.enabled) return null;

  return (
    <div className="space-y-3 p-3 rounded-lg border-2 border-dashed border-secondary/40 bg-secondary/5">
      <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wide">
        <Zap className="w-3.5 h-3.5" /> Configuração Personalizada
      </div>

      {/* Inverter */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Marca inversor</label>
          <input className="solar-input text-xs py-1.5" value={data.inverterBrand}
            onChange={e => update({ inverterBrand: e.target.value })} placeholder="Ex: Growatt" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Modelo inversor</label>
          <input className="solar-input text-xs py-1.5" value={data.inverterModel}
            onChange={e => update({ inverterModel: e.target.value })} placeholder="Ex: MIN 5000" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground">Potência inversor (kW)</label>
        <input className="solar-input text-xs py-1.5" type="number" step="0.1" value={data.inverterPower || ''}
          onChange={e => update({ inverterPower: parseFloat(e.target.value) || 0 })} />
      </div>

      {/* Panels */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Marca placas</label>
          <input className="solar-input text-xs py-1.5" value={data.panelBrand}
            onChange={e => update({ panelBrand: e.target.value })} placeholder="Ex: Trina" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Modelo placas</label>
          <input className="solar-input text-xs py-1.5" value={data.panelModel}
            onChange={e => update({ panelModel: e.target.value })} placeholder="Ex: TSM-570" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Potência (Wp)</label>
          <input className="solar-input text-xs py-1.5" type="number" value={data.panelPowerWp || ''}
            onChange={e => update({ panelPowerWp: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Quantidade</label>
          <input className="solar-input text-xs py-1.5" type="number" value={data.panelCount || ''}
            onChange={e => update({ panelCount: parseInt(e.target.value) || 0 })} />
        </div>
      </div>

      {/* 1.5x validation */}
      {!isPremium && (
        <div className={`flex items-center gap-1.5 text-[10px] p-2 rounded ${exceeds ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700'}`}>
          {exceeds ? <AlertTriangle className="w-3 h-3 shrink-0" /> : <CheckCircle className="w-3 h-3 shrink-0" />}
          <span>
            {formatNumber(panelKwp)} kWp de {formatNumber(inverterLimit)} kWp
            {exceeds ? ` — Ultrapassa 1,5× (máx ${maxPanels} placas)` : ` — Dentro do limite`}
          </span>
        </div>
      )}

      {/* Power summary */}
      <div className="text-xs text-center font-medium text-primary">
        Potência total: {formatNumber(panelKwp)} kWp
        {isPremium && <span className="text-muted-foreground"> ({microCount} micro inversores)</span>}
      </div>

      {/* Cost mode */}
      {isAuthenticated && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex gap-1">
            <button onClick={() => update({ costMode: 'kit_cost' })}
              className={`flex-1 text-[10px] py-1.5 rounded font-medium transition-colors ${data.costMode === 'kit_cost' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Informar custo do kit
            </button>
            <button onClick={() => update({ costMode: 'sale_price' })}
              className={`flex-1 text-[10px] py-1.5 rounded font-medium transition-colors ${data.costMode === 'sale_price' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Informar preço de venda
            </button>
          </div>

          {data.costMode === 'kit_cost' ? (
            <div>
              <label className="text-[10px] text-muted-foreground">Custo do kit (R$)</label>
              <input className="solar-input text-xs py-1.5" type="number" step="100" value={data.kitCost || ''}
                onChange={e => update({ kitCost: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
            </div>
          ) : (
            <div>
              <label className="text-[10px] text-muted-foreground">Preço de venda desejado (R$)</label>
              <input className="solar-input text-xs py-1.5" type="number" step="100" value={data.salePrice || ''}
                onChange={e => update({ salePrice: parseFloat(e.target.value) || 0 })} placeholder="0,00" />
            </div>
          )}

          {/* Breakdown */}
          <div className="space-y-1 text-[10px] p-2 rounded bg-muted/50 border border-border/50">
            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Custos calculados</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Equipamentos (kit)</span><span>{formatCurrency(breakdown.equipmentCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Instalação ({data.panelCount}× R$100)</span><span>{formatCurrency(breakdown.installationCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Homologação</span><span>{formatCurrency(breakdown.homologationCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Material CA ({isPremium ? `${effectiveInverterKw} kW total` : `${data.inverterPower} kW`})</span><span>{formatCurrency(breakdown.caMaterialCost)}</span></div>
            {breakdown.trunkCableCost > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Cabo tronco</span><span>{formatCurrency(breakdown.trunkCableCost)}</span></div>
            )}
            <div className="flex justify-between pt-1 border-t border-border font-semibold"><span>Custo total</span><span>{formatCurrency(breakdown.totalCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Margem</span><span>{formatNumber(breakdown.effectiveMargin)}%</span></div>
            <div className="flex justify-between font-bold text-primary"><span>Preço de venda</span><span>{formatCurrency(breakdown.salePrice)}</span></div>
            <div className={`flex justify-between font-semibold ${breakdown.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              <span>Lucro bruto</span><span>{formatCurrency(breakdown.grossProfit)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
