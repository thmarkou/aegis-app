/**
 * Power & Devices — external radios and power banks; last full charge tracking.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { database } from '../../../database';
import type PowerDevice from '../../../database/models/PowerDevice';
import { tactical } from '../../../shared/tacticalStyles';
import { isChargeStale, POWER_STALE_MS } from '../../../services/powerLogisticsStatus';

export function LogisticsScreen() {
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
      });
    });
    setPickerDeviceId(null);
  };

  const now = Date.now();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>Power & Devices</Text>
      <Text style={styles.desc}>
        Track last full charge for field gear. STALE (orange/red) if no charge logged in 90 days.
      </Text>

      {devices.map((d) => {
        const stale = isChargeStale(d.lastFullChargeAt, now);
        const daysSince =
          d.lastFullChargeAt != null ? Math.floor((now - d.lastFullChargeAt) / (24 * 60 * 60 * 1000)) : null;
        return (
          <View key={d.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.deviceName}>{d.name}</Text>
              <View
                style={[
                  styles.badge,
                  stale ? (daysSince == null || daysSince > 120 ? styles.badgeRed : styles.badgeOrange) : styles.badgeOk,
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
                {daysSince} days ago · STALE after {POWER_STALE_MS / (24 * 60 * 60 * 1000)} days without charge
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
                onPress={() => setChargeDate(d, Date.now())}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>Charged today</Text>
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 40 },
  title: {
    color: tactical.amber,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  desc: { color: tactical.zinc[500], fontSize: 13, marginBottom: 20, lineHeight: 18 },
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
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
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
});
