import { database } from './index';
import type PowerDevice from './models/PowerDevice';

const DEFAULTS: { slug: string; name: string }[] = [
  { slug: 'uv_k5', name: 'Quansheng UV-K5' },
  { slug: 'main_power_bank', name: 'Main Power Bank' },
];

export async function seedPowerDevices(): Promise<void> {
  const col = database.get<PowerDevice>('power_devices');
  const count = await col.query().fetchCount();
  if (count > 0) return;

  await database.write(async () => {
    for (const d of DEFAULTS) {
      await col.create((r) => {
        r.slug = d.slug;
        r.name = d.name;
        r.lastFullChargeAt = null;
      });
    }
  });
}
