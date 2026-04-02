/**
 * Compact inventory health for APRS telemetry (AEGIS: … INV:OK|WARN|LOW).
 * WARN: any pool item in yellow (lead window); LOW: critical, overdue, or missing battery data.
 */
import { database } from '../database';
import type InventoryPoolItem from '../database/models/InventoryPoolItem';
import { getPoolItemAlertDisplay } from './alertLeadTime';

export type InventoryAprsStatus = 'OK' | 'WARN' | 'LOW';

export async function getInventoryAprsStatus(): Promise<InventoryAprsStatus> {
  const now = Date.now();
  const items = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();

  let hasLow = false;
  let hasWarn = false;
  for (const item of items) {
    const d = getPoolItemAlertDisplay(item, now);
    if (d === 'missing_data' || d === 'critical') hasLow = true;
    else if (d === 'warning') hasWarn = true;
  }

  if (hasLow) return 'LOW';
  if (hasWarn) return 'WARN';
  return 'OK';
}
