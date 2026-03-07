/**
 * Syncs secure store settings to the in-memory store on load, and persists store changes.
 * Uses expo-secure-store instead of SQLite.
 */

import { getTheme, setTheme, getShtfMode, setShtfMode } from '../services/secureSettings';
import { useAppStore } from './useAppStore';

export async function loadSettingsIntoStore(): Promise<void> {
  const [theme, shtfModeEnabled] = await Promise.all([getTheme(), getShtfMode()]);
  useAppStore.setState({
    theme: theme as 'light' | 'dark' | 'shtf',
    shtfModeEnabled,
  });
}

export async function persistTheme(theme: 'light' | 'dark' | 'shtf'): Promise<void> {
  await setTheme(theme);
}

export async function persistShtfMode(enabled: boolean): Promise<void> {
  await setShtfMode(enabled);
}
