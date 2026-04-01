import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { database } from '../../../database';
import type ItemTemplate from '../../../database/models/ItemTemplate';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import { mapLegacyCategoryToPoolCategory } from '../../../shared/constants/poolCategories';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after a pool item is created from a template */
  onAdded?: () => void;
};

export function AddFromTemplatesModal({ visible, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);

  const load = useCallback(async () => {
    const list = await database.get<ItemTemplate>('item_templates').query().fetch();
    setTemplates(list);
  }, []);

  useEffect(() => {
    if (visible) {
      load();
      setSearch('');
    }
  }, [visible, load]);

  const filtered = search.trim()
    ? templates.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : templates;

  const addTemplateToPool = async (t: ItemTemplate) => {
    try {
      await database.write(async () => {
        await database.get<InventoryPoolItem>('inventory_pool_items').create((r) => {
          r.name = t.name.trim();
          r.poolCategory = mapLegacyCategoryToPoolCategory(t.category);
          r.unit = 'pcs';
          r.weightGrams = t.weightGrams;
          r.expiryDate = t.expiryDate;
          r.calories = null;
          r.waterLitersPerUnit = null;
          r.isEssential = false;
          r.condition = null;
          r.notes = null;
          r.barcode = t.barcode;
          r.latitude = null;
          r.longitude = null;
          r.isWaypoint = false;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      });
      onAdded?.();
      onClose();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not add item');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add from templates</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Quick-add common items (MRE, radio, etc.) to your pool. Edit details after if needed.
          </Text>
          <TextInput
            style={tacticalStyles.input}
            value={search}
            onChangeText={setSearch}
            placeholder="Search templates..."
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => void addTemplateToPool(item)} activeOpacity={0.75}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.category} · {(item.weightGrams / 1000).toFixed(2)} kg
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={tacticalStyles.emptyText}>
                {search.trim() ? 'No matching templates' : 'No templates. Manage catalog from this screen.'}
              </Text>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: tactical.black,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '78%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: tactical.amber,
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    color: tactical.zinc[400],
    fontSize: 24,
    padding: 4,
  },
  hint: {
    color: tactical.zinc[500],
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  list: { maxHeight: 360 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: tactical.zinc[700],
  },
  rowName: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  rowMeta: { color: tactical.zinc[400], fontSize: 13, marginTop: 2 },
});
