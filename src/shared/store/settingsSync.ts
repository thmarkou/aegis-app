/**
 * Syncs DB settings to the in-memory store on load, and persists store changes to DB.
 */

import { getSettings, setSettings } from '../../db/repositories/settings';
import { useAppStore } from './useAppStore';

export async function loadSettingsIntoStore(): Promise<void> {
  const settings = await getSettings();
  useAppStore.setState({
    theme: settings.theme,
    shtfModeEnabled: settings.shtfModeEnabled,
  });
}

export async function persistTheme(theme: 'light' | 'dark' | 'shtf'): Promise<void> {
  await setSettings({ theme });
}

export async function persistShtfMode(enabled: boolean): Promise<void> {
  await setSettings({ shtfModeEnabled: enabled });
}
