// Calculadora de Antecipação de Recebíveis
//
// Motor de cálculo puro (sem React) para a ferramenta de antecipação de
// recebíveis (boletos/duplicatas). Implementa:
//  - calendário de feriados bancários brasileiros (fixos + móveis + custom)
//  - ajuste de dia útil (vencimento nominal -> data financeira)
//  - desconto comercial composto (fórmula validada Sicoob)
//  - IOF sobre a base pós-juros, com modos AUTO/SIMPLES_REDUZIDO/PJ_NORMAL/PERSONALIZADO
//  - tabela de taxas por faixa de volume antecipado, com override manual
//  - solver reverso (Modo A: líquido desejado -> valor mínimo a cobrar)
//
// Dinheiro é tratado em CENTAVOS (inteiros) em toda a parte "estrutural"
// (somas, distribuição de parcelas, comparação com a meta) para nunca perder
// um centavo de precisão. Os fatores de juros/IOF usam ponto flutuante
// (são exponenciais por natureza), mas o resultado de cada parcela é
// arredondado para centavos antes de entrar em qualquer soma subsequente.

export type Periodicidade = "avista" | "semanal" | "quinzenal" | "mensal" | "personalizado";

export type IofMode = "AUTO" | "SIMPLES_REDUZIDO" | "PJ_NORMAL" | "PERSONALIZADO";

export interface FaixaTaxa {
  /** Limite superior da faixa, em reais. Use Infinity para a última faixa. */
  ateReais: number;
  /** Taxa mensal em % (ex.: 2.69 para 2,69% a.m.) */
  taxaMensalPct: number;
}

/** Tabela padrão de taxas de antecipação por volume antecipado (a.m.). */
export const TABELA_TAXAS_PADRAO: FaixaTaxa[] = [
  { ateReais: 50_000, taxaMensalPct: 2.69 },
  { ateReais: 150_000, taxaMensalPct: 2.45 },
  { ateReais: 350_000, taxaMensalPct: 2.15 },
  { ateReais: 500_000, taxaMensalPct: 1.99 },
  { ateReais: Infinity, taxaMensalPct: 1.90 },
];

export interface ConfigAntecipacao {
  tabelaTaxas: FaixaTaxa[];
  /** Taxa mensal manual (%) que, se definida, sobrepõe a tabela por faixa. */
  taxaManualPct?: number | null;
  tacReais: number;
  iofMode: IofMode;
  /** Alíquota adicional do IOF (%) — padrão 0,38%. */
  iofAdicionalPct: number;
  /** Usado só em iofMode === 'PERSONALIZADO': alíquota diária (%) manual. */
  iofDiariaPersonalizadaPct?: number;
  /** Empresa é Simples Nacional? (usado no modo AUTO) */
  simplesNacional: boolean;
  /** Limite (em reais) de operação para elegibilidade à alíquota diária reduzida no modo AUTO. */
  limiteSimplesReais: number;
  /** Feriados locais/customizados (datas ISO yyyy-MM-dd), além do calendário nacional. */
  feriadosCustom: string[];
  /** Outras taxas fixas (R$) descontadas do líquido total, além da TAC. */
  outrasTaxasReais: number;
  /** Limite de dias por título (condição do banco) — alerta se D > isso. */
  limiteDiasTitulo: number;
}

export const CONFIG_PADRAO: ConfigAntecipacao = {
  tabelaTaxas: TABELA_TAXAS_PADRAO,
  taxaManualPct: null,
  tacReais: 150,
  iofMode: "AUTO",
  iofAdicionalPct: 0.38,
  iofDiariaPersonalizadaPct: undefined,
  simplesNacional: true,
  limiteSimplesReais: 30_000,
  feriadosCustom: [],
  outrasTaxasReais: 0,
  limiteDiasTitulo: 180,
};

const IOF_DIARIA_REDUZIDA_PCT = 0.00274;
const IOF_DIARIA_NORMAL_PCT = 0.0082;

export interface ParcelaInput {
  id: string;
  /** Valor nominal da parcela, em CENTAVOS. */
  valorCents: number;
  /** Vencimento nominal (o que o cliente vê), ISO yyyy-MM-dd. */
  vencimentoNominal: string;
  /** Se true, esta parcela é antecipada no banco (gera juros/IOF e entra no volume da faixa). */
  antecipar: boolean;
  /** Rótulo opcional (ex.: "à vista", "30 dias"). */
  rotulo?: string;
}

export interface ParcelaResultado extends ParcelaInput {
  dataFinanceira: string;
  dias: number;
  taxaMensalPct: number;
  jurosCents: number;
  iofCents: number;
  liquidoCents: number;
  alertaLimiteDias: boolean;
}

export interface ResultadoOperacao {
  parcelas: ParcelaResultado[];
  volumeAntecipadoCents: number;
  taxaMensalPct: number;
  faixaOrigem: "manual" | "tabela";
  iofAdicionalPctUsado: number;
  iofDiariaPctUsado: number;
  iofEhReduzido: boolean;
  tacCents: number;
  outrasTaxasCents: number;
  totalBrutoCents: number;
  totalJurosCents: number;
  totalIofCents: number;
  totalLiquidoCents: number;
  haAlgumaAntecipada: boolean;
  algumaExcedeuLimiteDias: boolean;
}

// ---------------------------------------------------------------------------
// Dinheiro / arredondamento
// ---------------------------------------------------------------------------

export function reaisParaCents(reais: number): number {
  return Math.round(reais * 100);
}

export function centsParaReais(cents: number): number {
  return cents / 100;
}

export function formatBRL(cents: number): string {
  return centsParaReais(cents).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Converte string de input (ex.: "1.234,56") em centavos. */
export function parseMoedaBR(texto: string): number {
  if (!texto) return 0;
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

// ---------------------------------------------------------------------------
// Datas / dias úteis / feriados bancários
// ---------------------------------------------------------------------------

function toISO(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Parse de uma data ISO (yyyy-MM-dd) em UTC, para evitar deslocamento por timezone. */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISO(date: Date): string {
  return toISO(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDiasISO(iso: string, dias: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return formatISO(d);
}

/** Soma meses respeitando fim de mês (ex.: 31/01 + 1 mês = 28 ou 29/02). */
export function addMesesISO(iso: string, meses: number): string {
  const d = parseISO(iso);
  const diaOriginal = d.getUTCDate();
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
  const ultimoDiaDoMesAlvo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(diaOriginal, ultimoDiaDoMesAlvo));
  return formatISO(alvo);
}

export function diferencaDias(isoInicio: string, isoFim: string): number {
  const a = parseISO(isoInicio).getTime();
  const b = parseISO(isoFim).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Domingo de Páscoa (algoritmo de Gauss/Meeus) para a data informada. */
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const feriadosCache = new Map<number, Set<string>>();

/** Feriados nacionais (bancários) do ano, incluindo móveis baseados na Páscoa. */
function feriadosNacionais(ano: number): Set<string> {
  const cached = feriadosCache.get(ano);
  if (cached) return cached;
  const p = pascoa(ano);
  const addDays = (base: Date, n: number) => {
    const d = new Date(base.getTime());
    d.setUTCDate(d.getUTCDate() + n);
    return formatISO(d);
  };
  const set = new Set<string>([
    toISO(ano, 1, 1), // Confraternização Universal
    addDays(p, -48), // Carnaval (segunda)
    addDays(p, -47), // Carnaval (terça)
    addDays(p, -2), // Sexta-feira Santa
    addDays(p, 60), // Corpus Christi
    toISO(ano, 4, 21), // Tiradentes
    toISO(ano, 5, 1), // Dia do Trabalho
    toISO(ano, 9, 7), // Independência
    toISO(ano, 10, 12), // Nossa Sr.ª Aparecida
    toISO(ano, 11, 2), // Finados
    toISO(ano, 11, 15), // Proclamação da República
    toISO(ano, 11, 20), // Consciência Negra (feriado nacional desde a Lei 14.759/2023)
    toISO(ano, 12, 25), // Natal
  ]);
  feriadosCache.set(ano, set);
  return set;
}

export function ehFeriado(iso: string, feriadosCustom: string[] = []): boolean {
  const ano = parseISO(iso).getUTCFullYear();
  if (feriadosNacionais(ano).has(iso)) return true;
  if (feriadosCustom.includes(iso)) return true;
  return false;
}

export function ehFimDeSemana(iso: string): boolean {
  const dow = parseISO(iso).getUTCDay(); // 0 = domingo, 6 = sábado
  return dow === 0 || dow === 6;
}

export function ehDiaUtil(iso: string, feriadosCustom: string[] = []): boolean {
  return !ehFimDeSemana(iso) && !ehFeriado(iso, feriadosCustom);
}

/** Próximo dia útil (bancário) a partir da data informada (retorna a própria data se já for útil). */
export function proximoDiaUtil(iso: string, feriadosCustom: string[] = []): string {
  let cur = iso;
  while (!ehDiaUtil(cur, feriadosCustom)) {
    cur = addDiasISO(cur, 1);
  }
  return cur;
}

// ---------------------------------------------------------------------------
// Geração de parcelas (datas automáticas por periodicidade)
// ---------------------------------------------------------------------------

export interface GerarParcelasOpts {
  dataOperacao: string;
  numParcelas: number;
  periodicidade: Periodicidade;
  /** Se true, a 1ª parcela é "à vista" (vencimento = data da operação, sem antecipação). */
  incluirAVista: boolean;
  valorTotalCents: number;
}

export function gerarParcelas(opts: GerarParcelasOpts): ParcelaInput[] {
  const { dataOperacao, numParcelas, periodicidade, incluirAVista, valorTotalCents } = opts;
  const n = Math.max(1, numParcelas);
  const pesos = Array.from({ length: n }, () => 1);
  const valores = distribuirPorPeso(valorTotalCents, pesos);

  const parcelas: ParcelaInput[] = [];
  for (let i = 0; i < n; i++) {
    const ehAVista = incluirAVista && i === 0;
    let vencimento: string;
    if (ehAVista) {
      vencimento = dataOperacao;
    } else {
      const indiceRecorrencia = incluirAVista ? i : i + 1;
      vencimento = calcularVencimentoPorPeriodicidade(dataOperacao, periodicidade, indiceRecorrencia);
    }
    parcelas.push({
      id: `p${i + 1}`,
      valorCents: valores[i],
      vencimentoNominal: vencimento,
      antecipar: !ehAVista,
      rotulo: ehAVista ? "à vista" : undefined,
    });
  }
  return parcelas;
}

function calcularVencimentoPorPeriodicidade(dataOperacao: string, periodicidade: Periodicidade, indice: number): string {
  switch (periodicidade) {
    case "semanal":
      return addDiasISO(dataOperacao, 7 * indice);
    case "quinzenal":
      return addDiasISO(dataOperacao, 15 * indice);
    case "mensal":
      return addMesesISO(dataOperacao, indice);
    case "avista":
      return dataOperacao;
    case "personalizado":
    default:
      // Sem padrão definido — cai para mensal como ponto de partida editável.
      return addMesesISO(dataOperacao, indice);
  }
}

/** Distribui um total em centavos por pesos, garantindo soma exata (resto na última entrada). */
export function distribuirPorPeso(totalCents: number, pesos: number[]): number[] {
  const somaPesos = pesos.reduce((a, b) => a + b, 0) || 1;
  const valores = pesos.map(p => Math.floor((totalCents * p) / somaPesos));
  const somaAtual = valores.reduce((a, b) => a + b, 0);
  const resto = totalCents - somaAtual;
  if (valores.length > 0) valores[valores.length - 1] += resto;
  return valores;
}

// ---------------------------------------------------------------------------
// Taxa por faixa de volume antecipado
// ---------------------------------------------------------------------------

export function taxaPorFaixa(volumeAntecipadoCents: number, tabela: FaixaTaxa[]): number {
  const reais = centsParaReais(volumeAntecipadoCents);
  const ordenada = [...tabela].sort((a, b) => a.ateReais - b.ateReais);
  for (const faixa of ordenada) {
    if (reais <= faixa.ateReais) return faixa.taxaMensalPct;
  }
  return ordenada[ordenada.length - 1]?.taxaMensalPct ?? 0;
}

// ---------------------------------------------------------------------------
// Fórmulas financeiras (juros / IOF)
// ---------------------------------------------------------------------------

/**
 * Desconto comercial composto (fórmula validada Sicoob):
 *   juros = valorNominal * [1 - (1 - r)^(D/30)]
 * r = taxa mensal (decimal, ex.: 0.0269). D = dias corridos até a data financeira.
 * Retorna em CENTAVOS, arredondado.
 */
export function calcularJurosCents(valorNominalCents: number, taxaMensalPct: number, dias: number): number {
  if (dias <= 0) return 0;
  const r = taxaMensalPct / 100;
  const fator = 1 - Math.pow(1 - r, dias / 30);
  return Math.round(valorNominalCents * fator);
}

/**
 * IOF sobre a base pós-juros:
 *   baseIOF = valorNominal - juros
 *   IOF = baseIOF * (aliquotaAdicional + aliquotaDiaria * min(D, 365))
 * Retorna em CENTAVOS, arredondado.
 */
export function calcularIofCents(
  valorNominalCents: number,
  jurosCents: number,
  iofAdicionalPct: number,
  iofDiariaPct: number,
  dias: number
): number {
  const baseIofCents = valorNominalCents - jurosCents;
  const diasLimitados = Math.min(Math.max(dias, 0), 365);
  const fator = iofAdicionalPct / 100 + (iofDiariaPct / 100) * diasLimitados;
  return Math.round(baseIofCents * fator);
}

function resolverIof(config: ConfigAntecipacao, totalOperacaoCents: number): { adicionalPct: number; diariaPct: number; reduzido: boolean } {
  if (config.iofMode === "PERSONALIZADO") {
    return {
      adicionalPct: config.iofAdicionalPct,
      diariaPct: config.iofDiariaPersonalizadaPct ?? IOF_DIARIA_NORMAL_PCT,
      reduzido: (config.iofDiariaPersonalizadaPct ?? IOF_DIARIA_NORMAL_PCT) <= IOF_DIARIA_REDUZIDA_PCT,
    };
  }
  if (config.iofMode === "SIMPLES_REDUZIDO") {
    return { adicionalPct: config.iofAdicionalPct, diariaPct: IOF_DIARIA_REDUZIDA_PCT, reduzido: true };
  }
  if (config.iofMode === "PJ_NORMAL") {
    return { adicionalPct: config.iofAdicionalPct, diariaPct: IOF_DIARIA_NORMAL_PCT, reduzido: false };
  }
  // AUTO
  const elegivel = config.simplesNacional && centsParaReais(totalOperacaoCents) <= config.limiteSimplesReais;
  return {
    adicionalPct: config.iofAdicionalPct,
    diariaPct: elegivel ? IOF_DIARIA_REDUZIDA_PCT : IOF_DIARIA_NORMAL_PCT,
    reduzido: elegivel,
  };
}

// ---------------------------------------------------------------------------
// Cálculo da operação completa
// ---------------------------------------------------------------------------

export function calcularOperacao(
  parcelas: ParcelaInput[],
  dataOperacao: string,
  config: ConfigAntecipacao = CONFIG_PADRAO
): ResultadoOperacao {
  const totalBrutoCents = parcelas.reduce((a, p) => a + p.valorCents, 0);
  const volumeAntecipadoCents = parcelas.filter(p => p.antecipar).reduce((a, p) => a + p.valorCents, 0);
  const haAlgumaAntecipada = parcelas.some(p => p.antecipar);

  const faixaOrigem: "manual" | "tabela" = config.taxaManualPct != null ? "manual" : "tabela";
  const taxaMensalPct = config.taxaManualPct != null ? config.taxaManualPct : taxaPorFaixa(volumeAntecipadoCents, config.tabelaTaxas);

  const iofResolvido = resolverIof(config, totalBrutoCents);

  const parcelasResultado: ParcelaResultado[] = parcelas.map(p => {
    const dataFinanceira = proximoDiaUtil(p.vencimentoNominal, config.feriadosCustom);
    const dias = Math.max(0, diferencaDias(dataOperacao, dataFinanceira));
    const alertaLimiteDias = p.antecipar && dias > config.limiteDiasTitulo;

    let jurosCents = 0;
    let iofCents = 0;
    let liquidoCents = p.valorCents;

    if (p.antecipar) {
      jurosCents = calcularJurosCents(p.valorCents, taxaMensalPct, dias);
      iofCents = calcularIofCents(p.valorCents, jurosCents, iofResolvido.adicionalPct, iofResolvido.diariaPct, dias);
      liquidoCents = p.valorCents - jurosCents - iofCents;
    }

    return {
      ...p,
      dataFinanceira,
      dias,
      taxaMensalPct,
      jurosCents,
      iofCents,
      liquidoCents,
      alertaLimiteDias,
    };
  });

  const tacCents = haAlgumaAntecipada ? reaisParaCents(config.tacReais) : 0;
  const outrasTaxasCents = reaisParaCents(config.outrasTaxasReais);
  const totalJurosCents = parcelasResultado.reduce((a, p) => a + p.jurosCents, 0);
  const totalIofCents = parcelasResultado.reduce((a, p) => a + p.iofCents, 0);
  const totalLiquidoBrutoParcelas = parcelasResultado.reduce((a, p) => a + p.liquidoCents, 0);
  const totalLiquidoCents = totalLiquidoBrutoParcelas - tacCents - outrasTaxasCents;

  return {
    parcelas: parcelasResultado,
    volumeAntecipadoCents,
    taxaMensalPct,
    faixaOrigem,
    iofAdicionalPctUsado: iofResolvido.adicionalPct,
    iofDiariaPctUsado: iofResolvido.diariaPct,
    iofEhReduzido: iofResolvido.reduzido,
    tacCents,
    outrasTaxasCents,
    totalBrutoCents,
    totalJurosCents,
    totalIofCents,
    totalLiquidoCents,
    haAlgumaAntecipada,
    algumaExcedeuLimiteDias: parcelasResultado.some(p => p.alertaLimiteDias),
  };
}

// ---------------------------------------------------------------------------
// Modo A — solver reverso: líquido desejado -> valor mínimo a cobrar
// ---------------------------------------------------------------------------

export interface SolverOpts {
  /** Pesos relativos de cada parcela (ex.: [1,1,1,1] para parcelas iguais). */
  pesos: number[];
  datasVencimento: string[];
  antecipar: boolean[];
  rotulos?: string[];
  dataOperacao: string;
  config: ConfigAntecipacao;
  /** Líquido desejado, em centavos. */
  liquidoDesejadoCents: number;
  /** Margem de segurança fixa (R$), somada ao mínimo calculado. */
  margemFixaReais?: number;
  /** Margem de segurança percentual (%), aplicada sobre o mínimo calculado. */
  margemPercentual?: number;
}

export interface SolverResultado {
  valorMinimoCents: number;
  valorSugeridoCents: number;
  resultadoMinimo: ResultadoOperacao;
  resultadoSugerido: ResultadoOperacao;
  iteracoes: number;
}

function montarParcelasParaValor(opts: SolverOpts, totalCents: number): ParcelaInput[] {
  const valores = distribuirPorPeso(totalCents, opts.pesos);
  return valores.map((v, i) => ({
    id: `p${i + 1}`,
    valorCents: v,
    vencimentoNominal: opts.datasVencimento[i],
    antecipar: opts.antecipar[i],
    rotulo: opts.rotulos?.[i],
  }));
}

/**
 * Busca o menor valor bruto (em centavos) tal que o líquido resultante da
 * operação seja >= liquidoDesejadoCents. A função líquido(G) é monotônica
 * não-decrescente em G (taxas mais baratas em faixas maiores nunca reduzem
 * o líquido), então busca binária encontra o mínimo com segurança; o passo
 * final faz um ajuste fino de 1 centavo por vez para garantir a garantia
 * "nunca cobrar 1 centavo de menos".
 */
export function resolverValorMinimo(opts: SolverOpts): SolverResultado {
  const liquidoParaTotal = (totalCents: number) =>
    calcularOperacao(montarParcelasParaValor(opts, totalCents), opts.dataOperacao, opts.config).totalLiquidoCents;

  let iteracoes = 0;
  const alvo = opts.liquidoDesejadoCents;

  // Caso degenerado: alvo <= 0.
  if (alvo <= 0) {
    const vazio = calcularOperacao(montarParcelasParaValor(opts, 0), opts.dataOperacao, opts.config);
    return { valorMinimoCents: 0, valorSugeridoCents: 0, resultadoMinimo: vazio, resultadoSugerido: vazio, iteracoes: 0 };
  }

  // 1. Expande o limite superior até o líquido alcançar o alvo.
  let hi = Math.max(alvo, 100);
  iteracoes++;
  while (liquidoParaTotal(hi) < alvo) {
    hi *= 2;
    iteracoes++;
    if (hi > alvo * 100 + 1_000_000_000) break; // guarda de segurança
  }

  // 2. Busca binária pelo menor G com líquido(G) >= alvo.
  let lo = 0;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    iteracoes++;
    if (liquidoParaTotal(mid) >= alvo) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  // 3. Ajuste fino: garante que o líquido real bate (nunca entrega menos que o alvo).
  let valorMinimoCents = hi;
  let guard = 0;
  while (liquidoParaTotal(valorMinimoCents) < alvo && guard < 1000) {
    valorMinimoCents += 1;
    guard++;
    iteracoes++;
  }

  const resultadoMinimo = calcularOperacao(montarParcelasParaValor(opts, valorMinimoCents), opts.dataOperacao, opts.config);

  // 4. Margem de segurança (opcional), aplicada sobre o mínimo.
  let valorSugeridoCents = valorMinimoCents;
  if (opts.margemPercentual && opts.margemPercentual > 0) {
    valorSugeridoCents = Math.round(valorSugeridoCents * (1 + opts.margemPercentual / 100));
  }
  if (opts.margemFixaReais && opts.margemFixaReais > 0) {
    valorSugeridoCents += reaisParaCents(opts.margemFixaReais);
  }
  const resultadoSugerido =
    valorSugeridoCents === valorMinimoCents
      ? resultadoMinimo
      : calcularOperacao(montarParcelasParaValor(opts, valorSugeridoCents), opts.dataOperacao, opts.config);

  return { valorMinimoCents, valorSugeridoCents, resultadoMinimo, resultadoSugerido, iteracoes };
}

// ---------------------------------------------------------------------------
// Texto para o cliente
// ---------------------------------------------------------------------------

export function formatDataBR(iso: string): string {
  const d = parseISO(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export interface GerarPropostaOpts {
  resultado: ResultadoOperacao;
  dataOperacao: string;
  mostrarDetalhesFinanceiros?: boolean;
}

/**
 * Gera o texto para enviar ao cliente final. Por padrão NÃO menciona juros,
 * IOF, TAC ou antecipação — lista apenas os valores e vencimentos das
 * parcelas, exatamente como o cliente deve pagar.
 */
export function gerarPropostaCliente(opts: GerarPropostaOpts): string {
  const { resultado, mostrarDetalhesFinanceiros } = opts;
  const total = formatBRL(resultado.totalBrutoCents);
  const n = resultado.parcelas.length;

  const linhas = resultado.parcelas.map((p, idx) => {
    const ordinal = `${idx + 1}ª parcela`;
    const quando = p.rotulo === "à vista" ? "à vista" : `${formatDataBR(p.vencimentoNominal)}`;
    return `${ordinal}: ${quando} – ${formatBRL(p.valorCents)}`;
  });

  const partes = [
    n > 1
      ? `O valor para pagamento parcelado fica em ${total}, dividido em ${n} parcelas:`
      : `O valor para pagamento à vista fica em ${total}.`,
    "",
    ...linhas,
    "",
    `Total: ${total}.`,
  ];

  if (mostrarDetalhesFinanceiros) {
    partes.push(
      "",
      `(Inclui custo de antecipação bancária: juros ${formatBRL(resultado.totalJurosCents)}, IOF ${formatBRL(resultado.totalIofCents)}${
        resultado.tacCents > 0 ? `, TAC ${formatBRL(resultado.tacCents)}` : ""
      }.)`
    );
  }

  return partes.join("\n");
}
