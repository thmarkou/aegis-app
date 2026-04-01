import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';
import Kit from './models/Kit';
import InventoryPoolItem from './models/InventoryPoolItem';
import KitPackItem from './models/KitPackItem';
import Profile from './models/Profile';
import Radio from './models/Radio';
import Repeater from './models/Repeater';
import ItemTemplate from './models/ItemTemplate';
import MessageLog from './models/MessageLog';
import IncomingStation from './models/IncomingStation';
import PowerDevice from './models/PowerDevice';
import MissionPreset from './models/MissionPreset';

/** Raw adapter — use for `initializingPromise` (Compat wrapper does not expose it reliably). */
const sqliteAdapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[AEGIS] Database setup failed:', error);
  },
});

/** Wait until SQLite has finished schema setup or migrations (required before DDL/seed). */
export async function waitForDatabaseReady(): Promise<void> {
  await sqliteAdapter.initializingPromise;
}

export const database = new Database({
  adapter: sqliteAdapter,
  modelClasses: [
    Kit,
    InventoryPoolItem,
    KitPackItem,
    Profile,
    Radio,
    Repeater,
    ItemTemplate,
    MessageLog,
    IncomingStation,
    PowerDevice,
    MissionPreset,
  ],
});
