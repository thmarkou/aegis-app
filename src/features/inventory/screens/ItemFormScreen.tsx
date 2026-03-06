import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getColors } from '../../../shared/theme';
import { getItemById } from '../../../db/repositories/items';
import { insertItem, updateItem } from '../../../db/repositories/items';
import type { InventoryItem, ItemCategory } from '../../../shared/types';

const CATEGORIES: ItemCategory[] = [
  'water',
  'food',
  'medical',
  'shelter',
  'tools',
  'communication',
  'power',
  'other',
];

type Nav = NativeStackNavigationProp<InventoryStackParamList, 'ItemForm'>;

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ItemFormScreen() {
  const route = useRoute<RouteProp<InventoryStackParamList, 'ItemForm'>>();
  const { kitId, itemId } = route.params;
  const navigation = useNavigation<Nav>();
  const theme = useAppStore((s) => (s.shtfModeEnabled ? 'shtf' : s.theme));
  const colors = getColors(theme);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('other');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    getItemById(itemId).then((item) => {
      if (cancelled || !item) return;
      setName(item.name);
      setCategory(item.category);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setExpiryDate(item.expiryDate ?? '');
      setWeightGrams(String(item.weightGrams));
      setNotes(item.notes ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const handleSave = async () => {
    const q = parseFloat(quantity) || 1;
    const w = parseFloat(weightGrams) || 0;
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (itemId) {
      await updateItem(itemId, {
        name: name.trim(),
        category,
        quantity: q,
        unit: unit.trim() || 'pcs',
        expiryDate: expiryDate.trim() || null,
        weightGrams: w,
        notes: notes.trim() || null,
      });
    } else {
      await insertItem({
        id: uuid(),
        kitId,
        name: name.trim(),
        category,
        quantity: q,
        unit: unit.trim() || 'pcs',
        expiryDate: expiryDate.trim() || null,
        weightGrams: w,
        notes: notes.trim() || null,
      });
    }
    navigation.goBack();
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Item name"
        placeholderTextColor={colors.textSecondary}
      />
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, category === c && styles.chipActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Quantity / Unit</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.half]}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="1"
        />
        <TextInput
          style={[styles.input, styles.half]}
          value={unit}
          onChangeText={setUnit}
          placeholder="pcs"
        />
      </View>
      <Text style={styles.label}>Expiry (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={expiryDate}
        onChangeText={setExpiryDate}
        placeholder="2025-12-31"
        placeholderTextColor={colors.textSecondary}
      />
      <Text style={styles.label}>Weight (grams)</Text>
      <TextInput
        style={styles.input}
        value={weightGrams}
        onChangeText={setWeightGrams}
        keyboardType="decimal-pad"
        placeholder="0"
      />
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        placeholderTextColor={colors.textSecondary}
        multiline
      />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 32 },
    label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 4 },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    row: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text, fontSize: 13 },
    chipTextActive: { color: colors.primaryText },
    notes: { minHeight: 80, textAlignVertical: 'top' },
    saveBtn: {
      marginTop: 24,
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveBtnText: { color: colors.primaryText, fontSize: 18, fontWeight: '600' },
  });
}
