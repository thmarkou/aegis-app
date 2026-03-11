import * as SecureStore from 'expo-secure-store';

const KEYS = {
  adminPin: 'aegis_admin_pin',
  theme: 'aegis_theme',
  shtfMode: 'aegis_shtf_mode',
  expiryDays: 'aegis_expiry_days',
  weightPercent: 'aegis_weight_percent',
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

export async function getMissionCheck(key: string): Promise<boolean> {
  const v = await SecureStore.getItemAsync(key);
  return v === 'true';
}

export async function setMissionCheck(key: string, checked: boolean): Promise<void> {
  await SecureStore.setItemAsync(key, checked ? 'true' : 'false');
}

export const GPS_UPDATE_INTERVAL_NORMAL_MS = 5000;
export const GPS_UPDATE_INTERVAL_POWER_SAVE_MS = 30000;

export async function getGarminLinked(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.garminLinked);
  return v === 'true';
}

export async function setGarminLinked(linked: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.garminLinked, linked ? 'true' : 'false');
}

export async function getGpsUpdateIntervalMs(): Promise<number> {
  const powerSave = await getPowerSaveMode();
  return powerSave ? GPS_UPDATE_INTERVAL_POWER_SAVE_MS : GPS_UPDATE_INTERVAL_NORMAL_MS;
}
