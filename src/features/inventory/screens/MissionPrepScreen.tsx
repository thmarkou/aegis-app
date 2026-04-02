/**
 * Mission Prep – dynamic mission presets, readiness vs active kit, logistics rows, checklist.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MissionStackParamList } from '../../../shared/navigation/MissionStack';
import { Ionicons } from '@expo/vector-icons';
import { tactical } from '../../../shared/tacticalStyles';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { cancelEmergencyBroadcast } from '../../../services/EmergencyService';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import type MissionPreset from '../../../database/models/MissionPreset';
import { computeKitNutritionTotals, formatReadinessAgainstPreset } from '../../../services/missionReadiness';

const CHECKLIST_ITEMS = [
  { key: 'missionCheck_radiosCharged', label: 'Radios Charged' },
  { key: 'missionCheck_antennaTuned', label: 'Antenna Tuned' },
  { key: 'missionCheck_cablesConnected', label: 'Cables Connected' },
  { key: 'missionCheck_offlineMapsVerified', label: 'Offline Maps Verified' },
  { key: 'missionCheck_emergencyRations', label: 'Emergency Rations' },
] as const;

function summarizePreset(p: MissionPreset): string {
  const kcal = p.durationDays * p.caloriesPerDay;
  const water = p.durationDays * p.waterLitersPerDay;
  return `${Math.round(kcal)} kcal · ${water.toFixed(1)}L total (${p.durationDays}d @ ${p.caloriesPerDay} kcal/d, ${p.waterLitersPerDay}L/d)`;
}

export function MissionPrepScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MissionStackParamList>>();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [testMode, setTestMode] = useState(false);
  const [missionPresets, setMissionPresets] = useState<MissionPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<MissionPreset | null>(null);
  const [activeKitId, setActiveKitId] = useState<string | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);
  const [poolCount, setPoolCount] = useState(0);
  const [batteryTrackedCount, setBatteryTrackedCount] = useState(0);
  const [readinessLine, setReadinessLine] = useState<string>('');
  const [readinessOk, setReadinessOk] = useState(true);
  const [loadingReadiness, setLoadingReadiness] = useState(true);

  const kitsIdsSig = useMemo(() => kits.map((k) => k.id).sort().join(','), [kits]);

  const activeKit = useMemo(
    () => (activeKitId ? kits.find((k) => k.id === activeKitId) ?? null : null),
    [kits, activeKitId]
  );

  // Live kits so switching active kit elsewhere updates this screen without refocus.
  useEffect(() => {
    const sub = database
      .get<Kit>('kits')
      .query()
      .observe()
      .subscribe((rows) => {
        const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
        setKits(sorted);
      });
    return () => sub.unsubscribe();
  }, []);

  // Keep activeKitId aligned with SecureSettings when kit rows change (delete, sync, first launch).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sid = await SecureSettings.getActiveKitId();
      if (cancelled) return;
      if (kits.length === 0) {
        setActiveKitId(null);
        if (sid) await SecureSettings.setActiveKitId(null);
        return;
      }
      if (!sid || !kits.some((k) => k.id === sid)) {
        const next = kits[0].id;
        await SecureSettings.setActiveKitId(next);
        setActiveKitId(next);
      } else {
        setActiveKitId(sid);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kitsIdsSig]);

  // Live mission presets so chips update when rows change without refocusing this screen.
  useEffect(() => {
    const sub = database
      .get<MissionPreset>('mission_presets')
      .query()
      .observe()
      .subscribe((rows) => {
        const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
        setMissionPresets(sorted);
      });
    return () => sub.unsubscribe();
  }, []);

  const presetIdsSig = useMemo(
    () => missionPresets.map((p) => p.id).sort().join(','),
    [missionPresets]
  );

  // When preset rows are added/removed, re-resolve selection from SecureStore (e.g. new preset from form).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sid = await SecureSettings.getSelectedMissionPresetId();
      if (cancelled) return;
      setSelectedPreset((prev) => {
        const bySid = sid ? missionPresets.find((p) => p.id === sid) : null;
        if (bySid) return bySid;
        if (!prev) return missionPresets[0] ?? null;
        const updated = missionPresets.find((p) => p.id === prev.id);
        return updated ?? missionPresets[0] ?? null;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [presetIdsSig]);

  // Same IDs but field updates (e.g. edit preset): refresh model reference for readiness math.
  useEffect(() => {
    setSelectedPreset((prev) => {
      if (missionPresets.length === 0) return null;
      if (!prev) return prev;
      const updated = missionPresets.find((p) => p.id === prev.id);
      return updated ?? missionPresets[0] ?? null;
    });
  }, [missionPresets]);

  const load = useCallback(async () => {
    const state: Record<string, boolean> = {};
    for (const item of CHECKLIST_ITEMS) {
      state[item.key] = await SecureSettings.getMissionCheck(item.key);
    }
    setChecks(state);
    const tm = await SecureSettings.getTestMode();
    setTestMode(tm);
    const [poolN, poolRows] = await Promise.all([
      database.get('inventory_pool_items').query().fetchCount(),
      database.get<InventoryPoolItem>('inventory_pool_items').query().fetch(),
    ]);
    setPoolCount(poolN);
    setBatteryTrackedCount(poolRows.filter((r) => !!(r.batteryType && r.batteryType.trim())).length);
  }, []);

  const refreshReadiness = useCallback(async () => {
    setLoadingReadiness(true);
    try {
      const kid = activeKitId;
      if (!kid) {
        setReadinessLine('Create a kit (All kits) and set it active to compare packed load vs preset.');
        setReadinessOk(false);
        return;
      }
      if (!selectedPreset) {
        setReadinessLine('Create a mission preset (Edit Presets) or wait for sync.');
        setReadinessOk(false);
        return;
      }
      const totals = await computeKitNutritionTotals(kid);
      const { ok, message } = formatReadinessAgainstPreset(selectedPreset, totals);
      setReadinessOk(ok);
      setReadinessLine(message);
    } finally {
      setLoadingReadiness(false);
    }
  }, [activeKitId, selectedPreset]);

  useEffect(() => {
    refreshReadiness();
  }, [refreshReadiness]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const switchKit = async (id: string) => {
    await SecureSettings.setActiveKitId(id);
    setActiveKitId(id);
  };

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

  const selectPreset = async (p: MissionPreset) => {
    await SecureSettings.setSelectedMissionPresetId(p.id);
    setSelectedPreset(p);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>Mission Prep</Text>
      <Text style={styles.sectionDesc}>Plan Mission, active kit, and inventory vs targets.</Text>

      <View style={styles.planMissionHeader}>
        <Text style={styles.rowHeading}>Plan Mission</Text>
        <TouchableOpacity
          style={styles.editPresetsBtn}
          onPress={() => navigation.navigate('MissionPresetList')}
          activeOpacity={0.85}
        >
          <Ionicons name="options-outline" size={18} color={tactical.amber} />
          <Text style={styles.editPresetsBtnText}>Edit Presets</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.presetRow}>
        {missionPresets.length === 0 ? (
          <Text style={styles.emptyPresets}>
            No mission presets yet. Tap Edit Presets to add one and define calorie and water targets.
          </Text>
        ) : (
          missionPresets.map((p) => {
            const on = selectedPreset?.id === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.presetChip, on && styles.presetChipOn]}
                onPress={() => void selectPreset(p)}
                activeOpacity={0.85}
              >
                <Text style={[styles.presetChipText, on && styles.presetChipTextOn]}>{p.name}</Text>
                <Text style={[styles.presetMeta, on && styles.presetMetaOn]}>{summarizePreset(p)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.readinessBox}>
        {loadingReadiness ? (
          <ActivityIndicator color={tactical.amber} />
        ) : (
          <Text style={[styles.readinessText, !readinessOk && styles.readinessWarn]}>{readinessLine}</Text>
        )}
      </View>

      <View style={styles.divider} />

      <Text style={styles.blockTitle}>[ Power & Devices ]</Text>
      <TouchableOpacity style={styles.blockRow} onPress={() => navigation.navigate('Logistics')} activeOpacity={0.8}>
        <Ionicons name="battery-charging-outline" size={22} color={tactical.amber} />
        <View style={styles.blockBody}>
          <Text style={styles.blockPrimary}>Logistics & charging</Text>
          <Text style={styles.blockSecondary}>
            {batteryTrackedCount} battery-tracked item{batteryTrackedCount === 1 ? '' : 's'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={tactical.zinc[500]} />
      </TouchableOpacity>

      <Text style={styles.blockTitle}>[ Active Kits ]</Text>
      <Text style={styles.switchKitLabel}>Switch kit</Text>
      {kits.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.kitChipScroll}
          contentContainerStyle={styles.kitChipScrollContent}
        >
          {kits.map((k) => {
            const on = k.id === activeKitId;
            return (
              <TouchableOpacity
                key={k.id}
                style={[styles.kitSwitchChip, on && styles.kitSwitchChipOn]}
                onPress={() => void switchKit(k.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.kitSwitchChipText, on && styles.kitSwitchChipTextOn]} numberOfLines={1}>
                  {k.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noKitsHint}>No kits yet. Open All kits below to create one.</Text>
      )}

      {activeKit ? (
        <View style={styles.activeKitRow}>
          <TouchableOpacity
            style={styles.activeKitMain}
            onPress={() => navigation.navigate('KitDetail', { kitId: activeKit.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-outline" size={22} color={tactical.amber} />
            <View style={styles.blockBody}>
              <Text style={styles.blockPrimary}>{activeKit.name}</Text>
              <Text style={styles.blockSecondary}>Active kit · open to pack from pool</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tactical.zinc[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.activeKitEdit}
            onPress={() => navigation.navigate('KitForm', { kitId: activeKit.id })}
            accessibilityLabel="Edit active kit"
          >
            <Ionicons name="create-outline" size={22} color={tactical.amber} />
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.blockRow} onPress={() => navigation.navigate('KitList')} activeOpacity={0.8}>
        <Ionicons name="list-outline" size={22} color={tactical.amber} />
        <View style={styles.blockBody}>
          <Text style={styles.blockPrimary}>All kits</Text>
          <Text style={styles.blockSecondary}>
            {kits.length} kit{kits.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={tactical.zinc[500]} />
      </TouchableOpacity>

      <Text style={styles.blockTitle}>[ Global Inventory Pool ]</Text>
      <TouchableOpacity
        style={styles.blockRow}
        onPress={() => navigation.navigate('InventoryPool', {})}
        activeOpacity={0.8}
      >
        <Ionicons name="cube-outline" size={22} color={tactical.amber} />
        <View style={styles.blockBody}>
          <Text style={styles.blockPrimary}>Warehouse catalog</Text>
          <Text style={styles.blockSecondary}>{poolCount} item{poolCount === 1 ? '' : 's'} in pool</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={tactical.zinc[500]} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.checklistHeading}>Pre-flight checklist</Text>
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
        <Text style={[styles.readyBtnText, allChecked && styles.readyBtnTextActive]}>READY</Text>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingTop: 24, paddingBottom: 32 },
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
  planMissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  rowHeading: {
    color: tactical.zinc[400],
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    flex: 1,
  },
  editPresetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  editPresetsBtnText: {
    color: tactical.amber,
    fontSize: 13,
    fontWeight: '700',
  },
  presetRow: { gap: 10, marginBottom: 20 },
  emptyPresets: {
    color: tactical.zinc[500],
    fontSize: 14,
    lineHeight: 20,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    borderRadius: 12,
    padding: 12,
    backgroundColor: tactical.zinc[900],
  },
  presetChipOn: {
    borderColor: tactical.amber,
    backgroundColor: 'rgba(255, 191, 0, 0.12)',
  },
  presetChipText: { color: tactical.zinc[400], fontSize: 16, fontWeight: '700' },
  presetChipTextOn: { color: tactical.amber },
  presetMeta: { color: tactical.zinc[500], fontSize: 12, marginTop: 4, lineHeight: 16 },
  presetMetaOn: { color: tactical.zinc[400] },
  readinessBox: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: tactical.zinc[900],
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    marginBottom: 8,
  },
  readinessText: { color: tactical.zinc[400], fontSize: 14, lineHeight: 20 },
  readinessWarn: { color: '#f87171' },
  divider: {
    height: 1,
    backgroundColor: tactical.zinc[900],
    marginVertical: 16,
  },
  blockTitle: {
    color: tactical.amber,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  switchKitLabel: {
    color: tactical.zinc[500],
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  kitChipScroll: { marginBottom: 12 },
  kitChipScrollContent: { gap: 8, paddingRight: 8 },
  kitSwitchChip: {
    maxWidth: 200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  kitSwitchChipOn: {
    borderColor: tactical.amber,
    backgroundColor: 'rgba(255, 191, 0, 0.12)',
  },
  kitSwitchChipText: { color: tactical.zinc[400], fontSize: 14, fontWeight: '600' },
  kitSwitchChipTextOn: { color: tactical.amber },
  noKitsHint: {
    color: tactical.zinc[500],
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  activeKitRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 8,
  },
  activeKitMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  activeKitEdit: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.amber,
    backgroundColor: tactical.zinc[900],
    minWidth: 52,
  },
  blockBody: { flex: 1 },
  blockPrimary: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  blockSecondary: { color: tactical.zinc[500], fontSize: 13, marginTop: 2 },
  checklistHeading: {
    color: tactical.zinc[400],
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: tactical.zinc[700],
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
});
