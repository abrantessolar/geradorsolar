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

  // Overlay dynamic text on the cover image
  // Proposal number top-right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(GRAY);
  doc.text(numero, W - M, 12, { align: 'right' });

  // Client name on the green bar (approx y=200-224 in the template)
  const barY = 210;
  // White semi-transparent overlay on the green bar for text
  setFill(PRIMARY);
  doc.rect(M + 20, barY, CW - 20, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(WHITE);
  doc.text(proposal.clientData.name, M + 28, barY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor([220, 220, 220]);
  doc.text(`${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh/mês  •  ${proposal.clientData.city} — ${proposal.clientData.state || 'MS'}`, M + 28, barY + 18);

  // Seller info at bottom
  const sellerY = 245;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(WHITE);
  doc.text(`Representante: ${proposal.clientData.seller || ''}`, M + 20, sellerY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`${settings.company.phone}  |  ${settings.company.email}`, M + 20, sellerY + 6);

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
  // PAGE 3: SPECS + CHART
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Especificações do projeto');
  let y = 40;

  // Two columns: Equipamentos | Rendimentos
  const halfW = CW / 2 - 3;

  // Equipamentos section
  setFill(SECONDARY);
  doc.roundedRect(M, y, halfW, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(DARK);
  doc.text('Equipamentos', M + 5, y + 6.5);

  let ly = y + 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);

  if (isPremium) {
    const microCount = selectedCard?.microCount || 0;
    doc.text(`Micro Inversores: ${microCount}×`, M + 3, ly);
    ly += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${selectedCard?.inverter?.brand || ''} ${selectedCard?.inverter?.model || ''}`, M + 3, ly);
    doc.setFont('helvetica', 'normal');
    ly += 5.5;
    doc.text(`${selectedCard?.inverter?.power || ''} W cada`, M + 3, ly);
  } else {
    doc.text('Inversor:', M + 3, ly);
    ly += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text(`${selectedCard?.inverter?.brand || ''} ${selectedCard?.inverter?.model || ''}`, M + 3, ly);
    doc.setFont('helvetica', 'normal');
    ly += 5.5;
    doc.text(`${selectedCard?.inverter?.power || ''} kW`, M + 3, ly);
  }

  ly += 8;
  doc.text('Placas:', M + 3, ly);
  ly += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.text(`${selectedCard?.panelCount || 0}× ${selectedCard?.panel?.brand || ''} ${selectedCard?.panel?.power || ''}Wp`, M + 3, ly);

  // Rendimentos section
  const rx = M + halfW + 6;
  setFill(SECONDARY);
  doc.roundedRect(rx, y, halfW, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(DARK);
  doc.text('Rendimentos', rx + 5, y + 6.5);

  let ry = y + 15;
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
    doc.text(label, rx + 3, ry);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    doc.text(value, rx + halfW - 5, ry, { align: 'right' });
    ry += 7;
  });

  // "Incluso" section
  y = Math.max(ly, ry) + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  const inclusoText = 'Sistema solar + Material de instalação + Análise de sombreamento + Homologação + 3 Anos de garantia de instalação e acompanhamento';
  const inclusoLines = doc.splitTextToSize(inclusoText, CW);
  doc.text(inclusoLines, W / 2, y, { align: 'center' });

  // ── Chart: Geração vs Consumo ──
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text('Geração vs Consumo Mensal (kWh)', W / 2, y, { align: 'center' });
  y += 6;

  // Draw bar chart
  const chartH = 55;
  const barGroupW = CW / 12;
  const maxVal = Math.max(...chartData.map((d: any) => Math.max(d.geração || 0, d.consumo || 0, 1)));

  // Legend
  setFill(PRIMARY);
  doc.rect(M + CW / 2 - 35, y, 6, 3, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  doc.text('Geração', M + CW / 2 - 27, y + 2.5);
  setFill(SECONDARY);
  doc.rect(M + CW / 2 + 8, y, 6, 3, 'F');
  doc.text('Consumo', M + CW / 2 + 16, y + 2.5);
  y += 7;

  const chartY = y;
  // Y axis line
  setDraw([200, 200, 200]);
  doc.setLineWidth(0.2);
  doc.line(M, chartY, M, chartY + chartH);
  doc.line(M, chartY + chartH, M + CW, chartY + chartH);

  chartData.forEach((d: any, i: number) => {
    const cx = M + i * barGroupW;
    const barW = barGroupW * 0.35;
    const genH = ((d.geração || 0) / maxVal) * chartH;
    const conH = ((d.consumo || 0) / maxVal) * chartH;

    // Generation bar (green)
    setFill(PRIMARY);
    doc.rect(cx + barGroupW * 0.15, chartY + chartH - genH, barW, genH, 'F');

    // Consumption bar (gold)
    setFill(SECONDARY);
    doc.rect(cx + barGroupW * 0.5, chartY + chartH - conH, barW, conH, 'F');

    // Value labels on bars
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    if (genH > 5) doc.text(String(d.geração || 0), cx + barGroupW * 0.15 + barW / 2, chartY + chartH - genH - 1.5, { align: 'center' });
    setColor(DARK);
    if (conH > 5) doc.text(String(d.consumo || 0), cx + barGroupW * 0.5 + barW / 2, chartY + chartH - conH - 1.5, { align: 'center' });

    // Month label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    setColor(DARK);
    doc.text(MONTH_LABELS[i], cx + barGroupW / 2, chartY + chartH + 4, { align: 'center' });
  });

  // ═══════════════════════════════════════
  // INVESTMENT section (on same page below chart)
  // ═══════════════════════════════════════
  y = chartY + chartH + 12;

  // Gold accent line
  setFill(SECONDARY);
  doc.rect(M, y, CW, 1.5, 'F');
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(PRIMARY);
  doc.text('Investimento', M, y);
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  doc.text('sistema completo de energia solar fotovoltaica', M, y + 4);
  y += 12;

  // Big installment boxes — like the template
  const installW = CW / 5;
  INSTALLMENT_OPTIONS.forEach((n, i) => {
    const ix = M + i * installW;
    // Number big
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    setColor(SECONDARY);
    doc.text(`${n}X`, ix + installW / 2, y + 8, { align: 'center' });

    // Gold underline
    setFill(SECONDARY);
    doc.rect(ix + 4, y + 10, installW - 8, 0.8, 'F');

    // Value below
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(DARK);
    doc.text(formatCurrency(selectedCard?.installments?.[n] || 0), ix + installW / 2, y + 17, { align: 'center' });
  });

  y += 24;

  // À vista price
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  doc.text('À vista:', W / 2 - 20, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(PRIMARY);
  doc.text(formatCurrency(selectedCard?.totalPrice || 0), W / 2 - 17, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  doc.text(`Proposta válida por ${settings.proposalValidity || 15} dias  •  ${numero}  •  ${new Date(proposal.createdAt).toLocaleDateString('pt-BR')}`, W / 2, y, { align: 'center' });

  if (proposal.cetApplied) {
    y += 4;
    doc.text(`CET aplicada: ${proposal.cetApplied}% a.m.`, W / 2, y, { align: 'center' });
  }

  drawFooter();

  // ═══════════════════════════════════════
  // PAGE 3: INVESTMENT COMPARISON + CARD RATES
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Comparativo de Linhas');
  y = 40;

  // Line comparison cards
  const lineColW = CW / lineCards.length;
  lineCards.forEach((card: any, i: number) => {
    const x = M + i * lineColW;
    const isSelected = card.line === proposal.selectedLine;

    // Card background
    if (isSelected) {
      setFill(PRIMARY);
      doc.roundedRect(x + 2, y, lineColW - 4, 70, 3, 3, 'F');
      // Selected badge
      setFill(SECONDARY);
      doc.roundedRect(x + lineColW / 2 - 15, y - 3, 30, 8, 2, 2, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      setColor(DARK);
      doc.text('SELECIONADA', x + lineColW / 2, y + 2, { align: 'center' });
    } else {
      setFill(LIGHT_BG);
      doc.roundedRect(x + 2, y, lineColW - 4, 70, 3, 3, 'F');
      setDraw([200, 200, 200]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x + 2, y, lineColW - 4, 70, 3, 3, 'S');
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

    // Inverter/panel info
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

  y += 80;

  // Card installment table (if available)
  if (selectedCard?.cardInstallments && Object.keys(selectedCard.cardInstallments).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(PRIMARY);
    doc.text('Parcelamento no Cartão de Crédito', M, y);
    y += 7;

    // Table header
    setFill(PRIMARY);
    doc.rect(M, y - 3, CW, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(WHITE);
    doc.text('Parcelas', M + 5, y + 2);
    doc.text('Total', M + CW * 0.5, y + 2, { align: 'center' });
    doc.text('Valor/Mês', M + CW - 5, y + 2, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const cardEntries = Object.entries(selectedCard.cardInstallments);
    cardEntries.forEach(([n, v]: [string, any], i: number) => {
      if (i % 2 === 0) {
        setFill([250, 250, 245]);
        doc.rect(M, y - 3, CW, 6.5, 'F');
      }
      setColor(DARK);
      doc.text(`${n}×`, M + 5, y + 1.5);
      doc.text(formatCurrency(v.total), M + CW * 0.5, y + 1.5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(v.perMonth), M + CW - 5, y + 1.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 6.5;
    });
  }

  drawFooter();

  // ═══════════════════════════════════════
  // PAGE 4: FINANCIAL RETURN
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Retorno Financeiro');
  y = 40;

  // Economy cards
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

  // KPI cards row
  const kpiData = [
    { label: 'Economia Mensal', value: formatCurrency(selectedCard?.dimensioning?.monthlySavings || 0), color: PRIMARY },
    { label: 'Payback', value: `${formatNumber(selectedCard?.dimensioning?.paybackYears || 0)} anos`, color: PRIMARY },
    { label: 'Retorno 25 anos', value: formatCurrency(selectedCard?.dimensioning?.return25 || 0), color: PRIMARY },
  ];

  const kpiW = CW / 3;
  kpiData.forEach((kpi, i) => {
    const kx = M + i * kpiW;
    setFill(LIGHT_BG);
    doc.roundedRect(kx + 2, y, kpiW - 4, 22, 2, 2, 'F');
    setFill(SECONDARY);
    doc.rect(kx + 2, y, kpiW - 4, 2, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(kpi.label, kx + kpiW / 2, y + 9, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    setColor(kpi.color);
    doc.text(kpi.value, kx + kpiW / 2, y + 18, { align: 'center' });
  });
  y += 30;

  // Savings cards - 2x2 grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(PRIMARY);
  doc.text('Sua economia com energia solar', M, y);
  y += 7;

  const savingsItems = [
    { years: 5, value: calcSavings(5), type: 'savings' as const },
    { years: 10, value: calcSavings(10), type: 'savings' as const },
    { years: 15, value: calcSavings(15), type: 'savings' as const },
  ];

  const cardW = CW / 3 - 2;
  savingsItems.forEach((item, i) => {
    const sx = M + i * (cardW + 3);
    setFill([240, 245, 235]);
    doc.roundedRect(sx, y, cardW, 24, 2, 2, 'F');
    setFill(PRIMARY);
    doc.rect(sx, y, 3, 24, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(`Economia em ${item.years} anos`, sx + 8, y + 8);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    doc.text(formatCurrency(item.value), sx + 8, y + 18);
  });
  y += 30;

  // "Without solar" cards
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(RED_SOFT);
  doc.text('Quanto você pagaria sem energia solar', M, y);
  y += 7;

  const noSolarItems = [
    { years: 5, value: calcWithout(5) },
    { years: 10, value: calcWithout(10) },
  ];
  const nCardW = CW / 2 - 3;
  noSolarItems.forEach((item, i) => {
    const nx = M + i * (nCardW + 6);
    setFill([255, 240, 240]);
    doc.roundedRect(nx, y, nCardW, 24, 2, 2, 'F');
    setFill(RED_SOFT);
    doc.rect(nx, y, 3, 24, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(GRAY);
    doc.text(`Sem solar em ${item.years} anos`, nx + 8, y + 8);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    setColor(RED_SOFT);
    doc.text(formatCurrency(item.value), nx + 8, y + 18);
  });
  y += 32;

  // Cash flow table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text('Fluxo de Caixa Comparativo (Acumulado)', M, y);
  y += 7;

  // Table header
  setFill(PRIMARY);
  doc.rect(M, y - 3, CW, 7, 'F');
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
      setFill([250, 250, 245]);
      doc.rect(M, y - 2.5, CW, 6, 'F');
    }
    setColor(DARK);
    doc.text(`Ano ${row.year}`, M + 5, y + 1);
    doc.text(formatCurrency(row.semSolar), M + CW * 0.35, y + 1, { align: 'right' });
    doc.text(formatCurrency(row.comSolar), M + CW * 0.60, y + 1, { align: 'right' });
    const eco = row.semSolar - row.comSolar;
    setColor(eco > 0 ? GREEN : RED_SOFT);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(eco), M + CW * 0.82, y + 1, { align: 'right' });
    doc.text(eco > 0 ? '✓' : '—', M + CW - 3, y + 1, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 6;
  });

  drawFooter();

  // ═══════════════════════════════════════
  // PAGE 5: PORTFOLIO PHOTOS
  // ═══════════════════════════════════════
  doc.addPage();
  drawPageHeader('Nossos Projetos');
  y = 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text('Soluções Residenciais | Rurais | Comerciais', W / 2, y, { align: 'center' });
  y += 8;

  // Try to load portfolio photos from DB
  let portfolioPhotos: string[] = [];
  try {
    const { data } = await supabase
      .from('fotos_portfolio')
      .select('url')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .limit(6);
    if (data && data.length > 0) {
      portfolioPhotos = data.map((f: any) => f.url);
    }
  } catch {}

  if (portfolioPhotos.length > 0) {
    // Load and add images in a grid
    const photoW = (CW - 6) / 3;
    const photoH = photoW * 0.7;

    for (let i = 0; i < Math.min(portfolioPhotos.length, 6); i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const px = M + col * (photoW + 3);
      const py = y + row * (photoH + 4);

      try {
        const imgResp = await fetch(portfolioPhotos[i]);
        const blob = await imgResp.blob();
        const imgData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        // Rounded border
        setFill([240, 240, 240]);
        doc.roundedRect(px, py, photoW, photoH, 2, 2, 'F');
        doc.addImage(imgData, 'JPEG', px + 0.5, py + 0.5, photoW - 1, photoH - 1);
      } catch {
        // Placeholder
        setFill([230, 230, 225]);
        doc.roundedRect(px, py, photoW, photoH, 2, 2, 'F');
        doc.setFontSize(7);
        setColor(GRAY);
        doc.text('Foto', px + photoW / 2, py + photoH / 2, { align: 'center' });
      }
    }

    y += Math.ceil(Math.min(portfolioPhotos.length, 6) / 3) * (photoH + 4) + 5;
  } else {
    // No photos available message
    y += 10;
    setFill(LIGHT_BG);
    doc.roundedRect(M, y, CW, 30, 3, 3, 'F');
    doc.setFontSize(10);
    setColor(GRAY);
    doc.text('Portfólio de obras disponível em nosso site e redes sociais.', W / 2, y + 16, { align: 'center' });
    y += 40;
  }

  // Company info section at bottom
  y = Math.max(y, H - 80);
  setFill(SECONDARY);
  doc.rect(M, y, CW, 1.5, 'F');
  y += 10;

  if (logoData) {
    try { doc.addImage(logoData, 'PNG', W / 2 - 25, y, 50, 26); } catch {}
  }
  y += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(PRIMARY);
  doc.text(settings.company.name, W / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(DARK);
  doc.text(settings.company.phone, W / 2, y, { align: 'center' });
  y += 5;
  doc.text(settings.company.email, W / 2, y, { align: 'center' });
  y += 5;
  doc.text(settings.company.site || 'www.treslagoassolar.com.br', W / 2, y, { align: 'center' });
  y += 5;
  doc.text('@treslagoassolar', W / 2, y, { align: 'center' });

  drawFooter();

  // ═══════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════
  const clientName = (proposal.clientData.name || 'Cliente').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  doc.save(`Proposta_${numero}_${clientName}.pdf`);
}
