import layoutMedicaoUrl from '@/assets/ficha/layout-medicao.png';

/**
 * Página "Layout — folha de medição e posicionamento", anexada como última
 * página da Ficha de Instalação.
 *
 * É a arte original aprovada (PNG A4, 200 dpi) — a única coisa escrita por
 * cima é o nome do cliente, na linha "CLIENTE". O resto da página (medidas
 * A–H, área de desenho, "FRENTE ↑") fica em branco pro instalador preencher.
 */

// Geometria da linha "CLIENTE" medida no PDF de origem (pontos; A4 = 595,28 × 841,89).
const PAGE_W_PT = 595.2756;
const LINHA_CLIENTE = { x0: 111, x1: 549, baseY: 135.2 };
const COR_TEXTO = '#2d3320'; // mesma cor do rótulo "CLIENTE"

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a página de layout'));
    img.src = src;
  });
}

/** Retorna a página pronta como data URL JPEG (A4 inteiro), com o nome do cliente escrito. */
export async function gerarPaginaLayoutFicha(clienteNome: string): Promise<string> {
  const img = await carregarImagem(layoutMedicaoUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.drawImage(img, 0, 0);

  const nome = clienteNome.trim();
  if (nome) {
    const k = canvas.width / PAGE_W_PT; // pixels por ponto
    const larguraMax = (LINHA_CLIENTE.x1 - LINHA_CLIENTE.x0) * k;
    let tamanho = 10.5 * k;
    const aplicarFonte = () => { ctx.font = `700 ${tamanho}px Helvetica, Arial, sans-serif`; };
    ctx.fillStyle = COR_TEXTO;
    ctx.textBaseline = 'alphabetic';
    aplicarFonte();
    // Nome longo: reduz a fonte até caber na linha (sem passar do limite direito).
    while (ctx.measureText(nome).width > larguraMax && tamanho > 6 * k) {
      tamanho -= 0.5;
      aplicarFonte();
    }
    ctx.fillText(nome, LINHA_CLIENTE.x0 * k, LINHA_CLIENTE.baseY * k);
  }

  return canvas.toDataURL('image/jpeg', 0.95);
}
