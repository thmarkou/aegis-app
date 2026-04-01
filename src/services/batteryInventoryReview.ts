/**
 * Battery / charging review windows for tactical pool items (warehouse catalog).
 */
import type InventoryPoolItem from '../database/models/InventoryPoolItem';
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

/** Calendar months from last charge timestamp (local date preserved). */
export function addCalendarMonths(fromMs: number, months: number): number {
  const d = new Date(fromMs);
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate()).getTime();
}

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type BatteryAttentionLevel = 'ok' | 'upcoming' | 'needs_charge' | 'missing_data';

/**
 * - needs_charge: today (local) is after next review date
 * - upcoming: next review within 15 days (inclusive), still not overdue
 * - missing_data: battery category but no last charge logged
 */
export function getBatteryAttentionLevel(
  poolCategory: string,
  lastChargeAt: number | null,
  maintenanceMonths: number,
  nowMs: number = Date.now()
): BatteryAttentionLevel {
  if (!poolCategoryRequiresBattery(poolCategory)) return 'ok';
  if (lastChargeAt == null) return 'missing_data';
  const nextReview = addCalendarMonths(lastChargeAt, maintenanceMonths);
  const today = startOfLocalDay(nowMs);
  const reviewDay = startOfLocalDay(nextReview);
  const diffDays = Math.round((reviewDay - today) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'needs_charge';
  if (diffDays <= 15) return 'upcoming';
  return 'ok';
}

export function formatNextReviewDate(lastChargeAt: number | null, maintenanceMonths: number): string {
  if (lastChargeAt == null) return '—';
  const next = addCalendarMonths(lastChargeAt, maintenanceMonths);
  return new Date(next).toLocaleDateString();
}

export function poolItemNeedsBatteryAttention(
  item: InventoryPoolItem,
  maintenanceMonths: number,
  nowMs: number = Date.now()
): boolean {
  const level = getBatteryAttentionLevel(item.poolCategory, item.lastChargeAt, maintenanceMonths, nowMs);
  return level === 'needs_charge' || level === 'missing_data';
}
