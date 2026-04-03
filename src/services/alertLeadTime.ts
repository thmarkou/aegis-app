/**
 * User-defined alert lead (days before deadline) for expiry and maintenance — no hardcoded windows.
 */
import type InventoryPoolItem from '../database/models/InventoryPoolItem';
import { BATTERY_POOL_CATEGORY_KEYS } from '../shared/constants/poolCategories';
import { formatDateEuFromMs } from '../shared/utils/formatDateEu';
import { DEFAULT_MAINTENANCE_CYCLE_DAYS } from './powerLogisticsStatus';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Red / critical window: last N calendar days before a deadline (and overdue). */
export const CRITICAL_WINDOW_DAYS = 3;

export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Lead days from DB; negative/null treated as 0 (no yellow window). */
export function normalizedLeadDays(alertLeadDays: number | null | undefined): number {
  if (alertLeadDays == null || alertLeadDays < 0) return 0;
  return Math.min(3650, Math.floor(alertLeadDays));
}

export type AlertSeverity = 'ok' | 'warning' | 'critical';

export function getMaintenanceDeadlineMs(
  lastChargeAt: number | null,
  maintenanceCycleDays: number | null
): number | null {
  if (lastChargeAt == null) return null;
  const days = maintenanceCycleDays ?? DEFAULT_MAINTENANCE_CYCLE_DAYS;
  return lastChargeAt + days * DAY_MS;
}

/** Expiry “deadline”: start of the expiry date (local) — critical at or after this instant. */
export function getExpiryDeadlineMs(expiryDateMs: number): number {
  return startOfLocalDay(expiryDateMs);
}

export function severityForDeadline(
  nowMs: number,
  deadlineMs: number | null,
  leadDays: number | null | undefined
): AlertSeverity {
  if (deadlineMs == null) return 'ok';
  if (nowMs >= deadlineMs) return 'critical';
  const criticalStartMs = deadlineMs - CRITICAL_WINDOW_DAYS * DAY_MS;
  if (nowMs >= criticalStartMs) return 'critical';
  const lead = normalizedLeadDays(leadDays);
  if (lead === 0) return 'ok';
  const warningStartMs = deadlineMs - lead * DAY_MS;
  if (nowMs >= warningStartMs) return 'warning';
  return 'ok';
}

export function maxSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  const order: Record<AlertSeverity, number> = { ok: 0, warning: 1, critical: 2 };
  return order[a] >= order[b] ? a : b;
}

export function categoryNeedsBattery(category: string): boolean {
  return (BATTERY_POOL_CATEGORY_KEYS as readonly string[]).includes(category);
}

/** Deadlines used for alerts and local notifications (expiry hidden for battery-only categories). */
export function getPoolItemNotificationDeadlines(item: InventoryPoolItem): Array<{
  deadlineMs: number;
  kind: 'expiry' | 'maintenance';
}> {
  const out: Array<{ deadlineMs: number; kind: 'expiry' | 'maintenance' }> = [];
  if (!categoryNeedsBattery(item.poolCategory) && item.expiryDate != null) {
    out.push({ deadlineMs: getExpiryDeadlineMs(item.expiryDate), kind: 'expiry' });
  }
  if (categoryNeedsBattery(item.poolCategory)) {
    const hasBatt = !!(item.batteryType && item.batteryType.trim());
    if (hasBatt && item.lastChargeAt != null) {
      const m = getMaintenanceDeadlineMs(item.lastChargeAt, item.maintenanceCycleDays);
      if (m != null) out.push({ deadlineMs: m, kind: 'maintenance' });
    }
  }
  return out;
}

/** Severity from expiry + maintenance windows (ignores missing battery fields — use display helper for that). */
export function getCombinedPoolItemSeverity(
  item: InventoryPoolItem,
  nowMs: number = Date.now()
): AlertSeverity {
  const lead = item.alertLeadDays;
  let worst: AlertSeverity = 'ok';

  if (!categoryNeedsBattery(item.poolCategory) && item.expiryDate != null) {
    worst = maxSeverity(
      worst,
      severityForDeadline(nowMs, getExpiryDeadlineMs(item.expiryDate), lead)
    );
  }

  if (categoryNeedsBattery(item.poolCategory)) {
    const hasBatt = !!(item.batteryType && item.batteryType.trim());
    if (hasBatt && item.lastChargeAt != null) {
      worst = maxSeverity(
        worst,
        severityForDeadline(
          nowMs,
          getMaintenanceDeadlineMs(item.lastChargeAt, item.maintenanceCycleDays),
          lead
        )
      );
    }
  }

  return worst;
}

export type PoolAlertDisplay = 'ok' | 'warning' | 'critical' | 'missing_data';

export function getPoolItemAlertDisplay(
  item: InventoryPoolItem,
  nowMs: number = Date.now()
): PoolAlertDisplay {
  if (categoryNeedsBattery(item.poolCategory)) {
    const hasBatt = !!(item.batteryType && item.batteryType.trim());
    if (!hasBatt || item.lastChargeAt == null) return 'missing_data';
  }
  return getCombinedPoolItemSeverity(item, nowMs);
}

/** Rows for Dashboard MAINTENANCE (expiry + maintenance dates, Alert lead rules). */
export type DashboardMaintenanceAlert = {
  poolItemId: string;
  name: string;
  display: PoolAlertDisplay;
  detailLines: string[];
};

function dashboardAlertSortRank(d: PoolAlertDisplay): number {
  if (d === 'critical') return 0;
  if (d === 'missing_data') return 1;
  if (d === 'warning') return 2;
  return 99;
}

export function listDashboardMaintenanceAlerts(
  items: InventoryPoolItem[],
  nowMs: number = Date.now()
): DashboardMaintenanceAlert[] {
  const out: DashboardMaintenanceAlert[] = [];
  for (const item of items) {
    const display = getPoolItemAlertDisplay(item, nowMs);
    if (display === 'ok') continue;

    const detailLines: string[] = [];
    if (display === 'missing_data') {
      detailLines.push('Battery category: set type and last charge');
    } else {
      const lead = item.alertLeadDays;
      if (!categoryNeedsBattery(item.poolCategory) && item.expiryDate != null) {
        const sev = severityForDeadline(nowMs, getExpiryDeadlineMs(item.expiryDate), lead);
        if (sev !== 'ok') {
          detailLines.push(`Expiry ${formatDateEuFromMs(item.expiryDate)}`);
        }
      }
      if (categoryNeedsBattery(item.poolCategory)) {
        const hasBatt = !!(item.batteryType && item.batteryType.trim());
        if (hasBatt && item.lastChargeAt != null) {
          const m = getMaintenanceDeadlineMs(item.lastChargeAt, item.maintenanceCycleDays);
          if (m != null) {
            const sev = severityForDeadline(nowMs, m, lead);
            if (sev !== 'ok') {
              detailLines.push(`Charge / check due ${formatDateEuFromMs(m)}`);
            }
          }
        }
      }
    }

    out.push({
      poolItemId: item.id,
      name: item.name,
      display,
      detailLines: detailLines.length > 0 ? detailLines : ['Review in Warehouse'],
    });
  }

  out.sort((a, b) => {
    const ra = dashboardAlertSortRank(a.display);
    const rb = dashboardAlertSortRank(b.display);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export function poolItemNeedsAttention(item: InventoryPoolItem, nowMs: number = Date.now()): boolean {
  return getPoolItemAlertDisplay(item, nowMs) !== 'ok';
}

/** Form preview — same rules as persisted item. */
export type AlertFieldsInput = {
  poolCategory: string;
  expiryDateMs: number | null;
  lastChargeAt: number | null;
  maintenanceCycleDays: number | null;
  alertLeadDays: number | null;
  batteryType: string;
};

export function getPoolItemAlertDisplayFromFields(
  f: AlertFieldsInput,
  nowMs: number = Date.now()
): PoolAlertDisplay {
  if (categoryNeedsBattery(f.poolCategory)) {
    const hasBatt = !!(f.batteryType && f.batteryType.trim());
    if (!hasBatt || f.lastChargeAt == null) return 'missing_data';
  }
  const lead = f.alertLeadDays;
  let worst: AlertSeverity = 'ok';
  if (!categoryNeedsBattery(f.poolCategory) && f.expiryDateMs != null) {
    worst = maxSeverity(worst, severityForDeadline(nowMs, getExpiryDeadlineMs(f.expiryDateMs), lead));
  }
  if (categoryNeedsBattery(f.poolCategory) && f.lastChargeAt != null) {
    worst = maxSeverity(
      worst,
      severityForDeadline(
        nowMs,
        getMaintenanceDeadlineMs(f.lastChargeAt, f.maintenanceCycleDays),
        lead
      )
    );
  }
  return worst;
}

export function formatMaintenanceDueDate(
  lastChargeMs: number | null,
  cycleDays: number | null
): string {
  const d = getMaintenanceDeadlineMs(lastChargeMs, cycleDays);
  if (d == null) return '—';
  return formatDateEuFromMs(d);
}

/** Logistics row: maintenance countdown using item lead days. */
export function formatLogisticsMaintenanceCountdown(
  item: InventoryPoolItem,
  nowMs: number = Date.now()
): string {
  const lead = normalizedLeadDays(item.alertLeadDays);
  if (item.lastChargeAt == null) return 'No last charge — set in Warehouse';
  const deadlineMs = getMaintenanceDeadlineMs(item.lastChargeAt, item.maintenanceCycleDays);
  if (deadlineMs == null) return '—';
  const daysToDeadline = Math.ceil((deadlineMs - nowMs) / DAY_MS);
  if (nowMs >= deadlineMs) {
    return `Overdue (${Math.max(0, Math.abs(daysToDeadline))} d past deadline)`;
  }
  const criticalStartMs = deadlineMs - CRITICAL_WINDOW_DAYS * DAY_MS;
  if (nowMs >= criticalStartMs) {
    return `Critical window (${CRITICAL_WINDOW_DAYS} d before deadline) — ${daysToDeadline} day(s) left`;
  }
  if (lead === 0) {
    return `Deadline in ${daysToDeadline} days (set Alert lead for yellow warning)`;
  }
  const warningStartMs = deadlineMs - lead * DAY_MS;
  const daysToWarning = Math.max(0, Math.ceil((warningStartMs - nowMs) / DAY_MS));
  return `Deadline in ${daysToDeadline} days · Yellow in ${daysToWarning} d · Red at ${CRITICAL_WINDOW_DAYS} d before`;
}
