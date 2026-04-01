import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { database } from '../../../database';
import type ItemTemplate from '../../../database/models/ItemTemplate';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MissionStackParamList } from '../../../shared/navigation/MissionStack';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

type Nav = NativeStackNavigationProp<MissionStackParamList | InventoryStackParamList>;

export function TemplateListScreen() {
  const navigation = useNavigation<Nav>();
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);

  const load = useCallback(async () => {
    const list = await database.get<ItemTemplate>('item_templates').query().fetch();
    setTemplates(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = () => navigation.navigate('TemplateForm', {});
  const handleEdit = (template: ItemTemplate) =>
    navigation.navigate('TemplateForm', { templateId: template.id });
  const handleDelete = (template: ItemTemplate) => {
    Alert.alert('Delete', `Remove "${template.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await database.write(async () => await template.markAsDeleted());
          await load();
        },
      },
    ]);
  };

  return (
    <View style={tacticalStyles.screen}>
      <Text style={styles.intro}>
        Blueprints are just templates. Copy them to your Warehouse to add actual items to your inventory.
      </Text>
      <Text style={styles.introSecondary}>
        Use Warehouse → Add from Templates to copy a blueprint into your pool, or Manage blueprints here to edit
        specs.
      </Text>
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tacticalStyles.card}
            onPress={() => handleEdit(item)}
            onLongPress={() => handleDelete(item)}
          >
            <Text style={tacticalStyles.cardText}>{item.name}</Text>
            <Text style={tacticalStyles.cardSubtext}>
              {item.category} · {(item.weightGrams / 1000).toFixed(2)} kg
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>No blueprints yet. Tap + to create a template.</Text>
        }
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAdd}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: tactical.zinc[400],
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    lineHeight: 20,
    fontWeight: '600',
  },
  introSecondary: {
    color: tactical.zinc[500],
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 18,
  },
  listContent: { paddingTop: 8, paddingBottom: 24 },
});
