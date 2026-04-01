/**
 * Compact inventory health for APRS telemetry (AEGIS: … INV:OK|WARN|LOW).
 */
import { database } from '../database';
import type InventoryItem from '../database/models/InventoryItem';
import * as SecureSettings from '../shared/services/secureSettings';

export type InventoryAprsStatus = 'OK' | 'WARN' | 'LOW';

export async function getInventoryAprsStatus(): Promise<InventoryAprsStatus> {
  const now = Date.now();
  const days = await SecureSettings.getExpiryDays();
  const warnThreshold = now + days * 24 * 60 * 60 * 1000;

  const items = await database.get<InventoryItem>('inventory_items').query().fetch();

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
