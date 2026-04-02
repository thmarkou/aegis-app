import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import type InventoryPoolItem from '../database/models/InventoryPoolItem';
import type KitPackItem from '../database/models/KitPackItem';
import type PowerDevice from '../database/models/PowerDevice';

/** Soft-deletes pack lines, unlinks logistics devices, then soft-deletes the pool row. */
export async function deleteInventoryPoolItemCascade(poolItemId: string): Promise<void> {
  await database.write(async () => {
    const packs = await database
      .get<KitPackItem>('kit_pack_items')
      .query(Q.where('pool_item_id', poolItemId))
      .fetch();
    for (const p of packs) {
      await p.markAsDeleted();
    }
    const devices = await database
      .get<PowerDevice>('power_devices')
      .query(Q.where('pool_item_id', poolItemId))
      .fetch();
    for (const d of devices) {
      await d.update((r) => {
        r.poolItemId = null;
        r.updatedAt = new Date();
      });
    }
    const pool = await database.get<InventoryPoolItem>('inventory_pool_items').find(poolItemId);
    await pool.markAsDeleted();
  });
}
