import type { Kit } from '../../shared/types';
import { getDb } from '../index';

export async function getAllKits(): Promise<Kit[]> {
  const database = getDb();
  if (!database) return [];
  const rows = await database.getAllAsync<{
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM kits ORDER BY updated_at DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getKitById(id: string): Promise<Kit | null> {
  const database = getDb();
  if (!database) return null;
  const row = await database.getFirstAsync<{
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM kits WHERE id = ?', id);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertKit(kit: Omit<Kit, 'createdAt' | 'updatedAt'>): Promise<void> {
  const database = getDb();
  if (!database) return;
  const now = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO kits (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    kit.id,
    kit.name,
    kit.description ?? null,
    now,
    now
  );
}

export async function updateKit(
  id: string,
  updates: Partial<Pick<Kit, 'name' | 'description'>>
): Promise<void> {
  const database = getDb();
  if (!database) return;
  const now = new Date().toISOString();
  if (updates.name != null)
    await database.runAsync('UPDATE kits SET name = ?, updated_at = ? WHERE id = ?', updates.name, now, id);
  if (updates.description != null)
    await database.runAsync(
      'UPDATE kits SET description = ?, updated_at = ? WHERE id = ?',
      updates.description,
      now,
      id
    );
}

export async function deleteKit(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  await database.runAsync('DELETE FROM inventory_items WHERE kit_id = ?', id);
  await database.runAsync('DELETE FROM kits WHERE id = ?', id);
}
