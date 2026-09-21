import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

export async function gerarPropostaHibridaPDF(pagesContainer: HTMLElement, cliente: string, numero: string | null): Promise<Blob> {
  const pageEls = Array.from(pagesContainer.children) as HTMLElement[];
  if (pageEls.length === 0) throw new Error('Nenhuma página para capturar');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWmm = pdf.internal.pageSize.getWidth();
  const pageHmm = pdf.internal.pageSize.getHeight();

  try {
    await document.fonts.load('600 16px "Bricolage Grotesque"');
    await document.fonts.load('400 16px "Bricolage Grotesque"');
    await document.fonts.load('400 16px Inter');
    await document.fonts.load('600 16px Inter');
    await document.fonts.load('700 16px Inter');
    await document.fonts.ready;
  } catch { /* segue mesmo se alguma fonte falhar */ }
  await new Promise((r) => setTimeout(r, 150));
  const imgs = pagesContainer.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map((img) =>
    (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0
      ? Promise.resolve()
      : new Promise<void>((res) => { img.addEventListener('load', () => res()); img.addEventListener('error', () => res()); })
  ));

  for (let i = 0; i < pageEls.length; i++) {
    const el = pageEls[i];
    const canvas = await html2canvas(el, {
      scale: 1.5, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
      logging: false, windowWidth: el.offsetWidth, windowHeight: el.offsetHeight,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.7);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWmm, pageHmm, undefined, 'FAST');
  }

  pdf.setProperties({
    title: `Proposta Híbrida ${numero || ''} - ${cliente}`,
    subject: 'Proposta Comercial Energia Solar Híbrida',
    author: 'Três Lagoas Solar',
    creator: 'Três Lagoas Solar',
  });

  const arrayBuffer = pdf.output('arraybuffer');
  return new Blob([arrayBuffer], { type: 'application/pdf' });
}

function sanitizeFilename(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').substring(0, 60);
}

export function downloadPropostaHibridaPDF(blob: Blob, cliente: string): void {
  saveAs(blob, `${sanitizeFilename(cliente || 'Cliente')}_Hibrido.pdf`);
}
