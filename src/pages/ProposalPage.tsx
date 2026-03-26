import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getProposals, saveProposal, getSettings, getSocialProofs, lookupIrradiation } from '@/data/store';
import {
  formatCurrency, formatNumber, calcInstallments, calcDimensioning,
  findInverterForPanels, findPanel, calcTotalPrice, maxPanelsForInverter,
  calcMicroInverterCount, calcCardInstallments, calcEquipmentMonthly,
} from '@/data/calculations';
import { MONTH_LABELS, MONTH_KEYS, SEASONAL_FACTORS, INSTALLMENT_OPTIONS, UC_COLORS, LINE_NAMES, LINE_SUBS } from '@/data/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { Printer, Share2, Edit, ArrowLeft, Sun, Zap, TrendingUp, Shield, X, Cpu } from 'lucide-react';
import logo from '@/assets/logo.png';

const LINES = ['acesso', 'excellence', 'premium'] as const;

export default function ProposalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const proposals = getProposals();
  const proposal = proposals.find(p => p.id === id);
  const settings = getSettings();
  const socialProofs = getSocialProofs().filter(s => s.active);
  const [cetModal, setCetModal] = useState(false);
  const [cetValue, setCetValue] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [panelDelta, setPanelDelta] = useState(0);
  const [cashflowInstallments, setCashflowInstallments] = useState(60);
  const [paymentTab, setPaymentTab] = useState<'financing' | 'card'>('financing');
  const [cashflowMode, setCashflowMode] = useState<'financing' | 'card' | 'cash'>('financing');

  const basePanelCount = proposal?.selectedKit.panelCount ?? 0;
  const finalPanels = Math.max(Math.max(1, basePanelCount - 2), basePanelCount + panelDelta);
  const irradiation = proposal ? lookupIrradiation(proposal.clientData.state || 'MS', proposal.clientData.city).value : 5.0;

  // Recommended minimum panels from dimensioning
  const recommendedPanels = useMemo(() => {
    if (!proposal) return 0;
    const dim = calcDimensioning(
      proposal.consumption, proposal.equipment, proposal.clientData.networkType,
      irradiation, proposal.clientData.kwhPrice, 0, settings.systemLoss
    );
    return dim.panelCount;
  }, [proposal, irradiation, settings.systemLoss]);

  const lineCards = useMemo(() => {
    if (!proposal) return [];
    return LINES.map(line => {
      const panel = findPanel(line);
      const panelPowerKwp = (panel?.power || 570) / 1000;
      const inverter = findInverterForPanels(line, finalPanels, panelPowerKwp);
      const powerKwp = finalPanels * panelPowerKwp;
      const totalPrice = calcTotalPrice(inverter, panel, finalPanels, line);
      const dim = calcDimensioning(
        proposal.consumption, proposal.equipment, proposal.clientData.networkType,
        irradiation, proposal.clientData.kwhPrice, totalPrice, settings.systemLoss
      );
      const isPremium = line === 'premium';
      const microCount = isPremium ? calcMicroInverterCount(finalPanels) : 0;
      const maxPanels = isPremium ? 999 : (inverter ? maxPanelsForInverter(inverter.power, panelPowerKwp) : 0);
      const panelsRemaining = isPremium ? 999 : maxPanels - finalPanels;
      const monthlyGeneration = powerKwp * irradiation * 30 * (1 - settings.systemLoss / 100);
      const surplus = monthlyGeneration - dim.avgMonthlyKwh;
      const installments = proposal.cetApplied
        ? calcInstallments(totalPrice, proposal.cetApplied)
        : calcInstallments(totalPrice);
      const cardInstallments = calcCardInstallments(totalPrice, settings.creditCardRates);

      return {
        line, inverter, panel, panelCount: finalPanels, totalPrice, maxPanels, panelsRemaining, microCount,
        installments, cardInstallments,
        dimensioning: { ...dim, panelCount: finalPanels, powerKwp, monthlyGeneration, surplus },
      };
    });
  }, [finalPanels, proposal, irradiation, settings.systemLoss, settings.creditCardRates]);

  const chartData = useMemo(() => {
    if (!proposal || lineCards.length === 0) return [];
    const card = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
    if (!card) return [];
    return MONTH_KEYS.map((k, i) => {
      const gen = card.dimensioning.powerKwp * irradiation * 30 * (1 - settings.systemLoss / 100) * SEASONAL_FACTORS[k];
      const row: any = { month: MONTH_LABELS[i], geração: Math.round(gen) };
      if (proposal.consumerUnits && proposal.consumerUnits.length > 1) {
        proposal.consumerUnits.forEach((u, j) => {
          row[`UC ${j + 1}`] = Math.round(u.averageKwh * SEASONAL_FACTORS[k]);
        });
      } else {
        row['consumo'] = Math.round((proposal.dimensioning.avgMonthlyKwh) * SEASONAL_FACTORS[k]);
      }
      return row;
    });
  }, [lineCards, proposal, irradiation, settings.systemLoss]);

  // Cashflow data
  const cashflowData = useMemo(() => {
    if (!proposal || lineCards.length === 0) return [];
    const selectedCard = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
    if (!selectedCard) return [];

    const monthlyBill = selectedCard.dimensioning.avgMonthlyKwh * proposal.clientData.kwhPrice;
    const minFee = Math.max(80, monthlyBill * 0.15);

    const data: any[] = [];
    let accWithout = 0;
    let accWith = 0;

    for (let year = 0; year <= 15; year++) {
      const yearlyBill = monthlyBill * 12 * Math.pow(1.10, year);
      accWithout += yearlyBill;

      let yearlyWithSolar: number;
      if (cashflowMode === 'cash') {
        yearlyWithSolar = year === 0 ? selectedCard.totalPrice + minFee * 12 : minFee * 12;
      } else if (cashflowMode === 'card') {
        const bestCard = Object.values(selectedCard.cardInstallments).pop();
        const cardMonthly = bestCard ? bestCard.perMonth : selectedCard.totalPrice / 12;
        const cardMonths = bestCard ? Number(Object.keys(selectedCard.cardInstallments).pop()) : 12;
        yearlyWithSolar = year === 0 ? (cardMonthly * Math.min(cardMonths, 12) + minFee * 12) : (year * 12 < cardMonths ? (cardMonthly * 12 + minFee * 12) : minFee * 12);
      } else {
        const monthlyInstallment = selectedCard.installments[cashflowInstallments] || selectedCard.totalPrice / cashflowInstallments;
        const financingYears = cashflowInstallments / 12;
        yearlyWithSolar = year < financingYears
          ? (monthlyInstallment + minFee) * 12
          : minFee * 12;
      }
      accWith += yearlyWithSolar;

      data.push({
        year: `${year}`,
        semSolar: Math.round(accWithout),
        comSolar: Math.round(accWith),
      });
    }
    return data;
  }, [lineCards, proposal, cashflowInstallments, cashflowMode]);

  const paybackYear = useMemo(() => {
    for (let i = 1; i < cashflowData.length; i++) {
      if (cashflowData[i]?.comSolar <= cashflowData[i]?.semSolar && cashflowData[i - 1]?.comSolar > cashflowData[i - 1]?.semSolar) {
        return i;
      }
      if (cashflowData[i]?.semSolar >= cashflowData[i]?.comSolar) return i;
    }
    return null;
  }, [cashflowData]);

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary">Proposta não encontrada</h1>
          <button onClick={() => navigate('/')} className="solar-btn-primary">Voltar</button>
        </div>
      </div>
    );
  }

  const applyCet = () => {
    const cet = parseFloat(cetValue);
    if (cet > 0) {
      const updated = { ...proposal, cetApplied: cet, installmentValues: calcInstallments(proposal.totalPrice, cet) };
      saveProposal(updated);
      setCetModal(false);
      window.location.reload();
    }
  };

  const selectedCard = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
  const savings15 = cashflowData.length > 0
    ? (cashflowData[cashflowData.length - 1]?.semSolar || 0) - (cashflowData[cashflowData.length - 1]?.comSolar || 0)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Action bar */}
      <div className="no-print sticky top-0 z-50 bg-card border-b border-border/50 shadow-sm">
        <div className="container flex items-center justify-between py-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); }}
              className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
            <button onClick={() => setCetModal(true)} className="solar-btn-outline text-sm py-2 px-3 flex items-center gap-1">
              <Edit className="w-4 h-4" /> Editar CET
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto py-8 px-4 space-y-12">
        {/* COVER */}
        <section className="text-center space-y-6 py-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="absolute text-6xl font-bold text-primary select-none"
                style={{ left: `${(i % 5) * 22}%`, top: `${Math.floor(i / 5) * 28}%` }}>+</span>
            ))}
          </div>
          <div className="relative z-10">
            <img src={logo} alt="Três Lagoas Solar" className="h-24 mx-auto mb-6" />
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">{settings.company.name}</p>
            <h1 className="text-4xl md:text-5xl font-bold text-primary text-balance" style={{ lineHeight: '1.1' }}>
              Meu Projeto de<br />Energia Solar Fotovoltaica
            </h1>
            <div className="mt-8 space-y-1">
              <p className="text-xl font-semibold">{proposal.clientData.name}</p>
              <p className="text-muted-foreground">{proposal.clientData.city} — {proposal.clientData.state || 'MS'}</p>
              <p className="text-muted-foreground">{formatNumber(lineCards[0]?.dimensioning.avgMonthlyKwh || 0, 0)} kWh/mês</p>
              <p className="text-sm text-muted-foreground mt-4">
                Representante: {proposal.clientData.seller}<br />
                {settings.company.phone} • {settings.company.email}
              </p>
            </div>
          </div>
        </section>

        {/* PANEL ADJUSTMENT */}
        <section className="solar-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-primary text-center flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-secondary" /> Ajuste seu Sistema
          </h2>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setPanelDelta(d => {
                const next = basePanelCount + d - 1;
                return next >= basePanelCount - 2 && next >= 1 ? d - 1 : d;
              })}
              disabled={finalPanels <= Math.max(1, basePanelCount - 2)}
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
          <p className="text-center text-xs text-muted-foreground">
            Mínimo recomendado: {recommendedPanels} placas
            {panelDelta !== 0 && (
              <button onClick={() => setPanelDelta(0)} className="ml-2 text-primary underline">Resetar</button>
            )}
          </p>
        </section>

        {/* 3 LINE CARDS */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-primary text-center flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-secondary" /> Compare as Linhas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lineCards.map(card => {
              const isPremium = card.line === 'premium';
              const maxP = card.maxPanels;
              const remaining = card.panelsRemaining;
              const limitColor = isPremium ? undefined : (remaining <= 0 ? '#E84855' : remaining <= 2 ? '#E8B84B' : undefined);

              return (
                <div key={card.line} className={`solar-card p-6 space-y-4 ${card.line === proposal.selectedLine ? 'ring-2 ring-primary' : ''}`}>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-primary">{LINE_NAMES[card.line]}</h3>
                    <p className="text-xs text-muted-foreground">{LINE_SUBS[card.line]}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    {isPremium ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Micro inversores</span>
                        <span className="font-medium text-right">{card.microCount}× {card.inverter?.brand} {card.inverter?.model}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Inversor</span><span className="font-medium text-right">{card.inverter?.brand} {card.inverter?.model}</span></div>
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Suporta até</span>
                          <span className="font-medium text-right" style={limitColor ? { color: limitColor } : undefined}>
                            {maxP} placas
                            {remaining <= 0 && <span className="block text-xs">Limite atingido — inversor será atualizado na próxima placa</span>}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Placas</span><span className="font-medium">{card.panelCount}× {card.panel?.brand} {card.panel?.power}Wp</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Potência</span><span className="font-medium">{formatNumber(card.dimensioning.powerKwp)} kWp</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Geração/mês</span><span className="font-semibold text-primary">{formatNumber(card.dimensioning.monthlyGeneration, 0)} kWh</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Excedente</span><span className="font-medium">{formatNumber(card.dimensioning.surplus, 0)} kWh</span></div>
                  </div>

                  <div className="text-center py-3 border-y border-border">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(card.totalPrice)}</p>
                  </div>

                  {/* Payment tabs */}
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <button onClick={() => setPaymentTab('financing')}
                        className={`flex-1 text-xs py-1 rounded ${paymentTab === 'financing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        Financiamento
                      </button>
                      <button onClick={() => setPaymentTab('card')}
                        className={`flex-1 text-xs py-1 rounded ${paymentTab === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        Cartão
                      </button>
                    </div>
                    {paymentTab === 'financing' ? (
                      <div className="space-y-1 text-xs">
                        {INSTALLMENT_OPTIONS.map(n => (
                          <div key={n} className="flex justify-between">
                            <span className="text-muted-foreground">{n}×</span>
                            <span className="font-medium">{formatCurrency(card.installments[n])}</span>
                          </div>
                        ))}
                        {proposal.cetApplied && <p className="text-xs text-muted-foreground mt-1">CET {proposal.cetApplied}% a.m.</p>}
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                        {Object.entries(card.cardInstallments).map(([n, v]) => (
                          <div key={n} className="flex justify-between">
                            <span className="text-muted-foreground">{n}×</span>
                            <span className="font-medium">{formatCurrency(v.perMonth)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CHART */}
        <section className="solar-card p-8 space-y-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-secondary" /> Geração vs Consumo — 12 Meses
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v} kWh`} />
                <Legend />
                <Bar dataKey="geração" fill="#4A5A2A" radius={[4, 4, 0, 0]} />
                {proposal.consumerUnits && proposal.consumerUnits.length > 1 ? (
                  proposal.consumerUnits.map((u, j) => (
                    <Bar key={u.id} dataKey={`UC ${j + 1}`} stackId="consumption"
                      fill={UC_COLORS[j % UC_COLORS.length]} />
                  ))
                ) : (
                  <Bar dataKey="consumo" stackId="consumption" fill="#E8B84B" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* EQUIPMENT */}
        {proposal.equipment && proposal.equipment.length > 0 && (
          <section className="solar-card p-8 space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Cpu className="w-6 h-6 text-secondary" /> Equipamentos Adicionais
            </h2>
            <div className="space-y-2">
              {proposal.equipment.map((eq, idx) => (
                <div key={eq.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="font-medium">{eq.label}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    {eq.unit === 'km' ? (
                      <span>{eq.value} km/mês</span>
                    ) : (
                      <span>{eq.hoursPerDay}h/dia × {eq.daysPerMonth}d/mês</span>
                    )}
                    <span className="font-semibold text-primary">{formatNumber(calcEquipmentMonthly(eq), 0)} kWh/mês</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-border text-sm font-semibold">
                <span>Total equipamentos</span>
                <span className="text-primary">{formatNumber(proposal.equipment.reduce((s, e) => s + calcEquipmentMonthly(e), 0), 0)} kWh/mês</span>
              </div>
            </div>
          </section>
        )}


        <section className="solar-card p-8 space-y-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-secondary" /> Fluxo de Caixa Comparativo
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1">
              <button onClick={() => setCashflowMode('financing')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${cashflowMode === 'financing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                Financiamento
              </button>
              <button onClick={() => setCashflowMode('card')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${cashflowMode === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                Cartão
              </button>
              <button onClick={() => setCashflowMode('cash')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${cashflowMode === 'cash' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                À Vista
              </button>
            </div>
            {cashflowMode === 'financing' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Parcelas:</label>
                <div className="flex gap-1">
                  {INSTALLMENT_OPTIONS.map(n => (
                    <button key={n} onClick={() => setCashflowInstallments(n)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${cashflowInstallments === n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                      {n}×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Anos', position: 'insideBottom', offset: -5 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                {paybackYear && <ReferenceLine x={`${paybackYear}`} stroke="#4A5A2A" strokeDasharray="3 3" label={{ value: 'Payback', fill: '#4A5A2A', fontSize: 11 }} />}
                <Line type="monotone" dataKey="semSolar" name="Sem Solar" stroke="#E84855" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="comSolar" name="Com Solar" stroke="#4A5A2A" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-primary/5">
              <p className="text-xs text-muted-foreground">Economia mensal</p>
              <p className="text-xl font-bold text-primary">{selectedCard ? formatCurrency(selectedCard.dimensioning.monthlySavings) : '—'}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/5">
              <p className="text-xs text-muted-foreground">Payback</p>
              <p className="text-xl font-bold text-primary">{selectedCard ? `${formatNumber(selectedCard.dimensioning.paybackYears)} anos` : '—'}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-primary/5">
              <p className="text-xs text-muted-foreground">Economia em 15 anos</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(savings15)}</p>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        {socialProofs.length > 0 && (
          <section className="solar-card p-8 space-y-6">
            <h2 className="text-2xl font-bold text-primary">Nossos Projetos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {socialProofs.slice(0, 3).map(sp => (
                <div key={sp.id} className="cursor-pointer group"
                  onClick={() => sp.type === 'video' ? setVideoModal(sp.url) : setLightbox(sp.url)}>
                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {sp.type === 'video' ? (
                      <div className="text-center"><Sun className="w-10 h-10 text-secondary mx-auto" /><p className="text-xs mt-2">▶ Assistir</p></div>
                    ) : (
                      <img src={sp.url} alt={sp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                  </div>
                  <p className="text-sm font-medium mt-2">{sp.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* CET Modal */}
      {cetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center no-print" onClick={() => setCetModal(false)}>
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary">Editar CET</h3>
            <div>
              <label className="block text-sm font-medium mb-1">CET real (% a.m.)</label>
              <input className="solar-input" type="number" step="0.01" value={cetValue} onChange={e => setCetValue(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCetModal(false)} className="solar-btn-outline text-sm py-2">Cancelar</button>
              <button onClick={applyCet} className="solar-btn-primary text-sm py-2">Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center no-print" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-8 h-8" /></button>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}

      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center no-print" onClick={() => setVideoModal(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-8 h-8" /></button>
          <iframe src={videoModal.replace('watch?v=', 'embed/')} className="w-[90vw] max-w-3xl aspect-video rounded-lg" allowFullScreen />
        </div>
      )}
    </div>
  );
}
