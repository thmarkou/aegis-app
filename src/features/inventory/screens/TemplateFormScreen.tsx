import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { database } from '../../../database';
import type ItemTemplate from '../../../database/models/ItemTemplate';
import type { SettingsStackParamList } from '../../../shared/navigation/SettingsStack';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

const CATEGORIES = ['Food', 'Water', 'Medical', 'Gear', 'Radio', 'Vehicle', 'Base Camp'];

export function TemplateFormScreen() {
  const route = useRoute<RouteProp<SettingsStackParamList, 'TemplateForm'>>();
  const { templateId } = route.params ?? {};
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Gear');
  const [weightGrams, setWeightGrams] = useState('');

  useEffect(() => {
    if (!templateId) return;
    database.get<ItemTemplate>('item_templates').find(templateId).then((t) => {
      setName(t.name);
      setCategory(t.category);
      setWeightGrams(String(t.weightGrams));
    });
  }, [templateId]);

  const handleSave = async () => {
    const w = parseFloat(weightGrams) || 0;
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    await database.write(async () => {
      const templates = database.get<ItemTemplate>('item_templates');
      if (templateId) {
        const t = await templates.find(templateId);
        await t.update((r) => {
          r.name = name.trim();
          r.category = category;
          r.weightGrams = w;
        });
      } else {
        await templates.create((r) => {
          r.name = name.trim();
          r.category = category;
          r.weightGrams = w;
          r.expiryDate = null;
        });
      }
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
        placeholder="e.g. Quansheng UV-K5 (250g)"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Category</Text>
      <View style={tacticalStyles.row}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              tacticalStyles.categoryChip,
              category === c ? tacticalStyles.categoryChipActive : tacticalStyles.categoryChipInactive,
            ]}
            onPress={() => setCategory(c)}
          >
            <Text
              style={
                category === c ? tacticalStyles.categoryChipTextActive : tacticalStyles.categoryChipTextInactive
              }
            >
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={tacticalStyles.label}>Weight (g)</Text>
      <TextInput
        style={tacticalStyles.input}
        value={weightGrams}
        onChangeText={setWeightGrams}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#666"
      />
      <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={handleSave}>
        <Text style={tacticalStyles.btnPrimaryText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 32 },
});
