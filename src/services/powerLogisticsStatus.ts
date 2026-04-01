/**
 * External power devices (radio, power bank) — APRS PWR: status and STALE detection.
 */
import { database } from '../database';
import type PowerDevice from '../database/models/PowerDevice';

/** Default window when a row has no `maintenance_cycle_days` (legacy DB). */
export const DEFAULT_MAINTENANCE_CYCLE_DAYS = 90;

export type PowerAprsStatus = 'OK' | 'LOW';

export function isChargeStale(
  lastFullChargeAt: number | null,
  now: number,
  maintenanceCycleDays: number | null
): boolean {
  const days = maintenanceCycleDays ?? DEFAULT_MAINTENANCE_CYCLE_DAYS;
  const ms = days * 24 * 60 * 60 * 1000;
  if (lastFullChargeAt == null) return true;
  return now - lastFullChargeAt > ms;
}

export async function getPowerAprsStatus(): Promise<PowerAprsStatus> {
  const devices = await database.get<PowerDevice>('power_devices').query().fetch();
  const now = Date.now();
  for (const d of devices) {
    if (isChargeStale(d.lastFullChargeAt, now, d.maintenanceCycleDays)) return 'LOW';
  }
  return 'OK';
}

export async function getStalePowerDeviceCount(): Promise<number> {
  const devices = await database.get<PowerDevice>('power_devices').query().fetch();
  const now = Date.now();
  return devices.filter((d) => isChargeStale(d.lastFullChargeAt, now, d.maintenanceCycleDays)).length;
}
