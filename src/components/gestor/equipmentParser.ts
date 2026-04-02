/**
 * Parse equipment text like "12 ASTRONERGY 580W" or "3 FOXESS 2,5KW (MICRO)"
 */
export interface ParsedEquipment {
  qtd: number;
  marca: string;
  potencia: string;
  tipo?: string;
}

export function parseEquipmentText(text: string | null | undefined): ParsedEquipment | null {
  if (!text || !text.trim()) return null;

  const s = text.trim();
  
  // Check for MICRO type
  const isMicro = /\bMICRO\b/i.test(s);
  
  // Clean parenthetical content for parsing
  const clean = s.replace(/\(.*?\)/g, '').trim();
  
  // Match: number, then word(s), then potencia (number with W or KW)
  const match = clean.match(/^(\d+)\s+([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ]+)*?)\s+([\d,.]+\s*(?:KW|KWP|W|WP))\s*$/i);
  
  if (match) {
    return {
      qtd: parseInt(match[1]),
      marca: match[2].trim().toUpperCase(),
      potencia: match[3].replace(/\s+/g, '').toUpperCase(),
      tipo: isMicro ? 'MICRO' : 'String',
    };
  }
  
  // Fallback: try simpler pattern (number + brand)
  const simple = clean.match(/^(\d+)\s+(\S+)\s*(.*)/);
  if (simple) {
    return {
      qtd: parseInt(simple[1]),
      marca: simple[2].toUpperCase(),
      potencia: simple[3]?.replace(/\s+/g, '').toUpperCase() || '',
      tipo: isMicro ? 'MICRO' : 'String',
    };
  }
  
  return null;
}
