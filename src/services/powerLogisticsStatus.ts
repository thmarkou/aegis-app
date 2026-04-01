/**
 * External power devices (radio, power bank) — APRS PWR: status and STALE detection.
 */
import { database } from '../database';
import type PowerDevice from '../database/models/PowerDevice';

export const POWER_STALE_MS = 90 * 24 * 60 * 60 * 1000;

export type PowerAprsStatus = 'OK' | 'LOW';

export function isChargeStale(lastFullChargeAt: number | null, now = Date.now()): boolean {
  if (lastFullChargeAt == null) return true;
  return now - lastFullChargeAt > POWER_STALE_MS;
}

export async function getPowerAprsStatus(): Promise<PowerAprsStatus> {
  const devices = await database.get<PowerDevice>('power_devices').query().fetch();
  const now = Date.now();
  for (const d of devices) {
    if (isChargeStale(d.lastFullChargeAt, now)) return 'LOW';
  }
  return 'OK';
}

export async function getStalePowerDeviceCount(): Promise<number> {
  const devices = await database.get<PowerDevice>('power_devices').query().fetch();
  const now = Date.now();
  return devices.filter((d) => isChargeStale(d.lastFullChargeAt, now)).length;
}
