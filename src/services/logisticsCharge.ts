import { database } from '../database';
import type InventoryPoolItem from '../database/models/InventoryPoolItem';

/** Single write path for last charge / check (Logistics, Item form, etc.). */
export async function setPoolItemLastChargeAt(
  poolItemId: string,
  lastChargeAtMs: number
): Promise<void> {
  await database.write(async () => {
    const pool = await database.get<InventoryPoolItem>('inventory_pool_items').find(poolItemId);
    await pool.update((r) => {
      r.lastChargeAt = lastChargeAtMs;
      r.updatedAt = new Date();
    });
  });
}

/** Sets last full charge to now for a warehouse row (Logistics "Charged today"). */
export async function markPoolItemChargedNow(poolItemId: string): Promise<void> {
  await setPoolItemLastChargeAt(poolItemId, Date.now());
}
