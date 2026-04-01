/**
 * Local notifications for MRE/Medical items expiring within 30 days.
 * Apple Watch / Garmin cannot be vibrated from the app; phone uses sound + haptic (see App.tsx listener).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import { requestNotificationPermission } from './expirationNotifications';

const PREFIX = 'proactive-expiry-';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isProactivePoolItem(pool: InventoryPoolItem): boolean {
  if (pool.poolCategory === 'medical') return true;
  if (pool.poolCategory === 'consumables') {
    const n = pool.name.toLowerCase();
    return (
      n.includes('mre') ||
      n.includes('med') ||
      n.includes('ration') ||
      n.includes('first aid')
    );
  }
  return false;
}

export async function cancelProactiveInventoryNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    const id = n.identifier;
    if (id.startsWith(PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }
}

export async function scheduleProactiveInventoryExpiryAlerts(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.setNotificationChannelAsync('inventory-proactive', {
    name: 'Inventory (MRE/Meds)',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 280, 120, 280],
  });

  await cancelProactiveInventoryNotifications();

  const now = Date.now();
  const horizon = now + THIRTY_DAYS_MS;

  const items = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();

  for (const item of items) {
    const exp = item.expiryDate;
    if (exp == null) continue;
    if (exp <= now) continue;
    if (exp > horizon) continue;
    if (!isProactivePoolItem(item)) continue;

    const id = `${PREFIX}${item.id}`;
    let triggerAt = new Date(exp - 7 * 24 * 60 * 60 * 1000);
    triggerAt.setHours(8, 0, 0, 0);
    if (triggerAt.getTime() <= now) {
      triggerAt = new Date(now + 90 * 1000);
    }

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: 'AEGIS: Item expiring soon',
        body: `${item.name} (${item.poolCategory}) — expires ${new Date(exp).toISOString().slice(0, 10)}`,
        data: { poolItemId: item.id },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'inventory-proactive' } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: triggerAt,
      },
    });
  }
}
