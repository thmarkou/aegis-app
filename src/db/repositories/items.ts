import type { InventoryItem, ItemCategory } from '../../shared/types';
import { getDb } from '../index';

function mapRow(r: {
  id: string;
  kit_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  weight_grams: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): InventoryItem {
  return {
    id: r.id,
    kitId: r.kit_id,
    name: r.name,
    category: r.category as ItemCategory,
    quantity: r.quantity,
    unit: r.unit,
    expiryDate: r.expiry_date,
    weightGrams: r.weight_grams,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getItemsByKitId(kitId: string): Promise<InventoryItem[]> {
  const database = getDb();
  if (!database) return [];
  const rows = await database.getAllAsync(
    'SELECT * FROM inventory_items WHERE kit_id = ? ORDER BY category, name',
    kitId
  );
  return (rows as unknown as Parameters<typeof mapRow>[0][]).map(mapRow);
}

export async function getItemById(id: string): Promise<InventoryItem | null> {
  const database = getDb();
  if (!database) return null;
  const row = await database.getFirstAsync(
    'SELECT * FROM inventory_items WHERE id = ?',
    id
  ) as unknown as Parameters<typeof mapRow>[0] | null;
  return row ? mapRow(row) : null;
}

export async function insertItem(
  item: Omit<InventoryItem, 'createdAt' | 'updatedAt'>
): Promise<void> {
  const database = getDb();
  if (!database) return;
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO inventory_items (
      id, kit_id, name, category, quantity, unit, expiry_date, weight_grams, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.kitId,
    item.name,
    item.category,
    item.quantity,
    item.unit,
    item.expiryDate ?? null,
    item.weightGrams,
    item.notes ?? null,
    now,
    now
  );
}

export async function updateItem(
  id: string,
  updates: Partial<
    Pick<
      InventoryItem,
      'name' | 'category' | 'quantity' | 'unit' | 'expiryDate' | 'weightGrams' | 'notes'
    >
  >
): Promise<void> {
  const database = getDb();
  if (!database) return;
  const now = new Date().toISOString();
  const allowed: (keyof typeof updates)[] = [
    'name',
    'category',
    'quantity',
    'unit',
    'expiryDate',
    'weightGrams',
    'notes',
  ];
  for (const key of allowed) {
    const v = updates[key];
    if (v === undefined) continue;
    const col = key === 'expiryDate' ? 'expiry_date' : key === 'weightGrams' ? 'weight_grams' : key;
    await database.runAsync(
      `UPDATE inventory_items SET ${String(col)} = ?, updated_at = ? WHERE id = ?`,
      v,
      now,
      id
    );
  }
}

export async function deleteItem(id: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  await database.runAsync('DELETE FROM inventory_items WHERE id = ?', id);
}

/** Items expiring within the given number of days (for notifications). */
export async function getItemsExpiringWithinDays(days: number): Promise<InventoryItem[]> {
  const database = getDb();
  if (!database) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const rows = await database.getAllAsync(
    `SELECT * FROM inventory_items WHERE expiry_date IS NOT NULL AND expiry_date <= ? ORDER BY expiry_date ASC`,
    cutoffStr
  );
  return (rows as unknown as Parameters<typeof mapRow>[0][]).map(mapRow);
}
