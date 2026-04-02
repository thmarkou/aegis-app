/**
 * Shared domain types for AEGIS.
 * Kept in one place so DB, store and UI stay aligned.
 */

export type ThemeMode = 'light' | 'dark' | 'shtf';

/** Admin can read/write everything. User has read-only access. */
export type AuthRole = 'admin' | 'user';

export interface Profile {
  id: string;
  name: string;
  bodyWeightKg: number;
  createdAt: string;
  updatedAt: string;
}

/** Kit icon type for visual identification. */
export type KitIconType = 'backpack' | 'car' | 'home' | 'edc_belt';

export interface Kit {
  id: string;
  name: string;
  description: string | null;
  waterReservoirLiters: number | null;
  iconType: KitIconType | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScalingRule {
  waterLitersPerPersonPerDay: number;
  caloriesPerPersonPerDay: number;
  /** Days to plan for when showing "for X people for Y days" */
  defaultDays: number;
}

export interface AppSettings {
  theme: ThemeMode;
  shtfModeEnabled: boolean;
  expiryNotificationDays: number;
  weightWarningPercent: number;
  unitSystem: 'metric' | 'imperial';
}
