/**
 * Export warehouse pool rows to UTF-8 CSV matching the four import templates (poolCsvImport).
 */
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import { BATTERY_POOL_CATEGORY_KEYS } from '../../../shared/constants/poolCategories';
import { formatDateEuFromMs, formatIsoYmdFromMs } from '../../../shared/utils/formatDateEu';
import type { CsvTemplateKind } from './poolCsvImport';

const HDR_TOOLS = [
  'category',
  'name',
  'unit',
  'weight_grams',
  'condition',
  'notes',
  'barcode',
  'is_essential',
] as const;

const HDR_GENERAL = [
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

const HDR_FOOD_WATER = [
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

const HDR_BATTERY = [
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

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function joinRow(cells: readonly string[]): string {
  return cells.map((c) => csvEscape(c)).join(',');
}

/** DD-MM-YYYY for CSV; empty if missing/invalid (never em dash). */
function euDateOrEmpty(ms: number | null): string {
  if (ms == null) return '';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return formatDateEuFromMs(ms);
}

export function filterItemsForExportKind(
  kind: CsvTemplateKind,
  all: InventoryPoolItem[]
): InventoryPoolItem[] {
  switch (kind) {
    case 'tools':
      return all.filter((p) => p.poolCategory === 'tools');
    case 'general':
      return all.filter(
        (p) => p.poolCategory === 'medical' || p.poolCategory === 'shelter_clothing'
      );
    case 'food_water':
      return all.filter((p) => p.poolCategory === 'consumables' || p.poolCategory === 'water');
    case 'battery':
      return all.filter((p) =>
        (BATTERY_POOL_CATEGORY_KEYS as readonly string[]).includes(p.poolCategory)
      );
    default:
      return [];
  }
}

/** CSV text (UTF-8), header + one line per item, same column order as import templates. */
export function buildPoolExportCsv(kind: CsvTemplateKind, items: InventoryPoolItem[]): string {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
  const lines: string[] = [];

  if (kind === 'tools') {
    lines.push(joinRow(HDR_TOOLS));
    for (const p of sorted) {
      lines.push(
        joinRow([
          p.poolCategory,
          p.name,
          p.unit,
          String(p.weightGrams),
          p.condition ?? '',
          p.notes ?? '',
          p.barcode ?? '',
          p.isEssential ? 'true' : 'false',
        ])
      );
    }
  } else if (kind === 'general') {
    lines.push(joinRow(HDR_GENERAL));
    for (const p of sorted) {
      const shelter = p.poolCategory === 'shelter_clothing';
      lines.push(
        joinRow([
          p.poolCategory,
          p.name,
          p.unit,
          String(p.weightGrams),
          shelter ? '' : euDateOrEmpty(p.expiryDate),
          shelter || p.alertLeadDays == null ? '' : String(p.alertLeadDays),
          p.condition ?? '',
          p.notes ?? '',
          p.barcode ?? '',
          p.isEssential ? 'true' : 'false',
        ])
      );
    }
  } else if (kind === 'food_water') {
    lines.push(joinRow(HDR_FOOD_WATER));
    for (const p of sorted) {
      const isCons = p.poolCategory === 'consumables';
      const isWater = p.poolCategory === 'water';
      lines.push(
        joinRow([
          p.poolCategory,
          p.name,
          p.unit,
          String(p.weightGrams),
          isCons && p.calories != null ? String(p.calories) : '',
          isWater && p.waterLitersPerUnit != null ? String(p.waterLitersPerUnit) : '',
          euDateOrEmpty(p.expiryDate),
          p.alertLeadDays == null ? '' : String(p.alertLeadDays),
          p.condition ?? '',
          p.notes ?? '',
          p.barcode ?? '',
          p.isEssential ? 'true' : 'false',
        ])
      );
    }
  } else {
    lines.push(joinRow(HDR_BATTERY));
    for (const p of sorted) {
      lines.push(
        joinRow([
          p.poolCategory,
          p.name,
          p.unit,
          String(p.weightGrams),
          p.alertLeadDays == null ? '' : String(p.alertLeadDays),
          p.batteryType ?? '',
          p.lastChargeAt == null ? '' : formatIsoYmdFromMs(p.lastChargeAt),
          p.maintenanceCycleDays == null ? '' : String(p.maintenanceCycleDays),
          p.batteryCapacityMah == null ? '' : String(p.batteryCapacityMah),
          p.chargingRequirements ?? '',
          p.notes ?? '',
          p.barcode ?? '',
          p.isEssential ? 'true' : 'false',
        ])
      );
    }
  }

  return lines.join('\n');
}

function exportBaseFileName(kind: CsvTemplateKind): string {
  const map: Record<CsvTemplateKind, string> = {
    tools: 'aegis_tools_export',
    general: 'aegis_general_export',
    food_water: 'aegis_food_water_export',
    battery: 'aegis_battery_export',
  };
  return map[kind];
}

/** Write CSV to cache and open the system share sheet (Files, AirDrop, mail, …). */
export async function writePoolCsvAndShare(kind: CsvTemplateKind, csvBody: string): Promise<void> {
  const base = exportBaseFileName(kind);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fname = `${base}_${stamp}.csv`;
  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    Alert.alert('Export', 'File storage is not available on this device.');
    return;
  }
  const uri = `${dir}${fname}`;
  await FileSystem.writeAsStringAsync(uri, csvBody, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (Platform.OS === 'web') {
    Alert.alert(
      'Export',
      'Download/share from the browser is not wired for CSV yet. Use iOS or Android for Export CSV.'
    );
    return;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    Alert.alert('Export', `Saved: ${fname}\nSharing is not available on this platform.`);
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export warehouse CSV',
  });
}
