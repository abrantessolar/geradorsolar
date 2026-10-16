// Sugestão de vínculo usina ↔ cliente por similaridade de texto (nome,
// cidade/endereço). Sem dependência externa — Levenshtein simples é
// suficiente pro volume de usinas/clientes esperado aqui.

export function normalizar(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // remoção
        curr[j - 1] + 1, // inserção
        prev[j - 1] + custo // substituição
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** 0 (nada a ver) a 1 (idêntico), por distância de edição normalizada. */
function similaridadeTexto(a: string, b: string): number {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maior = Math.max(na.length, nb.length);
  return 1 - dist / maior;
}

export interface CandidatoVinculo<T> {
  item: T;
  pontuacao: number; // 0 a 1
}

/**
 * Ordena uma lista de clientes por quão parecido o nome/endereço deles é
 * com o nome da usina e a cidade cadastrada. Pontuação é só uma sugestão —
 * a confirmação final é sempre manual (ver seção 3.3 da spec).
 */
export function sugerirClientes<T extends { nome_completo: string | null; endereco: string | null }>(
  candidatos: T[],
  referencia: { nomeUsina?: string | null; cidade?: string | null }
): CandidatoVinculo<T>[] {
  const alvoNome = referencia.nomeUsina ?? '';
  const alvoCidade = referencia.cidade ?? '';

  return candidatos
    .map((item) => {
      const pontuacaoNome = similaridadeTexto(alvoNome, item.nome_completo ?? '');
      const pontuacaoCidade = alvoCidade
        ? similaridadeTexto(alvoCidade, item.endereco ?? '')
        : 0;
      // Nome pesa mais que cidade — cidade é só um reforço.
      const pontuacao = pontuacaoNome * 0.75 + pontuacaoCidade * 0.25;
      return { item, pontuacao };
    })
    .sort((a, b) => b.pontuacao - a.pontuacao);
}
