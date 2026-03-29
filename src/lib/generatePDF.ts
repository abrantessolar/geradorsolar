import jsPDF from 'jspdf';
import { formatCurrency, formatNumber } from '@/data/calculations';
import { LINE_NAMES, INSTALLMENT_OPTIONS, MONTH_LABELS } from '@/data/types';
import { supabase } from '@/integrations/supabase/client';
import { getConfigDB } from '@/data/supabaseStore';
import type { PdfTemplateSettings } from '@/data/pdfTemplateTypes';
import { DEFAULT_PDF_TEMPLATE } from '@/data/pdfTemplateTypes';
import pdfCoverImg from '@/assets/pdf-cover.png';
import pdfPortfolioImg from '@/assets/pdf-portfolio.png';

// Brand colors
const PRIMARY = [74, 90, 42] as const;    // #4A5A2A
const SECONDARY = [232, 184, 75] as const; // #E8B84B
const WHITE = [255, 255, 255] as const;
const DARK = [33, 33, 33] as const;
const GRAY = [120, 120, 120] as const;
const LIGHT_BG = [247, 247, 242] as const;
const RED_SOFT = [220, 60, 60] as const;
const GREEN = [34, 139, 34] as const;

type RGB = readonly [number, number, number];

export async function generateProposalPDF(
  proposal: any, settings: any, lineCards: any[],
  chartData: any[], cashflowData: any[]
): Promise<jsPDF> {
  // Load PDF template settings
  const savedTemplate = await getConfigDB('pdf_template');
  const tpl: PdfTemplateSettings = savedTemplate ? { ...DEFAULT_PDF_TEMPLATE, ...savedTemplate } : DEFAULT_PDF_TEMPLATE;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const W = 210;
  const H = 297;
  const M = 15;
  const CW = W - 2 * M;

  const selectedCard = lineCards.find((c: any) => c.line === proposal.selectedLine) || lineCards[0];
  const numero = proposal.numero_proposta || 'TLS-0000';
  const isPremium = proposal.selectedLine === 'premium';

  // Helpers
  const setColor = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  const drawFooter = () => {
    const fy = H - 14;
    setFill(PRIMARY);
    doc.rect(0, fy - 2, W, 16, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(WHITE);
    const fp = tpl.footer;
    const phone = fp.showPhone ? (fp.customPhone || settings.company.phone) : '';
    const email = fp.showEmail ? (fp.customEmail || settings.company.email) : '';
    const cnpj = fp.showCnpj ? `CNPJ: ${fp.customCnpj || settings.company.cnpj || ''}` : '';
    const site = fp.showSite ? (fp.customSite || settings.company.site || 'www.treslagoassolar.com.br') : '';
    const social = fp.showSocial ? (fp.customSocial || '@treslagoassolar') : '';
    const footerParts = [phone, email, cnpj, site, social].filter(Boolean);
    const footerText = footerParts.join('  |  ');
    doc.text(footerText, W / 2, fy + 5, { align: 'center' });
  };

  const drawPageHeader = (title: string) => {
    // Dark green header bar
    setFill(PRIMARY);
    doc.rect(0, 0, W, 28, 'F');
    // Gold accent line
    setFill(SECONDARY);
    doc.rect(0, 28, W, 2, 'F');
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setColor(WHITE);
    doc.text(title, W / 2, 18, { align: 'center' });
    // Proposal number
    doc.setFontSize(8);
    setColor(SECONDARY);
    doc.text(numero, W - M, 18, { align: 'right' });
  };

  // Compress image via canvas: resize + JPEG quality
  const compressImage = async (src: string, maxWidth: number, quality: number): Promise<string | null> => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, maxWidth / bitmap.width);
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      return canvas.toDataURL('image/jpeg', quality);
    } catch { return null; }
  };

  let logoData: string | null = null;
  try {
    logoData = await compressImage(new URL('/src/assets/logo.png', window.location.origin).href, 400, 0.75);
  } catch { /* logo not available */ }

  // Cover: largest image — compress aggressively
  const coverImgData = await compressImage(pdfCoverImg, 1200, 0.70);
  // Portfolio: many photos — compress more
  const portfolioImgData = await compressImage(pdfPortfolioImg, 1200, 0.60);

  // ═══════════════════════════════════════
  // PAGE 1: COVER (using uploaded template image)
  // ═══════════════════════════════════════
  if (coverImgData) {
    try {
      doc.addImage(coverImgData, 'JPEG', 0, 0, W, H);
    } catch {}
  }

  // Overlay dynamic text on the cover image — NO green rectangle behind text
  // Proposal number top-right
  if (tpl.cover.showProposalNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setColor(PRIMARY);
    doc.text(numero, W - M, 16, { align: 'right' });
  }

  // Client name — positioned on the green bar area of the template
  // The template's green bar is around Y=215-240, we place text there
  const barY = 220 + (H * 0.02);

  // Optional header text above client name
  if (tpl.cover.headerText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor([230, 230, 220]);
    doc.text(tpl.cover.headerText, W / 2, barY - 4, { align: 'center' });
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  setColor(WHITE);
  doc.text(proposal.clientData.name.toUpperCase(), W / 2, barY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const cityLine = tpl.cover.showCity
    ? `${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh/mês  •  ${proposal.clientData.city} — ${proposal.clientData.state || 'MS'}`
    : `${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh/mês`;
  doc.text(cityLine, W / 2, barY + 13, { align: 'center' });

  // Representative info — black text, 25% to the left
  const sellerName = proposal.clientData.seller || '';
  const matchedSeller = settings.sellers?.find((s: any) => s.name === sellerName);
  const sellerPhone = matchedSeller?.phone || settings.company?.phone || '';
  const sellerEmail = matchedSeller?.email || '';
  const repY = barY + 26 + (H * 0.075) - (H * 0.028) + (H * 0.005);
  const repX = W * 0.25 + (W * 0.05);
  if (sellerName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor([51, 51, 51]);
    doc.text(sellerName, repX, repY, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(GRAY);
    const repDetails = [sellerPhone, sellerEmail].filter(Boolean).join('  •  ');
    if (repDetails) {
      doc.text(repDetails, repX, repY + 6, { align: 'left' });
    }
  }

  // ═══════════════════════════════════════
  // PAGE 2: PORTFOLIO (using uploaded template image)
  // ═══════════════════════════════════════
  doc.addPage();
  if (portfolioImgData) {
    try {
      doc.addImage(portfolioImgData, 'JPEG', 0, 0, W, H);
    } catch {}
  } else {
    drawPageHeader('Nossos Projetos');
  }

  // ═══════════════════════════════════════
  // PAGE 3: SPECS + CHART + INVESTMENT + CARD INSTALLMENTS (all in one)
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Especificações e Investimento');
  let y = 34;

  // Compact two-column: Equipamentos | Rendimentos
  const halfW = CW / 2 - 4;

  // ── Equipamentos card ──
  setFill([250, 252, 245]);
  doc.roundedRect(M, y, halfW, 48, 4, 4, 'F');
  setFill(SECONDARY);
  doc.roundedRect(M, y, halfW, 2.5, 4, 4, 'F');
  doc.rect(M, y + 1.5, halfW, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(PRIMARY);
  doc.text('Equipamentos', M + 6, y + 9);

  let ly = y + 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);

  if (isPremium) {
    const microCount = selectedCard?.microCount || 0;
    doc.text(`Micro Inversores: ${microCount}×`, M + 6, ly);
    ly += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${selectedCard?.inverter?.brand || ''} ${selectedCard?.inverter?.model || ''}`, M + 6, ly);
    doc.setFont('helvetica', 'normal');
    ly += 4.5;
    doc.text(`${selectedCard?.inverter?.power || ''} W cada`, M + 6, ly);
  } else {
    doc.text('Inversor:', M + 6, ly);
    ly += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${selectedCard?.inverter?.brand || ''} ${selectedCard?.inverter?.model || ''}`, M + 6, ly);
    doc.setFont('helvetica', 'normal');
    ly += 4.5;
    doc.text(`${selectedCard?.inverter?.power || ''} kW`, M + 6, ly);
  }
  ly += 6;
  doc.text('Placas:', M + 6, ly);
  ly += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`${selectedCard?.panelCount || 0}× ${selectedCard?.panel?.brand || ''} ${selectedCard?.panel?.power || ''}Wp`, M + 6, ly);

  // ── Rendimentos card ──
  const rx = M + halfW + 8;
  setFill([250, 252, 245]);
  doc.roundedRect(rx, y, halfW, 48, 4, 4, 'F');
  setFill(SECONDARY);
  doc.roundedRect(rx, y, halfW, 2.5, 4, 4, 'F');
  doc.rect(rx, y + 1.5, halfW, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(PRIMARY);
  doc.text('Rendimentos', rx + 6, y + 9);

  let ry = y + 15;
  const rendimentos = [
    ['Geração:', `${formatNumber(selectedCard?.dimensioning?.monthlyGeneration || 0, 0)} kWh/mês`],
    ['Consumo:', `${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh/mês`],
    ['Excedente:', `${formatNumber(selectedCard?.dimensioning?.surplus || 0, 0)} kWh/mês`],
    ['Potência:', `${formatNumber(selectedCard?.dimensioning?.powerKwp || 0)} kWp`],
  ];

  doc.setFontSize(8);
  rendimentos.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(label, rx + 6, ry);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    doc.text(value, rx + halfW - 6, ry, { align: 'right' });
    ry += 6;
  });

  // "Incluso" text (compact) — uses template toggles
  y += 52;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  const surplusPct = settings.surplusFactor ?? 20;
  const inclusoItems = ['Sistema solar + Instalação'];
  if (tpl.specs.showMaterial) inclusoItems.push('Material de instalação');
  if (tpl.specs.showShadowAnalysis) inclusoItems.push('Análise de sombreamento');
  if (tpl.specs.showHomologation) inclusoItems.push('Homologação');
  if (tpl.specs.showMonitoring) inclusoItems.push('Monitoramento');
  if (tpl.specs.showWarranty) inclusoItems.push('3 Anos de garantia');
  const inclusoText = `Incluso: ${inclusoItems.join(' + ')} • ${surplusPct}% de reserva`;
  doc.text(inclusoText, W / 2, y, { align: 'center' });

  // ── Chart: Geração vs Consumo (compact) ──
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(PRIMARY);
  doc.text('Geração vs Consumo Mensal (kWh)', W / 2, y, { align: 'center' });
  y += 5;

  const chartH = 38;
  const barGroupW = CW / 12;
  const maxVal = Math.max(...chartData.map((d: any) => Math.max(d.geração || 0, d.consumo || 0, 1)));

  // Compact legend
  setFill(PRIMARY);
  doc.roundedRect(M + CW / 2 - 32, y, 5, 2.5, 1, 1, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  doc.text('Geração', M + CW / 2 - 25, y + 2);
  setFill(SECONDARY);
  doc.roundedRect(M + CW / 2 + 8, y, 5, 2.5, 1, 1, 'F');
  doc.text('Consumo', M + CW / 2 + 15, y + 2);
  y += 5;

  const chartY = y;
  setDraw([220, 220, 215]);
  doc.setLineWidth(0.15);
  doc.line(M, chartY, M, chartY + chartH);
  doc.line(M, chartY + chartH, M + CW, chartY + chartH);

  chartData.forEach((d: any, i: number) => {
    const cx = M + i * barGroupW;
    const barW = barGroupW * 0.35;
    const genH = ((d.geração || 0) / maxVal) * chartH;
    const conH = ((d.consumo || 0) / maxVal) * chartH;

    setFill(PRIMARY);
    doc.roundedRect(cx + barGroupW * 0.15, chartY + chartH - genH, barW, genH, 1, 1, 'F');
    setFill(SECONDARY);
    doc.roundedRect(cx + barGroupW * 0.5, chartY + chartH - conH, barW, conH, 1, 1, 'F');

    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    if (genH > 4) doc.text(String(d.geração || 0), cx + barGroupW * 0.15 + barW / 2, chartY + chartH - genH - 1, { align: 'center' });
    setColor(DARK);
    if (conH > 4) doc.text(String(d.consumo || 0), cx + barGroupW * 0.5 + barW / 2, chartY + chartH - conH - 1, { align: 'center' });

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    setColor(DARK);
    doc.text(MONTH_LABELS[i], cx + barGroupW / 2, chartY + chartH + 3.5, { align: 'center' });
  });

  // ═══════════════════════════════════════
  // INVESTMENT section
  // ═══════════════════════════════════════
  y = chartY + chartH + 8;

  setFill([230, 225, 210]);
  doc.roundedRect(W / 2 - 25, y, 50, 0.6, 0.3, 0.3, 'F');
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(PRIMARY);
  doc.text('Investimento', M, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  doc.text('sistema completo de energia solar fotovoltaica', M + 42, y);
  y += 6;

  // Filter installments based on template settings
  const installmentMap: Record<number, string> = { 72: 'show72x', 60: 'show60x', 48: 'show48x', 36: 'show36x', 24: 'show24x' };
  const visibleInstallments = INSTALLMENT_OPTIONS.filter(n => (tpl.specs.installments as any)[installmentMap[n]] !== false);
  const installW = CW / Math.max(visibleInstallments.length, 1);
  visibleInstallments.forEach((n, i) => {
    const ix = M + i * installW;
    setFill([252, 251, 246]);
    doc.roundedRect(ix + 2, y, installW - 4, 23, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(23);
    setColor(SECONDARY);
    doc.text(`${n}X`, ix + installW / 2, y + 10, { align: 'center' });

    setFill(SECONDARY);
    doc.roundedRect(ix + 6, y + 13, installW - 12, 0.7, 0.3, 0.3, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(DARK);
    doc.text(formatCurrency(selectedCard?.installments?.[n] || 0), ix + installW / 2, y + 20, { align: 'center' });
  });

  y += 27;

  // "Investimento" price box — 30% larger
  setFill([245, 248, 240]);
  doc.roundedRect(W / 2 - 45, y - 4, 90, 15, 3, 3, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  doc.text('Investimento:', W / 2 - 3, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(PRIMARY);
  doc.text(formatCurrency(selectedCard?.totalPrice || 0), W / 2, y + 4);

  y += 14;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  doc.text(`Proposta válida por ${settings.proposalValidity || 15} dias  •  ${numero}  •  ${new Date(proposal.createdAt).toLocaleDateString('pt-BR')}`, W / 2, y, { align: 'center' });

  if (proposal.cetApplied) {
    y += 3.5;
    doc.text(`CET aplicada: ${proposal.cetApplied}% a.m.`, W / 2, y, { align: 'center' });
  }

  // Card installments — 2 columns
  if (selectedCard?.cardInstallments && Object.keys(selectedCard.cardInstallments).length > 0) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setColor(PRIMARY);
    doc.text('Parcelamento no Cartão', M, y);
    y += 5;

    const colW = CW / 2 - 2;
    const cardEntries = Object.entries(selectedCard.cardInstallments);
    const half = Math.ceil(cardEntries.length / 2);
    const col1 = cardEntries.slice(0, half);
    const col2 = cardEntries.slice(half);

    // Headers for both columns
    [0, 1].forEach(col => {
      const cx = M + col * (colW + 4);
      setFill(PRIMARY);
      doc.roundedRect(cx, y - 2.5, colW, 6.5, 2, 2, 'F');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      setColor(WHITE);
      doc.text('Parcelas', cx + 6, y + 1.5);
      doc.text('Valor/Mês', cx + colW - 6, y + 1.5, { align: 'right' });
    });
    const startY = y + 6.5;

    [col1, col2].forEach((entries, col) => {
      let rowY = startY;
      const cx = M + col * (colW + 4);
      entries.forEach(([n, v]: [string, any], i: number) => {
        if (i % 2 === 0) {
          setFill([250, 252, 246]);
          doc.roundedRect(cx, rowY - 2.5, colW, 5.5, 1, 1, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        setColor(DARK);
        doc.text(`${n}×`, cx + 6, rowY + 1);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency((v as any).perMonth), cx + colW - 6, rowY + 1, { align: 'right' });
        rowY += 5.5;
      });
    });
    y = startY + Math.max(col1.length, col2.length) * 5.5;
  }

  drawFooter();

  // ═══════════════════════════════════════
  // PAGE 5: FINANCIAL RETURN
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Retorno Financeiro');
  y = 40;

  const monthlyBill = (selectedCard?.dimensioning?.avgMonthlyKwh || 0) * (proposal.clientData.kwhPrice || 0.85);
  const calcSavings = (years: number) => {
    let totalWithout = 0;
    let totalWith = 0;
    for (let yr = 0; yr < years; yr++) {
      totalWithout += monthlyBill * 12 * Math.pow(1.10, yr);
      totalWith += Math.max(80, monthlyBill * 0.15) * 12;
    }
    return totalWithout - totalWith;
  };
  const calcWithout = (years: number) => {
    let total = 0;
    for (let yr = 0; yr < years; yr++) total += monthlyBill * 12 * Math.pow(1.10, yr);
    return total;
  };

  // KPI cards with softer styling — filtered by template
  const kpiData: { label: string; value: string; color: RGB }[] = [];
  if (tpl.financial.showPayback) kpiData.push({ label: 'Payback', value: `${formatNumber(selectedCard?.dimensioning?.paybackYears || 0)} anos`, color: PRIMARY });
  if (tpl.financial.showMonthlyLoss) kpiData.push({ label: 'Economia Mensal', value: formatCurrency(selectedCard?.dimensioning?.monthlySavings || 0), color: PRIMARY });
  if (tpl.financial.showReturn25) kpiData.push({ label: 'Retorno 25 anos', value: formatCurrency(selectedCard?.dimensioning?.return25 || 0), color: PRIMARY });
  // Always show at least the monthly savings if nothing else
  if (kpiData.length === 0) kpiData.push({ label: 'Economia Mensal', value: formatCurrency(selectedCard?.dimensioning?.monthlySavings || 0), color: PRIMARY });

  const kpiW = CW / Math.max(kpiData.length, 1);
  kpiData.forEach((kpi, i) => {
    const kx = M + i * kpiW;
    setFill([250, 252, 245]);
    doc.roundedRect(kx + 2, y, kpiW - 4, 24, 4, 4, 'F');
    setFill(SECONDARY);
    doc.roundedRect(kx + 2, y, kpiW - 4, 3, 4, 4, 'F');
    doc.rect(kx + 2, y + 2, kpiW - 4, 1, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(kpi.label, kx + kpiW / 2, y + 10, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    setColor(kpi.color);
    doc.text(kpi.value, kx + kpiW / 2, y + 19, { align: 'center' });
  });
  y += 32;

  // Savings cards with softer edges
  const savingsItems: { years: number; value: number }[] = [];
  if (tpl.financial.showReturn5) savingsItems.push({ years: 5, value: calcSavings(5) });
  if (tpl.financial.showReturn10) savingsItems.push({ years: 10, value: calcSavings(10) });
  if (tpl.financial.showReturn15) savingsItems.push({ years: 15, value: calcSavings(15) });

  if (savingsItems.length > 0) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(PRIMARY);
  doc.text('Sua economia com energia solar', M, y);
  y += 7;

  const cardW = CW / Math.max(savingsItems.length, 1) - 2;
  savingsItems.forEach((item, i) => {
    const sx = M + i * (cardW + 3);
    setFill([245, 250, 238]);
    doc.roundedRect(sx, y, cardW, 26, 4, 4, 'F');
    // Soft left accent with rounded ends
    setFill(PRIMARY);
    doc.roundedRect(sx, y + 3, 3, 20, 1.5, 1.5, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(`Economia em ${item.years} anos`, sx + 10, y + 10);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    doc.text(formatCurrency(item.value), sx + 10, y + 20);
  });
  y += 32;
  } // end savings if

  // "Without solar" cards with softer edges
  const noSolarItems: { years: number; value: number }[] = [];
  if (tpl.financial.showWithout5) noSolarItems.push({ years: 5, value: calcWithout(5) });
  if (tpl.financial.showWithout10) noSolarItems.push({ years: 10, value: calcWithout(10) });

  if (noSolarItems.length > 0) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(RED_SOFT);
  doc.text('Quanto você pagaria sem energia solar', M, y);
  y += 7;
  const nCardW = CW / 3 - 2;
  noSolarItems.forEach((item, i) => {
    const nx = M + i * (nCardW + 3);
    setFill([255, 245, 243]);
    doc.roundedRect(nx, y, nCardW, 26, 4, 4, 'F');
    setFill(RED_SOFT);
    doc.roundedRect(nx, y + 3, 3, 20, 1.5, 1.5, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(`Sem solar em ${item.years} anos`, nx + 10, y + 10);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    setColor(RED_SOFT);
    doc.text(formatCurrency(item.value), nx + 10, y + 20);
  });
  y += 34;
  } // end noSolar if

  // Custom footer text from template
  if (tpl.financial.footerText) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(tpl.financial.footerText, W / 2, y, { align: 'center' });
    y += 5;
  }

  // Cash flow table with softer header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text('Fluxo de Caixa Comparativo (Acumulado)', M, y);
  y += 7;

  // Rounded table header
  setFill(PRIMARY);
  doc.roundedRect(M, y - 3, CW, 7, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  setColor(WHITE);
  doc.text('Ano', M + 5, y + 1.5);
  doc.text('Sem Solar', M + CW * 0.35, y + 1.5, { align: 'right' });
  doc.text('Com Solar', M + CW * 0.60, y + 1.5, { align: 'right' });
  doc.text('Economia', M + CW * 0.82, y + 1.5, { align: 'right' });
  doc.text('Status', M + CW - 3, y + 1.5, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const cfDisplay = cashflowData.filter((_: any, i: number) => i === 0 || i % 3 === 0 || i === cashflowData.length - 1);
  cfDisplay.forEach((row: any, i: number) => {
    if (i % 2 === 0) {
      setFill([250, 252, 246]);
      doc.roundedRect(M, y - 2.5, CW, 6, 1, 1, 'F');
    }
    setColor(DARK);
    doc.text(`Ano ${row.year}`, M + 5, y + 1);
    doc.text(formatCurrency(row.semSolar), M + CW * 0.35, y + 1, { align: 'right' });
    doc.text(formatCurrency(row.comSolar), M + CW * 0.60, y + 1, { align: 'right' });
    const eco = row.semSolar - row.comSolar;
    setColor(eco > 0 ? GREEN : RED_SOFT);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(eco), M + CW * 0.82, y + 1, { align: 'right' });
    // Soft rounded status indicator
    setFill(eco > 0 ? GREEN : RED_SOFT);
    doc.circle(M + CW - 5, y - 0.5, 2, 'F');
    doc.setFontSize(5.5);
    setColor(WHITE);
    doc.text(eco > 0 ? '+' : '-', M + CW - 5, y + 0.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    y += 6;
  });

  drawFooter();

  // ═══════════════════════════════════════
  // RETURN DOC (caller decides save vs blob)
  // ═══════════════════════════════════════
  return doc;
}
