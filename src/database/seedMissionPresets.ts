import * as SecureStore from 'expo-secure-store';
import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import type MissionPreset from './models/MissionPreset';
import * as SecureSettings from '../shared/services/secureSettings';

const LEGACY_PRESET_KEY = 'aegis_mission_preset';

const DEFAULT_PRESETS: readonly {
  name: string;
  durationDays: number;
  caloriesPerDay: number;
  waterLitersPerDay: number;
}[] = [
  { name: 'Overnight', durationDays: 1, caloriesPerDay: 2000, waterLitersPerDay: 3 },
  { name: '3-Day Bug-Out', durationDays: 3, caloriesPerDay: 2000, waterLitersPerDay: 3 },
  { name: 'Week Hunt', durationDays: 7, caloriesPerDay: 2000, waterLitersPerDay: 3 },
];

const LEGACY_ENUM_TO_NAME: Record<string, string> = {
  overnight: 'Overnight',
  three_day: '3-Day Bug-Out',
  week_hunt: 'Week Hunt',
};

export async function seedMissionPresets(): Promise<void> {
  const collection = database.get<MissionPreset>('mission_presets');
  const count = await collection.query().fetchCount();
  if (count === 0) {
    await database.write(async () => {
      for (const d of DEFAULT_PRESETS) {
        await collection.create((r) => {
          r.name = d.name;
          r.durationDays = d.durationDays;
          r.caloriesPerDay = d.caloriesPerDay;
          r.waterLitersPerDay = d.waterLitersPerDay;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      }
    });
  }

  const legacy = await SecureStore.getItemAsync(LEGACY_PRESET_KEY);
  if (legacy && legacy in LEGACY_ENUM_TO_NAME) {
    const byName = LEGACY_ENUM_TO_NAME[legacy];
    const rows = await collection.query(Q.where('name', byName)).fetch();
    if (rows[0]) {
      await SecureSettings.setSelectedMissionPresetId(rows[0].id);
    }
    await SecureStore.deleteItemAsync(LEGACY_PRESET_KEY);
  }

  const selected = await SecureSettings.getSelectedMissionPresetId();
  if (selected) {
    try {
      await collection.find(selected);
    } catch {
      await SecureSettings.setSelectedMissionPresetId(null);
    }
  }

  const stillNone = !((await SecureSettings.getSelectedMissionPresetId()) ?? '');
  if (stillNone) {
    const all = await collection.query().fetch();
    const preferred = all.find((p) => p.name === '3-Day Bug-Out') ?? all[0];
    if (preferred) {
      await SecureSettings.setSelectedMissionPresetId(preferred.id);
    }
  }
}
