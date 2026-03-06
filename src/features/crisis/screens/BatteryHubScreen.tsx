import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Battery from 'expo-battery';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getColors } from '../../../shared/theme';

/**
 * Battery Hub (MVP): phone battery level only.
 * Phase 2+: Radio, Powerbank, Watch.
 */
export function BatteryHubScreen() {
  const theme = useAppStore((s) => (s.shtfModeEnabled ? 'shtf' : s.theme));
  const colors = getColors(theme);
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    let subscribed = true;
    (async () => {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      if (subscribed) setLevel(batteryLevel);
      const chargingStatus = await Battery.getBatteryStateAsync();
      if (subscribed) setCharging(chargingStatus === Battery.BatteryState.CHARGING);
    })();
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      if (subscribed) setLevel(batteryLevel);
    });
    const sub2 = Battery.addBatteryStateListener(({ batteryState }) => {
      if (subscribed) setCharging(batteryState === Battery.BatteryState.CHARGING);
    });
    return () => {
      subscribed = false;
      sub.remove();
      sub2.remove();
    };
  }, []);

  const styles = makeStyles(colors);
  const pct = level != null ? Math.round(level * 100) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Battery</Text>
      <View style={styles.card}>
        <Text style={styles.deviceLabel}>Phone</Text>
        <View style={styles.row}>
          <View style={styles.barBg}>
            <View
              style={[
                styles.barFill,
                { width: `${pct ?? 0}%` },
                (pct != null && pct < 20) && styles.barLow,
              ]}
            />
          </View>
          <Text style={styles.pct}>{pct != null ? `${pct}%` : '…'}</Text>
        </View>
        {charging && <Text style={styles.charging}>Charging</Text>}
      </View>
      <Text style={styles.hint}>Radio, powerbank, watch in a later update.</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 24 },
    card: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deviceLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    barBg: {
      flex: 1,
      height: 12,
      backgroundColor: colors.background,
      borderRadius: 6,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 6,
    },
    barLow: { backgroundColor: colors.danger },
    pct: { fontSize: 18, fontWeight: '600', color: colors.text, minWidth: 44 },
    charging: { fontSize: 13, color: colors.primary, marginTop: 8 },
    hint: { fontSize: 13, color: colors.textSecondary, marginTop: 24 },
  });
}
