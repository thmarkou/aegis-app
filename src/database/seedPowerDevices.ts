/**
 * No default devices: power gear is user-defined from Logistics (and synced to warehouse).
 * Kept as a no-op so App.tsx init order stays stable.
 */
export async function seedPowerDevices(): Promise<void> {
  // Intentionally empty.
}
