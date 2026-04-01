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

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[AEGIS] Database setup failed:', error);
  },
});

export const database = new Database({
  adapter,
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
