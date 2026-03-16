import { create } from 'zustand';

export type GarminState = {
  /** Health link is active (toggle ON, permissions granted) */
  connected: boolean;
  /** Heart rate in BPM (null when not available) */
  heartRate: number | null;
  /** True if HR is from last 2h (live); false if from today (stale) */
  heartRateLive: boolean;
  /** Blood oxygen saturation 0–100 (null when not available) */
  spo2: number | null;
  /** Resting heart rate in BPM (null when not available) */
  restingHeartRate: number | null;
  /** Active energy burned today in kcal (null when not available) */
  activeEnergyKcal: number | null;
  /** Last error: HEALTH_ACCESS_DENIED, HEALTH_UNAVAILABLE, HEALTH_IOS_ONLY */
  error: string | null;
};

type GarminActions = {
  setConnected: (connected: boolean) => void;
  setHeartRate: (hr: number | null, live?: boolean) => void;
  setSpo2: (spo2: number | null) => void;
  setRestingHeartRate: (rhr: number | null) => void;
  setActiveEnergyKcal: (kcal: number | null) => void;
  setError: (err: string | null) => void;
  reset: () => void;
};

const initialState: GarminState = {
  connected: false,
  heartRate: null,
  heartRateLive: true,
  spo2: null,
  restingHeartRate: null,
  activeEnergyKcal: null,
  error: null,
};

export const useGarminStore = create<GarminState & GarminActions>((set) => ({
  ...initialState,
  setConnected: (connected) =>
    set({ connected, error: connected ? null : undefined }),
  setHeartRate: (heartRate, live = true) => set({ heartRate, heartRateLive: live }),
  setSpo2: (spo2) => set({ spo2 }),
  setRestingHeartRate: (restingHeartRate) => set({ restingHeartRate }),
  setActiveEnergyKcal: (activeEnergyKcal) => set({ activeEnergyKcal }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));

/** Builds bio string for APRS: [HR:72 SpO2:98%] */
export function buildBioString(state: Pick<GarminState, 'heartRate' | 'spo2'>): string {
  const hr = state.heartRate != null ? state.heartRate : null;
  const spo2 = state.spo2 != null ? state.spo2 : null;
  if (hr == null && spo2 == null) return '';
  const parts: string[] = [];
  if (hr != null) parts.push(`HR:${hr}`);
  if (spo2 != null) parts.push(`SpO2:${spo2}%`);
  return ` [${parts.join(' ')}]`;
}
