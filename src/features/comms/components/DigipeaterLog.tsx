import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useDigipeaterStore } from '../../../shared/store/useDigipeaterStore';

const AMBER = '#FFBF00';
const SOFT_GREEN = '#86efac';
const ZINC_900 = '#18181b';
const ZINC_700 = '#3f3f46';
const ZINC_500 = '#71717a';

export function DigipeaterLog() {
  const entries = useDigipeaterStore((s) => s.entries);
  const prevNamesRef = useRef<Set<string>>(new Set());
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const names = entries.map((e) => e.name.toUpperCase());
    const prev = prevNamesRef.current;
    const hasNewUnique = names.some((n) => !prev.has(n));
    if (hasNewUnique && entries.length > 0) {
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 380, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 520, useNativeDriver: false }),
      ]).start();
    }
    prevNamesRef.current = new Set(names);
  }, [entries]);

  const titleColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [AMBER, SOFT_GREEN],
  });

  return (
    <View style={styles.box}>
      <Animated.Text style={[styles.title, { color: titleColor }]}>RECENT DIGIPEATERS</Animated.Text>
      <Text style={styles.hint}>
        Path entries when your packet is decoded with WIDE/path (RF, IGate, or Settings → Simulate packet).
      </Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>No digipeaters logged yet</Text>
      ) : (
        entries.map((e, i) => (
          <View key={`${e.name}-${e.seenAt}-${i}`} style={styles.row}>
            <Text style={styles.digiName}>{e.name}</Text>
            <Text style={styles.time}>{new Date(e.seenAt).toLocaleTimeString()}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: ZINC_900,
    borderWidth: 2,
    borderColor: 'rgba(255, 191, 0, 0.45)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 140,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  hint: { color: ZINC_500, fontSize: 11, marginBottom: 12, lineHeight: 16 },
  empty: { color: ZINC_500, fontSize: 14, paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: ZINC_700,
  },
  digiName: { color: AMBER, fontSize: 14, fontFamily: 'monospace', fontWeight: '600' },
  time: { color: ZINC_500, fontSize: 11 },
});
