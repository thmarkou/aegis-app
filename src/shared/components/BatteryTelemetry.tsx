import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  pct: number | null;
  battColor: string;
};

function getBatteryIcon(pct: number | null): keyof typeof Ionicons.glyphMap {
  if (pct == null) return 'battery-half-outline';
  if (pct <= 20) return 'battery-dead';
  if (pct <= 50) return 'battery-half';
  return 'battery-full';
}

export function BatteryTelemetry({ pct, battColor }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={getBatteryIcon(pct)} size={14} color={battColor} />
      <Text style={[styles.text, { color: battColor }]}>
        BATT_LVL: {pct != null ? `${pct}%` : '--'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
