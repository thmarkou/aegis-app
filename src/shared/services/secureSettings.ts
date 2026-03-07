import * as SecureStore from 'expo-secure-store';

const KEYS = {
  adminPin: 'aegis_admin_pin',
  theme: 'aegis_theme',
  shtfMode: 'aegis_shtf_mode',
  expiryDays: 'aegis_expiry_days',
  weightPercent: 'aegis_weight_percent',
} as const;

const DEFAULTS = {
  adminPin: '1234',
  theme: 'dark',
  shtfMode: 'false',
  expiryDays: '14',
  weightPercent: '20',
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
