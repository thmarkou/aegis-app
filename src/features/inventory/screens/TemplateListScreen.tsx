import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { database } from '../../../database';
import type ItemTemplate from '../../../database/models/ItemTemplate';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../../shared/navigation/SettingsStack';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

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
          <Text style={tacticalStyles.emptyText}>No templates. Add one to get started.</Text>
        }
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAdd}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingTop: 16, paddingBottom: 24 },
});
