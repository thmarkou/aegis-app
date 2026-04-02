/**
 * @deprecated Merged into expirationNotifications (per-item alert_lead_days + critical window).
 */
export async function cancelProactiveInventoryNotifications(): Promise<void> {
  // Prefix proactive-expiry- is cleared in scheduleExpiryNotifications.
}

export async function scheduleProactiveInventoryExpiryAlerts(): Promise<void> {
  // no-op — see scheduleExpiryNotifications
}
