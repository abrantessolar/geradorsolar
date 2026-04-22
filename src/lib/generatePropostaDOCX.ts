import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { formatCurrency, formatNumber } from '@/data/calculations';

const TEMPLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/templates/proposta_template.docx`;

const VARIABLES = [
  'cliente_nome',
  'responsavel_nome',
  'geracao_mensal',
  'consumo_mensal',
  'vc_geracaomenosconsumo',
  'inversores_utilizados',
  'inversor_fabricante',
  'inversor_potencia_nominal',
  'modulo_quantidade',
  'modulo_fabricante',
  'modulo_potencia',
  'preco',
  'vc_24',
  'vc_36',
  'vc_48',
  'vc_60',
  'vc_72',
] as const;

type VarName = (typeof VARIABLES)[number];
type Replacements = Record<VarName, string>;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Word frequently splits placeholders like [vc_24] across multiple <w:r>/<w:t>
 * runs. For each known variable, we build a regex that matches the literal
 * text with any XML markup interleaved between characters, then collapse it
 * back to the plain placeholder so a simple find & replace works.
 */
function normalizePlaceholders(xml: string): string {
  let out = xml;
  for (const name of VARIABLES) {
    const literal = `[${name}]`;
    // Build pattern: each char allowed to be followed by xml tags or </w:t>...<w:t> joins
    const chars = literal.split('').map((c) => {
      const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped;
    });
    // Allow any sequence of XML tags / whitespace between characters
    const between = `(?:<[^>]+>|\\s)*`;
    const pattern = new RegExp(chars.join(between), 'g');
    out = out.replace(pattern, literal);
  }
  return out;
}

function replaceAll(xml: string, replacements: Replacements): string {
  let out = xml;
  for (const name of VARIABLES) {
    const value = escapeXml(replacements[name] ?? '');
    out = out.split(`[${name}]`).join(value);
  }
  return out;
}

export interface PropostaDocxData {
  cliente_nome: string;
  responsavel_nome: string;
  geracao_mensal: number;
  consumo_mensal: number;
  excedente_kwh: number;
  qtd_inversores: number;
  marca_inversor: string;
  potencia_inversor: string;
  num_placas: number;
  marca_placa: string;
  potencia_placa: string;
  preco_vista: number;
  parcela_24x: number;
  parcela_36x: number;
  parcela_48x: number;
  parcela_60x: number;
  parcela_72x: number;
  numero_proposta: string;
}

function fmtKwh(n: number): string {
  return `${formatNumber(n, 0)} kWh`;
}

function fmtMoney(n: number): string {
  return formatCurrency(n);
}

function buildReplacements(d: PropostaDocxData): Replacements {
  return {
    cliente_nome: d.cliente_nome,
    responsavel_nome: d.responsavel_nome,
    geracao_mensal: fmtKwh(d.geracao_mensal),
    consumo_mensal: fmtKwh(d.consumo_mensal),
    vc_geracaomenosconsumo: fmtKwh(d.excedente_kwh),
    inversores_utilizados: String(d.qtd_inversores),
    inversor_fabricante: d.marca_inversor,
    inversor_potencia_nominal: d.potencia_inversor,
    modulo_quantidade: String(d.num_placas),
    modulo_fabricante: d.marca_placa,
    modulo_potencia: d.potencia_placa,
    preco: fmtMoney(d.preco_vista),
    vc_24: fmtMoney(d.parcela_24x),
    vc_36: fmtMoney(d.parcela_36x),
    vc_48: fmtMoney(d.parcela_48x),
    vc_60: fmtMoney(d.parcela_60x),
    vc_72: fmtMoney(d.parcela_72x),
  };
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60);
}

export async function gerarPropostaDOCX(data: PropostaDocxData): Promise<void> {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error('Falha ao baixar template do servidor');
  const buffer = await res.arrayBuffer();

  const zip = new PizZip(buffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Template DOCX inválido (document.xml ausente)');

  let xml = docFile.asText();
  xml = normalizePlaceholders(xml);
  xml = replaceAll(xml, buildReplacements(data));

  zip.file('word/document.xml', xml);

  const out = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  const numero = data.numero_proposta || 'TLS-0000';
  const cliente = sanitizeFilename(data.cliente_nome || 'Cliente');
  saveAs(out, `Proposta_${numero}_${cliente}.docx`);
}
