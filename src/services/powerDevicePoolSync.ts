/**
 * Keeps logistics power_devices in sync with warehouse inventory_pool_items (Power category).
 */
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import type PowerDevice from '../database/models/PowerDevice';
import type InventoryPoolItem from '../database/models/InventoryPoolItem';
import type KitPackItem from '../database/models/KitPackItem';

export async function createPowerDeviceWithPool(input: {
  name: string;
  batteryType: string | null;
  maintenanceCycleDays: number;
}): Promise<string> {
  const name = input.name.trim();
  let deviceId = '';
  await database.write(async () => {
    const poolRow = await database.get<InventoryPoolItem>('inventory_pool_items').create((r) => {
      r.name = name;
      r.poolCategory = 'power';
      r.unit = 'ea';
      r.weightGrams = 0;
      r.expiryDate = null;
      r.calories = null;
      r.waterLitersPerUnit = null;
      r.isEssential = false;
      r.condition = null;
      r.notes = null;
      r.barcode = null;
      r.latitude = null;
      r.longitude = null;
      r.isWaypoint = false;
      r.createdAt = new Date();
      r.updatedAt = new Date();
    });
    const slug = `pd_${poolRow.id.slice(0, 8)}_${Date.now()}`;
    const dev = await database.get<PowerDevice>('power_devices').create((r) => {
      r.slug = slug;
      r.name = name;
      r.batteryType = input.batteryType?.trim() || null;
      r.maintenanceCycleDays = input.maintenanceCycleDays;
      r.lastFullChargeAt = null;
      r.poolItemId = poolRow.id;
      r.createdAt = new Date();
      r.updatedAt = new Date();
    });
    deviceId = dev.id;
  });
  return deviceId;
}

export async function updatePowerDeviceAndPool(
  deviceId: string,
  input: {
    name: string;
    batteryType: string | null;
    maintenanceCycleDays: number;
  }
): Promise<void> {
  const name = input.name.trim();
  await database.write(async () => {
    const dev = await database.get<PowerDevice>('power_devices').find(deviceId);
    await dev.update((r) => {
      r.name = name;
      r.batteryType = input.batteryType?.trim() || null;
      r.maintenanceCycleDays = input.maintenanceCycleDays;
      r.updatedAt = new Date();
    });
    if (dev.poolItemId) {
      const pool = await database.get<InventoryPoolItem>('inventory_pool_items').find(dev.poolItemId);
      await pool.update((r) => {
        r.name = name;
        r.updatedAt = new Date();
      });
    }
  });
}

export async function deletePowerDeviceAndPool(deviceId: string): Promise<void> {
  await database.write(async () => {
    const dev = await database.get<PowerDevice>('power_devices').find(deviceId);
    const poolId = dev.poolItemId;
    if (poolId) {
      const packs = await database
        .get<KitPackItem>('kit_pack_items')
        .query(Q.where('pool_item_id', poolId))
        .fetch();
      for (const p of packs) {
        await p.markAsDeleted();
      }
      const pool = await database.get<InventoryPoolItem>('inventory_pool_items').find(poolId);
      await pool.markAsDeleted();
    }
    await dev.markAsDeleted();
  });
}

export async function syncPowerDeviceNameFromPoolItem(poolItemId: string, name: string): Promise<void> {
  const devices = await database
    .get<PowerDevice>('power_devices')
    .query(Q.where('pool_item_id', poolItemId))
    .fetch();
  if (devices.length === 0) return;
  await database.write(async () => {
    for (const d of devices) {
      await d.update((r) => {
        r.name = name.trim();
        r.updatedAt = new Date();
      });
    }
  });
}

export async function findPowerDeviceByPoolItemId(poolItemId: string): Promise<PowerDevice | null> {
  const rows = await database
    .get<PowerDevice>('power_devices')
    .query(Q.where('pool_item_id', poolItemId))
    .fetch();
  return rows[0] ?? null;
}
