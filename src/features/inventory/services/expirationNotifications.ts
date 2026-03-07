/**
 * Schedules local notifications for inventory items expiring within the configured days.
 * Runs on app init and can be triggered after item save.
 */

import * as Notifications from 'expo-notifications';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type InventoryItem from '../../../database/models/InventoryItem';
import { getExpiryDays } from '../../../shared/services/secureSettings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleExpiryNotifications(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.setNotificationChannelAsync('expiry', {
    name: 'Expiry reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  const days = await getExpiryDays();
  const now = Date.now();
  const cutoff = now + days * 24 * 60 * 60 * 1000;

  const items = await database
    .get<InventoryItem>('inventory_items')
    .query(
      Q.and(
        Q.where('expiry_date', Q.gte(now)),
        Q.where('expiry_date', Q.lte(cutoff))
      )
    )
    .fetch();

  for (const item of items) {
    const expiry = item.expiryDate;
    if (expiry == null) continue;
    const triggerDate = new Date(expiry);
    triggerDate.setHours(8, 0, 0, 0);
    if (triggerDate.getTime() <= Date.now()) continue;
    const secondsFromNow = (triggerDate.getTime() - Date.now()) / 1000;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'AEGIS: Item expiring',
        body: `${item.name} expires on ${new Date(expiry).toISOString().slice(0, 10)}`,
        data: { itemId: item.id, kitId: item.kitId },
      },
      trigger: { seconds: secondsFromNow, channelId: 'expiry' },
      identifier: `expiry-${item.id}`,
    });
  }
}
