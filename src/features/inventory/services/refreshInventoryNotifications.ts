import { scheduleExpiryNotifications } from './expirationNotifications';

export async function refreshInventoryNotifications(): Promise<void> {
  await scheduleExpiryNotifications();
}
