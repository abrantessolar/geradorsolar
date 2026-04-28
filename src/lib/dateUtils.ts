/**
 * Parse a date string (YYYY-MM-DD) as a LOCAL date (no timezone shift).
 * Avoids the bug where new Date("1990-05-15") is interpreted as UTC midnight,
 * which becomes 14/05/1990 in BR time (UTC-3).
 */
export function parseLocalDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  // ISO date-only format: YYYY-MM-DD
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d));
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/** Format YYYY-MM-DD or ISO date string to dd/mm/yyyy without timezone shift. */
export function fmtDateBR(val: string | null | undefined): string {
  const d = parseLocalDate(val);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR');
}

/**
 * Get birthday info: returns { day, month } from a YYYY-MM-DD string.
 * Returns null if invalid.
 */
export function getBirthdayParts(val: string | null | undefined): { day: number; month: number; year: number } | null {
  const d = parseLocalDate(val);
  if (!d) return null;
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

/**
 * Days until next birthday (0 = today, 1 = tomorrow, ...).
 * Returns -1 if invalid.
 */
export function daysUntilBirthday(val: string | null | undefined, ref: Date = new Date()): number {
  const parts = getBirthdayParts(val);
  if (!parts) return -1;
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let next = new Date(ref.getFullYear(), parts.month - 1, parts.day);
  if (next.getTime() < today.getTime()) {
    next = new Date(ref.getFullYear() + 1, parts.month - 1, parts.day);
  }
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Age in years (turning this year). */
export function calcAge(val: string | null | undefined, ref: Date = new Date()): number | null {
  const parts = getBirthdayParts(val);
  if (!parts) return null;
  let age = ref.getFullYear() - parts.year;
  const beforeBirthday =
    ref.getMonth() + 1 < parts.month ||
    (ref.getMonth() + 1 === parts.month && ref.getDate() < parts.day);
  if (beforeBirthday) age -= 1;
  return age;
}
