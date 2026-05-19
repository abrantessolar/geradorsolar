import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Zap, RotateCcw } from 'lucide-react';
import MoneyInput from '@/components/ui/money-input';
import { getSettings } from '@/data/store';
import { getCaMaterialCost, formatCurrency, formatNumber, getOverloadStatus } from '@/data/calculations';
import HistoricoKitsPopover from './HistoricoKitsPopover';
import type { KitInput } from '@/data/kitHistory';
import EquipmentCombobox from './EquipmentCombobox';

export interface KitData {
  tipoInversor: 'string' | 'micro';
  marcaInversor: string;
  modeloInversor: string;
  potenciaInversorKw: number;
  qtdInversores: number;
  marcaPlaca: string;
  modeloPlaca: string;
  potenciaPlacaWp: number;
  qtdPlacas: number;
  custoKit: number;
  precoVendaManual: number | null;
}

export const defaultKit = (qtdPlacas: number): KitData => ({
  tipoInversor: 'string',
  marcaInversor: '', modeloInversor: '',
  potenciaInversorKw: 0, qtdInversores: 1,
  marcaPlaca: '', modeloPlaca: '',
  potenciaPlacaWp: 570, qtdPlacas,
  custoKit: 0,
  precoVendaManual: null,
});

export interface KitBreakdown {
  equipmentCost: number;
  installationCost: number;
  homologationCost: number;
  caMaterialCost: number;
  trunkCableCost: number;
  totalCost: number;
  profitMargin: number;
  calculatedSalePrice: number;
  salePrice: number;
  grossProfit: number;
  effectiveMargin: number;
}

export function calcKitBreakdown(kit: KitData): KitBreakdown {
  const settings = getSettings();
  const isMicro = kit.tipoInversor === 'micro';

  const equipmentCost = kit.custoKit || 0;
  const installationCost = settings.installationPricePerPanel * (kit.qtdPlacas || 0);
  const homologationCost = settings.homologationPrice;

  const totalInverterKw = isMicro
    ? (kit.potenciaInversorKw || 0) * (kit.qtdInversores || 0)
    : (kit.potenciaInversorKw || 0);
  const caMaterialCost = getCaMaterialCost(totalInverterKw);
  const trunkCableCost = isMicro
    ? Math.max(0, (kit.qtdInversores || 0) - 1) * settings.trunkCablePrice
    : 0;

  const totalCost = equipmentCost + installationCost + homologationCost + caMaterialCost + trunkCableCost;
  const profitMargin = settings.profitMargin;
  const calculatedSalePrice = totalCost / (1 - profitMargin / 100);
  const salePrice = kit.precoVendaManual ?? calculatedSalePrice;
  const grossProfit = salePrice - totalCost;
  const effectiveMargin = salePrice > 0 ? (grossProfit / salePrice) * 100 : 0;

  return {
    equipmentCost, installationCost, homologationCost, caMaterialCost, trunkCableCost,
    totalCost, profitMargin, calculatedSalePrice, salePrice, grossProfit, effectiveMargin,
  };
}

interface Props {
  kit: KitData;
  onChange: (kit: KitData) => void;
  isAuthenticated: boolean;
}

export default function KitManualForm({ kit, onChange, isAuthenticated }: Props) {
  const isMicro = kit.tipoInversor === 'micro';
  const update = (partial: Partial<KitData>) => onChange({ ...kit, ...partial });

  const breakdown = useMemo(() => calcKitBreakdown(kit), [kit]);

  const panelKwp = ((kit.potenciaPlacaWp || 0) / 1000) * (kit.qtdPlacas || 0);
  const totalInverterKw = isMicro
    ? (kit.potenciaInversorKw || 0) * (kit.qtdInversores || 0)
    : (kit.potenciaInversorKw || 0);
  const overload = totalInverterKw > 0 ? getOverloadStatus(panelKwp, totalInverterKw) : null;

  const pickFromHistory = (h: KitInput) => {
    onChange({
      ...kit,
      tipoInversor: h.tipoInversor,
      marcaInversor: h.marcaInversor,
      modeloInversor: h.modeloInversor,
      potenciaInversorKw: h.potenciaInversorKw,
      qtdInversores: h.qtdInversores,
      marcaPlaca: h.marcaPlaca,
      modeloPlaca: h.modeloPlaca,
      potenciaPlacaWp: h.potenciaPlacaWp,
      qtdPlacas: h.qtdPlacas,
      custoKit: h.custoKit,
      precoVendaManual: null,
    });
  };

  return (
    <section className="solar-card p-6 space-y-5 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Zap className="w-5 h-5 text-secondary" /> Dados do Kit
        </h2>
        <HistoricoKitsPopover onPick={pickFromHistory} />
      </div>

      {/* Tipo inversor toggle */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/60 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => update({ tipoInversor: 'string', qtdInversores: 1 })}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
            !isMicro ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          String
        </button>
        <button
          type="button"
          onClick={() => update({ tipoInversor: 'micro' })}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
            isMicro ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Micro Inversor
        </button>
      </div>

      {/* Inversor */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dados do Inversor
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground">Marca</label>
            <input className="solar-input text-sm py-2" value={kit.marcaInversor}
              onChange={e => update({ marcaInversor: e.target.value })}
              placeholder={isMicro ? 'Ex: SUNGROW' : 'Ex: SOFAR'} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Modelo</label>
            <input className="solar-input text-sm py-2" value={kit.modeloInversor}
              onChange={e => update({ modeloInversor: e.target.value })}
              placeholder={isMicro ? 'MS-A2' : 'KTLM-G3'} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Potência (kW)</label>
            <input className="solar-input text-sm py-2" type="number" step="0.1"
              value={kit.potenciaInversorKw || ''}
              onChange={e => update({ potenciaInversorKw: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Quantidade</label>
            <input className="solar-input text-sm py-2" type="number"
              value={kit.qtdInversores || ''}
              onChange={e => update({ qtdInversores: parseInt(e.target.value) || 1 })} />
          </div>
        </div>
      </div>

      {/* Placas */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dados das Placas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground">Marca</label>
            <input className="solar-input text-sm py-2" value={kit.marcaPlaca}
              onChange={e => update({ marcaPlaca: e.target.value })} placeholder="Ex: ASTRONERGY" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Modelo</label>
            <input className="solar-input text-sm py-2" value={kit.modeloPlaca}
              onChange={e => update({ modeloPlaca: e.target.value })} placeholder="CHSM72M-HC" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Potência (Wp)</label>
            <input className="solar-input text-sm py-2" type="number"
              value={kit.potenciaPlacaWp || ''}
              onChange={e => update({ potenciaPlacaWp: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Quantidade</label>
            <input className="solar-input text-sm py-2" type="number"
              value={kit.qtdPlacas || ''}
              onChange={e => update({ qtdPlacas: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      </div>

      {/* Overload */}
      {overload && (
        <div className={`flex items-center gap-2 text-xs p-2.5 rounded ${
          overload.level === 'green' ? 'bg-green-50 text-green-700' :
          overload.level === 'yellow' ? 'bg-yellow-50 text-yellow-700' :
          'bg-destructive/10 text-destructive'
        }`}>
          {overload.level === 'red'
            ? <AlertTriangle className="w-4 h-4 shrink-0" />
            : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span>
            {formatNumber(panelKwp)} kWp / {formatNumber(totalInverterKw)} kW
            {' '}· razão {formatNumber(overload.ratio, 2)} · margem {formatNumber(overload.margin)} kWp — {overload.label}
          </span>
        </div>
      )}

      {/* Power summary */}
      <div className="text-sm text-center font-medium text-primary">
        Potência do sistema: {formatNumber(panelKwp)} kWp
        {isMicro && kit.qtdInversores > 1 && (
          <span className="text-muted-foreground"> · {kit.qtdInversores} micro inversores</span>
        )}
      </div>

      {/* Custo + Detalhamento + Preço de venda — only authenticated */}
      {isAuthenticated && (
        <div className="space-y-3 pt-3 border-t border-border/50">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Custo do kit (R$)
            </label>
            <MoneyInput
              value={kit.custoKit}
              onChange={v => update({ custoKit: v })}
              className="solar-input"
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1 text-xs p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1 text-[10px]">
              Detalhamento calculado
            </p>
            <Row label="Custo do kit" value={formatCurrency(breakdown.equipmentCost)} />
            <Row label={`Instalação (${kit.qtdPlacas || 0} placas × ${formatCurrency(getSettings().installationPricePerPanel)})`} value={formatCurrency(breakdown.installationCost)} />
            <Row label="Homologação" value={formatCurrency(breakdown.homologationCost)} />
            <Row
              label={`Material CA (${formatNumber(totalInverterKw)} kW${isMicro ? ' total' : ''})`}
              value={formatCurrency(breakdown.caMaterialCost)}
            />
            {breakdown.trunkCableCost > 0 && (
              <Row label={`Cabo tronco (${kit.qtdInversores - 1}×)`} value={formatCurrency(breakdown.trunkCableCost)} />
            )}
            <div className="flex justify-between pt-1.5 border-t border-border font-semibold">
              <span>Custo total</span><span>{formatCurrency(breakdown.totalCost)}</span>
            </div>
            <Row label={`Margem alvo (${breakdown.profitMargin}%)`} value="" />
            <div className="flex justify-between font-bold text-primary">
              <span>Preço sugerido</span><span>{formatCurrency(breakdown.calculatedSalePrice)}</span>
            </div>
          </div>

          {/* Preço de venda editável */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted-foreground">Preço de venda (R$)</label>
              {kit.precoVendaManual !== null && (
                <button
                  type="button"
                  onClick={() => update({ precoVendaManual: null })}
                  className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                >
                  <RotateCcw className="w-3 h-3" /> Recalcular
                </button>
              )}
            </div>
            <MoneyInput
              value={breakdown.salePrice}
              onChange={v => update({ precoVendaManual: v })}
              className="solar-input font-semibold"
              placeholder="0,00"
            />
            <div className="flex justify-between items-center mt-1.5 text-[11px]">
              <span className="text-muted-foreground">
                {kit.precoVendaManual !== null ? 'Preço manual' : 'Preço calculado automaticamente'}
              </span>
              <span className={`font-semibold ${breakdown.grossProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                Margem: {formatNumber(breakdown.effectiveMargin)}% · Lucro {formatCurrency(breakdown.grossProfit)}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
