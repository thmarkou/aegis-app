import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { database } from '../../../database';
import type PowerDevice from '../../../database/models/PowerDevice';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import {
  createPowerDeviceWithPool,
  updatePowerDeviceAndPool,
} from '../../../services/powerDevicePoolSync';

const BATTERY_PRESETS = ['Li-ion', 'LiFePO4', 'NiMH', 'AA / AAA', '18650 pack', 'Other'] as const;

/** Params only — screen is registered on both Mission and Inventory stacks. */
type PowerDeviceFormNav = { PowerDeviceForm: { deviceId?: string } };

export function PowerDeviceFormScreen() {
  const route = useRoute<RouteProp<PowerDeviceFormNav, 'PowerDeviceForm'>>();
  const deviceId = route.params?.deviceId;
  const isCreate = deviceId == null;
  const navigation = useNavigation<NativeStackNavigationProp<PowerDeviceFormNav, 'PowerDeviceForm'>>();

  const [name, setName] = useState('');
  const [batteryType, setBatteryType] = useState('');
  const [maintenanceDays, setMaintenanceDays] = useState('90');

  useEffect(() => {
    if (isCreate) return;
    database
      .get<PowerDevice>('power_devices')
      .find(deviceId)
      .then((d) => {
        setName(d.name);
        setBatteryType(d.batteryType ?? '');
        setMaintenanceDays(
          d.maintenanceCycleDays != null ? String(d.maintenanceCycleDays) : '90'
        );
      })
      .catch(() => {
        Alert.alert('Error', 'Device not found');
        navigation.goBack();
      });
  }, [deviceId, isCreate, navigation]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Device name is required');
      return;
    }
    const days = parseInt(maintenanceDays.trim(), 10);
    if (isNaN(days) || days < 1 || days > 730) {
      Alert.alert('Error', 'Maintenance cycle must be between 1 and 730 days');
      return;
    }
    try {
      if (isCreate) {
        await createPowerDeviceWithPool({
          name: name.trim(),
          batteryType: batteryType.trim() || null,
          maintenanceCycleDays: days,
        });
      } else {
        await updatePowerDeviceAndPool(deviceId, {
          name: name.trim(),
          batteryType: batteryType.trim() || null,
          maintenanceCycleDays: days,
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={tacticalStyles.label}>Device name</Text>
      <TextInput
        style={tacticalStyles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Handheld radio"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Battery type</Text>
      <TextInput
        style={tacticalStyles.input}
        value={batteryType}
        onChangeText={setBatteryType}
        placeholder="e.g. Li-ion, AA"
        placeholderTextColor="#666"
      />
      <Text style={styles.presetHint}>Quick fill</Text>
      <View style={styles.presetRow}>
        {BATTERY_PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.presetChip, batteryType === p && styles.presetChipOn]}
            onPress={() => setBatteryType(p)}
            activeOpacity={0.85}
          >
            <Text style={[styles.presetChipText, batteryType === p && styles.presetChipTextOn]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={tacticalStyles.label}>Maintenance cycle (days)</Text>
      <Text style={styles.fieldHint}>Full charge required at least this often; used for STALE on Dashboard.</Text>
      <TextInput
        style={tacticalStyles.input}
        value={maintenanceDays}
        onChangeText={setMaintenanceDays}
        placeholder="90"
        placeholderTextColor="#666"
        keyboardType="number-pad"
      />
      <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={() => void handleSave()}>
        <Text style={tacticalStyles.btnPrimaryText}>{isCreate ? 'Add device' : 'Save'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 32 },
  fieldHint: {
    color: tactical.zinc[500],
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  presetHint: {
    color: tactical.zinc[500],
    fontSize: 12,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  presetChipOn: {
    borderColor: tactical.amber,
    backgroundColor: 'rgba(255, 191, 0, 0.12)',
  },
  presetChipText: { color: tactical.zinc[400], fontSize: 13, fontWeight: '600' },
  presetChipTextOn: { color: tactical.amber },
});
