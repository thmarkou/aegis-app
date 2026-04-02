import { database } from './index';
import type Kit from './models/Kit';
import * as SecureSettings from '../shared/services/secureSettings';

const PATROL_PACK_NAME = '35L Patrol Pack';

/**
 * After inventory reset (migration v18), ensure exactly one empty starter kit exists
 * and wire it as the active kit.
 */
export async function ensurePatrolPackKit(): Promise<void> {
  const kits = database.get<Kit>('kits');
  const count = await kits.query().fetchCount();
  if (count > 0) {
    const activeId = await SecureSettings.getActiveKitId();
    if (activeId) {
      try {
        await kits.find(activeId);
      } catch {
        const first = await kits.query().fetch();
        const k = first[0];
        if (k) await SecureSettings.setActiveKitId(k.id);
      }
    } else {
      const first = await kits.query().fetch();
      const k = first[0];
      if (k) await SecureSettings.setActiveKitId(k.id);
    }
    return;
  }

  await database.write(async () => {
    const kit = await kits.create((k) => {
      k.name = PATROL_PACK_NAME;
      k.description = null;
      k.waterReservoirLiters = null;
      k.iconType = null;
      k.createdAt = new Date();
      k.updatedAt = new Date();
    });
    await SecureSettings.setActiveKitId(kit.id);
  });
}
