/**
 * Bulk import warehouse pool items from UTF-8 CSV (export from Excel).
 * Templates: tools, medical_shelter (general), food_water, battery — see assets/import-templates/.
 */
import * as FileSystem from 'expo-file-system';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import {
  BATTERY_POOL_CATEGORY_KEYS,
  POOL_CATEGORY_KEYS,
  type PoolCategory,
} from '../../../shared/constants/poolCategories';
import { parseFlexibleDateToMs, parseIsoYmdToMs } from '../../../shared/utils/formatDateEu';
import { refreshInventoryNotifications } from './refreshInventoryNotifications';

export type CsvTemplateKind = 'tools' | 'general' | 'food_water' | 'battery';

export type PoolCsvImportResult = {
  imported: number;
  errors: string[];
};

/** React Native / Hermes has no global `atob`; decode Base64 to bytes in JS. */
function base64ToUint8Array(b64: string): Uint8Array {
  const s = b64.replace(/\s/g, '');
  const len = s.length;
  if (len % 4 !== 0) {
    throw new Error('Invalid base64 length');
  }
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const outLen = (len * 3) / 4 - pad;
  const out = new Uint8Array(outLen);

  const six = (code: number): number => {
    if (code >= 65 && code <= 90) return code - 65;
    if (code >= 97 && code <= 122) return code - 71;
    if (code >= 48 && code <= 57) return code + 4;
    if (code === 43) return 62;
    if (code === 47) return 63;
    return 0;
  };

  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const a = six(s.charCodeAt(i));
    const b = six(s.charCodeAt(i + 1));
    const c = s.charCodeAt(i + 2) === 61 ? 0 : six(s.charCodeAt(i + 2));
    const d = s.charCodeAt(i + 3) === 61 ? 0 : six(s.charCodeAt(i + 3));
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < outLen) out[o++] = (n >> 16) & 255;
    if (o < outLen) out[o++] = (n >> 8) & 255;
    if (o < outLen) out[o++] = n & 255;
  }
  return out;
}

/**
 * Prefer UTF-8 string read (valid for our templates and most UTF-8 CSV).
 * Fallback: raw bytes via Base64 + lenient UTF-8 when native UTF-8 read fails (e.g. Excel ANSI).
 */
export async function readTextFileLenientUtf8(uri: string): Promise<string> {
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToUint8Array(b64);
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

const DEFAULT_ALERT_LEAD = 14;
const DEFAULT_MAINTENANCE_CYCLE = 90;

const TOOLS_CATEGORIES: readonly PoolCategory[] = ['tools'];
const MEDICAL_SHELTER_CATEGORIES: readonly PoolCategory[] = ['medical', 'shelter_clothing'];
const FOOD_WATER_CATEGORIES: readonly PoolCategory[] = ['consumables', 'water'];

/** Strip BOM, split CSV with quoted fields. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let i = 0;
  let inQ = false;
  while (i < t.length) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(cur);
      cur = '';
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(cur);
      cur = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row.map((x) => x.trim()));
      row = [];
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  row.push(cur);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row.map((x) => x.trim()));
  return rows;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function rowToMap(headers: string[], cells: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    m[headers[i]] = cells[i] ?? '';
  }
  return m;
}

function parseBool(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t === '1' || t === 'true' || t === 'yes' || t === 'y';
}

function parseOptFloat(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function parseRequiredInt(s: string, fallback: number): number {
  const t = s.trim();
  if (!t) return fallback;
  const n = parseInt(t, 10);
  return isNaN(n) ? fallback : n;
}

function isPoolKey(s: string): s is PoolCategory {
  return (POOL_CATEGORY_KEYS as readonly string[]).includes(s);
}

const EXPECTED_TOOLS = [
  'category',
  'name',
  'unit',
  'weight_grams',
  'condition',
  'notes',
  'barcode',
  'is_essential',
] as const;

const EXPECTED_MEDICAL_SHELTER = [
  'category',
  'name',
  'unit',
  'weight_grams',
  'expiry',
  'alert_lead_days',
  'condition',
  'notes',
  'barcode',
  'is_essential',
] as const;

const EXPECTED_FOOD_WATER = [
  'category',
  'name',
  'unit',
  'weight_grams',
  'calories',
  'liters_per_unit',
  'expiry',
  'alert_lead_days',
  'condition',
  'notes',
  'barcode',
  'is_essential',
] as const;

const EXPECTED_BATTERY = [
  'category',
  'name',
  'unit',
  'weight_grams',
  'alert_lead_days',
  'battery_type',
  'last_charge_date',
  'maintenance_cycle_days',
  'battery_capacity_mah',
  'charging_requirements',
  'notes',
  'barcode',
  'is_essential',
] as const;

function headersMatch(expected: readonly string[], got: string[]): boolean {
  if (got.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (normalizeHeader(got[i]) !== expected[i]) return false;
  }
  return true;
}

async function createPoolRow(builder: (row: InventoryPoolItem) => void): Promise<void> {
  await database.write(async () => {
    await database.get<InventoryPoolItem>('inventory_pool_items').create(builder);
  });
}

export async function importPoolCsv(
  csvText: string,
  kind: CsvTemplateKind
): Promise<PoolCsvImportResult> {
  const errors: string[] = [];
  let imported = 0;
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { imported: 0, errors: ['File is empty or has no data rows.'] };
  }
  const rawHeaders = rows[0].map(normalizeHeader);
  let expected: readonly string[];
  if (kind === 'tools') expected = EXPECTED_TOOLS;
  else if (kind === 'general') expected = EXPECTED_MEDICAL_SHELTER;
  else if (kind === 'food_water') expected = EXPECTED_FOOD_WATER;
  else expected = EXPECTED_BATTERY;

  if (!headersMatch(expected, rawHeaders)) {
    return {
      imported: 0,
      errors: [
        `Header row must match the ${kind} template exactly. Expected columns: ${expected.join(', ')}`,
      ],
    };
  }

  const dataRows = rows.slice(1);
  for (let ri = 0; ri < dataRows.length; ri++) {
    const lineNo = ri + 2;
    const cells = dataRows[ri];
    if (cells.every((c) => !c.trim())) continue;
    while (cells.length < expected.length) cells.push('');
    const rec = rowToMap([...expected], cells);

    const name = rec.name?.trim() ?? '';
    if (!name) {
      errors.push(`Line ${lineNo}: name is required`);
      continue;
    }

    const catRaw = (rec.category ?? '').trim().toLowerCase();
    if (!isPoolKey(catRaw)) {
      errors.push(`Line ${lineNo}: invalid category "${rec.category}"`);
      continue;
    }

    if (kind === 'tools') {
      if (!TOOLS_CATEGORIES.includes(catRaw)) {
        errors.push(`Line ${lineNo}: category must be tools`);
        continue;
      }
      const unit = rec.unit?.trim() || 'pcs';
      const weightGrams = parseOptFloat(rec.weight_grams) ?? 0;
      const condition = rec.condition?.trim() ? rec.condition.trim().toLowerCase() : null;
      const notes = rec.notes?.trim() || null;
      const barcode = rec.barcode?.trim() || null;
      const isEssential = parseBool(rec.is_essential);

      try {
        await createPoolRow((r) => {
          r.name = name;
          r.poolCategory = catRaw;
          r.unit = unit;
          r.weightGrams = weightGrams;
          r.expiryDate = null;
          r.calories = null;
          r.waterLitersPerUnit = null;
          r.condition = condition;
          r.notes = notes;
          r.barcode = barcode;
          r.isEssential = isEssential;
          r.latitude = null;
          r.longitude = null;
          r.isWaypoint = false;
          r.batteryType = null;
          r.lastChargeAt = null;
          r.batteryCapacityMah = null;
          r.chargingRequirements = null;
          r.maintenanceCycleDays = null;
          r.alertLeadDays = null;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
        imported++;
      } catch (e) {
        errors.push(`Line ${lineNo}: ${e instanceof Error ? e.message : 'Save failed'}`);
      }
      continue;
    }

    if (kind === 'general') {
      if (!MEDICAL_SHELTER_CATEGORIES.includes(catRaw)) {
        errors.push(`Line ${lineNo}: category must be medical or shelter_clothing`);
        continue;
      }
      const isShelter = catRaw === 'shelter_clothing';
      const unit = rec.unit?.trim() || 'pcs';
      const weightGrams = parseOptFloat(rec.weight_grams) ?? 0;
      const expiryMs =
        !isShelter && rec.expiry?.trim() ? parseFlexibleDateToMs(rec.expiry.trim()) : null;
      if (!isShelter && rec.expiry?.trim() && expiryMs == null) {
        errors.push(`Line ${lineNo}: invalid expiry (use DD-MM-YYYY)`);
        continue;
      }
      const alertLead = isShelter
        ? null
        : parseRequiredInt(rec.alert_lead_days, DEFAULT_ALERT_LEAD);
      const condition = rec.condition?.trim() ? rec.condition.trim().toLowerCase() : null;
      const notes = rec.notes?.trim() || null;
      const barcode = rec.barcode?.trim() || null;
      const isEssential = parseBool(rec.is_essential);

      try {
        await createPoolRow((r) => {
          r.name = name;
          r.poolCategory = catRaw;
          r.unit = unit;
          r.weightGrams = weightGrams;
          r.expiryDate = expiryMs;
          r.calories = null;
          r.waterLitersPerUnit = null;
          r.condition = condition;
          r.notes = notes;
          r.barcode = barcode;
          r.isEssential = isEssential;
          r.latitude = null;
          r.longitude = null;
          r.isWaypoint = false;
          r.batteryType = null;
          r.lastChargeAt = null;
          r.batteryCapacityMah = null;
          r.chargingRequirements = null;
          r.maintenanceCycleDays = null;
          r.alertLeadDays =
            alertLead == null ? null : Math.min(3650, Math.max(1, alertLead));
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
        imported++;
      } catch (e) {
        errors.push(`Line ${lineNo}: ${e instanceof Error ? e.message : 'Save failed'}`);
      }
      continue;
    }

    if (kind === 'food_water') {
      if (!FOOD_WATER_CATEGORIES.includes(catRaw)) {
        errors.push(`Line ${lineNo}: category must be consumables or water`);
        continue;
      }
      const unit = rec.unit?.trim() || 'pcs';
      const weightGrams = parseOptFloat(rec.weight_grams) ?? 0;
      const calories =
        catRaw === 'consumables' && rec.calories?.trim()
          ? parseOptFloat(rec.calories)
          : null;
      const waterL =
        catRaw === 'water' && rec.liters_per_unit?.trim()
          ? parseOptFloat(rec.liters_per_unit)
          : null;
      const expiryMs = rec.expiry?.trim()
        ? parseFlexibleDateToMs(rec.expiry.trim())
        : null;
      if (rec.expiry?.trim() && expiryMs == null) {
        errors.push(`Line ${lineNo}: invalid expiry (use DD-MM-YYYY)`);
        continue;
      }
      const alertLead = parseRequiredInt(rec.alert_lead_days, DEFAULT_ALERT_LEAD);
      const condition = rec.condition?.trim() ? rec.condition.trim().toLowerCase() : null;
      const notes = rec.notes?.trim() || null;
      const barcode = rec.barcode?.trim() || null;
      const isEssential = parseBool(rec.is_essential);

      try {
        await createPoolRow((r) => {
          r.name = name;
          r.poolCategory = catRaw;
          r.unit = unit;
          r.weightGrams = weightGrams;
          r.expiryDate = expiryMs;
          r.calories = calories;
          r.waterLitersPerUnit = waterL;
          r.condition = condition;
          r.notes = notes;
          r.barcode = barcode;
          r.isEssential = isEssential;
          r.latitude = null;
          r.longitude = null;
          r.isWaypoint = false;
          r.batteryType = null;
          r.lastChargeAt = null;
          r.batteryCapacityMah = null;
          r.chargingRequirements = null;
          r.maintenanceCycleDays = null;
          r.alertLeadDays = Math.min(3650, Math.max(1, alertLead));
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
        imported++;
      } catch (e) {
        errors.push(`Line ${lineNo}: ${e instanceof Error ? e.message : 'Save failed'}`);
      }
      continue;
    }

    // battery
    if (!(BATTERY_POOL_CATEGORY_KEYS as readonly string[]).includes(catRaw)) {
      errors.push(
        `Line ${lineNo}: category must be one of: ${BATTERY_POOL_CATEGORY_KEYS.join(', ')}`
      );
      continue;
    }
    const unit = rec.unit?.trim() || 'pcs';
    const weightGrams = parseOptFloat(rec.weight_grams) ?? 0;
    const alertLead = parseRequiredInt(rec.alert_lead_days, DEFAULT_ALERT_LEAD);
    const batteryType = rec.battery_type?.trim() || null;
    const lastChargeMs = rec.last_charge_date?.trim()
      ? parseIsoYmdToMs(rec.last_charge_date.trim())
      : null;
    if (rec.last_charge_date?.trim() && lastChargeMs == null) {
      errors.push(`Line ${lineNo}: invalid last_charge_date (use YYYY-MM-DD)`);
      continue;
    }
    if (!batteryType) {
      errors.push(`Line ${lineNo}: battery_type is required`);
      continue;
    }
    if (lastChargeMs == null) {
      errors.push(`Line ${lineNo}: last_charge_date is required`);
      continue;
    }
    const maintenanceCycle = parseRequiredInt(rec.maintenance_cycle_days, DEFAULT_MAINTENANCE_CYCLE);
    const cap = rec.battery_capacity_mah?.trim()
      ? parseOptFloat(rec.battery_capacity_mah)
      : null;
    const chargingReq = rec.charging_requirements?.trim() || null;
    const notes = rec.notes?.trim() || null;
    const barcode = rec.barcode?.trim() || null;
    const isEssential = parseBool(rec.is_essential);

    try {
      await createPoolRow((r) => {
        r.name = name;
        r.poolCategory = catRaw;
        r.unit = unit;
        r.weightGrams = weightGrams;
        r.expiryDate = null;
        r.calories = null;
        r.waterLitersPerUnit = null;
        r.condition = null;
        r.notes = notes;
        r.barcode = barcode;
        r.isEssential = isEssential;
        r.latitude = null;
        r.longitude = null;
        r.isWaypoint = false;
        r.batteryType = batteryType;
        r.lastChargeAt = lastChargeMs;
        r.batteryCapacityMah = cap;
        r.chargingRequirements = chargingReq;
        r.maintenanceCycleDays = Math.min(730, Math.max(1, maintenanceCycle));
        r.alertLeadDays = Math.min(3650, Math.max(1, alertLead));
        r.createdAt = new Date();
        r.updatedAt = new Date();
      });
      imported++;
    } catch (e) {
      errors.push(`Line ${lineNo}: ${e instanceof Error ? e.message : 'Save failed'}`);
    }
  }

  if (imported > 0) {
    refreshInventoryNotifications().catch(() => {});
  }

  return { imported, errors };
}
