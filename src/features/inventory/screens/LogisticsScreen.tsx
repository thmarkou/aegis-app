/**
 * Logistics — quick charge logging for warehouse rows that have a battery type set.
 * Alert colors and countdowns use per-item `alert_lead_days` + maintenance cycle.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import { tactical } from '../../../shared/tacticalStyles';
import {
  formatLogisticsMaintenanceCountdown,
  getMaintenanceDeadlineMs,
  severityForDeadline,
  type AlertSeverity,
} from '../../../services/alertLeadTime';
import { markPoolItemChargedNow } from '../../../services/logisticsCharge';
import type { MissionStackParamList } from '../../../shared/navigation/MissionStack';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { DEFAULT_MAINTENANCE_CYCLE_DAYS } from '../../../services/powerLogisticsStatus';
import { formatDateEuFromMs } from '../../../shared/utils/formatDateEu';

function isBatteryTracked(item: InventoryPoolItem): boolean {
  return !!(item.batteryType && item.batteryType.trim());
}

function maintenanceAlertSeverity(item: InventoryPoolItem, nowMs: number): AlertSeverity {
  if (item.lastChargeAt == null) return 'critical';
  const deadline = getMaintenanceDeadlineMs(item.lastChargeAt, item.maintenanceCycleDays);
  return severityForDeadline(nowMs, deadline, item.alertLeadDays);
}

export function LogisticsScreen() {
  const navigation = useNavigation<
    NativeStackNavigationProp<MissionStackParamList & InventoryStackParamList, 'Logistics'>
  >();
  const [rows, setRows] = useState<InventoryPoolItem[]>([]);

  useEffect(() => {
    const col = database.get<InventoryPoolItem>('inventory_pool_items');
    const sub = col
      .query()
      .observe()
      .subscribe((all) => {
        const tracked = all.filter(isBatteryTracked).sort((a, b) => a.name.localeCompare(b.name));
        setRows(tracked);
      });
    return () => sub.unsubscribe();
  }, []);

  const now = Date.now();

  const emptyHint = useMemo(
    () =>
      'No battery-tracked items yet. In Warehouse, add or edit an item, set Battery type, maintenance cycle, and Alert lead time — it will appear here for quick “Charged today” logging.',
    []
  );

  return (
    <View style={styles.wrap}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>Power & Devices</Text>
        <Text style={styles.desc}>
          Countdown uses your Alert lead time (days) from each warehouse item. Yellow = in the lead window
          before the due date; red = due or overdue.
        </Text>

        {rows.length === 0 ? <Text style={styles.empty}>{emptyHint}</Text> : null}

        {rows.map((item) => {
          const cycleDays = item.maintenanceCycleDays ?? DEFAULT_MAINTENANCE_CYCLE_DAYS;
          const sev = maintenanceAlertSeverity(item, now);
          const lastMs = item.lastChargeAt;
          const countdown = formatLogisticsMaintenanceCountdown(item, now);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  <Text style={styles.batteryMeta}>{item.batteryType}</Text>
                  <Text style={styles.cycleMeta}>Maintenance cycle: {cycleDays} days</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    sev === 'critical'
                      ? styles.badgeRed
                      : sev === 'warning'
                        ? styles.badgeOrange
                        : styles.badgeOk,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {sev === 'critical' ? 'DUE' : sev === 'warning' ? 'SOON' : 'OK'}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Last full charge:{' '}
                {lastMs != null ? formatDateEuFromMs(lastMs) : 'Not set'}
              </Text>
              <Text style={styles.countdownLine}>{countdown}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => void markPoolItemChargedNow(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnSecondaryText}>Charged today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnGhost}
                  onPress={() => navigation.navigate('ItemForm', { poolItemId: item.id })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnGhostText}>Edit in Warehouse</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: tactical.black },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  title: {
    color: tactical.amber,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  desc: { color: tactical.zinc[500], fontSize: 13, marginBottom: 20, lineHeight: 18 },
  empty: { color: tactical.zinc[500], fontSize: 14, lineHeight: 20, marginBottom: 16 },
  card: {
    backgroundColor: tactical.zinc[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  deviceName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  batteryMeta: { color: tactical.zinc[500], fontSize: 13, marginTop: 4 },
  cycleMeta: { color: tactical.zinc[500], fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeOk: { backgroundColor: 'rgba(34, 197, 94, 0.25)' },
  badgeOrange: { backgroundColor: 'rgba(249, 115, 22, 0.35)' },
  badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
  badgeText: { color: tactical.amber, fontSize: 11, fontWeight: '800' },
  meta: { color: tactical.amber, fontSize: 14, marginBottom: 6 },
  countdownLine: { color: tactical.zinc[400], fontSize: 12, lineHeight: 17, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: tactical.amber,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: tactical.amber,
  },
  btnSecondaryText: { color: tactical.black, fontWeight: '700', fontSize: 13 },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnGhostText: { color: tactical.amber, fontWeight: '700', fontSize: 13 },
});
