import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, Platform } from 'react-native';
import { tactical } from '../../../shared/tacticalStyles';
import * as SecureSettings from '../../../shared/services/secureSettings';

const CHECKLIST_ITEMS = [
  { key: 'missionCheck_radiosCharged', label: 'Radios Charged' },
  { key: 'missionCheck_antennaTuned', label: 'Antenna Tuned' },
  { key: 'missionCheck_cablesConnected', label: 'Cables Connected' },
  { key: 'missionCheck_offlineMapsVerified', label: 'Offline Maps Verified' },
  { key: 'missionCheck_emergencyRations', label: 'Emergency Rations' },
] as const;

export function MissionPrepScreen() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const state: Record<string, boolean> = {};
    for (const item of CHECKLIST_ITEMS) {
      state[item.key] = await SecureSettings.getMissionCheck(item.key);
    }
    setChecks(state);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (key: string, value: boolean) => {
    await SecureSettings.setMissionCheck(key, value);
    setChecks((prev) => ({ ...prev, [key]: value }));
  };

  const allChecked = CHECKLIST_ITEMS.every((item) => checks[item.key]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>Mission Prep</Text>
      <Text style={styles.sectionDesc}>
        Pre-flight checks. All must be checked for mission readiness.
      </Text>

      {CHECKLIST_ITEMS.map((item) => (
        <View key={item.key} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Switch
            value={checks[item.key] ?? false}
            onValueChange={(v) => handleToggle(item.key, v)}
            trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
            thumbColor={(checks[item.key] ?? false) ? tactical.black : tactical.zinc[400]}
          />
        </View>
      ))}

      <View style={[styles.statusBox, allChecked && styles.statusReady]}>
        <Text style={[styles.statusText, allChecked && styles.statusTextReady]}>
          {allChecked ? 'READY FOR MISSION' : 'NOT READY'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingTop: 24, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tactical.zinc[700],
  },
  title: {
    color: tactical.amber,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDesc: {
    color: tactical.zinc[500],
    fontSize: 14,
    marginBottom: 16,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBox: {
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
    alignItems: 'center',
  },
  statusReady: {
    borderColor: tactical.amber,
    backgroundColor: 'rgba(255, 191, 0, 0.1)',
  },
  statusText: {
    color: tactical.zinc[500],
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusTextReady: {
    color: tactical.amber,
  },
});
