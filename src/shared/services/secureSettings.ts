import * as SecureStore from 'expo-secure-store';

const KEYS = {
  adminPin: 'aegis_admin_pin',
  theme: 'aegis_theme',
  shtfMode: 'aegis_shtf_mode',
  expiryDays: 'aegis_expiry_days',
  weightPercent: 'aegis_weight_percent',
  bodyWeightKg: 'aegis_body_weight_kg',
  maxHeartRate: 'aegis_max_heart_rate',
  callsign: 'aegis_callsign',
  ssid: 'aegis_ssid',
  sortByExpiry: 'aegis_sort_by_expiry',
  powerSaveMode: 'aegis_power_save_mode',
  missionCheck_radiosCharged: 'aegis_mission_radios',
  missionCheck_antennaTuned: 'aegis_mission_antenna',
  missionCheck_cablesConnected: 'aegis_mission_cables',
  missionCheck_offlineMapsVerified: 'aegis_mission_maps',
  missionCheck_emergencyRations: 'aegis_mission_rations',
  garminLinked: 'aegis_garmin_linked',
  testMode: 'aegis_test_mode',
  txDelayMs: 'aegis_tx_delay_ms',
  digitalGain: 'aegis_digital_gain',
  /** E.164 for SMSGTE gateway, e.g. +306912345678 */
  emergencySmsNumber: 'aegis_emergency_sms_number',
  /** Decode transmitted AFSK via mic (acoustic loopback) for modem tests */
  loopbackDecodeMode: 'aegis_loopback_decode',
  activeKitId: 'aegis_active_kit_id',
  /** DB row id in `mission_presets` */
  selectedMissionPresetId: 'aegis_selected_mission_preset_id',
  /** Months after last charge / check when next battery review is due (warehouse items). */
  maintenanceAlertThresholdMonths: 'aegis_maintenance_alert_threshold_months',
  /** Passphrase for APRS ENC: family channel (AES-256-CBC). */
  familyEncryptionKey: 'aegis_family_encryption_key',
  /** Passphrase for APRS ENC: rescuers channel. */
  rescuersEncryptionKey: 'aegis_rescuers_encryption_key',
} as const;

const DEFAULTS = {
  adminPin: '1234',
  theme: 'dark',
  shtfMode: 'false',
  expiryDays: '14',
  weightPercent: '20',
  callsign: 'SY2EYH',
  ssid: '7',
  sortByExpiry: 'false',
};

export async function getAdminPin(): Promise<string> {
  return (await SecureStore.getItemAsync(KEYS.adminPin)) ?? DEFAULTS.adminPin;
}

export async function setAdminPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.adminPin, pin);
}

export async function getTheme(): Promise<string> {
  return (await SecureStore.getItemAsync(KEYS.theme)) ?? DEFAULTS.theme;
}

export async function setTheme(theme: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.theme, theme);
}

export async function getShtfMode(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.shtfMode);
  return v === 'true';
}

export async function setShtfMode(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.shtfMode, enabled ? 'true' : 'false');
}

export async function getExpiryDays(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEYS.expiryDays);
  return v ? parseInt(v, 10) : parseInt(DEFAULTS.expiryDays, 10);
}

export async function setExpiryDays(days: number): Promise<void> {
  await SecureStore.setItemAsync(KEYS.expiryDays, String(days));
}

export async function getWeightPercent(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEYS.weightPercent);
  return v ? parseInt(v, 10) : parseInt(DEFAULTS.weightPercent, 10);
}

export async function setWeightPercent(pct: number): Promise<void> {
  await SecureStore.setItemAsync(KEYS.weightPercent, String(pct));
}

export async function getBodyWeightKg(): Promise<number | null> {
  const v = await SecureStore.getItemAsync(KEYS.bodyWeightKg);
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) || n < 1 || n > 500 ? null : n;
}

export async function setBodyWeightKg(kg: number | null): Promise<void> {
  if (kg == null) {
    await SecureStore.deleteItemAsync(KEYS.bodyWeightKg);
    return;
  }
  const clamped = Math.max(1, Math.min(500, Math.round(kg * 10) / 10));
  await SecureStore.setItemAsync(KEYS.bodyWeightKg, String(clamped));
}

export async function getMaxHeartRate(): Promise<number | null> {
  const v = await SecureStore.getItemAsync(KEYS.maxHeartRate);
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) || n < 60 || n > 250 ? null : n;
}

export async function setMaxHeartRate(bpm: number | null): Promise<void> {
  if (bpm == null) {
    await SecureStore.deleteItemAsync(KEYS.maxHeartRate);
    return;
  }
  const clamped = Math.max(60, Math.min(250, Math.round(bpm)));
  await SecureStore.setItemAsync(KEYS.maxHeartRate, String(clamped));
}

export async function getCallsign(): Promise<string> {
  return (await SecureStore.getItemAsync(KEYS.callsign)) ?? DEFAULTS.callsign;
}

export async function setCallsign(callsign: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.callsign, callsign.trim().toUpperCase());
}

export async function getSsid(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEYS.ssid);
  return v ? parseInt(v, 10) : parseInt(DEFAULTS.ssid, 10);
}

export async function setSsid(ssid: number): Promise<void> {
  const n = Math.max(0, Math.min(15, Math.floor(ssid)));
  await SecureStore.setItemAsync(KEYS.ssid, String(n));
}

export async function getSortByExpiry(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.sortByExpiry);
  return v === 'true';
}

export async function setSortByExpiry(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.sortByExpiry, enabled ? 'true' : 'false');
}

export async function getPowerSaveMode(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.powerSaveMode);
  return v === 'true';
}

export async function setPowerSaveMode(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.powerSaveMode, enabled ? 'true' : 'false');
}

const MISSION_CHECK_KEYS: Record<string, string> = {
  missionCheck_radiosCharged: KEYS.missionCheck_radiosCharged,
  missionCheck_antennaTuned: KEYS.missionCheck_antennaTuned,
  missionCheck_cablesConnected: KEYS.missionCheck_cablesConnected,
  missionCheck_offlineMapsVerified: KEYS.missionCheck_offlineMapsVerified,
  missionCheck_emergencyRations: KEYS.missionCheck_emergencyRations,
};

export async function getMissionCheck(key: string): Promise<boolean> {
  const storageKey = MISSION_CHECK_KEYS[key] ?? key;
  const v = await SecureStore.getItemAsync(storageKey);
  return v === 'true';
}

export async function setMissionCheck(key: string, checked: boolean): Promise<void> {
  const storageKey = MISSION_CHECK_KEYS[key] ?? key;
  await SecureStore.setItemAsync(storageKey, checked ? 'true' : 'false');
}

export const GPS_UPDATE_INTERVAL_NORMAL_MS = 5000;
export const GPS_UPDATE_INTERVAL_POWER_SAVE_MS = 30000;

export async function getTestMode(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.testMode);
  return v === 'true';
}

export async function setTestMode(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.testMode, enabled ? 'true' : 'false');
}

/** Default true on first launch so HealthKit permission modal is triggered. */
export async function getGarminLinked(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.garminLinked);
  return v !== 'false';
}

export async function setGarminLinked(linked: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.garminLinked, linked ? 'true' : 'false');
}

export const TX_DELAY_MIN_MS = 100;
export const TX_DELAY_MAX_MS = 1000;
export const TX_DELAY_DEFAULT_MS = 500;
export const DIGITAL_GAIN_MIN = 0.5;
export const DIGITAL_GAIN_MAX = 1.5;
export const DIGITAL_GAIN_DEFAULT = 1.0;

export async function getTxDelayMs(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEYS.txDelayMs);
  const n = v ? parseInt(v, 10) : TX_DELAY_DEFAULT_MS;
  return Math.max(TX_DELAY_MIN_MS, Math.min(TX_DELAY_MAX_MS, isNaN(n) ? TX_DELAY_DEFAULT_MS : n));
}

export async function setTxDelayMs(ms: number): Promise<void> {
  const clamped = Math.max(TX_DELAY_MIN_MS, Math.min(TX_DELAY_MAX_MS, Math.round(ms)));
  await SecureStore.setItemAsync(KEYS.txDelayMs, String(clamped));
}

export async function getDigitalGain(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEYS.digitalGain);
  const n = v ? parseFloat(v) : DIGITAL_GAIN_DEFAULT;
  return Math.max(DIGITAL_GAIN_MIN, Math.min(DIGITAL_GAIN_MAX, isNaN(n) ? DIGITAL_GAIN_DEFAULT : n));
}

export async function setDigitalGain(gain: number): Promise<void> {
  const clamped = Math.max(DIGITAL_GAIN_MIN, Math.min(DIGITAL_GAIN_MAX, Math.round(gain * 100) / 100));
  await SecureStore.setItemAsync(KEYS.digitalGain, String(clamped));
}

export async function getEmergencySmsNumber(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(KEYS.emergencySmsNumber);
  const t = v?.trim();
  return t ? t : null;
}

/** E.164 digits with optional leading + */
export async function setEmergencySmsNumber(phone: string | null): Promise<void> {
  if (phone == null || !phone.trim()) {
    await SecureStore.deleteItemAsync(KEYS.emergencySmsNumber);
    return;
  }
  const normalized = phone.trim().replace(/\s/g, '');
  await SecureStore.setItemAsync(KEYS.emergencySmsNumber, normalized);
}

export async function getLoopbackDecodeMode(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.loopbackDecodeMode);
  return v === 'true';
}

export async function setLoopbackDecodeMode(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.loopbackDecodeMode, enabled ? 'true' : 'false');
}

export async function getActiveKitId(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(KEYS.activeKitId);
  const t = v?.trim();
  return t ? t : null;
}

export async function setActiveKitId(kitId: string | null): Promise<void> {
  if (kitId == null || !kitId.trim()) {
    await SecureStore.deleteItemAsync(KEYS.activeKitId);
    return;
  }
  await SecureStore.setItemAsync(KEYS.activeKitId, kitId.trim());
}

export async function getSelectedMissionPresetId(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(KEYS.selectedMissionPresetId);
  const t = v?.trim();
  return t ? t : null;
}

export async function setSelectedMissionPresetId(presetRowId: string | null): Promise<void> {
  if (presetRowId == null || !presetRowId.trim()) {
    await SecureStore.deleteItemAsync(KEYS.selectedMissionPresetId);
    return;
  }
  await SecureStore.setItemAsync(KEYS.selectedMissionPresetId, presetRowId.trim());
}

const DEFAULT_MAINTENANCE_ALERT_MONTHS = 6;

export async function getMaintenanceAlertThresholdMonths(): Promise<number> {
  const v = await SecureStore.getItemAsync(KEYS.maintenanceAlertThresholdMonths);
  const n = v ? parseInt(v, 10) : DEFAULT_MAINTENANCE_ALERT_MONTHS;
  return isNaN(n) || n < 1 || n > 60 ? DEFAULT_MAINTENANCE_ALERT_MONTHS : n;
}

export async function setMaintenanceAlertThresholdMonths(months: number): Promise<void> {
  const clamped = Math.max(1, Math.min(60, Math.round(months)));
  await SecureStore.setItemAsync(KEYS.maintenanceAlertThresholdMonths, String(clamped));
}

export async function getFamilyEncryptionKey(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(KEYS.familyEncryptionKey);
  const t = v?.trim();
  return t ? t : null;
}

export async function setFamilyEncryptionKey(key: string | null): Promise<void> {
  if (key == null || !key.trim()) {
    await SecureStore.deleteItemAsync(KEYS.familyEncryptionKey);
    return;
  }
  await SecureStore.setItemAsync(KEYS.familyEncryptionKey, key);
}

export async function getRescuersEncryptionKey(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(KEYS.rescuersEncryptionKey);
  const t = v?.trim();
  return t ? t : null;
}

export async function setRescuersEncryptionKey(key: string | null): Promise<void> {
  if (key == null || !key.trim()) {
    await SecureStore.deleteItemAsync(KEYS.rescuersEncryptionKey);
    return;
  }
  await SecureStore.setItemAsync(KEYS.rescuersEncryptionKey, key);
}

export async function getGpsUpdateIntervalMs(): Promise<number> {
  const powerSave = await getPowerSaveMode();
  return powerSave ? GPS_UPDATE_INTERVAL_POWER_SAVE_MS : GPS_UPDATE_INTERVAL_NORMAL_MS;
}
