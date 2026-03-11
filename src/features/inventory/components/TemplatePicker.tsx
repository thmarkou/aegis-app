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
} from 'react-native';
import { database } from '../../../database';
import type ItemTemplate from '../../../database/models/ItemTemplate';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

export type TemplatePickResult = {
  name: string;
  category: string;
  weightGrams: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: TemplatePickResult) => void;
};

export function TemplatePicker({ visible, onClose, onSelect }: Props) {
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
    ? templates.filter((t) =>
        t.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : templates;

  const handleSelect = (t: ItemTemplate) => {
    onSelect({
      name: t.name,
      category: t.category,
      weightGrams: t.weightGrams,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select template</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
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
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.category} · {(item.weightGrams / 1000).toFixed(2)} kg
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={tacticalStyles.emptyText}>
                {search.trim() ? 'No matching templates' : 'No templates yet'}
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
    maxHeight: '70%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  list: { maxHeight: 320 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: tactical.zinc[700],
  },
  rowName: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  rowMeta: { color: tactical.zinc[400], fontSize: 13, marginTop: 2 },
});
