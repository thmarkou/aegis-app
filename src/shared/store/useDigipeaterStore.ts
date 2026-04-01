import { create } from 'zustand';

export type DigipeaterLogEntry = {
  name: string;
  seenAt: number;
};

const MAX_ENTRIES = 5;

type State = {
  entries: DigipeaterLogEntry[];
};

type Actions = {
  /** Records digipeaters from our own packet’s path (newest first, cap 5). */
  recordFromOurPacketPath: (digis: string[]) => void;
  clear: () => void;
};

export const useDigipeaterStore = create<State & Actions>((set) => ({
  entries: [],
  recordFromOurPacketPath: (digis) => {
    if (digis.length === 0) return;
    const now = Date.now();
    set((s) => {
      const next: DigipeaterLogEntry[] = [];
      for (const d of digis) {
        const name = d.trim();
        if (!name) continue;
        next.push({ name, seenAt: now });
      }
      const merged = [...next, ...s.entries];
      const seen = new Set<string>();
      const deduped: DigipeaterLogEntry[] = [];
      for (const e of merged) {
        const key = e.name.toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(e);
        if (deduped.length >= MAX_ENTRIES) break;
      }
      return { entries: deduped.slice(0, MAX_ENTRIES) };
    });
  },
  clear: () => set({ entries: [] }),
}));
