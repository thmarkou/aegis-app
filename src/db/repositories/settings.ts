import type { AppSettings } from '../../shared/types';
import {
  DEFAULT_EXPIRY_NOTIFICATION_DAYS,
  DEFAULT_WEIGHT_WARNING_PERCENT,
} from '../../shared/constants';
import { getDb } from '../index';

const SETTINGS_KEYS = {
  theme: 'theme',
  shtfModeEnabled: 'shtf_mode_enabled',
  expiryNotificationDays: 'expiry_notification_days',
  weightWarningPercent: 'weight_warning_percent',
  unitSystem: 'unit_system',
} as const;

export async function getSettings(): Promise<AppSettings> {
  const database = getDb();
  if (!database) {
    return {
      theme: 'dark',
      shtfModeEnabled: false,
      expiryNotificationDays: DEFAULT_EXPIRY_NOTIFICATION_DAYS,
      weightWarningPercent: DEFAULT_WEIGHT_WARNING_PERCENT,
      unitSystem: 'metric',
    };
  }
  const rows = await database.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    theme: (map.get(SETTINGS_KEYS.theme) as AppSettings['theme']) ?? 'dark',
    shtfModeEnabled: map.get(SETTINGS_KEYS.shtfModeEnabled) === 'true',
    expiryNotificationDays: parseInt(map.get(SETTINGS_KEYS.expiryNotificationDays) ?? '', 10) || DEFAULT_EXPIRY_NOTIFICATION_DAYS,
    weightWarningPercent: parseInt(map.get(SETTINGS_KEYS.weightWarningPercent) ?? '', 10) || DEFAULT_WEIGHT_WARNING_PERCENT,
    unitSystem: (map.get(SETTINGS_KEYS.unitSystem) as AppSettings['unitSystem']) ?? 'metric',
  };
}

const ADMIN_PIN_KEY = 'admin_pin';
const DEFAULT_ADMIN_PIN = '1234';

export async function getAdminPin(): Promise<string> {
  const database = getDb();
  if (!database) return DEFAULT_ADMIN_PIN;
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    ADMIN_PIN_KEY
  );
  return row?.value ?? DEFAULT_ADMIN_PIN;
}

export async function setAdminPin(pin: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    ADMIN_PIN_KEY,
    pin
  );
}

export async function setSettings(updates: Partial<AppSettings>): Promise<void> {
  const database = getDb();
  if (!database) return;
  const mapping: [key: string, value: string][] = [];
  if (updates.theme != null) mapping.push([SETTINGS_KEYS.theme, updates.theme]);
  if (updates.shtfModeEnabled != null)
    mapping.push([SETTINGS_KEYS.shtfModeEnabled, updates.shtfModeEnabled ? 'true' : 'false']);
  if (updates.expiryNotificationDays != null)
    mapping.push([SETTINGS_KEYS.expiryNotificationDays, String(updates.expiryNotificationDays)]);
  if (updates.weightWarningPercent != null)
    mapping.push([SETTINGS_KEYS.weightWarningPercent, String(updates.weightWarningPercent)]);
  if (updates.unitSystem != null)
    mapping.push([SETTINGS_KEYS.unitSystem, updates.unitSystem]);
  for (const [key, value] of mapping) {
    await database.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      key,
      value
    );
  }
}
