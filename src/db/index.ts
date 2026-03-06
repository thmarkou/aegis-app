/**
 * DB init and access. Uses expo-sqlite for offline-first storage.
 */

import * as SQLite from 'expo-sqlite';
import { schemaVersion, sql } from './schema';

const DB_NAME = 'aegis.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(sql);
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ['schema_version', String(schemaVersion)]
  );
  return db;
}

export function getDb(): SQLite.SQLiteDatabase | null {
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}
