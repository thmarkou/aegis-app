/**
 * Local notifications per pool item: yellow at alert_lead_days before deadline, red at CRITICAL_WINDOW_DAYS before.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import {
  CRITICAL_WINDOW_DAYS,
  DAY_MS,
  getPoolItemNotificationDeadlines,
  normalizedLeadDays,
} from '../../../services/alertLeadTime';
import { formatDateEuFromMs } from '../../../shared/utils/formatDateEu';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const LEGACY_PREFIXES = ['expiry-', 'proactive-expiry-'];
const INV_PREFIX = 'inv-alert-';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function atEightAmLocal(ms: number): Date {
  const d = new Date(ms);
  d.setHours(8, 0, 0, 0);
  return d;
}

async function cancelLegacyAndInventoryNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    const id = n.identifier;
    if (id.startsWith(INV_PREFIX) || LEGACY_PREFIXES.some((p) => id.startsWith(p))) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }
}

/** iOS caps scheduled triggers (~64); stop after this to avoid silent drops. */
const MAX_SCHEDULED = 60;

export async function scheduleExpiryNotifications(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.setNotificationChannelAsync('inventory-alerts', {
    name: 'Inventory deadlines',
    importance: Notifications.AndroidImportance.HIGH,
  });

  await cancelLegacyAndInventoryNotifications();

  const now = Date.now();
  const items = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();

  type Sched = { at: number; id: string; title: string; body: string };
  const queue: Sched[] = [];

  for (const item of items) {
    const lead = normalizedLeadDays(item.alertLeadDays);
    for (const { deadlineMs, kind } of getPoolItemNotificationDeadlines(item)) {
      const label = kind === 'expiry' ? 'Expiry' : 'Maintenance due';
      const critAt = atEightAmLocal(deadlineMs - CRITICAL_WINDOW_DAYS * DAY_MS).getTime();
      if (critAt > now) {
        queue.push({
          at: critAt,
          id: `${INV_PREFIX}${item.id}-${kind}-crit`,
          title: `AEGIS: ${label} (critical)`,
          body: `${item.name} — ${label.toLowerCase()} ${formatDateEuFromMs(deadlineMs)} (${CRITICAL_WINDOW_DAYS}d window)`,
        });
      }
      if (lead >= 1) {
        const warnAt = atEightAmLocal(deadlineMs - lead * DAY_MS).getTime();
        if (warnAt > now && warnAt < critAt) {
          queue.push({
            at: warnAt,
            id: `${INV_PREFIX}${item.id}-${kind}-warn`,
            title: `AEGIS: ${label} (warning)`,
            body: `${item.name} — ${label.toLowerCase()} ${formatDateEuFromMs(deadlineMs)} (${lead}d lead)`,
          });
        }
      }
    }
  }

  queue.sort((a, b) => a.at - b.at);
  const slice = queue.slice(0, MAX_SCHEDULED);

  for (const q of slice) {
    await Notifications.scheduleNotificationAsync({
      identifier: q.id,
      content: {
        title: q.title,
        body: q.body,
        data: { type: 'inventory-alert' },
        ...(Platform.OS === 'android' ? { channelId: 'inventory-alerts' } : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: new Date(q.at),
      },
    });
  }
}
