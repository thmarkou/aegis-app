import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import migrations from './migrations';
import Kit from './models/Kit';
import InventoryItem from './models/InventoryItem';
import Profile from './models/Profile';
import Radio from './models/Radio';
import Repeater from './models/Repeater';
import ItemTemplate from './models/ItemTemplate';
import MessageLog from './models/MessageLog';
import IncomingStation from './models/IncomingStation';

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
  modelClasses: [Kit, InventoryItem, Profile, Radio, Repeater, ItemTemplate, MessageLog, IncomingStation],
});
