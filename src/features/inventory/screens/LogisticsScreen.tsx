/**
 * Power & Devices — external radios and power banks; last full charge vs maintenance cycle.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { database } from '../../../database';
import type PowerDevice from '../../../database/models/PowerDevice';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import {
  DEFAULT_MAINTENANCE_CYCLE_DAYS,
  isChargeStale,
} from '../../../services/powerLogisticsStatus';
import { deletePowerDeviceAndPool } from '../../../services/powerDevicePoolSync';

/** Only routes used from this screen (registered on Mission + Inventory stacks). */
type LogisticsStackNav = {
  PowerDeviceForm: { deviceId?: string };
  Logistics: undefined;
};

export function LogisticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LogisticsStackNav>>();
  const [devices, setDevices] = useState<PowerDevice[]>([]);
  const [pickerDeviceId, setPickerDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const col = database.get<PowerDevice>('power_devices');
    const sub = col.query().observe().subscribe((rows) => setDevices(rows));
    return () => sub.unsubscribe();
  }, []);

  const setChargeDate = async (device: PowerDevice, ms: number) => {
    await database.write(async () => {
      await device.update((r) => {
        r.lastFullChargeAt = ms;
        r.updatedAt = new Date();
      });
    });
    setPickerDeviceId(null);
  };

  const confirmDelete = (device: PowerDevice) => {
    Alert.alert('Remove device', `Delete "${device.name}" from Logistics and the warehouse Power entry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deletePowerDeviceAndPool(device.id).catch((e) =>
            Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed')
          );
        },
      },
    ]);
  };

  const now = Date.now();

  return (
    <View style={styles.wrap}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>Power & Devices</Text>
        <Text style={styles.desc}>
          Track full charges for field gear. STALE if no charge logged within each device&apos;s maintenance cycle.
          New devices appear in Warehouse under Power.
        </Text>

        {devices.length === 0 ? (
          <Text style={styles.empty}>No devices yet. Tap + to add radios, power banks, or other gear.</Text>
        ) : null}

        {devices.map((d) => {
          const cycleDays = d.maintenanceCycleDays ?? DEFAULT_MAINTENANCE_CYCLE_DAYS;
          const stale = isChargeStale(d.lastFullChargeAt, now, d.maintenanceCycleDays);
          const daysSince =
            d.lastFullChargeAt != null ? Math.floor((now - d.lastFullChargeAt) / (24 * 60 * 60 * 1000)) : null;
          return (
            <View key={d.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  style={styles.cardTitleBlock}
                  onPress={() => navigation.navigate('PowerDeviceForm', { deviceId: d.id })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deviceName}>{d.name}</Text>
                  {d.batteryType ? <Text style={styles.batteryMeta}>{d.batteryType}</Text> : null}
                  <Text style={styles.cycleMeta}>Maintenance: every {cycleDays} days</Text>
                </TouchableOpacity>
                <View
                  style={[
                    styles.badge,
                    stale
                      ? daysSince == null || daysSince > cycleDays + 30
                        ? styles.badgeRed
                        : styles.badgeOrange
                      : styles.badgeOk,
                  ]}
                >
                  <Text style={styles.badgeText}>{stale ? 'STALE' : 'OK'}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                Last full charge:{' '}
                {d.lastFullChargeAt != null
                  ? new Date(d.lastFullChargeAt).toLocaleDateString()
                  : 'Not set'}
              </Text>
              {daysSince != null && (
                <Text style={styles.metaMuted}>
                  {daysSince} days ago · STALE after {cycleDays} days without a logged charge
                </Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => setPickerDeviceId(d.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnText}>Set charge date</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => void setChargeDate(d, Date.now())}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnSecondaryText}>Charged today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnGhost}
                  onPress={() => navigation.navigate('PowerDeviceForm', { deviceId: d.id })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnGhostText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnGhost}
                  onPress={() => confirmDelete(d)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnDeleteText}>Remove</Text>
                </TouchableOpacity>
              </View>
              {pickerDeviceId === d.id && (
                <DateTimePicker
                  value={d.lastFullChargeAt != null ? new Date(d.lastFullChargeAt) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, date) => {
                    if (Platform.OS === 'android') setPickerDeviceId(null);
                    if (date) void setChargeDate(d, date.getTime());
                    else setPickerDeviceId(null);
                  }}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={tacticalStyles.fab}
        onPress={() => navigation.navigate('PowerDeviceForm', {})}
        accessibilityLabel="Add power device"
      >
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: tactical.black },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
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
  meta: { color: tactical.amber, fontSize: 14, marginBottom: 4 },
  metaMuted: { color: tactical.zinc[500], fontSize: 12, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    backgroundColor: tactical.amber,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnText: { color: tactical.black, fontWeight: '700', fontSize: 13 },
  btnSecondary: {
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnSecondaryText: { color: tactical.zinc[400], fontWeight: '600', fontSize: 13 },
  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnGhostText: { color: tactical.amber, fontWeight: '700', fontSize: 13 },
  btnDeleteText: { color: '#f87171', fontWeight: '700', fontSize: 13 },
});
