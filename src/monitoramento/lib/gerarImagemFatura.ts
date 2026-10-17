import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

// Captura a arte (ArteFatura.tsx) renderizada fora da tela e baixa como
// PNG — mesmo padrão de html2canvas já usado nos outros geradores do
// site (generatePropostaPlacaPDF.ts etc.), só que aqui o resultado final
// é a própria imagem, não um PDF.
export async function gerarEBaixarImagemFatura(el: HTMLElement, nomeArquivo: string): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    /* segue mesmo se falhar */
  }
  await new Promise((r) => setTimeout(r, 100));

  const canvas = await html2canvas(el, {
    scale: 1.5,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#f7f6f3',
    logging: false,
    windowWidth: el.offsetWidth,
    windowHeight: el.offsetHeight,
  });

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem'))), 'image/png', 1);
  });

  saveAs(blob, `${sanitizeFilename(nomeArquivo)}.png`);
}

function sanitizeFilename(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 80);
}
