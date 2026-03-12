/**
 * Mission Prep – checklist with toggles. READY button activates only when all checked.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tactical } from '../../../shared/tacticalStyles';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { cancelEmergencyBroadcast } from '../../../services/EmergencyService';

const CHECKLIST_ITEMS = [
  { key: 'missionCheck_radiosCharged', label: 'Radios Charged' },
  { key: 'missionCheck_antennaTuned', label: 'Antenna Tuned' },
  { key: 'missionCheck_cablesConnected', label: 'Cables Connected' },
  { key: 'missionCheck_offlineMapsVerified', label: 'Offline Maps Verified' },
  { key: 'missionCheck_emergencyRations', label: 'Emergency Rations' },
] as const;

export function MissionPrepScreen() {
  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [testMode, setTestMode] = useState(false);

  const load = useCallback(async () => {
    const state: Record<string, boolean> = {};
    for (const item of CHECKLIST_ITEMS) {
      state[item.key] = await SecureSettings.getMissionCheck(item.key);
    }
    setChecks(state);
    const tm = await SecureSettings.getTestMode();
    setTestMode(tm);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (key: string, value: boolean) => {
    await SecureSettings.setMissionCheck(key, value);
    setChecks((prev) => ({ ...prev, [key]: value }));
  };

  const allChecked = CHECKLIST_ITEMS.every((item) => checks[item.key]);

  const handleReady = () => {
    if (allChecked) {
      (navigation.getParent() as { navigate: (s: string) => void })?.navigate('Comms');
    }
  };

  const handleTestModeToggle = async (value: boolean) => {
    await SecureSettings.setTestMode(value);
    setTestMode(value);
    if (!value) {
      await cancelEmergencyBroadcast();
    }
  };

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

      <TouchableOpacity
        style={[styles.readyBtn, allChecked && styles.readyBtnActive]}
        onPress={handleReady}
        disabled={!allChecked}
        activeOpacity={0.8}
      >
        <Text style={[styles.readyBtnText, allChecked && styles.readyBtnTextActive]}>
          READY
        </Text>
      </TouchableOpacity>

      <View style={styles.testModeRow}>
        <Text style={styles.testModeLabel}>TEST_MODE</Text>
        <Switch
          value={testMode}
          onValueChange={handleTestModeToggle}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={testMode ? tactical.black : tactical.zinc[400]}
        />
      </View>

      <TouchableOpacity
        style={styles.kitsLink}
        onPress={() => navigation.navigate('KitList')}
        activeOpacity={0.7}
      >
        <Text style={styles.kitsLinkText}>Manage Kits</Text>
      </TouchableOpacity>
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
  readyBtn: {
    marginTop: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
    alignItems: 'center',
  },
  readyBtnActive: {
    borderColor: tactical.amber,
    backgroundColor: tactical.amber,
  },
  readyBtnText: {
    color: tactical.zinc[500],
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  readyBtnTextActive: {
    color: tactical.black,
  },
  testModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: tactical.zinc[700],
  },
  testModeLabel: {
    color: tactical.zinc[500],
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  kitsLink: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  kitsLinkText: {
    color: tactical.zinc[500],
    fontSize: 14,
  },
});
