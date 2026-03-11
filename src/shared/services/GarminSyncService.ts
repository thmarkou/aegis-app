/**
 * GarminSyncService – Apple HealthKit bridge for Garmin Fenix data.
 * Polls Health every 20s for HR, SpO2, RHR, Active Energy. Prioritizes Garmin source when available.
 * No BLE – works alongside Garmin Connect.
 */

import AppleHealthKit from 'react-native-health';
import * as SecureSettings from './secureSettings';
import { useGarminStore } from '../store/useGarminStore';
import { Platform } from 'react-native';

const POLL_INTERVAL_MS = 20000;
const Permissions = AppleHealthKit.Constants.Permissions;

let pollIntervalId: ReturnType<typeof setInterval> | null = null;

function isAvailableAsync(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.isAvailable((err: unknown, available: boolean) => {
      if (err) reject(err);
      else resolve(available);
    });
  });
}

function initHealthKitAsync(options: {
  permissions: { read: string[]; write: string[] };
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AppleHealthKit.initHealthKit as (opts: any, cb: (e: unknown) => void) => void)(options, (err: unknown) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

export async function initGarminService(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const store = useGarminStore.getState();
  try {
    const available = await isAvailableAsync();
    if (!available) {
      store.setError('HEALTH_UNAVAILABLE');
      return;
    }
    const linked = await SecureSettings.getGarminLinked();
    if (linked) {
      const ok = await connectGarminDevice();
      if (!ok) await SecureSettings.setGarminLinked(false);
    }
  } catch {
    store.setError('HEALTH_UNAVAILABLE');
  }
}

export async function isGarminLinked(): Promise<boolean> {
  return SecureSettings.getGarminLinked();
}

export async function setGarminLinked(linked: boolean): Promise<void> {
  await SecureSettings.setGarminLinked(linked);
  if (!linked) {
    stopHealthPolling();
    useGarminStore.getState().reset();
  }
}

export async function connectGarminDevice(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    useGarminStore.getState().setError('HEALTH_IOS_ONLY');
    return false;
  }

  const store = useGarminStore.getState();
  store.setError(null);

  try {
    const available = await isAvailableAsync();
    if (!available) {
      store.setError('HEALTH_UNAVAILABLE');
      return false;
    }

    await initHealthKitAsync({
      permissions: {
        read: [
          Permissions.HeartRate,
          Permissions.StepCount,
          Permissions.DistanceWalkingRunning,
          Permissions.OxygenSaturation,
          Permissions.RestingHeartRate,
          Permissions.ActiveEnergyBurned,
        ],
        write: [],
      },
    });

    await SecureSettings.setGarminLinked(true);
    store.setConnected(true);
    startHealthPolling();
    return true;
  } catch {
    store.setError('HEALTH_ACCESS_DENIED');
    store.setConnected(false);
    return false;
  }
}

type HealthSample = { value: number; sourceName?: string };

function fetchLatestHeartRate(): void {
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

  AppleHealthKit.getHeartRateSamples(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: false,
      limit: 20,
    },
    (err: unknown, results: HealthSample[] | undefined) => {
      if (err) {
        store.setHeartRate(null);
        return;
      }
      if (!Array.isArray(results) || results.length === 0) {
        store.setHeartRate(null);
        return;
      }
      const garminSample = results.find(
        (s) => s.sourceName && /garmin|fenix/i.test(s.sourceName)
      );
      const sample = garminSample ?? results[0];
      store.setHeartRate(Math.round(sample.value));
    }
  );
}

function fetchLatestSpo2(): void {
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  AppleHealthKit.getOxygenSaturationSamples(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: false,
      limit: 20,
    },
    (err: unknown, results: HealthSample[] | undefined) => {
      if (err) {
        store.setSpo2(null);
        return;
      }
      if (!Array.isArray(results) || results.length === 0) {
        store.setSpo2(null);
        return;
      }
      const garminSample = results.find(
        (s) => s.sourceName && /garmin|fenix/i.test(s.sourceName)
      );
      const sample = garminSample ?? results[0];
      // HealthKit returns 0.98 for 98%; convert to display percentage
      const pct = Math.round(sample.value * 100);
      store.setSpo2(Math.min(100, Math.max(0, pct)));
    }
  );
}

function fetchLatestRestingHeartRate(): void {
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  AppleHealthKit.getRestingHeartRateSamples(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: false,
      limit: 20,
    },
    (err: unknown, results: HealthSample[] | undefined) => {
      if (err) {
        store.setRestingHeartRate(null);
        return;
      }
      if (!Array.isArray(results) || results.length === 0) {
        store.setRestingHeartRate(null);
        return;
      }
      const garminSample = results.find(
        (s) => s.sourceName && /garmin|fenix/i.test(s.sourceName)
      );
      const sample = garminSample ?? results[0];
      store.setRestingHeartRate(Math.round(sample.value));
    }
  );
}

function fetchLatestActiveEnergy(): void {
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setHours(0, 0, 0, 0);

  AppleHealthKit.getActiveEnergyBurned(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: false,
    },
    (err: unknown, results: Array<{ value: number }> | undefined) => {
      if (err) {
        store.setActiveEnergyKcal(null);
        return;
      }
      if (!Array.isArray(results) || results.length === 0) {
        store.setActiveEnergyKcal(null);
        return;
      }
      const total = results.reduce((sum, r) => sum + (r.value ?? 0), 0);
      store.setActiveEnergyKcal(Math.round(total));
    }
  );
}

function fetchAllBioMetrics(): void {
  fetchLatestHeartRate();
  fetchLatestSpo2();
  fetchLatestRestingHeartRate();
  fetchLatestActiveEnergy();
}

function startHealthPolling(): void {
  stopHealthPolling();
  fetchAllBioMetrics();
  pollIntervalId = setInterval(fetchAllBioMetrics, POLL_INTERVAL_MS);
}

function stopHealthPolling(): void {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

export async function disconnectGarminDevice(): Promise<void> {
  stopHealthPolling();
  useGarminStore.getState().reset();
  await SecureSettings.setGarminLinked(false);
}

export function destroyGarminService(): void {
  stopHealthPolling();
}
