/**
 * Schedules local notifications for inventory items expiring within the configured days.
 * Runs on app init and can be triggered after item save.
 */

import * as Notifications from 'expo-notifications';
import { getItemsExpiringWithinDays } from '../../../db/repositories/items';
import { getSettings } from '../../../db/repositories/settings';

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

  const settings = await getSettings();
  const items = await getItemsExpiringWithinDays(settings.expiryNotificationDays);

  for (const item of items) {
    if (!item.expiryDate) continue;
    const triggerDate = new Date(item.expiryDate);
    triggerDate.setHours(8, 0, 0, 0);
    if (triggerDate.getTime() <= Date.now()) continue;
    const secondsFromNow = (triggerDate.getTime() - Date.now()) / 1000;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'AEGIS: Item expiring',
        body: `${item.name} expires on ${item.expiryDate}`,
        data: { itemId: item.id, kitId: item.kitId },
      },
      trigger: { seconds: secondsFromNow, channelId: 'expiry' },
      identifier: `expiry-${item.id}`,
    });
  }
}
