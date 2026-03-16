import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import type { KitIconType } from '../../../shared/types';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

const KIT_ICONS: { type: KitIconType; label: string; ionicon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'backpack', label: 'Backpack', ionicon: 'bag-outline' },
  { type: 'car', label: 'Car', ionicon: 'car-outline' },
  { type: 'home', label: 'Home', ionicon: 'home-outline' },
];

export function KitFormScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'KitForm'>>();
  const { kitId } = route.params;
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [waterReservoirLiters, setWaterReservoirLiters] = useState('');
  const [iconType, setIconType] = useState<KitIconType | null>(null);

  useEffect(() => {
    database.get<Kit>('kits').find(kitId).then((k) => {
      setName(k.name);
      setDescription(k.description ?? '');
      setWaterReservoirLiters(k.waterReservoirLiters != null ? String(k.waterReservoirLiters) : '');
      setIconType((k.iconType as KitIconType) ?? null);
    });
  }, [kitId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    const waterL = waterReservoirLiters.trim() ? parseFloat(waterReservoirLiters) : null;
    if (waterL != null && (isNaN(waterL) || waterL < 0 || waterL > 20)) {
      Alert.alert('Error', 'Water reservoir must be 0–20 L');
      return;
    }
    await database.write(async () => {
      const kit = await database.get<Kit>('kits').find(kitId);
      await kit.update((r) => {
        r.name = name.trim();
        r.description = description.trim() || null;
        r.waterReservoirLiters = waterL;
        r.iconType = iconType;
        r.updatedAt = new Date();
      });
    });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={tacticalStyles.label}>Name</Text>
      <TextInput
        style={tacticalStyles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. 35L Vehicle EDC, 50L Home Bug-Out"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Description</Text>
      <TextInput
        style={[tacticalStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description"
        placeholderTextColor="#666"
        multiline
      />
      <Text style={tacticalStyles.label}>Water Reservoir (Liters)</Text>
      <TextInput
        style={tacticalStyles.input}
        value={waterReservoirLiters}
        onChangeText={setWaterReservoirLiters}
        placeholder="e.g. 2 for 50L pack, 1.5 for 35L"
        placeholderTextColor="#666"
        keyboardType="decimal-pad"
      />
      <Text style={tacticalStyles.label}>Kit Icon</Text>
      <View style={[tacticalStyles.row, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {KIT_ICONS.map(({ type, label, ionicon }) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.iconChip,
              iconType === type ? tacticalStyles.categoryChipActive : tacticalStyles.categoryChipInactive,
            ]}
            onPress={() => setIconType(iconType === type ? null : type)}
          >
            <Ionicons name={ionicon} size={20} color={iconType === type ? tactical.black : '#ffffff'} />
            <Text style={[iconType === type ? tacticalStyles.categoryChipTextActive : tacticalStyles.categoryChipTextInactive, { marginLeft: 6 }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={handleSave}>
        <Text style={tacticalStyles.btnPrimaryText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 32 },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});
