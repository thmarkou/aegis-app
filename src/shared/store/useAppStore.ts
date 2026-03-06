import { create } from 'zustand';
import type { AuthRole, ThemeMode } from '../types';

interface AppState {
  theme: ThemeMode;
  shtfModeEnabled: boolean;
  /** null = not logged in (show login screen) */
  authRole: AuthRole | null;

  setTheme: (theme: ThemeMode) => void;
  setShtfMode: (enabled: boolean) => void;
  toggleShtfMode: () => void;
  setAuthRole: (role: AuthRole | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  shtfModeEnabled: false,
  authRole: null,

  setTheme: (theme) => set({ theme }),
  setShtfMode: (enabled) => set({ shtfModeEnabled: enabled }),
  toggleShtfMode: () => set((s) => ({ shtfModeEnabled: !s.shtfModeEnabled })),
  setAuthRole: (role) => set({ authRole: role }),
  logout: () => set({ authRole: null }),
}));
