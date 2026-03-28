import jsPDF from 'jspdf';
import { formatCurrency, formatNumber } from '@/data/calculations';
import { LINE_NAMES, INSTALLMENT_OPTIONS } from '@/data/types';

const PRIMARY = [74, 90, 42]; // #4A5A2A
const SECONDARY = [232, 184, 75]; // #E8B84B
const WHITE = [255, 255, 255];
const DARK = [30, 30, 30];
const GRAY = [120, 120, 120];
const LIGHT_BG = [245, 245, 240];

export async function generateProposalPDF(proposal: any, settings: any, lineCards: any[], chartData: any[], cashflowData: any[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  const H = 297;
  const M = 15; // margin
  const CW = W - 2 * M; // content width

  const selectedCard = lineCards.find(c => c.line === proposal.selectedLine) || lineCards[0];
  const numero = proposal.numero_proposta || 'TLS-0000';

  // Helper functions
  const setColor = (rgb: number[]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb: number[]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);

  // ═══════════════════════════════════════
  // PAGE 1: COVER
  // ═══════════════════════════════════════
  setFill(PRIMARY);
  doc.rect(0, 0, W, H, 'F');

  // Gold accent bar
  setFill(SECONDARY);
  doc.rect(0, H * 0.38, W, 3, 'F');

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(SECONDARY);
  doc.text(settings.company.name.toUpperCase(), W / 2, 50, { align: 'center' });

  // Title
  doc.setFontSize(32);
  setColor(WHITE);
  doc.text('PROPOSTA', W / 2, 90, { align: 'center' });
  doc.setFontSize(24);
  doc.text('DE ENERGIA SOLAR', W / 2, 105, { align: 'center' });

  // Proposal number
  doc.setFontSize(16);
  setColor(SECONDARY);
  doc.text(numero, W / 2, 125, { align: 'center' });

  // Gold line
  setFill(SECONDARY);
  doc.rect(M + 40, 135, CW - 80, 0.5, 'F');

  // Client info
  let y = 155;
  doc.setFontSize(18);
  setColor(WHITE);
  doc.text(proposal.clientData.name, W / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(12);
  setColor([200, 200, 200]);
  doc.text(`${proposal.clientData.city} — ${proposal.clientData.state || 'MS'}`, W / 2, y, { align: 'center' });
  y += 8;
  doc.text(`${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh/mês`, W / 2, y, { align: 'center' });

  // Date
  y = H - 50;
  doc.setFontSize(10);
  setColor([180, 180, 180]);
  doc.text(`Gerada em ${new Date(proposal.createdAt).toLocaleDateString('pt-BR')}`, W / 2, y, { align: 'center' });
  y += 6;
  doc.text(`Válida por ${settings.proposalValidity || 15} dias`, W / 2, y, { align: 'center' });

  // Contact
  y += 12;
  doc.setFontSize(9);
  doc.text(`${settings.company.phone} • ${settings.company.email}`, W / 2, y, { align: 'center' });

  // ═══════════════════════════════════════
  // PAGE 2: SPECIFICATIONS
  // ═══════════════════════════════════════
  doc.addPage();
  y = M;

  // Header bar
  setFill(PRIMARY);
  doc.rect(0, 0, W, 25, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(WHITE);
  doc.text('ESPECIFICAÇÕES DO PROJETO', W / 2, 17, { align: 'center' });

  y = 35;

  // Selected line info
  setFill(LIGHT_BG);
  doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
  doc.setFontSize(12);
  setColor(PRIMARY);
  doc.text(`Linha ${LINE_NAMES[proposal.selectedLine] || proposal.selectedLine}`, M + 5, y + 8);
  y += 20;

  // Equipment specs table
  const specs = [
    ['Inversor', `${selectedCard?.inverter?.brand || '—'} ${selectedCard?.inverter?.model || ''}`],
    ['Potência Inversor', `${selectedCard?.inverter?.power || '—'} kW`],
    ['Placas Solares', `${selectedCard?.panelCount || 0}× ${selectedCard?.panel?.brand || ''} ${selectedCard?.panel?.power || ''}Wp`],
    ['Potência Total', `${formatNumber(selectedCard?.dimensioning?.powerKwp || 0)} kWp`],
    ['Geração Mensal', `${formatNumber(selectedCard?.dimensioning?.monthlyGeneration || 0, 0)} kWh`],
    ['Consumo Médio', `${formatNumber(selectedCard?.dimensioning?.avgMonthlyKwh || 0, 0)} kWh`],
    ['Excedente', `${formatNumber(selectedCard?.dimensioning?.surplus || 0, 0)} kWh`],
  ];

  doc.setFontSize(10);
  specs.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      setFill([250, 250, 245]);
      doc.rect(M, y - 4, CW, 10, 'F');
    }
    setColor(GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(label, M + 5, y + 2);
    setColor(DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, M + CW - 5, y + 2, { align: 'right' });
    y += 10;
  });

  // Monthly generation table
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(PRIMARY);
  doc.text('Geração Mensal Estimada (kWh)', M, y);
  y += 8;

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const colW = CW / 6;

  // Table header
  setFill(PRIMARY);
  doc.rect(M, y - 4, CW, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(WHITE);
  for (let i = 0; i < 6; i++) {
    doc.text(months[i], M + colW * i + colW / 2, y + 1, { align: 'center' });
  }
  y += 8;

  // Table row 1
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  for (let i = 0; i < 6; i++) {
    const val = chartData[i]?.['geração'] || 0;
    doc.text(String(val), M + colW * i + colW / 2, y + 1, { align: 'center' });
  }
  y += 8;

  // Table header row 2
  setFill(PRIMARY);
  doc.rect(M, y - 4, CW, 8, 'F');
  setColor(WHITE);
  doc.setFont('helvetica', 'bold');
  for (let i = 0; i < 6; i++) {
    doc.text(months[i + 6], M + colW * i + colW / 2, y + 1, { align: 'center' });
  }
  y += 8;

  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  for (let i = 0; i < 6; i++) {
    const val = chartData[i + 6]?.['geração'] || 0;
    doc.text(String(val), M + colW * i + colW / 2, y + 1, { align: 'center' });
  }

  // ═══════════════════════════════════════
  // PAGE 3: INVESTMENT
  // ═══════════════════════════════════════
  doc.addPage();

  setFill(PRIMARY);
  doc.rect(0, 0, W, 25, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(WHITE);
  doc.text('INVESTIMENTO', W / 2, 17, { align: 'center' });

  y = 40;

  // Price box
  setFill(LIGHT_BG);
  doc.roundedRect(M + 20, y, CW - 40, 30, 3, 3, 'F');
  setFill(SECONDARY);
  doc.rect(M + 20, y, CW - 40, 1, 'F');
  doc.setFontSize(22);
  setColor(PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(selectedCard?.totalPrice || 0), W / 2, y + 20, { align: 'center' });
  y += 40;

  // All 3 lines comparison
  doc.setFontSize(11);
  setColor(PRIMARY);
  doc.text('Comparativo de Linhas', M, y);
  y += 8;

  const lineColW = CW / 3;
  lineCards.forEach((card, i) => {
    const x = M + i * lineColW;
    const isSelected = card.line === proposal.selectedLine;
    setFill(isSelected ? PRIMARY : LIGHT_BG);
    doc.roundedRect(x + 2, y, lineColW - 4, 45, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    setColor(isSelected ? WHITE : PRIMARY);
    doc.text(LINE_NAMES[card.line] || card.line, x + lineColW / 2, y + 8, { align: 'center' });

    doc.setFontSize(12);
    doc.text(formatCurrency(card.totalPrice), x + lineColW / 2, y + 20, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    setColor(isSelected ? [220, 220, 220] : GRAY);
    doc.text(`${formatNumber(card.dimensioning.powerKwp)} kWp`, x + lineColW / 2, y + 28, { align: 'center' });
    doc.text(`${formatNumber(card.dimensioning.monthlyGeneration, 0)} kWh/mês`, x + lineColW / 2, y + 34, { align: 'center' });
    doc.text(`Payback: ${formatNumber(card.dimensioning.paybackYears)}a`, x + lineColW / 2, y + 40, { align: 'center' });
  });
  y += 55;

  // Financing table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(PRIMARY);
  doc.text('Parcelamento — Financiamento', M, y);
  y += 8;

  setFill(PRIMARY);
  doc.rect(M, y - 3, CW, 8, 'F');
  doc.setFontSize(9);
  setColor(WHITE);
  doc.text('Parcelas', M + 5, y + 2);
  doc.text('Valor Mensal', M + CW - 5, y + 2, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  INSTALLMENT_OPTIONS.forEach((n, i) => {
    if (i % 2 === 0) {
      setFill([250, 250, 245]);
      doc.rect(M, y - 3, CW, 8, 'F');
    }
    setColor(DARK);
    doc.text(`${n}×`, M + 5, y + 2);
    doc.text(formatCurrency(selectedCard?.installments?.[n] || 0), M + CW - 5, y + 2, { align: 'right' });
    y += 8;
  });

  if (proposal.cetApplied) {
    doc.setFontSize(8);
    setColor(GRAY);
    doc.text(`CET aplicada: ${proposal.cetApplied}% a.m.`, M, y + 3);
  }

  // ═══════════════════════════════════════
  // PAGE 4: FINANCIAL RETURN
  // ═══════════════════════════════════════
  doc.addPage();

  setFill(PRIMARY);
  doc.rect(0, 0, W, 25, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  setColor(WHITE);
  doc.text('RETORNO FINANCEIRO', W / 2, 17, { align: 'center' });

  y = 40;

  // KPIs
  const kpis = [
    { label: 'Economia Mensal', value: formatCurrency(selectedCard?.dimensioning?.monthlySavings || 0) },
    { label: 'Payback', value: `${formatNumber(selectedCard?.dimensioning?.paybackYears || 0)} anos` },
    { label: 'Retorno 25 anos', value: formatCurrency(selectedCard?.dimensioning?.return25 || 0) },
  ];

  const kpiW = CW / 3;
  kpis.forEach((kpi, i) => {
    const x = M + i * kpiW;
    setFill(LIGHT_BG);
    doc.roundedRect(x + 2, y, kpiW - 4, 28, 2, 2, 'F');
    doc.setFontSize(8);
    setColor(GRAY);
    doc.text(kpi.label, x + kpiW / 2, y + 8, { align: 'center' });
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    setColor(PRIMARY);
    doc.text(kpi.value, x + kpiW / 2, y + 21, { align: 'center' });
  });
  y += 38;

  // Cashflow table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  setColor(PRIMARY);
  doc.text('Fluxo de Caixa Comparativo', M, y);
  y += 8;

  setFill(PRIMARY);
  doc.rect(M, y - 3, CW, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(WHITE);
  doc.text('Ano', M + 5, y + 2);
  doc.text('Sem Solar', M + CW * 0.45, y + 2, { align: 'right' });
  doc.text('Com Solar', M + CW * 0.72, y + 2, { align: 'right' });
  doc.text('Economia', M + CW - 5, y + 2, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  const cfSlice = cashflowData.filter((_, i) => i % 5 === 0 || i === cashflowData.length - 1);
  cfSlice.forEach((row, i) => {
    if (i % 2 === 0) {
      setFill([250, 250, 245]);
      doc.rect(M, y - 3, CW, 8, 'F');
    }
    setColor(DARK);
    doc.text(`${row.year}`, M + 5, y + 2);
    doc.text(formatCurrency(row.semSolar), M + CW * 0.45, y + 2, { align: 'right' });
    doc.text(formatCurrency(row.comSolar), M + CW * 0.72, y + 2, { align: 'right' });
    const economia = row.semSolar - row.comSolar;
    setColor(economia > 0 ? [0, 128, 0] : [200, 0, 0]);
    doc.text(formatCurrency(economia), M + CW - 5, y + 2, { align: 'right' });
    y += 8;
  });

  // Footer
  y = H - 30;
  setFill(SECONDARY);
  doc.rect(M, y, CW, 0.5, 'F');
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(GRAY);
  doc.text(`${settings.company.name} • ${settings.company.phone} • ${settings.company.email}`, W / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Proposta ${numero} • Válida por ${settings.proposalValidity || 15} dias`, W / 2, y, { align: 'center' });

  // ═══════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════
  const clientName = (proposal.clientData.name || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Proposta_${numero}_${clientName}.pdf`);
}
