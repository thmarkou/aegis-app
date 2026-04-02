/** Display stored weight (grams) in the same unit as the item form. */
export function formatWeightGrams(g: number): string {
  if (!Number.isFinite(g)) return '0';
  if (Math.abs(g - Math.round(g)) < 1e-9) return String(Math.round(g));
  const t = g.toFixed(1);
  return t.endsWith('.0') ? String(Math.round(g)) : t;
}
