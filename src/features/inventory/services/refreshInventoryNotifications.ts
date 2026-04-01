import { scheduleExpiryNotifications } from './expirationNotifications';
import { scheduleProactiveInventoryExpiryAlerts } from './proactiveInventoryNotifications';

export async function refreshInventoryNotifications(): Promise<void> {
  await Promise.all([scheduleExpiryNotifications(), scheduleProactiveInventoryExpiryAlerts()]);
}
