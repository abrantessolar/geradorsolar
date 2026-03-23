import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getProposals, saveProposal, getSettings, getSocialProofs } from '@/data/store';
import {
  formatCurrency, formatNumber, calcInstallments, calcDimensioning,
  findInverterForPanels, findPanel, calcTotalPrice, maxPanelsForInverter,
  getInvertersList,
} from '@/data/calculations';
import { MONTH_LABELS, MONTH_KEYS, SEASONAL_FACTORS, INSTALLMENT_OPTIONS, UC_COLORS } from '@/data/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Printer, Share2, Edit, ArrowLeft, Sun, Zap, TrendingUp, Shield, X, ChevronUp, ChevronDown } from 'lucide-react';

const LINES = ['acesso', 'excellence', 'premium'] as const;
const LINE_NAMES: Record<string, string> = { acesso: 'ACESSO', excellence: 'EXCELLENCE', premium: 'PREMIUM' };
const LINE_SUBS: Record<string, string> = { acesso: 'Equipamentos nacionais', excellence: 'Importados intermediários', premium: 'Top de linha' };

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

  const basePanelCount = proposal?.selectedKit.panelCount ?? 0;
  const finalPanels = Math.max(Math.max(1, basePanelCount - 2), basePanelCount + panelDelta);
  const irradiation = settings.irradiation[proposal?.clientData.city || ''] || 5.0;

  const lineCards = useMemo(() => {
    if (!proposal) return [];
    return LINES.map(line => {
      const panel = findPanel(line);
      const panelPowerKwp = (panel?.power || 570) / 1000;
      const inverter = findInverterForPanels(line, finalPanels, panelPowerKwp);
      const powerKwp = finalPanels * panelPowerKwp;
      const totalPrice = calcTotalPrice(inverter, panel, finalPanels);
      const dim = calcDimensioning(
        proposal.consumption, proposal.equipment, proposal.clientData.networkType,
        irradiation, proposal.clientData.kwhPrice, totalPrice, settings.systemLoss
      );
      const maxPanels = inverter ? maxPanelsForInverter(inverter.power, panelPowerKwp) : 0;
      const panelsRemaining = maxPanels - finalPanels;
      const installments = proposal.cetApplied
        ? calcInstallments(totalPrice, proposal.cetApplied)
        : calcInstallments(totalPrice);

      return {
        line, inverter, panel, panelCount: finalPanels, totalPrice, maxPanels, panelsRemaining,
        installments,
        dimensioning: { ...dim, panelCount: finalPanels, powerKwp },
      };
    });
  }, [finalPanels, proposal, irradiation, settings.systemLoss]);

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
        row['consumo'] = proposal.consumption[k];
      }
      return row;
    });
  }, [lineCards, proposal, irradiation, settings.systemLoss]);

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
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-6">
              <Sun className="w-12 h-12 text-secondary" />
            </div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Três Lagoas Solar — Energia Limpa</p>
            <h1 className="text-4xl md:text-5xl font-bold text-primary text-balance" style={{ lineHeight: '1.1' }}>
              Meu Projeto de<br />Energia Solar Fotovoltaica
            </h1>
            <div className="mt-8 space-y-1">
              <p className="text-xl font-semibold">{proposal.clientData.name}</p>
              <p className="text-muted-foreground">{formatNumber(lineCards[0].dimensioning.avgMonthlyKwh, 0)} kWh/mês</p>
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
          {panelDelta !== 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Base: {basePanelCount} placas ({panelDelta > 0 ? '+' : ''}{panelDelta})
              <button onClick={() => setPanelDelta(0)} className="ml-2 text-primary underline">Resetar</button>
            </p>
          )}
        </section>

        {/* 3 LINE CARDS */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-primary text-center flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-secondary" /> Compare as Linhas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lineCards.map(card => {
              const maxP = card.maxPanels;
              const remaining = card.panelsRemaining;
              const limitColor = remaining <= 0 ? '#E84855' : remaining <= 2 ? '#E8B84B' : undefined;
              const inverters = getInvertersList(card.line);
              const currentIdx = inverters.findIndex(inv => inv.id === card.inverter?.id);

              return (
                <div key={card.line} className={`solar-card p-6 space-y-4 ${card.line === proposal.selectedLine ? 'ring-2 ring-primary' : ''}`}>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-primary">{LINE_NAMES[card.line]}</h3>
                    <p className="text-xs text-muted-foreground">{LINE_SUBS[card.line]}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Inversor</span><span className="font-medium text-right">{card.inverter?.brand} {card.inverter?.model}</span></div>
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">Suporta até</span>
                      <span className="font-medium text-right" style={limitColor ? { color: limitColor } : undefined}>
                        {maxP} placas
                        {remaining <= 0 && <span className="block text-xs">Limite atingido — inversor será atualizado na próxima placa</span>}
                      </span>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Placas</span><span className="font-medium">{card.panelCount}× {card.panel?.brand} {card.panel?.power}Wp</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Potência</span><span className="font-medium">{formatNumber(card.dimensioning.powerKwp)} kWp</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Geração/mês</span><span className="font-semibold text-primary">{formatNumber(card.dimensioning.monthlyGeneration, 0)} kWh</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Excedente</span><span className="font-medium">{formatNumber(card.dimensioning.surplus, 0)} kWh</span></div>
                  </div>

                  <div className="text-center py-3 border-y border-border">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(card.totalPrice)}</p>
                  </div>

                  <div className="space-y-1 text-xs">
                    {INSTALLMENT_OPTIONS.map(n => (
                      <div key={n} className="flex justify-between">
                        <span className="text-muted-foreground">{n}×</span>
                        <span className="font-medium">{formatCurrency(card.installments[n])}</span>
                      </div>
                    ))}
                    {proposal.cetApplied && <p className="text-xs text-muted-foreground mt-1">CET {proposal.cetApplied}% a.m.</p>}
                  </div>

                  {/* Inverter upgrade/downgrade buttons */}
                  <div className="flex gap-2">
                    <button
                      disabled={currentIdx <= 0 || (currentIdx > 0 && maxPanelsForInverter(inverters[currentIdx - 1].power, (card.panel?.power || 570) / 1000) < card.panelCount)}
                      onClick={() => {/* Inverter changes automatically via 1.5x rule; manual downgrade would require reducing panels */}}
                      className="flex-1 text-xs py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-all"
                      title="O inversor ajusta automaticamente conforme o número de placas"
                    >
                      <ChevronDown className="w-3 h-3 inline mr-1" />Inversor menor
                    </button>
                    <button
                      disabled={currentIdx >= inverters.length - 1}
                      onClick={() => {/* Handled by increasing panels past limit */}}
                      className="flex-1 text-xs py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-all"
                      title="Aumente placas para fazer upgrade automático do inversor"
                    >
                      Inversor maior<ChevronUp className="w-3 h-3 inline ml-1" />
                    </button>
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
                <Bar dataKey="geração" fill="hsl(80,37%,26%)" radius={[4, 4, 0, 0]} />
                {proposal.consumerUnits && proposal.consumerUnits.length > 1 ? (
                  proposal.consumerUnits.map((u, j) => (
                    <Bar key={u.id} dataKey={`UC ${j + 1}`} stackId="consumption"
                      fill={UC_COLORS[j % UC_COLORS.length]} />
                  ))
                ) : (
                  <Bar dataKey="consumo" stackId="consumption" fill="hsl(40,79%,60%)" radius={[0, 0, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* FINANCIAL RETURN */}
        <section className="solar-card p-8 space-y-6">
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-secondary" /> Retorno Financeiro
          </h2>
          {(() => {
            const selectedCard = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
            const dim = selectedCard.dimensioning;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-primary/5"><p className="text-xs text-muted-foreground">Economia mensal</p><p className="text-xl font-bold text-primary">{formatCurrency(dim.monthlySavings)}</p></div>
                <div className="text-center p-4 rounded-xl bg-primary/5"><p className="text-xs text-muted-foreground">Payback</p><p className="text-xl font-bold text-primary">{formatNumber(dim.paybackYears)} anos</p></div>
                <div className="text-center p-4 rounded-xl bg-primary/5"><p className="text-xs text-muted-foreground">Retorno 10 anos</p><p className="text-xl font-bold text-primary">{formatCurrency(dim.return10)}</p></div>
                <div className="text-center p-4 rounded-xl bg-primary/5"><p className="text-xs text-muted-foreground">Retorno 25 anos</p><p className="text-xl font-bold text-primary">{formatCurrency(dim.return25)}</p></div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Documentos necessários</h3>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Conta de energia recente</li>
                <li>Documento de identidade</li>
                <li>Comprovante de residência</li>
                <li>Comprovante de renda (se financiamento)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-primary">Prazos</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>📦 Instalação: até {settings.installationDays} dias úteis</li>
                <li>📋 Homologação: +10 dias úteis</li>
                <li>💳 Pagamento à vista ou cartão 12× (taxa 1,1% a.m.)</li>
              </ul>
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
