/**
 * AEGIS theme: normal (light/dark) and SHTF (OLED black).
 * SHTF minimizes brightness and UI for battery survival.
 */

import type { ThemeMode } from './types';

export const colors = {
  light: {
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#166534',
    primaryText: '#ffffff',
    danger: '#b91c1c',
    warning: '#b45309',
  },
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    primary: '#22c55e',
    primaryText: '#0f172a',
    danger: '#ef4444',
    warning: '#f59e0b',
  },
  shtf: {
    background: '#000000',
    surface: '#000000',
    text: '#22c55e',
    textSecondary: '#16a34a',
    border: '#14532d',
    primary: '#22c55e',
    primaryText: '#000000',
    danger: '#dc2626',
    warning: '#ca8a04',
  },
} as const;

export function getColors(mode: ThemeMode) {
  return colors[mode];
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
} as const;
