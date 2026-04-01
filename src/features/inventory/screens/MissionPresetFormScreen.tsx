import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { database } from '../../../database';
import type MissionPreset from '../../../database/models/MissionPreset';
import type { MissionStackParamList } from '../../../shared/navigation/MissionStack';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

type R = RouteProp<MissionStackParamList, 'MissionPresetForm'>;

export function MissionPresetFormScreen() {
  const route = useRoute<R>();
  const { presetId } = route.params ?? {};
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState('3');
  const [caloriesPerDay, setCaloriesPerDay] = useState('2000');
  const [waterLitersPerDay, setWaterLitersPerDay] = useState('3');

  useEffect(() => {
    if (!presetId) return;
    database
      .get<MissionPreset>('mission_presets')
      .find(presetId)
      .then((p) => {
        setName(p.name);
        setDurationDays(String(p.durationDays));
        setCaloriesPerDay(String(p.caloriesPerDay));
        setWaterLitersPerDay(String(p.waterLitersPerDay));
      })
      .catch(() => {});
  }, [presetId]);

  const handleSave = async () => {
    const n = name.trim();
    const d = Math.max(0.25, parseFloat(durationDays) || 0);
    const c = Math.max(0, parseFloat(caloriesPerDay) || 0);
    const w = Math.max(0, parseFloat(waterLitersPerDay) || 0);
    if (!n) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    await database.write(async () => {
      const col = database.get<MissionPreset>('mission_presets');
      if (presetId) {
        const row = await col.find(presetId);
        await row.update((r) => {
          r.name = n;
          r.durationDays = d;
          r.caloriesPerDay = c;
          r.waterLitersPerDay = w;
          r.updatedAt = new Date();
        });
      } else {
        await col.create((r) => {
          r.name = n;
          r.durationDays = d;
          r.caloriesPerDay = c;
          r.waterLitersPerDay = w;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      }
    });
    navigation.goBack();
  };

  const d = Math.max(0, parseFloat(durationDays) || 0);
  const c = Math.max(0, parseFloat(caloriesPerDay) || 0);
  const w = Math.max(0, parseFloat(waterLitersPerDay) || 0);
  const totalKcal = d * c;
  const totalWater = d * w;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={tacticalStyles.label}>Name</Text>
      <TextInput
        style={tacticalStyles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Winter Hunt, 72h Bug-Out"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Duration (days)</Text>
      <TextInput
        style={tacticalStyles.input}
        value={durationDays}
        onChangeText={setDurationDays}
        keyboardType="decimal-pad"
        placeholder="e.g. 3"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Calories per day</Text>
      <TextInput
        style={tacticalStyles.input}
        value={caloriesPerDay}
        onChangeText={setCaloriesPerDay}
        keyboardType="decimal-pad"
        placeholder="e.g. 2000"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Water (L) per day</Text>
      <TextInput
        style={tacticalStyles.input}
        value={waterLitersPerDay}
        onChangeText={setWaterLitersPerDay}
        keyboardType="decimal-pad"
        placeholder="e.g. 3"
        placeholderTextColor="#666"
      />
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Targets (computed)</Text>
        <Text style={styles.previewText}>
          {Math.round(totalKcal)} kcal · {totalWater.toFixed(1)}L H₂O total
        </Text>
      </View>
      <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={() => void handleSave()}>
        <Text style={tacticalStyles.btnPrimaryText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 32 },
  preview: {
    marginTop: 8,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  previewLabel: {
    color: tactical.zinc[500],
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    color: tactical.amber,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
