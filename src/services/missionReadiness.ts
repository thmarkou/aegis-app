import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import type Kit from '../database/models/Kit';
import type KitPackItem from '../database/models/KitPackItem';
import type InventoryPoolItem from '../database/models/InventoryPoolItem';
import type MissionPreset from '../database/models/MissionPreset';

export type KitNutritionTotals = {
  totalKcal: number;
  /** Packed water from pool line items (L). */
  packedWaterLiters: number;
  /** Kit reservoir (L), counted toward hydration readiness. */
  reservoirLiters: number;
  /** packed + reservoir */
  totalWaterLiters: number;
};

export async function computeKitNutritionTotals(kitId: string): Promise<KitNutritionTotals> {
  let reservoirLiters = 0;
  try {
    const kit = await database.get<Kit>('kits').find(kitId);
    reservoirLiters = kit.waterReservoirLiters ?? 0;
  } catch {
    return {
      totalKcal: 0,
      packedWaterLiters: 0,
      reservoirLiters: 0,
      totalWaterLiters: 0,
    };
  }
  const packs = await database
    .get<KitPackItem>('kit_pack_items')
    .query(Q.where('kit_id', kitId))
    .fetch();

  let totalKcal = 0;
  let packedWaterLiters = 0;
  for (const p of packs) {
    const pool: InventoryPoolItem = await p.poolItem.fetch();
    totalKcal += (pool.calories ?? 0) * p.quantity;
    const w = pool.waterLitersPerUnit ?? 0;
    packedWaterLiters += w * p.quantity;
  }

  return {
    totalKcal,
    packedWaterLiters,
    reservoirLiters,
    totalWaterLiters: packedWaterLiters + reservoirLiters,
  };
}

export function formatReadinessAgainstPreset(
  preset: Pick<MissionPreset, 'name' | 'durationDays' | 'caloriesPerDay' | 'waterLitersPerDay'>,
  totals: KitNutritionTotals
): { ok: boolean; message: string } {
  const targetKcal = preset.durationDays * preset.caloriesPerDay;
  const targetWaterLiters = preset.durationDays * preset.waterLitersPerDay;
  const kcalShort = Math.max(0, targetKcal - totals.totalKcal);
  const waterShort = Math.max(0, targetWaterLiters - totals.totalWaterLiters);
  if (kcalShort <= 0 && waterShort <= 0) {
    return {
      ok: true,
      message: `Ready for “${preset.name}”: ${Math.round(targetKcal)} kcal and ${targetWaterLiters.toFixed(1)}L targets met.`,
    };
  }
  const parts: string[] = [];
  if (waterShort > 0) {
    parts.push(`Missing ~${waterShort.toFixed(1)}L water`);
  }
  if (kcalShort > 0) {
    parts.push(`Missing ~${Math.round(kcalShort)} kcal`);
  }
  return {
    ok: false,
    message: `Warning (“${preset.name}”): ${parts.join('; ')}.`,
  };
}
