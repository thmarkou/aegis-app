/**
 * Compact inventory health for APRS telemetry (AEGIS: … INV:OK|WARN|LOW).
 * WARN: expiring within max(30d, Settings expiry window); LOW: any expired item.
 */
import { database } from '../database';
import type InventoryPoolItem from '../database/models/InventoryPoolItem';
import * as SecureSettings from '../shared/services/secureSettings';

export const PROACTIVE_EXPIRY_DAYS = 30;

export type InventoryAprsStatus = 'OK' | 'WARN' | 'LOW';

export async function getInventoryAprsStatus(): Promise<InventoryAprsStatus> {
  const now = Date.now();
  const settingsDays = await SecureSettings.getExpiryDays();
  const warnDays = Math.max(PROACTIVE_EXPIRY_DAYS, settingsDays);
  const warnThreshold = now + warnDays * 24 * 60 * 60 * 1000;

  const items = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();

  let hasExpired = false;
  let hasWarn = false;
  for (const item of items) {
    const exp = item.expiryDate;
    if (exp == null) continue;
    if (exp <= now) hasExpired = true;
    else if (exp <= warnThreshold) hasWarn = true;
  }

  if (hasExpired) return 'LOW';
  if (hasWarn) return 'WARN';
  return 'OK';
}
