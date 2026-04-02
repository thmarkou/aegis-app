/**
 * Parses decimal text when the OS keyboard uses comma instead of period (e.g. Greek/EU).
 * Accepts "0,5", "0.5", "1,25".
 */
export function parseLocaleDecimalInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '');
  if (!t) return null;
  const normalized = t.replace(/,/g, '.');
  const n = parseFloat(normalized);
  if (Number.isNaN(n)) return null;
  return n;
}
