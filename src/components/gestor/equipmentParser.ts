/**
 * Parse equipment text like "14 ASTRONERGY 580W" or "3 FOXESS 2,5KW (MICRO)"
 */
export interface ParsedEquipment {
  qtd: number;
  marca: string;
  potencia: string; // numeric string, e.g. "580" or "2.5"
  tipo?: string;    // "String" or "MICRO"
}

const IGNORE_WORDS = new Set(['MICRO', 'KW', 'W', 'KWP', 'WP', 'E', '(', ')']);

export function parsePaineis(text: string | null | undefined): ParsedEquipment | null {
  if (!text || !text.trim()) return null;
  const s = text.trim().toUpperCase();

  // Extract qty: first number
  const qtyMatch = s.match(/^(\d+)/);
  if (!qtyMatch) return null;
  const qtd = parseInt(qtyMatch[1]);

  // Extract potencia: number before W or WP (e.g. "580W", "580WP")
  const potMatch = s.match(/([\d,.]+)\s*(?:WP|W)\b/i);
  const potencia = potMatch ? potMatch[1].replace(',', '.') : '';

  // Extract marca: first alphabetical word after the qty, ignoring noise words
  const afterQty = s.substring(qtyMatch[0].length).trim();
  const words = afterQty.split(/[\s()]+/).filter(w => w && !IGNORE_WORDS.has(w) && !/^[\d,.]+(?:W|WP|KW|KWP)?$/i.test(w));
  const marca = words[0] || '';

  if (!marca && !potencia) return null;

  return { qtd, marca, potencia, tipo: 'String' };
}

export function parseInversor(text: string | null | undefined): ParsedEquipment | null {
  if (!text || !text.trim()) return null;
  const s = text.trim().toUpperCase();

  const isMicro = /\bMICRO\b/i.test(s);

  // Extract qty: first number
  const qtyMatch = s.match(/^(\d+)/);
  if (!qtyMatch) return null;
  const qtd = parseInt(qtyMatch[1]);

  // Extract potencia: number before KW or KWP (e.g. "6KW", "2,5KW")
  const potMatch = s.match(/([\d,.]+)\s*(?:KWP|KW)\b/i);
  const potencia = potMatch ? potMatch[1].replace(',', '.') : '';

  // Extract marca: first alphabetical word after qty, ignoring noise
  const afterQty = s.substring(qtyMatch[0].length).trim();
  const words = afterQty.split(/[\s()]+/).filter(w => w && !IGNORE_WORDS.has(w) && !/^[\d,.]+(?:W|WP|KW|KWP)?$/i.test(w));
  const marca = words[0] || '';

  if (!marca && !potencia) return null;

  return { qtd, marca, potencia, tipo: isMicro ? 'MICRO' : 'String' };
}

/** Legacy compat — generic parser (delegates based on unit detection) */
export function parseEquipmentText(text: string | null | undefined): ParsedEquipment | null {
  if (!text) return null;
  const upper = text.toUpperCase();
  // If contains KW → inversor, else → paineis
  if (/\d[\d,.]*\s*KW/i.test(upper)) return parseInversor(text);
  return parsePaineis(text);
}
