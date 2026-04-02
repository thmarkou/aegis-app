/**
 * Battery-tracked warehouse rows — APRS PWR: status and STALE detection (Logistics uses same data).
 */
import { database } from '../database';
import type InventoryPoolItem from '../database/models/InventoryPoolItem';

/** Default window when a row has no `maintenance_cycle_days`. */
export const DEFAULT_MAINTENANCE_CYCLE_DAYS = 90;

export type PowerAprsStatus = 'OK' | 'LOW';

/** True if `last_charge_at` is missing or older than the maintenance cycle. */
export function isChargeStale(
  lastChargeAt: number | null,
  now: number,
  maintenanceCycleDays: number | null
): boolean {
  const days = maintenanceCycleDays ?? DEFAULT_MAINTENANCE_CYCLE_DAYS;
  const ms = days * 24 * 60 * 60 * 1000;
  if (lastChargeAt == null) return true;
  return now - lastChargeAt > ms;
}

function isBatteryTrackedRow(item: InventoryPoolItem): boolean {
  return !!(item.batteryType && item.batteryType.trim());
}

export async function getPowerAprsStatus(): Promise<PowerAprsStatus> {
  const items = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();
  const now = Date.now();
  for (const row of items) {
    if (!isBatteryTrackedRow(row)) continue;
    if (isChargeStale(row.lastChargeAt, now, row.maintenanceCycleDays)) return 'LOW';
  }
  return 'OK';
}

export async function getStalePowerDeviceCount(): Promise<number> {
  const items = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();
  const now = Date.now();
  return items.filter(
    (row) =>
      isBatteryTrackedRow(row) && isChargeStale(row.lastChargeAt, now, row.maintenanceCycleDays)
  ).length;
}
