/**
 * GarminSyncService – Apple HealthKit bridge for biometrics.
 * Pulls HR, SpO2, RHR, Active Energy, Steps from Apple Health.
 * HR poll every 5s for real-time display; full poll every 20s.
 * Safe: HealthKit is optional; failures are caught so the app never freezes.
 */

import * as SecureSettings from './secureSettings';
import { useGarminStore } from '../store/useGarminStore';
import { Platform } from 'react-native';

const HR_POLL_INTERVAL_MS = 5000;
const FULL_POLL_INTERVAL_MS = 20000;

// react-native-health exports via module.exports (no default). Use the module directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AppleHealthKit: any = null;
try {
  AppleHealthKit = require('react-native-health');
} catch {
  // react-native-health not available (e.g. Android, or module not linked)
}

function getPermissions(): Record<string, string> {
  return AppleHealthKit?.Constants?.Permissions ?? {};
}

let hrPollIntervalId: ReturnType<typeof setInterval> | null = null;
let fullPollIntervalId: ReturnType<typeof setInterval> | null = null;

function isAvailableAsync(): Promise<boolean> {
  if (!AppleHealthKit) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    try {
      AppleHealthKit!.isAvailable((err: unknown, available: boolean) => {
        if (err) reject(err);
        else resolve(available);
      });
    } catch (e) {
      reject(e);
    }
  });
}

/** Re-attempt HealthKit connection. Use for Retry button. */
export async function retryHealthConnection(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  useGarminStore.getState().setError(null);
  return connectGarminDevice();
}

function initHealthKitAsync(options: {
  permissions: { read: string[]; write: string[] };
}): Promise<boolean> {
  if (!AppleHealthKit) return Promise.reject(new Error('HealthKit not available'));
  return new Promise((resolve, reject) => {
    try {
      AppleHealthKit!.initHealthKit(options, (err: unknown) => {
        if (err) reject(err);
        else resolve(true);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export async function initGarminService(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const store = useGarminStore.getState();
  try {
    if (!AppleHealthKit) {
      store.setError('HealthKit module not loaded (rebuild native app)');
      return;
    }
    const available = await isAvailableAsync();
    if (!available) {
      store.setError('HealthKit unavailable (Simulator or device without Health app)');
      return;
    }
    const linked = await SecureSettings.getGarminLinked();
    if (linked) {
      const ok = await connectGarminDevice();
      if (!ok) await SecureSettings.setGarminLinked(false);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.setError(msg || 'HealthKit init failed');
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
  if (!AppleHealthKit) {
    useGarminStore.getState().setError('HealthKit module not loaded (rebuild native app)');
    return false;
  }

  const store = useGarminStore.getState();
  store.setError(null);

  try {
    const Permissions = getPermissions();
    const hrPerm = Permissions.HeartRate ?? 'HeartRate';
    const available = await isAvailableAsync();
    if (!available) {
      store.setError('HealthKit unavailable (Simulator or device without Health app)');
      return false;
    }

    await initHealthKitAsync({
      permissions: {
        read: [
          hrPerm,
          Permissions.StepCount ?? 'StepCount',
          Permissions.DistanceWalkingRunning ?? 'DistanceWalkingRunning',
          Permissions.OxygenSaturation ?? 'OxygenSaturation',
          Permissions.RestingHeartRate ?? 'RestingHeartRate',
          Permissions.ActiveEnergyBurned ?? 'ActiveEnergyBurned',
        ],
        write: [],
      },
    });
    // Permission modal has been shown; user granted access

    await SecureSettings.setGarminLinked(true);
    store.setConnected(true);
    startHealthPolling();
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    store.setError(msg || 'HEALTH_ACCESS_DENIED');
    store.setConnected(false);
    return false;
  }
}

type HealthSample = { value: number; sourceName?: string };

function fetchLatestHeartRate(): void {
  if (!AppleHealthKit) return;
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const twoHoursAgo = new Date(endDate.getTime() - 2 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  function trySetFromResults(results: HealthSample[] | undefined): boolean {
    if (!Array.isArray(results) || results.length === 0) return false;
    const sample = results[0];
    const val = sample?.value;
    if (typeof val !== 'number') return false;
    store.setHeartRate(Math.round(val), true);
    store.setError(null); // Clear any stale error once real data arrives
    return true;
  }

  try {
    AppleHealthKit.getHeartRateSamples(
      {
        startDate: twoHoursAgo.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 20,
      },
      (err: unknown, results: HealthSample[] | undefined) => {
        try {
          if (err) {
            store.setHeartRate(null);
            return;
          }
          if (trySetFromResults(results)) return;
          if (!AppleHealthKit) return;
          AppleHealthKit.getHeartRateSamples(
            {
              startDate: twentyFourHoursAgo.toISOString(),
              endDate: endDate.toISOString(),
              ascending: false,
              limit: 1,
            },
            (err2: unknown, results2: HealthSample[] | undefined) => {
              try {
                if (err2) {
                  store.setHeartRate(null);
                  return;
                }
                if (!trySetFromResults(results2)) store.setHeartRate(null);
              } catch {
                store.setHeartRate(null);
              }
            }
          );
        } catch {
          store.setHeartRate(null);
        }
      }
    );
  } catch {
    store.setHeartRate(null);
  }
}

function fetchLatestSpo2(): void {
  if (!AppleHealthKit) return;
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  try {
    AppleHealthKit.getOxygenSaturationSamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 20,
      },
      (err: unknown, results: HealthSample[] | undefined) => {
        try {
          if (err) {
            store.setSpo2(null);
            return;
          }
          if (!Array.isArray(results) || results.length === 0) {
            store.setSpo2(null);
            return;
          }
          const sample = results[0];
          const pct = Math.round(sample.value * 100);
          store.setSpo2(Math.min(100, Math.max(0, pct)));
          store.setError(null);
        } catch {
          store.setSpo2(null);
        }
      }
    );
  } catch {
    store.setSpo2(null);
  }
}

function fetchLatestRestingHeartRate(): void {
  if (!AppleHealthKit) return;
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    AppleHealthKit.getRestingHeartRateSamples(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 20,
      },
      (err: unknown, results: HealthSample[] | undefined) => {
        try {
          if (err) {
            store.setRestingHeartRate(null);
            return;
          }
          if (!Array.isArray(results) || results.length === 0) {
            store.setRestingHeartRate(null);
            return;
          }
          const sample = results[0];
          store.setRestingHeartRate(Math.round(sample.value));
        } catch {
          store.setRestingHeartRate(null);
        }
      }
    );
  } catch {
    store.setRestingHeartRate(null);
  }
}

function fetchLatestActiveEnergy(): void {
  if (!AppleHealthKit) return;
  const store = useGarminStore.getState();
  if (!store.connected) return;

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setHours(0, 0, 0, 0);
  const twentyFourHoursAgo = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  function trySetFromResults(results: Array<{ value?: number }> | undefined): boolean {
    if (!Array.isArray(results) || results.length === 0) return false;
    const total = results.reduce((sum, r) => sum + (r.value ?? 0), 0);
    if (total > 0) {
      store.setActiveEnergyKcal(Math.round(total));
      store.setError(null);
      return true;
    }
    return false;
  }

  try {
    AppleHealthKit.getActiveEnergyBurned(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      },
      (err: unknown, results: Array<{ value: number }> | undefined) => {
        try {
          if (err) {
            store.setActiveEnergyKcal(null);
            return;
          }
          if (trySetFromResults(results)) return;
          if (!AppleHealthKit) return;
          AppleHealthKit.getActiveEnergyBurned(
            {
              startDate: twentyFourHoursAgo.toISOString(),
              endDate: endDate.toISOString(),
              ascending: false,
            },
            (err2: unknown, results2: Array<{ value: number }> | undefined) => {
              try {
                if (err2) {
                  store.setActiveEnergyKcal(null);
                  return;
                }
                if (!trySetFromResults(results2)) store.setActiveEnergyKcal(null);
              } catch {
                store.setActiveEnergyKcal(null);
              }
            }
          );
        } catch {
          store.setActiveEnergyKcal(null);
        }
      }
    );
  } catch {
    store.setActiveEnergyKcal(null);
  }
}

function fetchAllBioMetrics(): void {
  fetchLatestHeartRate();
  fetchLatestSpo2();
  fetchLatestRestingHeartRate();
  fetchLatestActiveEnergy();
}

/** Manually trigger an immediate HealthKit sync. Use for pull-to-refresh. */
export function refreshHealthData(): void {
  const store = useGarminStore.getState();
  if (store.connected) fetchAllBioMetrics();
}

function startHealthPolling(): void {
  stopHealthPolling();
  fetchAllBioMetrics();
  // HR every 5s for real-time display; full metrics every 20s
  hrPollIntervalId = setInterval(fetchLatestHeartRate, HR_POLL_INTERVAL_MS);
  fullPollIntervalId = setInterval(fetchAllBioMetrics, FULL_POLL_INTERVAL_MS);
}

function stopHealthPolling(): void {
  if (hrPollIntervalId) {
    clearInterval(hrPollIntervalId);
    hrPollIntervalId = null;
  }
  if (fullPollIntervalId) {
    clearInterval(fullPollIntervalId);
    fullPollIntervalId = null;
  }
}

export async function disconnectGarminDevice(): Promise<void> {
  stopHealthPolling();
  useGarminStore.getState().reset();
  await SecureSettings.setGarminLinked(false);
}

/**
 * Request HealthKit permissions (e.g. when entering Dashboard).
 * Triggers permission modal if needed. Ensures Garmin/Health data can flow.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const linked = await SecureSettings.getGarminLinked();
    if (!linked) return false;
    const ok = await connectGarminDevice();
    return ok;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    useGarminStore.getState().setError(msg || 'HealthKit init failed');
    return false;
  }
}

export function destroyGarminService(): void {
  stopHealthPolling();
}
