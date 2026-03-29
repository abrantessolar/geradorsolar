import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Minus, ChevronDown, ChevronUp, Zap, Sun, TrendingUp, ArrowRight, AlertTriangle, Eye, EyeOff, CreditCard, Settings2, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CustomKitForm, { CustomKitData, defaultCustomKit, calcCustomBreakdown } from '@/components/CustomKitForm';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import {
  ClientData, MonthlyConsumption, ConsumptionMode, ConsumerUnit, EquipmentItem,
  MONTH_LABELS, MONTH_KEYS, EQUIPMENT_CATALOG, SEASONAL_FACTORS, UC_COLORS,
  BRAZILIAN_STATES, LINE_NAMES, LINE_SUBS,
} from '@/data/types';
import type { EquipmentCatalogItem } from '@/data/types';
import {
  estimateFullConsumption, calcEquipmentMonthly, calcDimensioning,
  findInverterForPanels, findPanel, calcTotalPrice, calcInstallments,
  calcCardInstallments, calcCostBreakdown,
  formatCurrency, formatNumber, maxPanelsForInverter, calcMicroInverterCount,
} from '@/data/calculations';
import { getSettings, saveProposal, lookupIrradiation, getPriceTable } from '@/data/store';
import { savePropostaDB, searchCidadesDB, syncKitsFromDB, syncPriceTableFromDB } from '@/data/supabaseStore';
import type { Proposal, PriceTableEntry, PriceTableLineDetails } from '@/data/types';
import { useAuth } from '@/contexts/AuthContext';

const EQUIPMENT_COLORS = [
  '#E67E22', '#3498DB', '#9B59B6', '#1ABC9C', '#E74C3C',
  '#F39C12', '#2ECC71', '#8E44AD', '#16A085', '#D35400',
];

const LINES = ['essencial', 'excellence', 'premium'] as const;

// Group equipment catalog by category
const EQUIPMENT_CATEGORIES = EQUIPMENT_CATALOG.reduce<Record<string, EquipmentCatalogItem[]>>((acc, item) => {
  if (!acc[item.category]) acc[item.category] = [];
  acc[item.category].push(item);
  return acc;
}, {});

const emptyMonthly = (): MonthlyConsumption => ({
  jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
  jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
});

export default function CalculatorPage() {
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const settings = getSettings();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch active sellers from user_profiles (vendedor + orcamentista)
  const [activeSellers, setActiveSellers] = useState<{ user_id: string; nome: string; telefone: string | null; email: string }[]>([]);
  useEffect(() => {
    const fetchSellers = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, nome, email, telefone, role, ativo')
        .in('role', ['vendedor', 'orcamentista'])
        .eq('ativo', true)
        .order('nome');
      const sellers = data || [];
      setActiveSellers(sellers);
      // Set default seller if not already set
      if (!client.seller && sellers.length > 0) {
        setClient(p => ({ ...p, seller: sellers[0].nome }));
      }
    };
    fetchSellers();
  }, []);

  // Edit mode: pre-fill from existing proposal
  const editProposal = (location.state as any)?.editProposal || null;
  const prefillLead = (location.state as any)?.prefillLead || null;
  const [editMode, setEditMode] = useState(!!editProposal);
  const [editProposalId, setEditProposalId] = useState<string | null>(editProposal?.id || null);
  const [editNumero, setEditNumero] = useState<string | null>(editProposal?.numero_proposta || null);

  const defaultDist = settings.distributors?.find(d => d.name === settings.defaultDistributor);
  const [selectedDistributor, setSelectedDistributor] = useState(settings.defaultDistributor || 'ELEKTRO');

  const ep = editProposal?.dados_completos || editProposal;
  const [client, setClient] = useState<ClientData>(
    ep?.clientData || {
      id: '', name: prefillLead?.name || '', state: prefillLead?.state || 'MS',
      city: prefillLead?.city || 'Três Lagoas', networkType: 'bifasica',
      kwhPrice: defaultDist?.kwhPrice || 0.85, seller: '',
    }
  );

  const [units, setUnits] = useState<(ConsumerUnit & { mode: ConsumptionMode; monthlyValues: MonthlyConsumption })[]>(() => {
    if (ep?.consumerUnits && ep.consumerUnits.length > 0) {
      return ep.consumerUnits.map((u: any) => ({
        id: u.id, name: u.name, averageKwh: u.averageKwh,
        mode: u.monthlyValues ? 'monthly' as const : 'average' as const,
        monthlyValues: u.monthlyValues || emptyMonthly(),
      }));
    }
    const defaultKwh = prefillLead?.avgKwh || 350;
    return [{ id: '1', name: 'Principal', averageKwh: defaultKwh, mode: 'average' as const, monthlyValues: emptyMonthly() }];
  });
  const [equipment, setEquipment] = useState<EquipmentItem[]>(ep?.equipment || []);
  const [eqOpen, setEqOpen] = useState(false);
  const [panelDelta, setPanelDelta] = useState(0);
  const [paymentTab, setPaymentTab] = useState<'financing' | 'card'>('financing');
  const [showCostPanel, setShowCostPanel] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(() => {
    if (ep?.selectedLine) {
      const idx = LINES.indexOf(ep.selectedLine as any);
      return idx >= 0 ? idx : null;
    }
    return null;
  });
  const [customKits, setCustomKits] = useState<Record<string, CustomKitData>>(() => {
    const base = {
      essencial: defaultCustomKit(0),
      excellence: defaultCustomKit(0),
      premium: defaultCustomKit(0),
    };
    if (ep?.customKit) {
      base[ep.selectedLine] = ep.customKit;
    }
    return base;
  });

  // Show toast when loading from edit
  useEffect(() => {
    if (editProposal && editNumero) {
      toast.success(`Calculadora carregada com os dados da proposta ${editNumero}`);
    }
  }, []);

  // City autocomplete
  const [citySuggestions, setCitySuggestions] = useState<{ cidade: string; uf: string }[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [citySearching, setCitySearching] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const cityTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCityChange = (value: string) => {
    setClient(p => ({ ...p, city: value }));
    if (cityTimerRef.current) clearTimeout(cityTimerRef.current);
    if (value.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    setCitySearching(true);
    cityTimerRef.current = setTimeout(async () => {
      const results = await searchCidadesDB(value);
      setCitySuggestions(results);
      setShowCitySuggestions(results.length > 0);
      setCitySearching(false);
    }, 300);
  };

  const selectCity = (cidade: string, uf: string) => {
    setClient(p => ({ ...p, city: cidade, state: uf }));
    setShowCitySuggestions(false);
  };

  const handleDistributorChange = (name: string) => {
    setSelectedDistributor(name);
    const dist = settings.distributors?.find(d => d.name === name);
    if (dist) {
      setClient(p => ({ ...p, kwhPrice: dist.kwhPrice }));
    }
  };

  const totalAverage = units.reduce((s, u) => {
    if (u.mode === 'monthly') {
      return s + MONTH_KEYS.reduce((ms, k) => ms + u.monthlyValues[k], 0) / 12;
    }
    return s + u.averageKwh;
  }, 0);

  // Combine all UCs into a single consumption object (respecting per-UC mode)
  const consumption = useMemo<MonthlyConsumption>(() => {
    const result = emptyMonthly();
    units.forEach(u => {
      if (u.mode === 'monthly') {
        MONTH_KEYS.forEach(k => { (result as any)[k] += u.monthlyValues[k]; });
      } else {
        MONTH_KEYS.forEach(k => { (result as any)[k] += Math.round(u.averageKwh * SEASONAL_FACTORS[k]); });
      }
    });
    return result;
  }, [units]);

  // Try local first, then async DB lookup
  const localLookup = lookupIrradiation(client.state, client.city);
  const [dbIrr, setDbIrr] = useState<{ value: number; found: boolean; monthly: number[] | null } | null>(null);

  useEffect(() => {
    if (localLookup.found || !client.city || client.city.length < 2) {
      setDbIrr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { getCidadesIrradianciaDB } = await import('@/data/supabaseStore');
      const monthly = await getCidadesIrradianciaDB(client.city, client.state);
      if (!cancelled && monthly) {
        const avg = monthly.reduce((a, b) => a + b, 0) / 12;
        setDbIrr({ value: avg, found: true, monthly });
      }
    })();
    return () => { cancelled = true; };
  }, [client.city, client.state, localLookup.found]);

  const irradiationLookup = dbIrr && dbIrr.found ? dbIrr : localLookup;
  const irradiation = irradiationLookup.value;
  const monthlyIrr = irradiationLookup.monthly;

  const basePanelCount = useMemo(() => {
    const baseDim = calcDimensioning(consumption, equipment, client.networkType, irradiation, client.kwhPrice, 0, settings.systemLoss);
    return baseDim.panelCount;
  }, [consumption, equipment, client.networkType, irradiation, client.kwhPrice, settings.systemLoss]);

  const finalPanels = Math.max(1, basePanelCount + panelDelta);

  const priceTable = useMemo(() => getPriceTable(), []);

  // Find best price table entry for a given line and panel count
  const findPriceTableEntry = useCallback((line: 'essencial' | 'excellence' | 'premium', panels: number): PriceTableEntry | null => {
    const entries = priceTable.filter(e => e[line] !== null && e[line]! > 0 && e.panels >= panels);
    entries.sort((a, b) => a.panels - b.panels);
    // Exact match first, then next available
    const exact = entries.find(e => e.panels === panels);
    if (exact) return exact;
    return entries[0] || null;
  }, [priceTable]);

  const systemCards = useMemo(() => {
    return LINES.map(line => {
      const custom = customKits[line];
      const isCustom = custom?.enabled;

      const panel = findPanel(line);
      const panelPowerKwp = (panel?.power || 570) / 1000;

      // Custom mode
      if (isCustom && custom) {
        const customPanelKwp = (custom.panelPowerWp / 1000) * custom.panelCount;
        const customBreakdown = calcCustomBreakdown(custom, line);
        const customPrice = customBreakdown.salePrice;
        const isPremium = line === 'premium';
        const microCount = isPremium ? calcMicroInverterCount(custom.panelCount) : 0;
        const maxPanels = isPremium ? 999 : Math.floor((custom.inverterPower * 1.5) / (custom.panelPowerWp / 1000));
        const panelsRemaining = isPremium ? 999 : maxPanels - custom.panelCount;
        const monthlyGen = customPanelKwp * irradiation * 30 * (1 - settings.systemLoss / 100);
        const dim = calcDimensioning(consumption, equipment, client.networkType, irradiation, client.kwhPrice, customPrice, settings.systemLoss);

        return {
          line, inverter: null, panel: null, panelCount: custom.panelCount, totalPrice: customPrice,
          maxPanels, panelsRemaining, microCount, isCustom: true,
          ptDetails: null, ptEntry: null, hasPriceTableCost: false,
          costBreakdown: {
            equipmentCost: customBreakdown.equipmentCost, installationCost: customBreakdown.installationCost,
            homologationCost: customBreakdown.homologationCost, caMaterialCost: customBreakdown.caMaterialCost,
            trunkCableCost: customBreakdown.trunkCableCost, totalCost: customBreakdown.totalCost,
            profitMargin: customBreakdown.profitMargin, salePrice: customBreakdown.salePrice,
            grossProfit: customBreakdown.grossProfit,
          },
          cardInstallments: calcCardInstallments(customPrice, settings.creditCardRates),
          inverterBrand: custom.inverterBrand || '—',
          inverterModel: custom.inverterModel || `${custom.inverterPower} kW`,
          panelBrand: custom.panelBrand || '—',
          panelPowerLabel: `${custom.panelPowerWp} Wp`,
          installments: calcInstallments(customPrice),
          dimensioning: { ...dim, panelCount: custom.panelCount, powerKwp: customPanelKwp, monthlyGeneration: monthlyGen, surplus: monthlyGen - dim.avgMonthlyKwh },
        };
      }

      // Table mode (original)
      const ptEntry = findPriceTableEntry(line, finalPanels);
      const ptDetails = (ptEntry?.details as any)?.[line] as PriceTableLineDetails | undefined;
      const usedPanels = ptEntry ? ptEntry.panels : finalPanels;
      const inverter = findInverterForPanels(line, usedPanels, panelPowerKwp);
      const powerKwp = usedPanels * panelPowerKwp;
      const hasPriceTableCost = ptEntry && ptEntry[line] !== null && ptEntry[line]! > 0;
      const totalPrice = hasPriceTableCost ? ptEntry[line]! : calcTotalPrice(inverter, panel, usedPanels, line);
      const dim = calcDimensioning(consumption, equipment, client.networkType, irradiation, client.kwhPrice, totalPrice, settings.systemLoss);
      const isPremium = line === 'premium';
      const microCount = isPremium ? calcMicroInverterCount(usedPanels) : 0;
      const ptInverterPower = ptDetails?.inverterPower ? parseFloat(ptDetails.inverterPower) : null;
      const ptPanelPower = ptDetails?.panelPower ? parseFloat(ptDetails.panelPower) : null;
      const effectiveInverterKw = ptInverterPower || inverter?.power || 0;
      const effectivePanelWp = ptPanelPower || panel?.power || 570;
      const effectivePanelKwp = effectivePanelWp / 1000;
      const maxPanels = isPremium ? 999 : Math.floor((effectiveInverterKw * 1.5) / effectivePanelKwp);
      const panelsRemaining = isPremium ? 999 : maxPanels - usedPanels;
      const monthlyGeneration = powerKwp * irradiation * 30 * (1 - settings.systemLoss / 100);
      const surplus = monthlyGeneration - dim.avgMonthlyKwh;
      const costBreakdown = calcCostBreakdown(inverter, panel, usedPanels, line);
      const cardInstallments = calcCardInstallments(totalPrice, settings.creditCardRates);

      return {
        line, inverter, panel, panelCount: usedPanels, totalPrice, maxPanels, panelsRemaining, microCount,
        isCustom: false, ptDetails, ptEntry, hasPriceTableCost, costBreakdown, cardInstallments,
        inverterBrand: ptDetails?.inverterBrand || inverter?.brand || '',
        inverterModel: ptDetails?.inverterPower ? `${ptDetails.inverterPower} kW` : inverter?.model || '',
        panelBrand: ptDetails?.panelBrand || panel?.brand || '',
        panelPowerLabel: ptDetails?.panelPower ? `${ptDetails.panelPower} Wp` : `${panel?.power || 570} Wp`,
        installments: calcInstallments(totalPrice),
        dimensioning: { ...dim, panelCount: usedPanels, powerKwp, monthlyGeneration, surplus },
      };
    });
  }, [consumption, equipment, client, irradiation, finalPanels, settings.systemLoss, settings.creditCardRates, findPriceTableEntry, customKits]);

  const chartData = useMemo(() => {
    const baseDim = systemCards[0]?.dimensioning;
    if (!baseDim) return [];
    return MONTH_KEYS.map((k, i) => {
      const irrMonth = monthlyIrr ? monthlyIrr[i] : irradiation * SEASONAL_FACTORS[k];
      const gen = baseDim.powerKwp * irrMonth * 30 * (1 - settings.systemLoss / 100);
      const row: any = { month: MONTH_LABELS[i], geração: Math.round(gen) };
      if (units.length > 1) {
        units.forEach((u, j) => {
          if (u.mode === 'monthly') {
            row[`UC ${j + 1}`] = u.monthlyValues[k];
          } else {
            row[`UC ${j + 1}`] = Math.round(u.averageKwh * SEASONAL_FACTORS[k]);
          }
        });
      } else {
        const u = units[0];
        if (u?.mode === 'monthly') {
          row['consumo'] = u.monthlyValues[k];
        } else {
          row['consumo'] = Math.round((u?.averageKwh || 0) * SEASONAL_FACTORS[k]);
        }
      }
      equipment.forEach((eq, idx) => {
        row[eq.label || `Equip ${idx + 1}`] = Math.round(calcEquipmentMonthly(eq) * SEASONAL_FACTORS[k]);
      });
      return row;
    });
  }, [consumption, equipment, systemCards, irradiation, monthlyIrr, settings.systemLoss, units, totalAverage]);

  const handleEstimate = (unitIdx: number) => {
    setUnits(prev => prev.map((u, i) => {
      if (i !== unitIdx) return u;
      return { ...u, monthlyValues: estimateFullConsumption(u.monthlyValues) };
    }));
  };

  const addEquipment = (cat: EquipmentCatalogItem) => {
    setEquipment(prev => [...prev, {
      id: Date.now().toString(),
      type: cat.type,
      label: cat.label,
      dailyKwh: cat.powerKw,
      daysPerMonth: cat.defaultDaysPerMonth,
      hoursPerDay: cat.defaultHoursPerDay,
      unit: cat.unit,
      value: cat.unit === 'km' ? 1000 : cat.defaultHoursPerDay,
      powerKw: cat.powerKw,
    }]);
  };

  const removeEquipment = (id: string) => setEquipment(prev => prev.filter(e => e.id !== id));

  const updateEquipment = (id: string, field: string, value: number) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const generateProposal = async (lineIdx: number) => {
    const card = systemCards[lineIdx];
    const consumerUnitsForProposal: ConsumerUnit[] = units.map(u => ({
      id: u.id,
      name: u.name,
      averageKwh: u.mode === 'monthly' ? MONTH_KEYS.reduce((s, k) => s + u.monthlyValues[k], 0) / 12 : u.averageKwh,
      monthlyValues: u.mode === 'monthly' ? u.monthlyValues : undefined,
    }));

    const custom = customKits[card.line];
    const isCustom = custom?.enabled;
    const sellerData = activeSellers.find(s => s.nome === client.seller);

    const proposal: Proposal = {
      id: editMode && editProposalId ? editProposalId : crypto.randomUUID(),
      clientData: { ...client, id: editMode ? (ep?.clientData?.id || crypto.randomUUID()) : crypto.randomUUID() },
      consumption, consumerUnits: consumerUnitsForProposal, equipment,
      selectedLine: card.line,
      selectedKit: isCustom
        ? {
            inverter: { id: 'custom', line: card.line as any, type: 'inversor', brand: custom.inverterBrand, model: custom.inverterModel, power: custom.inverterPower, warranty: 10, costPrice: 0, minPower: 0, maxPower: 999, active: true },
            panel: { id: 'custom', line: card.line as any, type: 'placa', brand: custom.panelBrand, model: custom.panelModel, power: custom.panelPowerWp, warranty: 25, costPrice: 0, minPower: 0, maxPower: 999, active: true },
            panelCount: custom.panelCount,
          }
        : { inverter: card.inverter, panel: card.panel, panelCount: card.panelCount },
      totalPrice: card.totalPrice,
      installmentValues: card.installments,
      cardInstallments: card.cardInstallments,
      costBreakdown: card.costBreakdown,
      cetApplied: editMode ? (ep?.cetApplied || null) : null,
      status: editMode ? (ep?.status || 'enviada') : 'enviada',
      createdAt: editMode ? (ep?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      dimensioning: card.dimensioning,
      irradiation,
      monthlyIrradiation: monthlyIrr || undefined,
      sellerPhone: sellerData?.telefone || '',
      sellerEmail: sellerData?.email || '',
      microInverterCount: card.microCount,
      inverterBrand: card.inverterBrand,
      inverterModel: card.inverterModel,
      panelBrand: card.panelBrand,
      panelPowerLabel: card.panelPowerLabel,
      customKit: isCustom ? custom : undefined,
      numero_proposta: editNumero || undefined,
    };

    saveProposal(proposal);
    try {
      const dbId = await savePropostaDB(proposal);
      if (editMode) {
        const { addHistoricoDB } = await import('@/data/supabaseStore');
        await addHistoricoDB(dbId, 'editada', session?.user?.id || null, {
          updatedAt: new Date().toISOString(),
          updatedBy: session?.user?.email || 'desconhecido',
        });
        toast.success(`Proposta ${editNumero} atualizada!`);
      } else {
        const { addHistoricoDB } = await import('@/data/supabaseStore');
        await addHistoricoDB(dbId, 'criada', session?.user?.id || null, {});
      }
      navigate(`/proposta/${dbId}`);
    } catch {
      navigate(`/proposta/${proposal.id}`);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 solar-badge bg-secondary/20 text-secondary-foreground">
          <Zap className="w-3.5 h-3.5" /> Calculadora Solar
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-primary text-balance" style={{ lineHeight: '1.1' }}>
          Dimensione seu sistema solar
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Preencha os dados abaixo para calcular o sistema ideal para seu cliente.
        </p>
      </div>

      {/* Client Data */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Sun className="w-5 h-5 text-secondary" /> Dados do Cliente
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome completo</label>
            <input className="solar-input" value={client.name} onChange={e => setClient(p => ({ ...p, name: e.target.value }))} />
          </div>
          
          <div className="relative" ref={cityRef}>
            <label className="block text-sm font-medium mb-1">Cidade</label>
            <input className="solar-input" value={client.city}
              onChange={e => handleCityChange(e.target.value)}
              onFocus={() => { if (citySuggestions.length > 0) setShowCitySuggestions(true); }}
              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
            />
            {showCitySuggestions && citySuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {citySuggestions.map((s, i) => (
                  <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onMouseDown={() => selectCity(s.cidade, s.uf)}>
                    {s.cidade} — {s.uf}
                  </button>
                ))}
              </div>
            )}
            {!irradiationLookup.found && client.city && (
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#E8B84B' }}>
                <AlertTriangle className="w-3 h-3" />
                Cidade não encontrada. Usando irradiância de Três Lagoas — MS.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de rede</label>
            <select className="solar-input" value={client.networkType} onChange={e => setClient(p => ({ ...p, networkType: e.target.value as any }))}>
              <option value="monofasica">Monofásica</option>
              <option value="bifasica">Bifásica</option>
              <option value="trifasica">Trifásica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Distribuidora</label>
            <select className="solar-input" value={selectedDistributor}
              onChange={e => handleDistributorChange(e.target.value)}>
              {(settings.distributors || []).map(d => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor kWh (R$)</label>
            <input className="solar-input" type="number" step="0.01" value={client.kwhPrice}
              onChange={e => setClient(p => ({ ...p, kwhPrice: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Vendedor</label>
            <select className="solar-input" value={client.seller} onChange={e => setClient(p => ({ ...p, seller: e.target.value }))}>
              <option value="">Selecione...</option>
              {activeSellers.map(s => <option key={s.user_id} value={s.nome}>{s.nome}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Consumption */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Zap className="w-5 h-5 text-secondary" /> Consumo de Energia
        </h2>

        <div className="space-y-4">
          {units.map((u, i) => (
            <div key={u.id} className="space-y-3 p-4 rounded-lg border border-border/50"
              style={{ borderLeftWidth: '4px', borderLeftColor: UC_COLORS[i % UC_COLORS.length] }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: UC_COLORS[i % UC_COLORS.length] }} />
                  UC {i + 1}: {u.name}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <button onClick={() => setUnits(prev => prev.map(x => x.id === u.id ? { ...x, mode: 'average' as ConsumptionMode, averageKwh: x.mode === 'monthly' ? Math.round(MONTH_KEYS.reduce((s, k) => s + x.monthlyValues[k], 0) / 12) : x.averageKwh } : x))}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${u.mode === 'average' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      Média
                    </button>
                    <button onClick={() => setUnits(prev => prev.map(x => x.id === u.id ? { ...x, mode: 'monthly' as ConsumptionMode } : x))}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${u.mode === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      Mês a mês
                    </button>
                  </div>
                  {units.length > 1 && (
                    <button onClick={() => setUnits(prev => prev.filter(x => x.id !== u.id))}
                      className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {u.mode === 'average' ? (
                <input className="solar-input" type="number" placeholder="Consumo médio mensal (kWh)"
                  value={u.averageKwh || ''}
                  onChange={e => setUnits(prev => prev.map(x => x.id === u.id ? { ...x, averageKwh: parseFloat(e.target.value) || 0 } : x))} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {MONTH_KEYS.map((k, mi) => (
                      <div key={k}>
                        <label className="block text-xs font-medium mb-1">{MONTH_LABELS[mi]}</label>
                        <input className="solar-input text-sm" type="number" placeholder="kWh"
                          value={u.monthlyValues[k] || ''}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setUnits(prev => prev.map(x => x.id === u.id
                              ? { ...x, monthlyValues: { ...x.monthlyValues, [k]: val } }
                              : x
                            ));
                          }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleEstimate(i)} className="solar-btn-outline text-sm py-2 px-4">
                    Estimar meses faltantes
                  </button>
                </>
              )}
            </div>
          ))}

          {units.length < 10 && (
            <button onClick={() => setUnits(prev => [...prev, {
              id: Date.now().toString(),
              name: `UC ${prev.length + 1}`,
              averageKwh: 0,
              mode: 'average' as ConsumptionMode,
              monthlyValues: emptyMonthly(),
            }])}
              className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
              <Plus className="w-4 h-4" /> Adicionar outra conta de luz
            </button>
          )}

          <p className="text-sm text-muted-foreground">
            Consumo total: <span className="font-semibold text-foreground">{formatNumber(totalAverage, 0)} kWh/mês</span>
            <span className="ml-2 text-xs">(dimensionado com {settings.surplusFactor ?? 20}% de reserva)</span>
          </p>
        </div>
      </section>

      {/* Equipment */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <button onClick={() => setEqOpen(!eqOpen)} className="w-full flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Plus className="w-5 h-5 text-secondary" /> Equipamentos Adicionais
          </h2>
          {eqOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        {eqOpen && (
          <div className="space-y-4">
            {Object.entries(EQUIPMENT_CATEGORIES).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(cat => (
                    <button key={cat.type} onClick={() => addEquipment(cat)}
                      className="text-left text-sm px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors flex justify-between items-center">
                      <span>{cat.label} <span className="text-xs text-muted-foreground">({cat.powerKw} kW)</span></span>
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {equipment.length > 0 && (
              <div className="space-y-3 border-t border-border pt-4">
                {equipment.map((eq, idx) => (
                  <div key={eq.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50" style={{ borderLeft: `4px solid ${EQUIPMENT_COLORS[idx % EQUIPMENT_COLORS.length]}` }}>
                    <span className="text-sm font-medium flex-1 min-w-[150px]">{eq.label}</span>
                    {eq.unit === 'km' ? (
                      <div className="flex items-center gap-1">
                        <input type="number" className="solar-input w-24 text-sm py-1" value={eq.value}
                          onChange={e => updateEquipment(eq.id, 'value', parseFloat(e.target.value) || 0)} />
                        <span className="text-xs text-muted-foreground">km/mês</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <input type="number" className="solar-input w-16 text-sm py-1" value={eq.hoursPerDay}
                            onChange={e => updateEquipment(eq.id, 'hoursPerDay', parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-muted-foreground">h/dia</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" className="solar-input w-16 text-sm py-1" value={eq.daysPerMonth}
                            onChange={e => updateEquipment(eq.id, 'daysPerMonth', parseFloat(e.target.value) || 0)} />
                          <span className="text-xs text-muted-foreground">d/mês</span>
                        </div>
                      </>
                    )}
                    <span className="text-xs font-semibold text-primary min-w-[80px] text-right">
                      {formatNumber(calcEquipmentMonthly(eq), 0)} kWh/mês
                    </span>
                    <button onClick={() => removeEquipment(eq.id)} className="text-destructive hover:text-destructive/80">
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Chart */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary" /> Gráfico Mensal
        </h2>
        <div className="h-80 md:h-80 min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              barCategoryGap={typeof window !== 'undefined' && window.innerWidth < 768 ? '10%' : '20%'}>
              <XAxis dataKey="month" tick={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 11 : 12 }} />
              <YAxis tick={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 11 : 12 }} />
              <Tooltip formatter={(v: number) => `${v} kWh`} />
              <Legend wrapperStyle={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '11px' : '12px' }} />
              <Bar dataKey="geração" fill="#4A5A2A" radius={[4, 4, 0, 0]}
                maxBarSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : undefined} />
              {units.length > 1 ? (
                units.map((_, j) => (
                  <Bar key={j} dataKey={`UC ${j + 1}`} stackId="consumption"
                    fill={UC_COLORS[j % UC_COLORS.length]}
                    maxBarSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : undefined} />
                ))
              ) : (
                <Bar dataKey="consumo" stackId="consumption" fill="#E8B84B"
                  maxBarSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : undefined} />
              )}
              {equipment.map((eq, idx) => (
                <Bar key={eq.id} dataKey={eq.label} stackId="consumption"
                  fill={EQUIPMENT_COLORS[idx % EQUIPMENT_COLORS.length]}
                  maxBarSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Unified Panel Adjustment */}
      <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '450ms' }}>
        <h2 className="text-xl font-bold text-primary text-center">Ajustar Quantidade de Placas</h2>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setPanelDelta(d => d - 1)}
            disabled={finalPanels <= 1}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95"
          >
            −
          </button>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">{finalPanels}</p>
            <p className="text-sm text-muted-foreground">placas</p>
          </div>
          <button
            onClick={() => setPanelDelta(d => d + 1)}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold hover:bg-primary/90 transition-all active:scale-95"
          >
            +
          </button>
        </div>
        {/* Indicators */}
        {systemCards[0] && (() => {
          const refCard = systemCards[0];
          const gen = refCard.dimensioning.monthlyGeneration;
          const cons = refCard.dimensioning.avgMonthlyKwh;
          const exc = gen - cons;
          return (
            <div className="space-y-0.5 text-center" style={{ fontSize: '12px', color: '#888' }}>
              <p>Consumo: {formatNumber(cons, 0)} kWh/mês</p>
              <p>Geração estimada: {formatNumber(gen, 0)} kWh/mês</p>
              <p style={{ color: exc >= 0 ? '#3BB273' : '#E84855' }}>
                Excedente: {exc >= 0 ? '+' : '−'}{formatNumber(Math.abs(exc), 0)} kWh/mês
              </p>
            </div>
          );
        })()}
        {panelDelta !== 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Mínimo recomendado: {basePanelCount} placas ({panelDelta > 0 ? '+' : ''}{panelDelta} ajuste)
            <button onClick={() => setPanelDelta(0)} className="ml-2 text-primary underline">Resetar</button>
          </p>
        )}
      </section>

      {/* System Cards */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
        <h2 className="text-2xl font-bold text-primary text-center">Sistemas Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemCards.map((card, idx) => {
            const isPremium = card.line === 'premium';
            const maxP = card.maxPanels;
            const remaining = card.panelsRemaining;
            const limitColor = isPremium ? undefined : (remaining <= 0 ? '#E84855' : remaining <= 2 ? '#E8B84B' : undefined);
            return (
              <div key={card.line} 
                className={`solar-card p-6 space-y-4 relative cursor-pointer transition-all ${selectedLine === idx ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
                onClick={() => setSelectedLine(idx)}
              >
                <div className="text-center">
                  <h3 className="text-lg font-bold text-primary">{LINE_NAMES[card.line]}</h3>
                  <p className="text-xs text-muted-foreground">{LINE_SUBS[card.line]}</p>
                </div>

                {/* Custom mode toggle - only for authenticated users */}
                {isAuthenticated && (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5" />
                      {customKits[card.line]?.enabled ? 'Personalizar' : 'Usar tabela de preços'}
                    </span>
                    <Switch
                      checked={customKits[card.line]?.enabled || false}
                      onCheckedChange={(checked) => setCustomKits(prev => ({
                        ...prev,
                        [card.line]: { ...(prev[card.line] || defaultCustomKit(finalPanels)), enabled: checked, panelCount: checked && !prev[card.line]?.panelCount ? finalPanels : (prev[card.line]?.panelCount || finalPanels) },
                      }))}
                    />
                  </div>
                )}

                {/* Custom kit form */}
                {customKits[card.line]?.enabled && (
                  <CustomKitForm
                    data={customKits[card.line]}
                    onChange={(d) => setCustomKits(prev => ({ ...prev, [card.line]: d }))}
                    line={card.line}
                    isAuthenticated={isAuthenticated}
                  />
                )}

                <div className="space-y-2 text-sm">
                  {isPremium ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Micro inversores</span>
                      <span className="font-medium">{card.microCount}× {card.inverterBrand} {card.inverterModel}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Inversor</span><span className="font-medium">{card.inverterBrand} {card.inverterModel}</span></div>
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Suporta até</span>
                        <span className="font-medium text-right" style={limitColor ? { color: limitColor } : undefined}>
                          {maxP} placas de {card.panelPowerLabel}
                          {remaining <= 2 && remaining > 0 && <span className="block text-xs" style={{ color: '#E8B84B' }}>Quase no limite do inversor</span>}
                          {remaining <= 0 && <span className="block text-xs text-destructive">Limite atingido — próximo kit usa inversor maior</span>}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Placas</span><span className="font-medium">{card.panelCount}× {card.panelBrand} ({card.panelPowerLabel})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Potência</span><span className="font-medium">{formatNumber(card.dimensioning.powerKwp)} kWp</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Geração/mês</span><span className="font-medium">{formatNumber(card.dimensioning.monthlyGeneration, 0)} kWh</span></div>
                  {card.isCustom ? (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Fonte</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground font-medium">⚡ Personalizada</span>
                    </div>
                  ) : card.hasPriceTableCost && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Fonte</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Tabela de preços</span>
                    </div>
                  )}
                </div>

                <div className="text-center py-3 border-y border-border">
                  <p className="text-xs text-muted-foreground mb-1">Investimento</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(card.costBreakdown.salePrice)}</p>
                </div>

                {/* Payment tabs */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <button onClick={() => setPaymentTab('financing')}
                      className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${paymentTab === 'financing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      Financiamento
                    </button>
                    <button onClick={() => setPaymentTab('card')}
                      className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${paymentTab === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      <CreditCard className="w-3 h-3 inline mr-1" />Cartão
                    </button>
                  </div>
                  {paymentTab === 'financing' ? (
                    <div className="space-y-1 text-xs">
                      {Object.entries(card.installments).map(([n, v]) => (
                        <div key={n} className="flex justify-between">
                          <span className="text-muted-foreground">{n}×</span>
                          <span className="font-medium">{formatCurrency(v as number)}</span>
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        Valores sujeitos à aprovação de crédito
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                      {Object.entries(card.cardInstallments).map(([n, v]) => (
                        <div key={n} className="flex justify-between">
                          <span className="text-muted-foreground">{n}×</span>
                          <span className="font-medium">{formatCurrency((v as any).perMonth)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Internal cost breakdown - only for authenticated users */}
                {isAuthenticated && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <button onClick={() => setShowCostPanel(p => !p)}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                      {showCostPanel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showCostPanel ? 'Ocultar custos internos' : 'Ver custos internos'}
                    </button>
                    {showCostPanel && (
                      <div className="space-y-1.5 text-xs p-3 rounded-lg bg-muted/50 border border-border/50">
                        <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-2">Detalhamento interno</p>
                        <div className="flex justify-between"><span className="text-muted-foreground">Equipamentos</span><span>{formatCurrency(card.costBreakdown.equipmentCost)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Instalação ({card.panelCount}× R$100)</span><span>{formatCurrency(card.costBreakdown.installationCost)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Homologação</span><span>{formatCurrency(card.costBreakdown.homologationCost)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Material CA ({card.inverter?.power || 0} kW)</span><span>{formatCurrency(card.costBreakdown.caMaterialCost)}</span></div>
                        {card.costBreakdown.trunkCableCost > 0 && (
                          <div className="flex justify-between"><span className="text-muted-foreground">Cabo tronco</span><span>{formatCurrency(card.costBreakdown.trunkCableCost)}</span></div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t border-border font-semibold"><span>Custo total</span><span>{formatCurrency(card.costBreakdown.totalCost)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Margem</span><span>{card.costBreakdown.profitMargin}%</span></div>
                        <div className="flex justify-between font-bold text-primary"><span>Preço de venda</span><span>{formatCurrency(card.costBreakdown.salePrice)}</span></div>
                        <div className="flex justify-between text-green-600 font-semibold"><span>Lucro bruto</span><span>{formatCurrency(card.costBreakdown.grossProfit)}</span></div>
                      </div>
                    )}
                  </div>
                )}

                {selectedLine === idx && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Central Generate Proposal Button */}
        <div className="text-center pt-4">
          {selectedLine === null ? (
            <p className="text-sm text-muted-foreground mb-3">Clique em uma das opções acima para selecionar</p>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">
              Selecionado: <span className="font-semibold text-primary">{LINE_NAMES[systemCards[selectedLine].line]}</span>
            </p>
          )}
          <button
            onClick={() => {
              if (selectedLine === null) {
                toast.error('Selecione uma opção de sistema antes de gerar a proposta.');
                return;
              }
              generateProposal(selectedLine);
            }}
            className="solar-btn-primary px-8 py-3 text-base flex items-center justify-center gap-2 mx-auto"
          >
            {editMode ? 'Atualizar Proposta' : 'Gerar Proposta'} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Financial Summary */}
      {selectedLine !== null && systemCards[selectedLine] && (
        <section className="solar-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <h2 className="text-xl font-bold text-primary">Viabilidade Financeira ({LINE_NAMES[systemCards[selectedLine].line]})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Economia mensal', value: formatCurrency(systemCards[selectedLine].dimensioning.monthlySavings) },
              { label: 'Payback', value: `${formatNumber(systemCards[selectedLine].dimensioning.paybackYears)} anos` },
              { label: 'Retorno 10 anos', value: formatCurrency(systemCards[selectedLine].dimensioning.return10) },
              { label: 'Retorno 25 anos', value: formatCurrency(systemCards[selectedLine].dimensioning.return25) },
            ].map(item => (
              <div key={item.label} className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="text-lg font-bold text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
