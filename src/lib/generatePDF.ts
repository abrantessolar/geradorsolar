import jsPDF from 'jspdf';
import { formatCurrency, formatNumber } from '@/data/calculations';
import { LINE_NAMES, INSTALLMENT_OPTIONS, MONTH_LABELS } from '@/data/types';
import { supabase } from '@/integrations/supabase/client';
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
) {
  const doc = new jsPDF('p', 'mm', 'a4');
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
    const footerText = `${settings.company.phone}  |  ${settings.company.email}  |  CNPJ: ${settings.company.cnpj || ''}  |  ${settings.company.site || 'www.treslagoassolar.com.br'}  |  @treslagoassolar`;
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

  // Load cover and portfolio images as base64
  const loadImageAsBase64 = async (src: string): Promise<string | null> => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  let logoData: string | null = null;
  try {
    const response = await fetch(new URL('/src/assets/logo.png', window.location.origin).href);
    const blob = await response.blob();
    logoData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { /* logo not available */ }

  const coverImgData = await loadImageAsBase64(pdfCoverImg);
  const portfolioImgData = await loadImageAsBase64(pdfPortfolioImg);

  // ═══════════════════════════════════════
  // PAGE 1: COVER (using uploaded template image)
  // ═══════════════════════════════════════
  if (coverImgData) {
    try {
      doc.addImage(coverImgData, 'PNG', 0, 0, W, H);
    } catch {}
  }

  // Overlay dynamic text on the cover image — NO green rectangle behind text
  // Proposal number top-right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(PRIMARY);
  doc.text(numero, W - M, 16, { align: 'right' });

  // Client name — positioned on the green bar area of the template
  // The template's green bar is around Y=215-240, we place text there
  const barY = 220 + (H * 0.02);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  setColor(WHITE);
  doc.text(proposal.clientData.name.toUpperCase(), W / 2, barY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setColor([230, 230, 220]);
  doc.text(`${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh/mês  •  ${proposal.clientData.city} — ${proposal.clientData.state || 'MS'}`, W / 2, barY + 13, { align: 'center' });

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
      doc.addImage(portfolioImgData, 'PNG', 0, 0, W, H);
    } catch {}
  } else {
    drawPageHeader('Nossos Projetos');
  }

  // ═══════════════════════════════════════
  // PAGE 3: SPECS + CHART + CARD INSTALLMENTS
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Especificações do projeto');
  let y = 40;

  // Soft card container for Equipamentos + Rendimentos
  const halfW = CW / 2 - 4;

  // ── Equipamentos card ──
  setFill([250, 252, 245]); // very soft green-tinted bg
  doc.roundedRect(M, y, halfW, 62, 4, 4, 'F');
  // Soft top accent
  setFill(SECONDARY);
  doc.roundedRect(M, y, halfW, 3, 4, 4, 'F');
  doc.rect(M, y + 2, halfW, 1, 'F'); // fill bottom corners of accent

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text('Equipamentos', M + 8, y + 12);

  let ly = y + 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);

  if (isPremium) {
    const microCount = selectedCard?.microCount || 0;
    doc.text(`Micro Inversores: ${microCount}×`, M + 8, ly);
    ly += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${selectedCard?.inverter?.brand || ''} ${selectedCard?.inverter?.model || ''}`, M + 8, ly);
    doc.setFont('helvetica', 'normal');
    ly += 5.5;
    doc.text(`${selectedCard?.inverter?.power || ''} W cada`, M + 8, ly);
  } else {
    doc.text('Inversor:', M + 8, ly);
    ly += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${selectedCard?.inverter?.brand || ''} ${selectedCard?.inverter?.model || ''}`, M + 8, ly);
    doc.setFont('helvetica', 'normal');
    ly += 5.5;
    doc.text(`${selectedCard?.inverter?.power || ''} kW`, M + 8, ly);
  }

  ly += 8;
  doc.text('Placas:', M + 8, ly);
  ly += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`${selectedCard?.panelCount || 0}× ${selectedCard?.panel?.brand || ''} ${selectedCard?.panel?.power || ''}Wp`, M + 8, ly);

  // ── Rendimentos card ──
  const rx = M + halfW + 8;
  setFill([250, 252, 245]);
  doc.roundedRect(rx, y, halfW, 62, 4, 4, 'F');
  setFill(SECONDARY);
  doc.roundedRect(rx, y, halfW, 3, 4, 4, 'F');
  doc.rect(rx, y + 2, halfW, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text('Rendimentos', rx + 8, y + 12);

  let ry = y + 20;
  const rendimentos = [
    ['Geração:', `${formatNumber(selectedCard?.dimensioning?.monthlyGeneration || 0, 0)} kWh/mês`],
    ['Consumo:', `${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh/mês`],
    ['Excedente:', `${formatNumber(selectedCard?.dimensioning?.surplus || 0, 0)} kWh/mês`],
    ['Potência:', `${formatNumber(selectedCard?.dimensioning?.powerKwp || 0)} kWp`],
  ];

  doc.setFontSize(9);
  rendimentos.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(label, rx + 8, ry);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    doc.text(value, rx + halfW - 8, ry, { align: 'right' });
    ry += 7;
  });

  // "Incluso" section - softer
  y += 68;
  setFill([248, 248, 243]);
  doc.roundedRect(M, y, CW, 16, 3, 3, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  const surplusPct = settings.surplusFactor ?? 20;
  const inclusoText = `Sistema solar + Material de instalação + Análise de sombreamento + Homologação + 3 Anos de garantia de instalação e acompanhamento • Dimensionado com ${surplusPct}% de reserva para crescimento futuro`;
  const inclusoLines = doc.splitTextToSize(inclusoText, CW - 10);
  doc.text(inclusoLines, W / 2, y + 6, { align: 'center' });

  // ── Chart: Geração vs Consumo ──
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text('Geração vs Consumo Mensal (kWh)', W / 2, y, { align: 'center' });
  y += 6;

  const chartH = 50;
  const barGroupW = CW / 12;
  const maxVal = Math.max(...chartData.map((d: any) => Math.max(d.geração || 0, d.consumo || 0, 1)));

  // Legend
  doc.roundedRect(M + CW / 2 - 40, y - 1, 80, 6, 2, 2, 'S');
  setDraw([220, 220, 215]);
  doc.setLineWidth(0.2);
  setFill(PRIMARY);
  doc.roundedRect(M + CW / 2 - 35, y, 5, 3, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  doc.text('Geração', M + CW / 2 - 28, y + 2.5);
  setFill(SECONDARY);
  doc.roundedRect(M + CW / 2 + 8, y, 5, 3, 1, 1, 'F');
  doc.text('Consumo', M + CW / 2 + 15, y + 2.5);
  y += 8;

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

    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    if (genH > 5) doc.text(String(d.geração || 0), cx + barGroupW * 0.15 + barW / 2, chartY + chartH - genH - 1.5, { align: 'center' });
    setColor(DARK);
    if (conH > 5) doc.text(String(d.consumo || 0), cx + barGroupW * 0.5 + barW / 2, chartY + chartH - conH - 1.5, { align: 'center' });

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    setColor(DARK);
    doc.text(MONTH_LABELS[i], cx + barGroupW / 2, chartY + chartH + 4, { align: 'center' });
  });

  // ═══════════════════════════════════════
  // INVESTMENT section (on same page below chart)
  // ═══════════════════════════════════════
  y = chartY + chartH + 10;

  // Soft divider
  setFill([230, 225, 210]);
  doc.roundedRect(W / 2 - 30, y, 60, 0.8, 0.4, 0.4, 'F');
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(PRIMARY);
  doc.text('Investimento', M, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  doc.text('sistema completo de energia solar fotovoltaica', M + 48, y);
  y += 8;

  // Installment boxes with soft cards
  const installW = CW / 5;
  INSTALLMENT_OPTIONS.forEach((n, i) => {
    const ix = M + i * installW;
    // Soft card bg
    setFill([252, 251, 246]);
    doc.roundedRect(ix + 2, y, installW - 4, 24, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    setColor(SECONDARY);
    doc.text(`${n}X`, ix + installW / 2, y + 10, { align: 'center' });

    // Rounded accent underline
    setFill(SECONDARY);
    doc.roundedRect(ix + 6, y + 12, installW - 12, 0.8, 0.4, 0.4, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(DARK);
    doc.text(formatCurrency(selectedCard?.installments?.[n] || 0), ix + installW / 2, y + 19, { align: 'center' });
  });

  y += 28;

  // À vista price in soft card
  setFill([245, 248, 240]);
  doc.roundedRect(W / 2 - 40, y - 4, 80, 14, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  doc.text('À vista:', W / 2 - 5, y + 3, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setColor(PRIMARY);
  doc.text(formatCurrency(selectedCard?.totalPrice || 0), W / 2 - 2, y + 3);

  y += 14;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  doc.text(`Proposta válida por ${settings.proposalValidity || 15} dias  •  ${numero}  •  ${new Date(proposal.createdAt).toLocaleDateString('pt-BR')}`, W / 2, y, { align: 'center' });

  if (proposal.cetApplied) {
    y += 4;
    doc.text(`CET aplicada: ${proposal.cetApplied}% a.m.`, W / 2, y, { align: 'center' });
  }

  // Card installments (simplified: qty + per-month only) on this page
  if (selectedCard?.cardInstallments && Object.keys(selectedCard.cardInstallments).length > 0) {
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(PRIMARY);
    doc.text('Parcelamento no Cartão de Crédito', M, y);
    y += 6;

    // Soft rounded header
    setFill(PRIMARY);
    doc.roundedRect(M, y - 3, CW, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(WHITE);
    doc.text('Parcelas', M + 10, y + 2);
    doc.text('Valor/Mês', M + CW - 10, y + 2, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const cardEntries = Object.entries(selectedCard.cardInstallments);
    cardEntries.forEach(([n, v]: [string, any], i: number) => {
      if (i % 2 === 0) {
        setFill([250, 252, 246]);
        doc.roundedRect(M, y - 3, CW, 6.5, 1, 1, 'F');
      }
      setColor(DARK);
      doc.text(`${n}×`, M + 10, y + 1.5);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(v.perMonth), M + CW - 10, y + 1.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 6.5;
    });
  }

  drawFooter();

  // ═══════════════════════════════════════
  // PAGE 4: COMPARATIVO DE LINHAS
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Comparativo de Linhas');
  y = 40;

  const lineColW = CW / lineCards.length;
  lineCards.forEach((card: any, i: number) => {
    const x = M + i * lineColW;
    const isSelected = card.line === proposal.selectedLine;

    if (isSelected) {
      setFill(PRIMARY);
      doc.roundedRect(x + 2, y, lineColW - 4, 72, 5, 5, 'F');
      setFill(SECONDARY);
      doc.roundedRect(x + lineColW / 2 - 15, y - 3, 30, 8, 3, 3, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      setColor(DARK);
      doc.text('SELECIONADA', x + lineColW / 2, y + 2, { align: 'center' });
    } else {
      setFill([250, 252, 245]);
      doc.roundedRect(x + 2, y, lineColW - 4, 72, 5, 5, 'F');
      setDraw([215, 215, 210]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x + 2, y, lineColW - 4, 72, 5, 5, 'S');
    }

    const textColor: RGB = isSelected ? WHITE : DARK;
    const subColor: RGB = isSelected ? [200, 210, 190] : GRAY;

    let cy = y + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(textColor);
    doc.text(LINE_NAMES[card.line] || card.line, x + lineColW / 2, cy, { align: 'center' });

    cy += 10;
    doc.setFontSize(16);
    doc.text(formatCurrency(card.totalPrice), x + lineColW / 2, cy, { align: 'center' });

    cy += 8;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(subColor);
    doc.text(`${formatNumber(card.dimensioning.powerKwp)} kWp`, x + lineColW / 2, cy, { align: 'center' });
    cy += 5;
    doc.text(`${formatNumber(card.dimensioning.monthlyGeneration, 0)} kWh/mês`, x + lineColW / 2, cy, { align: 'center' });
    cy += 5;
    doc.text(`Payback: ${formatNumber(card.dimensioning.paybackYears)} anos`, x + lineColW / 2, cy, { align: 'center' });
    cy += 5;
    doc.text(`Economia: ${formatCurrency(card.dimensioning.monthlySavings)}/mês`, x + lineColW / 2, cy, { align: 'center' });

    cy += 6;
    doc.setFontSize(6);
    const isPrem = card.line === 'premium';
    if (isPrem) {
      doc.text(`${card.microCount}× ${card.inverter?.brand || ''} ${card.inverter?.model || ''}`, x + lineColW / 2, cy, { align: 'center' });
    } else {
      doc.text(`${card.inverter?.brand || ''} ${card.inverter?.model || ''}`, x + lineColW / 2, cy, { align: 'center' });
    }
    cy += 4;
    doc.text(`${card.panelCount}× ${card.panel?.brand || ''} ${card.panel?.power || ''}Wp`, x + lineColW / 2, cy, { align: 'center' });
  });

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

  // KPI cards with softer styling
  const kpiData = [
    { label: 'Economia Mensal', value: formatCurrency(selectedCard?.dimensioning?.monthlySavings || 0), color: PRIMARY },
    { label: 'Payback', value: `${formatNumber(selectedCard?.dimensioning?.paybackYears || 0)} anos`, color: PRIMARY },
    { label: 'Retorno 25 anos', value: formatCurrency(selectedCard?.dimensioning?.return25 || 0), color: PRIMARY },
  ];

  const kpiW = CW / 3;
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(PRIMARY);
  doc.text('Sua economia com energia solar', M, y);
  y += 7;

  const savingsItems = [
    { years: 5, value: calcSavings(5) },
    { years: 10, value: calcSavings(10) },
    { years: 15, value: calcSavings(15) },
  ];

  const cardW = CW / 3 - 2;
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

  // "Without solar" cards with softer edges
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(RED_SOFT);
  doc.text('Quanto você pagaria sem energia solar', M, y);
  y += 7;

  const noSolarItems = [
    { years: 5, value: calcWithout(5) },
    { years: 10, value: calcWithout(10) },
    { years: 15, value: calcWithout(15) },
  ];
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
  // SAVE
  // ═══════════════════════════════════════
  const clientName = (proposal.clientData.name || 'Cliente').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  doc.save(`Proposta_${numero}_${clientName}.pdf`);
}
