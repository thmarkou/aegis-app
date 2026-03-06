import type { Profile } from '../../shared/types';
import { getDb } from '../index';

export async function getAllProfiles(): Promise<Profile[]> {
  const database = getDb();
  if (!database) return [];
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    body_weight_kg: number;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM profiles ORDER BY created_at ASC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    bodyWeightKg: r.body_weight_kg,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function insertProfile(profile: Omit<Profile, 'createdAt' | 'updatedAt'>): Promise<void> {
  const database = getDb();
  if (!database) return;
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO profiles (id, name, body_weight_kg, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    profile.id,
    profile.name,
    profile.bodyWeightKg,
    now,
    now
  );
}

export async function updateProfile(
  id: string,
  updates: Partial<Pick<Profile, 'name' | 'bodyWeightKg'>>
): Promise<void> {
  const database = getDb();
  if (!database) return;
  const now = new Date().toISOString();
  if (updates.name != null)
    await database.runAsync('UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?', updates.name, now, id);
  if (updates.bodyWeightKg != null)
    await database.runAsync(
      'UPDATE profiles SET body_weight_kg = ?, updated_at = ? WHERE id = ?',
      updates.bodyWeightKg,
      now,
      id
    );
}

export async function deleteProfile(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  await database.runAsync('DELETE FROM profiles WHERE id = ?', id);
}
