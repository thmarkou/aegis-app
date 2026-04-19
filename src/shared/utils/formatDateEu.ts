/**
 * European date display: DD-MM-YYYY (no extra dependencies).
 * Battery last charge: import column YYYY-MM-DD; UI uses MM-DD-YYYY (see below).
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

/** Format milliseconds as MM-DD-YYYY (battery last charge in the app UI). */
export function formatDateUsMdYFromMs(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

/** Parse MM-DD-YYYY (month-day-year) to local noon. */
export function parseUsMdYToMs(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(yyyy, month - 1, day, 12, 0, 0, 0);
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d.getTime();
}

/** Battery CSV `last_charge_date` column: YYYY-MM-DD only (import). */
export function parseIsoYmdToMs(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return null;
  const yyyy = parseInt(iso[1], 10);
  const mm = parseInt(iso[2], 10) - 1;
  const dd = parseInt(iso[3], 10);
  const d = new Date(yyyy, mm, dd, 12, 0, 0, 0);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm || d.getDate() !== dd) return null;
  return d.getTime();
}

/** Build a Date for the last-charge picker from MM-DD-YYYY. */
export function dateForPickerFromUsMdY(stored: string): Date {
  const ms = parseUsMdYToMs(stored);
  if (ms != null) return new Date(ms);
  return new Date();
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
