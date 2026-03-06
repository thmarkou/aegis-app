/**
 * SQLite schema for AEGIS offline-first storage.
 * v1: profiles, kits, inventory items, settings.
 */

export const schemaVersion = 1;

export const sql = `
-- Profiles: family members for scaling (water, calories, etc.)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  body_weight_kg REAL NOT NULL DEFAULT 70,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Kits: e.g. Bug-Out Bag, Pantry
CREATE TABLE IF NOT EXISTS kits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Inventory items per kit
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY NOT NULL,
  kit_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pcs',
  expiry_date TEXT,
  weight_grams REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (kit_id) REFERENCES kits (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_kit ON inventory_items(kit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory_items(expiry_date);

-- App settings (single row key-value style)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;
