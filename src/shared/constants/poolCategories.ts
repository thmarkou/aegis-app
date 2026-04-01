/**
 * Central inventory pool: every item belongs to exactly one pool category.
 */
export const POOL_CATEGORY_KEYS = [
  'tools',
  'consumables',
  'medical',
  'shelter_clothing',
  'comms_nav',
] as const;

export type PoolCategory = (typeof POOL_CATEGORY_KEYS)[number];

export const POOL_CATEGORY_LABELS: Record<PoolCategory, string> = {
  tools: 'Tools',
  consumables: 'Consumables',
  medical: 'Medical',
  shelter_clothing: 'Shelter / Clothing',
  comms_nav: 'Comms / Nav',
};

/** Map legacy free-text categories (templates, old DB) to pool keys. */
export function mapLegacyCategoryToPoolCategory(legacy: string): PoolCategory {
  const c = legacy.trim().toLowerCase();
  if (c === 'food' || c === 'water' || c === 'mre' || c.includes('ration')) return 'consumables';
  if (c === 'medical') return 'medical';
  if (c === 'radio' || c === 'communication') return 'comms_nav';
  if (c === 'vehicle' || c === 'base camp' || c === 'shelter') return 'shelter_clothing';
  if (c === 'gear') return 'tools';
  return 'tools';
}
