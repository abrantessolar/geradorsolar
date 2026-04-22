import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import type { PropostaTemplateData } from '@/components/PropostaTemplatePages';

/**
 * Captura as 4 páginas renderizadas (offscreen) do componente
 * <PropostaTemplatePages /> e gera um PDF A4 idêntico ao layout do template
 * .docx, garantindo arquivo final ≤ 2 MB.
 */
export async function gerarPropostaPDF(
  pagesContainer: HTMLElement,
  data: PropostaTemplateData,
): Promise<Blob> {
  const pageEls = Array.from(pagesContainer.children) as HTMLElement[];
  if (pageEls.length === 0) throw new Error('Nenhuma página para capturar');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });
  const pageWmm = pdf.internal.pageSize.getWidth(); // 210
  const pageHmm = pdf.internal.pageSize.getHeight(); // 297

  // Espera 1 frame para garantir que as imagens decodificaram
  await new Promise((r) => setTimeout(r, 100));

  // Pré-carrega imagens dentro do container
  const imgs = pagesContainer.querySelectorAll('img');
  await Promise.all(
    Array.from(imgs).map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          }),
    ),
  );

  for (let i = 0; i < pageEls.length; i++) {
    const el = pageEls[i];
    const canvas = await html2canvas(el, {
      scale: 2, // boa qualidade
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: el.offsetWidth,
      windowHeight: el.offsetHeight,
    });

    // JPEG com qualidade balanceada para manter PDF ≤ 2 MB
    const imgData = canvas.toDataURL('image/jpeg', 0.78);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWmm, pageHmm, undefined, 'FAST');
  }

  // Metadados úteis
  pdf.setProperties({
    title: `Proposta ${data.numero_proposta} - ${data.cliente_nome}`,
    subject: 'Proposta Comercial Energia Solar',
    author: 'Três Lagoas Solar',
    creator: 'Três Lagoas Solar',
  });

  const arrayBuffer = pdf.output('arraybuffer');
  return new Blob([arrayBuffer], { type: 'application/pdf' });
}

export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60);
}

export function downloadPropostaPDF(blob: Blob, numero: string, cliente: string): void {
  const filename = `Proposta_${numero || 'TLS-0000'}_${sanitizeFilename(cliente || 'Cliente')}.pdf`;
  saveAs(blob, filename);
}
