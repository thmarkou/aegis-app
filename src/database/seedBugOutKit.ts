import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import type Kit from './models/Kit';

const BUG_OUT_NAME = '35L Bug-Out';

/** Ensures the primary bug-out kit exists so MISSION can surface it immediately. */
export async function seedBugOutKit(): Promise<void> {
  const kits = database.get<Kit>('kits');
  const existing = await kits.query(Q.where('name', BUG_OUT_NAME)).fetch();
  if (existing.length > 0) return;

  await database.write(async () => {
    await kits.create((k) => {
      k.name = BUG_OUT_NAME;
      k.description = 'Primary deployment bag';
      k.waterReservoirLiters = 0;
      k.iconType = 'backpack';
      k.createdAt = new Date();
      k.updatedAt = new Date();
    });
  });
}
