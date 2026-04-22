import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';
import type { PropostaTemplateData } from '@/components/PropostaTemplatePages';
import { FALLBACK_PHOTOS } from '@/components/ProposalPortfolio';

/**
 * Gera PDF A4 (4 páginas) a partir do componente <PropostaTemplatePages />.
 * Foco em leveza: scale 1.5, JPEG q70 → alvo ~600 KB-1 MB.
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
  const pageWmm = pdf.internal.pageSize.getWidth();
  const pageHmm = pdf.internal.pageSize.getHeight();

  // Espera fontes/imagens
  await new Promise((r) => setTimeout(r, 150));
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
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: el.offsetWidth,
      windowHeight: el.offsetHeight,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.7);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWmm, pageHmm, undefined, 'FAST');
  }

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

/**
 * Carrega URL → canvas redimensionado → dataURL JPEG (leve).
 * Usado para otimizar fotos do portfólio antes de renderizar no template.
 */
async function optimizeImage(url: string, maxSide = 400, quality = 0.55): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Crop quadrado central para evitar imagens esticadas/comprimidas (cover behavior)
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const out = Math.min(maxSide, side);
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(url);
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
      try {
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(url); // CORS falhou → mantém URL original
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

/**
 * Busca até 16 fotos do portfólio (Supabase ou fallback) e retorna
 * thumbnails 400×400 q55 em data-URL.
 */
export async function fetchPortfolioPhotosOptimized(): Promise<string[]> {
  let urls: string[] = [];
  try {
    const { data } = await supabase
      .from('fotos_portfolio')
      .select('url')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .limit(16);
    if (data && data.length > 0) urls = data.map((d) => d.url);
  } catch {
    // ignore
  }
  if (urls.length === 0) urls = [...FALLBACK_PHOTOS];
  urls = urls.slice(0, 16);

  const optimized = await Promise.all(urls.map((u) => optimizeImage(u, 400, 0.55)));
  return optimized.filter(Boolean);
}
