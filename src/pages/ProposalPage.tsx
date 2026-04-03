import { useParams, useNavigate } from 'react-router-dom';
import logoTls from '@/assets/logo.png';
import { useState, useMemo, useEffect, useRef } from 'react';
import { getProposals, saveProposal, getSettings, getSocialProofs, lookupIrradiation, getPriceTable } from '@/data/store';
import { getPropostaByIdDB, markPropostaViewedDB, getSettingsDB, addHistoricoDB } from '@/data/supabaseStore';
import { getCidadesIrradianciaDB } from '@/data/supabaseStore';
import {
  formatCurrency, formatNumber, calcInstallments, calcDimensioning,
  findInverterForPanels, findPanel, maxPanelsForInverter,
  calcMicroInverterCount, calcCardInstallments, calcEquipmentMonthly, calcCostBreakdown,
} from '@/data/calculations';
import { MONTH_LABELS, MONTH_KEYS, SEASONAL_FACTORS, INSTALLMENT_OPTIONS, UC_COLORS, LINE_NAMES, LINE_SUBS } from '@/data/types';
import type { PriceTableEntry, PriceTableLineDetails } from '@/data/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { Download, Share2, Edit, ArrowLeft, Sun, Zap, TrendingUp, Shield, X, Cpu, Check, MessageCircle, Calendar, AlertTriangle, ChevronDown, ChevronUp, BarChart3, Eye, EyeOff } from 'lucide-react';
import { generateProposalPDF } from '@/lib/generatePDF';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import Diferenciais from '@/components/Diferenciais';
import ProposalPortfolio from '@/components/ProposalPortfolio';


const LINES = ['excellence', 'premium'] as const;
const PERIOD_OPTIONS = [5, 10, 15, 20, 25];

export default function ProposalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showCostPanel, setShowCostPanel] = useState(false);
  const settings = getSettings();
  const socialProofs = getSocialProofs().filter(s => s.active);

  // Header scroll behavior for authenticated users
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setHeaderVisible(currentY < lastScrollY.current || currentY < 50);
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAuthenticated]);

  useEffect(() => {
    async function loadProposal() {
      const dbProposal = await getPropostaByIdDB(id || '');
      if (dbProposal) {
        setProposal(dbProposal);
        if (!isAuthenticated) {
          markPropostaViewedDB(id || '');
        }
      } else {
        const proposals = getProposals();
        const localProposal = proposals.find(p => p.id === id);
        setProposal(localProposal || null);
      }
      setLoading(false);
    }
    loadProposal();
  }, [id]);

  
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [panelDelta, setPanelDelta] = useState(0);
  const [cashflowInstallments, setCashflowInstallments] = useState(60);
  const [paymentTab, setPaymentTab] = useState<'financing' | 'card'>('financing');
  const [cashflowMode, setCashflowMode] = useState<'financing' | 'card' | 'cash'>('financing');
  const [cashflowLine, setCashflowLine] = useState<string>(proposal?.selectedLine || 'excellence');
  const [cashflowPeriod, setCashflowPeriod] = useState(15);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCashflow, setShowCashflow] = useState(false);

  const savedProposal = proposal?.dados_completos || proposal;
  const basePanelCount = savedProposal?.selectedKit?.panelCount ?? proposal?.selectedKit?.panelCount ?? 0;
  const finalPanels = Math.max(Math.max(1, basePanelCount - 2), basePanelCount + panelDelta);
  const irradiationLookup = proposal ? lookupIrradiation(savedProposal?.clientData?.state || proposal.clientData.state || 'MS', savedProposal?.clientData?.city || proposal.clientData.city) : { value: 5.0, found: false, monthly: null };
  const irradiation = savedProposal?.irradiation || irradiationLookup.value;
  const monthlyIrr = savedProposal?.monthlyIrradiation || irradiationLookup.monthly;

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
    const savedData = proposal.dados_completos || proposal;
    const selectedLine = savedData.selectedLine || proposal.selectedLine;
    const linesToShow = [selectedLine];
    
    return linesToShow.map(line => {
      const isSelectedLine = line === selectedLine;
      
      if (isSelectedLine && panelDelta === 0) {
        const savedKit = savedData.selectedKit;
        const savedDim = savedData.dimensioning || proposal.dimensioning;
        const savedCostBreakdown = savedData.costBreakdown || proposal.costBreakdown;
        
        const inverter = savedKit?.inverter || null;
        const panel = savedKit?.panel || null;
        const panelCount = savedKit?.panelCount || finalPanels;
        const isPremium = line === 'premium';
        const isCustomSaved = !!savedData.customKit?.enabled;
        const microCount = savedData.microInverterCount ?? (isPremium ? calcMicroInverterCount(panelCount) : 0);
        const panelPowerKwp = (panel?.power || 570) / 1000;
        const maxPanels = isPremium ? 999 : (inverter ? maxPanelsForInverter(inverter.power, panelPowerKwp) : 0);
        const panelsRemaining = isPremium ? 999 : maxPanels - panelCount;

        const fallbackCostBreakdown = (!savedCostBreakdown && !isCustomSaved)
          ? calcCostBreakdown(inverter, panel, panelCount, line)
          : null;
        const costBreakdown = savedCostBreakdown || fallbackCostBreakdown;
        const totalPrice = costBreakdown?.salePrice || savedData.totalPrice || proposal.totalPrice;
        const installments = calcInstallments(totalPrice);
        const cardInstallments = calcCardInstallments(totalPrice, settings.creditCardRates);

        return {
          line, inverter, panel, panelCount, totalPrice, maxPanels, panelsRemaining, microCount,
          installments, cardInstallments, costBreakdown,
          inverterBrand: savedData.inverterBrand || inverter?.brand || '',
          inverterModel: savedData.inverterModel || inverter?.model || '',
          panelBrand: savedData.panelBrand || panel?.brand || '',
          panelPowerLabel: savedData.panelPowerLabel || `${panel?.power || 570} Wp`,
          dimensioning: { ...savedDim, panelCount, powerKwp: savedDim.powerKwp, monthlyGeneration: savedDim.monthlyGeneration, surplus: savedDim.surplus },
        };
      }
      
      const priceTable = getPriceTable();
      const ptEntries = priceTable.filter(e => e[line] !== null && e[line]! > 0 && e.panels >= finalPanels);
      ptEntries.sort((a, b) => a.panels - b.panels);
      const ptEntry = ptEntries.find(e => e.panels === finalPanels) || ptEntries[0] || null;
      const ptDetails = (ptEntry?.details as any)?.[line] as PriceTableLineDetails | undefined;

      const panel = findPanel(line);
      const panelPowerKwp = (panel?.power || 570) / 1000;
      const usedPanels = ptEntry ? ptEntry.panels : finalPanels;
      const inverter = findInverterForPanels(line, usedPanels, panelPowerKwp);
      const powerKwp = usedPanels * panelPowerKwp;
      const hasPriceTableCost = ptEntry && ptEntry[line] !== null && ptEntry[line]! > 0;
      const costBreakdown = calcCostBreakdown(inverter, panel, usedPanels, line);
      const totalPrice = costBreakdown.salePrice;
      const dim = calcDimensioning(
        proposal.consumption || savedData.consumption, proposal.equipment || savedData.equipment || [], proposal.clientData?.networkType || savedData.clientData?.networkType,
        irradiation, proposal.clientData?.kwhPrice || savedData.clientData?.kwhPrice, totalPrice, settings.systemLoss
      );
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
      const installments = calcInstallments(totalPrice);
      const cardInstallments = calcCardInstallments(totalPrice, settings.creditCardRates);

      return {
        line, inverter, panel, panelCount: usedPanels, totalPrice, maxPanels, panelsRemaining, microCount,
        installments, cardInstallments, costBreakdown,
        inverterBrand: ptDetails?.inverterBrand || inverter?.brand || '',
        inverterModel: ptDetails?.inverterPower ? `${ptDetails.inverterPower} kW` : inverter?.model || '',
        panelBrand: ptDetails?.panelBrand || panel?.brand || '',
        panelPowerLabel: ptDetails?.panelPower ? `${ptDetails.panelPower} Wp` : `${panel?.power || 570} Wp`,
        dimensioning: { ...dim, panelCount: usedPanels, powerKwp, monthlyGeneration, surplus },
      };
    });
  }, [finalPanels, proposal, irradiation, settings.systemLoss, settings.creditCardRates, panelDelta]);

  const chartData = useMemo(() => {
    if (!proposal || lineCards.length === 0) return [];
    const card = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
    if (!card) return [];
    return MONTH_KEYS.map((k, i) => {
      const irrMonth = monthlyIrr ? monthlyIrr[i] : irradiation * SEASONAL_FACTORS[k];
      const gen = card.dimensioning.powerKwp * irrMonth * 30 * (1 - settings.systemLoss / 100);
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
  }, [lineCards, proposal, irradiation, monthlyIrr, settings.systemLoss]);

  const cashflowData = useMemo(() => {
    if (!proposal || lineCards.length === 0) return [];
    const selectedCard = lineCards.find(c => c.line === cashflowLine) || lineCards[0];
    if (!selectedCard) return [];

    const monthlyBill = selectedCard.dimensioning.avgMonthlyKwh * proposal.clientData.kwhPrice;
    const minFee = Math.max(80, monthlyBill * 0.15);
    const data: any[] = [];
    let accWithout = 0;
    let accWith = 0;

    for (let year = 0; year <= cashflowPeriod; year++) {
      const yearlyBill = monthlyBill * 12 * Math.pow(1.10, year);
      accWithout += yearlyBill;

      let yearlyWithSolar: number;
      if (cashflowMode === 'cash') {
        yearlyWithSolar = year === 0 ? selectedCard.totalPrice + minFee * 12 : minFee * 12;
      } else if (cashflowMode === 'card') {
        const bestCard = Object.values(selectedCard.cardInstallments).pop();
        const cardMonthly = bestCard ? (bestCard as any).perMonth : selectedCard.totalPrice / 12;
        const cardMonths = bestCard ? Number(Object.keys(selectedCard.cardInstallments).pop()) : 12;
        yearlyWithSolar = year === 0 ? (cardMonthly * Math.min(cardMonths, 12) + minFee * 12) : (year * 12 < cardMonths ? (cardMonthly * 12 + minFee * 12) : minFee * 12);
      } else {
        const instVal = selectedCard.installments[cashflowInstallments];
        const monthlyInstallment = instVal ? (typeof instVal === 'number' ? instVal : (instVal as any).perMonth) : selectedCard.totalPrice / cashflowInstallments;
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
  }, [lineCards, proposal, cashflowInstallments, cashflowMode, cashflowLine, cashflowPeriod]);

  const paybackYear = useMemo(() => {
    for (let i = 1; i < cashflowData.length; i++) {
      if (cashflowData[i]?.comSolar <= cashflowData[i]?.semSolar && cashflowData[i - 1]?.comSolar > cashflowData[i - 1]?.semSolar) {
        return i;
      }
      if (cashflowData[i]?.semSolar >= cashflowData[i]?.comSolar) return i;
    }
    return null;
  }, [cashflowData]);

  const proposalUrl = typeof window !== 'undefined' ? `${window.location.origin}/proposta/${id}` : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(proposalUrl);
      toast.success('Link copiado!', { description: 'Cole o link e envie para o cliente.' });
    } catch {
      const input = document.createElement('input');
      input.value = proposalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Link copiado!');
    }
    setShowShareMenu(false);
  };

  const handleShareWhatsApp = () => {
    const clientName = proposal?.clientData?.name || 'cliente';
    const text = encodeURIComponent(
      `Olá ${clientName}! Segue sua proposta de energia solar personalizada:\n\n${proposalUrl}\n\n${settings.company.name}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const getPdfDoc = async () => {
    const doc = await generateProposalPDF(proposal, settings, lineCards, chartData, cashflowData);
    return doc;
  };

  const getFileName = () => {
    const numero = proposal.numero_proposta || 'TLS-0000';
    const clientName = (proposal.clientData.name || 'Cliente').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    return `Proposta_${numero}_${clientName}.pdf`;
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Gerando PDF...');
      const doc = await getPdfDoc();
      doc.save(getFileName());
      toast.dismiss();
      toast.success('PDF gerado com sucesso!');
      // Track download
      addHistoricoDB(id || '', 'pdf_baixado', session?.user?.id || null, {});
    } catch (err) {
      toast.dismiss();
      toast.error('Erro ao gerar PDF');
    }
  };

  const handlePreviewPDF = async () => {
    try {
      toast.loading('Gerando visualização...');
      const doc = await getPdfDoc();
      const arrayBuffer = doc.output('arraybuffer');
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(url);
      setShowPdfViewer(true);
      toast.dismiss();
    } catch (err) {
      toast.dismiss();
      toast.error('Erro ao gerar visualização');
    }
  };

  const handleGoBack = () => {
    if (isAuthenticated && proposal) {
      // Navigate to calculator with proposal data for editing
      navigate('/orcamentos', { state: { editProposal: proposal } });
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-primary">Proposta não encontrada</h1>
          <p className="text-muted-foreground">Esta proposta pode ter expirado ou o link está incorreto.</p>
          <button onClick={() => navigate('/')} className="solar-btn-primary">Voltar ao site</button>
        </div>
      </div>
    );
  }

  // CET removed - financing uses fixed multipliers now

  const selectedCard = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
  const cashflowCard = lineCards.find(c => c.line === cashflowLine) || lineCards[0];
  const savingsEnd = cashflowData.length > 0
    ? (cashflowData[cashflowData.length - 1]?.semSolar || 0) - (cashflowData[cashflowData.length - 1]?.comSolar || 0)
    : 0;

  return (
    <div className={`min-h-screen bg-background ${isPrinting ? 'print-mode' : ''}`}>
      {/* AUTHENTICATED: Compact collapsible header */}
      {isAuthenticated && (
        <div className={`no-print fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="bg-card/90 backdrop-blur-sm border-b border-border/30 shadow-sm">
            <div className="container flex items-center justify-between h-12">
              <button onClick={handleGoBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar à calculadora
              </button>
              <div className="flex gap-1.5">
                <button onClick={handlePreviewPDF} className="solar-btn-outline text-xs py-1 px-2.5 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={handleDownloadPDF} className="solar-btn-primary text-xs py-1 px-2.5 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
                <div className="relative">
                  <button onClick={() => setShowShareMenu(!showShareMenu)}
                    className="solar-btn-outline text-xs py-1 px-2.5 flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                      <button onClick={handleCopyLink}
                        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 text-xs transition-colors">
                        <Share2 className="w-3 h-3 text-primary" /> Copiar link
                      </button>
                      <button onClick={handleShareWhatsApp}
                        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 text-xs transition-colors border-t border-border">
                        <MessageCircle className="w-3 h-3 text-green-600" /> WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBLIC: Floating download button only */}
      {!isAuthenticated && (
        <button
          onClick={handleDownloadPDF}
          className="no-print fixed bottom-6 right-6 z-50 bg-muted/80 hover:bg-muted text-foreground text-xs py-2 px-3 rounded-lg shadow-md backdrop-blur-sm flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Baixar PDF
        </button>
      )}

      {/* Click outside to close share menu */}
      {showShareMenu && <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />}

      <div className={`max-w-5xl mx-auto py-4 sm:py-8 px-2 sm:px-4 space-y-8 sm:space-y-12 print-container ${isAuthenticated ? 'pt-16' : ''}`}>
        {/* COVER */}
        <section className="text-center space-y-6 py-16 relative overflow-hidden print-page print-cover">
          <div className="absolute inset-0 opacity-5 no-print">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="absolute text-6xl font-bold text-primary select-none"
                style={{ left: `${(i % 5) * 22}%`, top: `${Math.floor(i / 5) * 28}%` }}>+</span>
            ))}
          </div>
          <div className="relative z-10">
            <img src={logoTls} alt="Três Lagoas Solar" className="h-72 mx-auto mb-6 print-logo" />
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-2">{settings.company.name}</p>
            {proposal.numero_proposta && (
              <p className="text-sm font-mono font-bold text-secondary mb-2">{proposal.numero_proposta}</p>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-primary text-balance print-title" style={{ lineHeight: '1.1' }}>
              Meu Projeto de<br />Energia Solar Fotovoltaica
            </h1>
            <div className="mt-8 space-y-1">
              <p className="text-xl font-semibold">{proposal.clientData.name}</p>
              <p className="text-muted-foreground">{proposal.clientData.city} — {proposal.clientData.state || 'MS'}</p>
              <p className="text-muted-foreground">{formatNumber(lineCards[0]?.dimensioning.avgMonthlyKwh || 0, 0)} kWh/mês</p>
              <p className="text-sm text-muted-foreground mt-4">
                Representante: {proposal.clientData.seller}<br />
                {proposal.sellerEmail ? <>{proposal.sellerEmail}<br /></> : null}
                {proposal.sellerPhone}
              </p>
            </div>
          </div>
        </section>

        {/* PANEL ADJUSTMENT - only for authenticated */}
        {isAuthenticated && (
          <section className="solar-card p-6 space-y-4 no-print">
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
            {selectedCard && (() => {
              const gen = selectedCard.dimensioning.monthlyGeneration;
              const cons = selectedCard.dimensioning.avgMonthlyKwh;
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
            <p className="text-center text-xs text-muted-foreground">
              Mínimo recomendado: {recommendedPanels} placas
              {panelDelta !== 0 && (
                <button onClick={() => setPanelDelta(0)} className="ml-2 text-primary underline">Resetar</button>
              )}
            </p>
          </section>
        )}

        {/* SELECTED LINE CARD */}
        <section className="space-y-4 print-page">
          <h2 className="text-2xl font-bold text-primary text-center flex items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-secondary" /> Seu Sistema Solar
          </h2>
          <div className="max-w-lg mx-auto print-line-cards">
            {lineCards.map(card => {
              const isPremium = card.line === 'premium';
              const maxP = card.maxPanels;
              const remaining = card.panelsRemaining;
              const limitColor = isPremium ? undefined : (remaining <= 0 ? '#E84855' : remaining <= 2 ? '#E8B84B' : undefined);

              return (
                <div key={card.line} className="solar-card p-6 space-y-4 print-card ring-2 ring-primary">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-primary">{LINE_NAMES[card.line]}</h3>
                    <p className="text-xs text-muted-foreground">{LINE_SUBS[card.line]}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    {isPremium ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Micro inversores</span>
                        <span className="font-medium text-right">{card.microCount}× {card.inverterBrand || card.inverter?.brand} {card.inverterModel || card.inverter?.model}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Inversor</span><span className="font-medium text-right">{card.inverterBrand || card.inverter?.brand} {card.inverterModel || card.inverter?.model}</span></div>
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Suporta até</span>
                          <span className="font-medium text-right" style={limitColor ? { color: limitColor } : undefined}>
                            {maxP} placas
                            {remaining <= 0 && <span className="block text-xs">Limite atingido — inversor será atualizado na próxima placa</span>}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Placas</span><span className="font-medium">{card.panelCount}× {card.panelBrand || card.panel?.brand} {card.panelPowerLabel || `${card.panel?.power || 570}Wp`}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Potência</span><span className="font-medium">{formatNumber(card.dimensioning.powerKwp)} kWp</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Geração/mês</span><span className="font-bold text-primary text-lg">{formatNumber(card.dimensioning.monthlyGeneration, 0)} kWh</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Excedente</span><span className="font-medium">{formatNumber(card.dimensioning.surplus, 0)} kWh</span></div>
                  </div>

                  <div className="text-center py-3 border-y border-border">
                    <p className="text-3xl font-bold text-primary">{formatCurrency(card.totalPrice)}</p>
                  </div>

                  {/* Payment tabs */}
                  <div className="space-y-2">
                    <div className="flex gap-1 no-print">
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
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-muted-foreground print-only-block hidden">Financiamento:</p>
                        {INSTALLMENT_OPTIONS.map(n => {
                          const v = card.installments[n];
                          const inst = typeof v === 'number' ? { perMonth: v, total: v * n } : v as { perMonth: number; total: number };
                          return (
                            <div key={n} className="flex justify-between">
                              <span className="text-muted-foreground">{n}×</span>
                              <span className="font-medium">{formatCurrency(inst.perMonth)}</span>
                            </div>
                          );
                        })}
                        
                        <p className="text-[10px] text-muted-foreground mt-1 italic">
                          * Estimativa. Sujeito à aprovação de crédito.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
                        <p className="font-bold text-muted-foreground print-only-block hidden">Cartão:</p>
                        {Object.entries(card.cardInstallments)
                          .sort(([a], [b]) => Number(b) - Number(a))
                          .map(([n, v]) => (
                          <div key={n} className="flex justify-between">
                            <span className="text-muted-foreground">{n}×</span>
                            <span className="font-medium">
                              {formatCurrency((v as any).perMonth)}
                            </span>
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
        <section className="solar-card p-4 sm:p-8 space-y-6 print-page print-chart-section">
          <h2 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" /> Geração vs Consumo — 12 Meses
          </h2>
          <div className="min-h-[280px] h-72 sm:h-80 print-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}
                barCategoryGap={typeof window !== 'undefined' && window.innerWidth < 768 ? '10%' : '20%'}>
                <XAxis dataKey="month" tick={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 11 : 12 }} />
                <YAxis tick={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 11 : 12 }} />
                <Tooltip formatter={(v: number) => `${v} kWh`} />
                <Legend wrapperStyle={{ fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '11px' : '12px' }} />
                <Bar dataKey="geração" fill="hsl(80, 37%, 26%)" radius={[4, 4, 0, 0]}
                  maxBarSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : undefined} />
                {proposal.consumerUnits && proposal.consumerUnits.length > 1 ? (
                  proposal.consumerUnits.map((u, j) => (
                    <Bar key={u.id} dataKey={`UC ${j + 1}`} stackId="consumption"
                      fill={UC_COLORS[j % UC_COLORS.length]}
                      maxBarSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : undefined} />
                  ))
                ) : (
                  <Bar dataKey="consumo" stackId="consumption" fill="hsl(40, 79%, 60%)"
                    maxBarSize={typeof window !== 'undefined' && window.innerWidth < 768 ? 40 : undefined} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Print-only table version of chart data */}
          <div className="hidden print-only-block">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-1 text-left">Mês</th>
                  <th className="border border-border p-1 text-right">Geração (kWh)</th>
                  <th className="border border-border p-1 text-right">Consumo (kWh)</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, i) => (
                  <tr key={i}>
                    <td className="border border-border p-1">{d.month}</td>
                    <td className="border border-border p-1 text-right">{d.geração}</td>
                    <td className="border border-border p-1 text-right">{d.consumo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* EQUIPMENT */}
        {proposal.equipment && proposal.equipment.length > 0 && (
          <section className="solar-card p-8 space-y-4 print-page">
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

        {/* FINANCIAL RETURN CARDS */}
        {(() => {
          const card = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
          if (!card) return null;
          const monthlyBill = card.dimensioning.avgMonthlyKwh * proposal.clientData.kwhPrice;
          const investmentBase = card.totalPrice || 0;

          const calcSavings = (years: number) => {
            let totalWithout = 0;
            let totalWith = 0;
            for (let y = 0; y < years; y++) {
              totalWithout += monthlyBill * 12 * Math.pow(1.10, y);
              const minFee = Math.max(80, monthlyBill * 0.15);
              totalWith += minFee * 12;
            }
            return totalWithout - totalWith - investmentBase;
          };

          const calcWithoutSolar = (years: number) => {
            let total = 0;
            for (let y = 0; y < years; y++) {
              total += monthlyBill * 12 * Math.pow(1.10, y);
            }
            return total;
          };

          return (
            <section className="space-y-6 print-page">
              <h2 className="text-xl sm:text-2xl font-bold text-primary text-center flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" /> Retorno Financeiro
              </h2>
              <p className="text-center text-sm text-muted-foreground">
                Sistema dimensionado com {settings.surplusFactor ?? 20}% de reserva para crescimento futuro do consumo
              </p>

              {/* Savings cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[5, 10, 15].map(years => (
                  <div key={years} className="solar-card p-5 space-y-2" style={{ borderLeft: '4px solid #4A5A2A' }}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" style={{ color: '#4A5A2A' }} />
                      <span className="text-sm font-semibold text-muted-foreground">Retorno em {years} anos</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#4A5A2A' }}>
                      {formatCurrency(calcSavings(years))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Você economiza nos próximos {years} anos
                    </p>
                  </div>
                ))}

                {/* Without solar cards */}
                {[5, 10, 15].map(years => (
                  <div key={`no-${years}`} className="solar-card p-5 space-y-2 bg-red-50 dark:bg-red-950/20" style={{ borderLeft: '4px solid #E84855' }}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">Sem solar em {years} anos</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(calcWithoutSolar(years))}
                    </p>
                    <p className="text-xs text-red-500/80">
                      Sem energia solar, você pagaria de conta de luz em {years} anos
                    </p>
                  </div>
                ))}
              </div>

              {/* Cash flow toggle button */}
              <div className="text-center no-print">
                <button
                  onClick={() => setShowCashflow(!showCashflow)}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: '#4A5A2A' }}
                >
                  <BarChart3 className="w-6 h-6" />
                  {showCashflow ? 'Ocultar Fluxo de Caixa' : 'Clique aqui para visualizar o Fluxo de Caixa completo'}
                  {showCashflow ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {/* Collapsible cash flow */}
              {showCashflow && (
                <div className="solar-card p-4 sm:p-8 space-y-4 sm:space-y-6 animate-fade-in">
                  <h3 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
                    <Shield className="w-5 h-5 text-secondary" /> Fluxo de Caixa Comparativo
                  </h3>

                  {/* Line info */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Linha</label>
                    <p className="text-sm font-semibold text-primary">{LINE_NAMES[proposal.selectedLine] || proposal.selectedLine}</p>
                  </div>

                  {/* Mode selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Pagamento</label>
                    <div className="grid grid-cols-3 gap-1">
                      <button onClick={() => setCashflowMode('financing')}
                        className={`px-2 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${cashflowMode === 'financing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                        Financiam.
                      </button>
                      <button onClick={() => setCashflowMode('card')}
                        className={`px-2 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${cashflowMode === 'card' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                        Cartão
                      </button>
                      <button onClick={() => setCashflowMode('cash')}
                        className={`px-2 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${cashflowMode === 'cash' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                        À Vista
                      </button>
                    </div>
                    {cashflowMode === 'financing' && (
                      <div className="mt-2 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Parcelas</label>
                        <div className="flex flex-wrap gap-1">
                          {INSTALLMENT_OPTIONS.map(n => (
                            <button key={n} onClick={() => setCashflowInstallments(n)}
                              className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${cashflowInstallments === n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                              {n}×
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Period selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Período</label>
                    <div className="flex flex-wrap gap-1">
                      {PERIOD_OPTIONS.map(p => (
                        <button key={p} onClick={() => setCashflowPeriod(p)}
                          className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${cashflowPeriod === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                          {p}a
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-64 sm:h-80 -mx-2 sm:mx-0 print-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashflowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Anos', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} width={55} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        {paybackYear && <ReferenceLine x={`${paybackYear}`} stroke="hsl(80, 37%, 26%)" strokeDasharray="3 3" label={{ value: 'Payback', fill: 'hsl(80, 37%, 26%)', fontSize: 10 }} />}
                        <Line type="monotone" dataKey="semSolar" name="Sem Solar" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="comSolar" name="Com Solar" stroke="hsl(80, 37%, 26%)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center p-2 sm:p-4 rounded-xl bg-primary/5">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Economia mensal</p>
                      <p className="text-sm sm:text-xl font-bold text-primary">{cashflowCard ? formatCurrency(cashflowCard.dimensioning.monthlySavings) : '—'}</p>
                    </div>
                    <div className="text-center p-2 sm:p-4 rounded-xl bg-primary/5">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Payback</p>
                      <p className="text-sm sm:text-xl font-bold text-primary">{cashflowCard ? `${formatNumber(cashflowCard.dimensioning.paybackYears)} anos` : '—'}</p>
                    </div>
                    <div className="text-center p-2 sm:p-4 rounded-xl bg-primary/5">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Economia {cashflowPeriod}a</p>
                      <p className="text-sm sm:text-xl font-bold text-primary">{formatCurrency(savingsEnd)}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* DIFERENCIAIS */}
        <Diferenciais compact />

        {/* PORTFÓLIO DE OBRAS */}
        <ProposalPortfolio />

        {/* PRINT FOOTER */}
        <div className="hidden print-only-block text-center py-8 border-t border-border mt-8">
          <p className="text-sm font-semibold">{settings.company.name}</p>
          <p className="text-xs text-muted-foreground">
            {settings.company.phone} • {settings.company.email} • {settings.company.site}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Proposta válida por {settings.proposalValidity || 15} dias • Gerado em {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>


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

      {/* PDF Viewer Modal */}
      {showPdfViewer && pdfBlobUrl && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-3 bg-card rounded-t-xl">
              <span className="text-sm font-medium text-foreground">Visualização do PDF</span>
              <div className="flex gap-2">
                <button onClick={handleDownloadPDF} className="solar-btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
                <button onClick={() => { setShowPdfViewer(false); if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <object data={`${pdfBlobUrl}#toolbar=1&navpanes=1&scrollbar=1`} type="application/pdf" className="flex-1 w-full rounded-b-xl bg-white">
              <iframe src={`${pdfBlobUrl}#toolbar=1&navpanes=1&scrollbar=1`} className="w-full h-full rounded-b-xl bg-white" title="PDF Preview" />
            </object>
          </div>
        </div>
      )}
    </div>
  );
}