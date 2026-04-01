import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { database } from '../../../database';
import type MissionPreset from '../../../database/models/MissionPreset';
import type { MissionStackParamList } from '../../../shared/navigation/MissionStack';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

type Nav = NativeStackNavigationProp<MissionStackParamList, 'MissionPresetList'>;

function formatPresetSummary(p: MissionPreset): string {
  const kcalTotal = p.durationDays * p.caloriesPerDay;
  const waterTotal = p.durationDays * p.waterLitersPerDay;
  return `${p.durationDays}d · ${kcalTotal} kcal · ${waterTotal.toFixed(1)}L total (${p.caloriesPerDay} kcal/d · ${p.waterLitersPerDay}L/d)`;
}

export function MissionPresetListScreen() {
  const navigation = useNavigation<Nav>();
  const [presets, setPresets] = useState<MissionPreset[]>([]);

  const load = useCallback(async () => {
    const rows = await database.get<MissionPreset>('mission_presets').query().fetch();
    rows.sort((a, b) => a.name.localeCompare(b.name));
    setPresets(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleDelete = (p: MissionPreset) => {
    Alert.alert('Delete preset', `Remove "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const selected = await SecureSettings.getSelectedMissionPresetId();
          await database.write(async () => await p.markAsDeleted());
          if (selected === p.id) {
            const remaining = await database.get<MissionPreset>('mission_presets').query().fetch();
            await SecureSettings.setSelectedMissionPresetId(remaining[0]?.id ?? null);
          }
          await load();
        },
      },
    ]);
  };

  return (
    <View style={tacticalStyles.screen}>
      <Text style={styles.intro}>
        Define mission targets: duration × per-day calories and water. Readiness on the MISSION tab uses the
        selected preset.
      </Text>
      <FlatList
        data={presets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tacticalStyles.card}
            onPress={() => navigation.navigate('MissionPresetForm', { presetId: item.id })}
            onLongPress={() => handleDelete(item)}
          >
            <Text style={tacticalStyles.cardText}>{item.name}</Text>
            <Text style={tacticalStyles.cardSubtext}>{formatPresetSummary(item)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>No presets. Tap + to create one.</Text>
        }
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={() => navigation.navigate('MissionPresetForm', {})}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: tactical.zinc[500],
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    lineHeight: 20,
  },
  listContent: { paddingTop: 8, paddingBottom: 88 },
});
