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

export interface Kit {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ItemCategory =
  | 'water'
  | 'food'
  | 'medical'
  | 'shelter'
  | 'tools'
  | 'communication'
  | 'power'
  | 'other';

export interface InventoryItem {
  id: string;
  kitId: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  weightGrams: number;
  notes: string | null;
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
