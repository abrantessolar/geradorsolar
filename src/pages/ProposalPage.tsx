import { useParams, useNavigate } from 'react-router-dom';
import logoTls from '@/assets/logo.png';
import { useState, useMemo, useEffect, useRef } from 'react';
import { getProposals, saveProposal, getSettings, getSocialProofs, lookupIrradiation, getPriceTable } from '@/data/store';
import { getPropostaByIdDB, markPropostaViewedDB, getSettingsDB, addHistoricoDB, savePropostaDB } from '@/data/supabaseStore';
import { getCidadesIrradianciaDB } from '@/data/supabaseStore';
import {
  formatCurrency, formatNumber, calcInstallments, calcDimensioning,
  findInverterForPanels, findPanel, maxPanelsForInverter,
  calcMicroInverterCount, calcCardInstallments, calcEquipmentMonthly, calcCostBreakdown,
} from '@/data/calculations';
import { MONTH_LABELS, MONTH_KEYS, SEASONAL_FACTORS, LINE_NAMES } from '@/data/types';
import type { PriceTableLineDetails } from '@/data/types';
import { Download, Share2, Edit, ArrowLeft, Zap, MessageCircle, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';
import { gerarPropostaPDF, downloadPropostaPDF, fetchPortfolioPhotosOptimized } from '@/lib/generatePropostaPDF';
import { PropostaTemplatePages, type PropostaTemplateData } from '@/components/PropostaTemplatePages';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import PDFCanvasViewer from '@/components/PDFCanvasViewer';


// Ciclo de vida da proposta
const VALIDITY_DAYS = 10; // após este prazo, mostra "fora de validade"
const EXPIRY_DAYS = 30;   // após este prazo, link expira completamente
const DEFAULT_WHATSAPP = '5567996448995';

export default function ProposalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAuthenticated = !!session;
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfPortfolioPhotos, setPdfPortfolioPhotos] = useState<string[]>([]);
  const [editingProposal, setEditingProposal] = useState(false);
  const [editForm, setEditForm] = useState({
    inverterBrand: '', inverterModel: '', panelBrand: '', panelPowerLabel: '',
    totalPrice: '', observacoes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const proposalContentRef = useRef<HTMLDivElement>(null);
  const templateContainerRef = useRef<HTMLDivElement>(null);
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

  
  const [panelDelta, setPanelDelta] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

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

  const getFileName = () => {
    const numero = proposal?.numero_proposta || 'TLS-0000';
    const clientName = (proposal?.clientData?.name || 'Cliente').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    return `Proposta_${numero}_${clientName}.pdf`;
  };

  const buildTemplateData = (): PropostaTemplateData | null => {
    if (!selectedCard) return null;
    const getInst = (n: number) => {
      const v = selectedCard.installments[n];
      if (!v) return 0;
      return typeof v === 'number' ? v : (v as any).perMonth || 0;
    };
    const inverterPower = selectedCard.inverterModel || (selectedCard.inverter ? `${selectedCard.inverter.power} kW` : '');
    const panelPower = selectedCard.panelPowerLabel || (selectedCard.panel ? `${selectedCard.panel.power} Wp` : '');
    const qtdInversores = selectedCard.line === 'premium' ? selectedCard.microCount : 1;

    // Fluxo de caixa: 5/10/15/20/25 anos — reusa cashflowData (financiamento padrão)
    const monthlyBill = selectedCard.dimensioning.avgMonthlyKwh * proposal.clientData.kwhPrice;
    const minFee = Math.max(80, monthlyBill * 0.15);
    const periodos = [5, 10, 15, 20, 25];
    const fluxo = periodos.map((years) => {
      let accWithout = 0;
      let accWith = 0;
      for (let y = 0; y < years; y++) {
        const yearlyBill = monthlyBill * 12 * Math.pow(1.10, y);
        accWithout += yearlyBill;
        // Modo à vista: investimento no ano 0 + tarifa mínima
        const yearlyWith = y === 0 ? selectedCard.totalPrice + minFee * 12 : minFee * 12;
        accWith += yearlyWith;
      }
      return {
        year: years,
        semSolar: Math.round(accWithout),
        comSolar: Math.round(accWith),
        economia: Math.round(accWithout - accWith),
      };
    });

    // Economia mensal estimada — baseada na geração (mudança do padrão de consumo)
    const tarifa = proposal.clientData.kwhPrice || 0;
    const economiaMensal = selectedCard.dimensioning.monthlyGeneration * tarifa;
    const paybackAnos = economiaMensal > 0 ? selectedCard.totalPrice / (economiaMensal * 12) : 0;

    // Dados mensais (12 meses) — geração x consumo
    const dadosMensais = MONTH_KEYS.map((k, i) => {
      const irrMonth = monthlyIrr ? monthlyIrr[i] : irradiation * SEASONAL_FACTORS[k];
      const gen = selectedCard.dimensioning.powerKwp * irrMonth * 30 * (1 - settings.systemLoss / 100);
      const cons = selectedCard.dimensioning.avgMonthlyKwh * SEASONAL_FACTORS[k];
      return { mes: MONTH_LABELS[i], geracao: Math.round(gen), consumo: Math.round(cons) };
    });

    return {
      cliente_nome: proposal.clientData?.name || 'Cliente',
      cliente_cidade: [proposal.clientData?.city, proposal.clientData?.state].filter(Boolean).join(' — '),
      responsavel_nome: proposal.clientData?.seller || '',
      responsavel_telefone: proposal.sellerPhone || '',
      responsavel_email: proposal.sellerEmail || '',
      geracao_mensal: selectedCard.dimensioning.monthlyGeneration,
      consumo_mensal: selectedCard.dimensioning.avgMonthlyKwh,
      consumo_informado: selectedCard.dimensioning.avgBase,
      excedente_kwh: selectedCard.dimensioning.surplus,
      potencia_kwp: selectedCard.dimensioning.powerKwp,
      qtd_inversores: qtdInversores,
      marca_inversor: selectedCard.inverterBrand || selectedCard.inverter?.brand || '',
      potencia_inversor: inverterPower,
      num_placas: selectedCard.panelCount,
      marca_placa: selectedCard.panelBrand || selectedCard.panel?.brand || '',
      potencia_placa: panelPower,
      preco_vista: selectedCard.totalPrice,
      parcela_24x: getInst(24),
      parcela_36x: getInst(36),
      parcela_48x: getInst(48),
      parcela_60x: getInst(60),
      parcela_72x: getInst(72),
      cartao_parcelas: Object.entries(selectedCard.cardInstallments || {})
        .map(([n, v]: [string, any]) => ({ meses: Number(n), valor: v.perMonth }))
        .sort((a, b) => a.meses - b.meses),
      numero_proposta: proposal.numero_proposta || 'TLS-0000',
      economia_mensal: economiaMensal,
      payback_anos: paybackAnos,
      tarifa_kwh: tarifa,
      dados_mensais: dadosMensais,
      fluxo_caixa: fluxo,
      fotos_portfolio: pdfPortfolioPhotos,
      observacoes: proposal.observacoes || undefined,
    };
  };

  const buildPdfBlob = async (): Promise<Blob> => {
    // Carrega/otimiza fotos sob demanda (cacheia em estado)
    let photos = pdfPortfolioPhotos;
    if (photos.length === 0) {
      photos = await fetchPortfolioPhotosOptimized();
      setPdfPortfolioPhotos(photos);
    }
    const data = buildTemplateData();
    if (!data) throw new Error('Dados da proposta não carregados');
    // Garante que o template tenha as fotos (caso buildTemplateData rodou antes do setState refletir)
    data.fotos_portfolio = photos;
    if (!templateContainerRef.current) throw new Error('Template não renderizado');
    // Aguarda render do template offscreen com as fotos atualizadas
    await new Promise((r) => setTimeout(r, 200));
    return await gerarPropostaPDF(templateContainerRef.current, data);
  };

  const handleDownloadPDF = async () => {
    const data = buildTemplateData();
    if (!data) {
      toast.error('Dados da proposta não carregados');
      return;
    }
    const toastId = toast.loading('Gerando PDF...');
    try {
      const blob = await buildPdfBlob();
      downloadPropostaPDF(blob, data.numero_proposta, data.cliente_nome);
      toast.dismiss(toastId);
      toast.success('PDF gerado com sucesso!');
      addHistoricoDB(id || '', 'pdf_baixado', session?.user?.id || null, {});
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Erro ao gerar PDF');
      console.error(err);
    }
  };

  const handlePreviewPDF = async () => {
    const toastId = toast.loading('Gerando visualização...');
    try {
      const blob = await buildPdfBlob();
      setPdfBlob(blob);
      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Erro ao gerar visualização');
      console.error(err);
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

  const openEditPanel = () => {
    setEditForm({
      inverterBrand: proposal.inverterBrand || selectedCard?.inverterBrand || '',
      inverterModel: proposal.inverterModel || '',
      panelBrand: proposal.panelBrand || selectedCard?.panelBrand || '',
      panelPowerLabel: proposal.panelPowerLabel || selectedCard?.panelPowerLabel || '',
      totalPrice: String(selectedCard?.totalPrice ?? proposal.totalPrice ?? ''),
      observacoes: proposal.observacoes || '',
    });
    setEditingProposal(true);
  };

  const saveEditPanel = async () => {
    setSavingEdit(true);
    try {
      const novoPreco = parseFloat(editForm.totalPrice.replace(',', '.')) || selectedCard.totalPrice;
      const precoMudou = novoPreco !== selectedCard.totalPrice;

      const updated = {
        ...proposal,
        inverterBrand: editForm.inverterBrand,
        inverterModel: editForm.inverterModel,
        panelBrand: editForm.panelBrand,
        panelPowerLabel: editForm.panelPowerLabel,
        observacoes: editForm.observacoes.trim() || undefined,
        ...(precoMudou ? {
          totalPrice: novoPreco,
          installmentValues: calcInstallments(novoPreco),
          cardInstallments: calcCardInstallments(novoPreco, settings.creditCardRates),
        } : {}),
      };

      setProposal(updated);
      await savePropostaDB(updated);
      const { addHistoricoDB: addHist } = await import('@/data/supabaseStore');
      await addHist(id || '', 'editada', session?.user?.id || null, { origem: 'edicao_pontual' });
      toast.success('Alterações salvas!');
      setEditingProposal(false);
      handlePreviewPDF();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSavingEdit(false);
    }
  };

  // ===== Validade / Expiração =====
  const createdAt = proposal.criado_em ? new Date(proposal.criado_em) : new Date();
  const today = new Date();
  const daysSinceCreated = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const validUntil = new Date(createdAt.getTime() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(createdAt.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');
  const isExpired = daysSinceCreated > EXPIRY_DAYS && !isAuthenticated;
  const isOutOfValidity = daysSinceCreated > VALIDITY_DAYS && !isExpired;

  // WhatsApp do consultor
  const sellerPhone = (proposal.sellerPhone || '').replace(/\D/g, '') || DEFAULT_WHATSAPP;
  const sellerWhatsNumber = sellerPhone.startsWith('55') ? sellerPhone : `55${sellerPhone}`;
  const sellerName = proposal.clientData?.seller || 'consultor';
  const propostaNum = proposal.numero_proposta || '';
  const whatsappMessage = encodeURIComponent(
    `Olá ${sellerName}, tenho dúvidas sobre a proposta ${propostaNum}.`,
  );
  const whatsappUrl = `https://wa.me/${sellerWhatsNumber}?text=${whatsappMessage}`;

  // ===== Tela de proposta expirada =====
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6 solar-card p-8">
          <img src={logoTls} alt="Três Lagoas Solar" className="h-24 mx-auto" />
          <div className="space-y-2">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-primary">Orçamento expirado</h1>
            <p className="text-muted-foreground">
              Este orçamento expirou em <span className="font-semibold">{fmtDate(expiresAt)}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Para receber uma proposta atualizada com os valores e condições atuais, fale com seu consultor.
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
          >
            <MessageCircle className="w-5 h-5" /> Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const templateData = buildTemplateData();

  return (
    <div className={`min-h-screen bg-background ${isPrinting ? 'print-mode' : ''}`}>
      {/* Template offscreen (usado apenas para gerar PDF idêntico ao .docx) */}
      {templateData && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-99999px',
            top: 0,
            width: '1241px',
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          <PropostaTemplatePages ref={templateContainerRef} data={templateData} />
        </div>
      )}
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
                  <Download className="w-3.5 h-3.5" /> PDF
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

      {/* PUBLIC: Floating download button */}
      {!isAuthenticated && (
        <button
          onClick={handleDownloadPDF}
          className="no-print fixed bottom-6 right-6 z-50 bg-muted/80 hover:bg-muted text-foreground text-xs py-2 px-3 rounded-lg shadow-md backdrop-blur-sm flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Baixar PDF
        </button>
      )}

      {/* WhatsApp floating button - visible to everyone */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="no-print fixed bottom-6 left-6 z-50 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-3 px-4 rounded-full shadow-lg transition-all hover:scale-105"
        title={`Falar com ${sellerName} no WhatsApp`}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">Tire suas dúvidas</span>
      </a>

      {/* Click outside to close share menu */}
      {showShareMenu && <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />}

      <div ref={proposalContentRef} className={`max-w-5xl mx-auto py-4 sm:py-8 px-2 sm:px-4 space-y-8 sm:space-y-12 print-container ${isAuthenticated ? 'pt-16' : ''}`}>
        {/* STATUS HEADER — resumo compacto pra equipe, não é mais uma capa de venda */}
        <section className="solar-card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
              {proposal.numero_proposta && <span>{proposal.numero_proposta}</span>}
              {proposal.numero_proposta && <span>·</span>}
              <span>{settings.company.name}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{proposal.clientData.name}</p>
            <p className="text-sm text-muted-foreground">
              {proposal.clientData.city} — {proposal.clientData.state || 'MS'} · {formatNumber(lineCards[0]?.dimensioning.avgMonthlyKwh || 0, 0)} kWh/mês
            </p>
          </div>
          {isOutOfValidity ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Fora de validade desde {fmtDate(validUntil)}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-600/10 text-green-700 dark:text-green-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Válida até {fmtDate(validUntil)}
            </div>
          )}
        </section>

        {isOutOfValidity && (
          <div className="solar-card p-4 border-l-4 border-destructive bg-destructive/5 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">Esta proposta está fora do prazo de validade.</p>
              <p className="text-muted-foreground">Os valores podem ter sido atualizados. Gere uma nova versão antes de enviar o PDF.</p>
            </div>
          </div>
        )}

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

        {/* EDIÇÃO PONTUAL - only for authenticated */}
        {isAuthenticated && (
          <section className="solar-card p-6 space-y-4 no-print">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Edit className="w-5 h-5 text-secondary" /> Ajustes da Proposta
              </h2>
              {!editingProposal && (
                <button onClick={openEditPanel} className="solar-btn-outline text-xs py-1.5 px-3">
                  Editar campos
                </button>
              )}
            </div>

            {editingProposal && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Marca do inversor</label>
                    <input className="solar-input py-2 text-sm" value={editForm.inverterBrand}
                      onChange={e => setEditForm(f => ({ ...f, inverterBrand: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Modelo do inversor</label>
                    <input className="solar-input py-2 text-sm" value={editForm.inverterModel}
                      onChange={e => setEditForm(f => ({ ...f, inverterModel: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Marca da placa</label>
                    <input className="solar-input py-2 text-sm" value={editForm.panelBrand}
                      onChange={e => setEditForm(f => ({ ...f, panelBrand: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Potência da placa</label>
                    <input className="solar-input py-2 text-sm" value={editForm.panelPowerLabel}
                      onChange={e => setEditForm(f => ({ ...f, panelPowerLabel: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-muted-foreground">Preço total (R$)</label>
                    <input className="solar-input py-2 text-sm" inputMode="decimal" value={editForm.totalPrice}
                      onChange={e => setEditForm(f => ({ ...f, totalPrice: e.target.value }))} />
                    <p className="text-[11px] text-muted-foreground mt-1">Alterar recalcula parcelas automaticamente.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-muted-foreground">Observações / condições especiais</label>
                  <textarea className="solar-input py-2 text-sm min-h-[80px]" value={editForm.observacoes}
                    onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>

                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingProposal(false)} className="solar-btn-outline text-sm py-2 px-4" disabled={savingEdit}>
                    Cancelar
                  </button>
                  <button onClick={saveEditPanel} className="solar-btn-primary text-sm py-2 px-4" disabled={savingEdit}>
                    {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* RESUMO DA LINHA SELECIONADA — leitura rápida, sem duplicar o que já está no PDF */}
        {selectedCard && (
          <section className="solar-card p-5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4 text-secondary" /> {LINE_NAMES[selectedCard.line] || selectedCard.line}
              </h2>
              <p className="text-2xl font-bold text-primary">{formatCurrency(selectedCard.totalPrice)}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
              <div><span className="text-muted-foreground">Placas: </span><span className="font-medium">{selectedCard.panelCount}× {selectedCard.panelBrand || selectedCard.panel?.brand}</span></div>
              <div><span className="text-muted-foreground">Potência: </span><span className="font-medium">{formatNumber(selectedCard.dimensioning.powerKwp)} kWp</span></div>
              <div><span className="text-muted-foreground">Geração/mês: </span><span className="font-medium">{formatNumber(selectedCard.dimensioning.monthlyGeneration, 0)} kWh</span></div>
              <div><span className="text-muted-foreground">Excedente: </span><span className="font-medium">{formatNumber(selectedCard.dimensioning.surplus, 0)} kWh</span></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Preços, parcelas, geração×consumo e equipamentos completos estão no documento abaixo — essa é só uma conferência rápida.
            </p>
          </section>
        )}

        {/* DOCUMENTO — o mesmo PDF que vai pro cliente. É a fonte única de verdade. */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Documento (o que o cliente recebe)</h2>
            <button onClick={handlePreviewPDF} className="solar-btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> {pdfBlob ? 'Atualizar pré-visualização' : 'Gerar pré-visualização'}
            </button>
          </div>

          {pdfBlob ? (
            <PDFCanvasViewer blob={pdfBlob} onDownload={handleDownloadPDF} inline />
          ) : (
            <div className="solar-card p-10 text-center text-sm text-muted-foreground">
              Clique em "Gerar pré-visualização" pra ver o PDF exatamente como ele sai pro cliente.
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            {isOutOfValidity ? (
              <span className="text-destructive font-semibold">
                Proposta fora de validade desde {fmtDate(validUntil)} • Gerada em {fmtDate(createdAt)}
              </span>
            ) : (
              <>Proposta válida até {fmtDate(validUntil)} • Gerada em {fmtDate(createdAt)}</>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}