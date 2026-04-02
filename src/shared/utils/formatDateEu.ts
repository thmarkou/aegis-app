/**
 * European date display: DD-MM-YYYY (no extra dependencies).
 */

/** Format milliseconds as DD-MM-YYYY for UI. */
export function formatDateEuFromMs(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Parse DD-MM-YYYY or legacy YYYY-MM-DD to local noon timestamp. */
export function parseFlexibleDateToMs(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const eu = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (eu) {
    const dd = parseInt(eu[1], 10);
    const mm = parseInt(eu[2], 10) - 1;
    const yyyy = parseInt(eu[3], 10);
    const d = new Date(yyyy, mm, dd, 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const yyyy = parseInt(iso[1], 10);
    const mm = parseInt(iso[2], 10) - 1;
    const dd = parseInt(iso[3], 10);
    const d = new Date(yyyy, mm, dd, 12, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
}

/** Build a Date for @react-native-community/datetimepicker `value` from stored DD-MM-YYYY or YYYY-MM-DD. */
export function dateForPickerFromStored(stored: string): Date {
  const ms = parseFlexibleDateToMs(stored);
  if (ms != null) return new Date(ms);
  return new Date();
}
