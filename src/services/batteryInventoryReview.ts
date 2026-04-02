/**
 * Battery pool categories and type presets (warehouse catalog).
 * Alert timing uses `alertLeadTime.ts` (user-defined lead days per item).
 */
import { BATTERY_POOL_CATEGORY_KEYS } from '../shared/constants/poolCategories';

export const BATTERY_TYPE_OPTIONS = [
  'Li-ion',
  'LiFePO4',
  'NiMH',
  'Lead-acid',
  'Alkaline AA/AAA',
] as const;

export type BatteryTypeOption = (typeof BATTERY_TYPE_OPTIONS)[number];

export function poolCategoryRequiresBattery(category: string): boolean {
  return (BATTERY_POOL_CATEGORY_KEYS as readonly string[]).includes(category);
}
