import { create } from 'zustand';
import type { AuthRole, ThemeMode } from '../types';

interface AppState {
  theme: ThemeMode;
  shtfModeEnabled: boolean;
  /** null = not logged in (show login screen) */
  authRole: AuthRole | null;
  /** Global emergency overlay – visible on top of all screens */
  emergencyOverlayVisible: boolean;
  /** True when we have declared emergency; false immediately on cancel. Stops pulsing. */
  isGlobalEmergency: boolean;
  /** Incremented on cancel to force Map to reload markers */
  mapRefreshTrigger: number;

  setTheme: (theme: ThemeMode) => void;
  setShtfMode: (enabled: boolean) => void;
  toggleShtfMode: () => void;
  setAuthRole: (role: AuthRole | null) => void;
  setEmergencyOverlay: (visible: boolean) => void;
  setGlobalEmergency: (v: boolean) => void;
  triggerMapRefresh: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  shtfModeEnabled: false,
  authRole: null,
  emergencyOverlayVisible: false,
  isGlobalEmergency: false,
  mapRefreshTrigger: 0,

  setTheme: (theme) => set({ theme }),
  setShtfMode: (enabled) => set({ shtfModeEnabled: enabled }),
  toggleShtfMode: () => set((s) => ({ shtfModeEnabled: !s.shtfModeEnabled })),
  setAuthRole: (role) => set({ authRole: role }),
  setEmergencyOverlay: (visible) => set({ emergencyOverlayVisible: visible }),
  setGlobalEmergency: (v) => set({ isGlobalEmergency: v }),
  triggerMapRefresh: () => set((s) => ({ mapRefreshTrigger: s.mapRefreshTrigger + 1 })),
  logout: () => set({ authRole: null }),
}));
