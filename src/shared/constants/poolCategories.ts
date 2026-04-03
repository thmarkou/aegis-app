/**
 * Central inventory pool: every item belongs to exactly one pool category.
 */
export const POOL_CATEGORY_KEYS = [
  'tools',
  'consumables',
  'water',
  'medical',
  'shelter_clothing',
  'comms_nav',
  'tactical_radios',
  'power_units',
  'power_banks',
  'lighting',
  'power',
] as const;

export type PoolCategory = (typeof POOL_CATEGORY_KEYS)[number];

export const POOL_CATEGORY_LABELS: Record<PoolCategory, string> = {
  tools: 'Tools',
  consumables: 'Consumables',
  water: 'Water',
  medical: 'Medical',
  shelter_clothing: 'Shelter / Clothing',
  comms_nav: 'Comms / Nav',
  tactical_radios: 'Tactical Radios',
  power_units: 'Power Units',
  power_banks: 'Power Banks',
  lighting: 'Lighting / Flashlights',
  power: 'Power',
};

/** Categories that show Battery & Charging Management on the item form. */
export const BATTERY_POOL_CATEGORY_KEYS: readonly PoolCategory[] = [
  'comms_nav',
  'tactical_radios',
  'power_units',
  'power_banks',
  'lighting',
  'power',
];

/** Calories (per unit) — only Consumables (food, MRE, cans). */
export function poolCategoryShowsCalories(category: string): boolean {
  return category === 'consumables';
}

/** Liters per unit — only Water category (bottles, jerrycans, etc.). */
export function poolCategoryShowsWaterLitersField(category: string): boolean {
  return category === 'water';
}

/** Map legacy free-text categories (templates, old DB) to pool keys. */
export function mapLegacyCategoryToPoolCategory(legacy: string): PoolCategory {
  const c = legacy.trim().toLowerCase();
  if (c === 'water' || c.includes('water bottle') || c === 'jerry' || c === 'hydration') return 'water';
  if (c === 'food' || c === 'mre' || c.includes('ration')) return 'consumables';
  if (c === 'medical') return 'medical';
  if (c === 'radio' || c === 'communication') return 'comms_nav';
  if (c === 'vehicle' || c === 'base camp' || c === 'shelter') return 'shelter_clothing';
  if (c === 'gear') return 'tools';
  if (c === 'power' || c === 'electronics' || c.includes('battery')) return 'power';
  if (c === 'tactical_radio' || c === 'tactical radios' || c.includes('handheld')) return 'tactical_radios';
  if (c === 'power unit' || c === 'inverter') return 'power_units';
  if (c === 'power bank' || c === 'bank') return 'power_banks';
  if (c === 'light' || c === 'flashlight' || c === 'torch') return 'lighting';
  return 'tools';
}
