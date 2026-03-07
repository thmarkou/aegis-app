import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Switch } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { database } from '../../../database';
import type InventoryItem from '../../../database/models/InventoryItem';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

const CATEGORIES = ['Food', 'Water', 'Medical', 'Gear', 'Radio'];

export function ItemFormScreen() {
  const route = useRoute<RouteProp<InventoryStackParamList, 'ItemForm'>>();
  const { kitId, itemId } = route.params;
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Gear');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [isEssential, setIsEssential] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!itemId) return;
    database.get<InventoryItem>('inventory_items').find(itemId).then((item) => {
      setName(item.name);
      setCategory(item.category);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setExpiryDate(item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : '');
      setWeightGrams(String(item.weightGrams));
      setCalories(item.calories != null ? String(item.calories) : '');
      setIsEssential(item.isEssential);
      setNotes(item.notes ?? '');
    });
  }, [itemId]);

  const handleSave = async () => {
    const q = parseFloat(quantity) || 1;
    const w = parseFloat(weightGrams) || 0;
    const cal = calories.trim() ? parseFloat(calories) : null;
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    const expiry = expiryDate.trim() ? new Date(expiryDate).getTime() : null;

    await database.write(async () => {
      const items = database.get<InventoryItem>('inventory_items');
      if (itemId) {
        const item = await items.find(itemId);
        await item.update((r) => {
          r.name = name.trim();
          r.category = category;
          r.quantity = q;
          r.unit = unit.trim() || 'pcs';
          r.expiryDate = expiry;
          r.weightGrams = w;
          r.calories = cal;
          r.isEssential = isEssential;
          r.notes = notes.trim() || null;
          r.updatedAt = new Date();
        });
      } else {
        await items.create((r) => {
          r.kitId = kitId;
          r.name = name.trim();
          r.category = category;
          r.quantity = q;
          r.unit = unit.trim() || 'pcs';
          r.expiryDate = expiry;
          r.weightGrams = w;
          r.calories = cal;
          r.isEssential = isEssential;
          r.notes = notes.trim() || null;
          r.createdAt = new Date();
          r.updatedAt = new Date();
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
        placeholder="Item name"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Category</Text>
      <View style={tacticalStyles.row}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[tacticalStyles.categoryChip, category === c ? tacticalStyles.categoryChipActive : tacticalStyles.categoryChipInactive]}
            onPress={() => setCategory(c)}
          >
            <Text style={category === c ? tacticalStyles.categoryChipTextActive : tacticalStyles.categoryChipTextInactive}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[tacticalStyles.row, { flexWrap: 'nowrap' }]}>
        <View style={tacticalStyles.rowItem}>
          <Text style={tacticalStyles.label}>Qty</Text>
          <TextInput style={tacticalStyles.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
        </View>
        <View style={tacticalStyles.rowItem}>
          <Text style={tacticalStyles.label}>Unit</Text>
          <TextInput style={tacticalStyles.input} value={unit} onChangeText={setUnit} placeholder="pcs" placeholderTextColor="#666" />
        </View>
      </View>
      <Text style={tacticalStyles.label}>Expiry (YYYY-MM-DD)</Text>
      <TextInput style={tacticalStyles.input} value={expiryDate} onChangeText={setExpiryDate} placeholder="2025-12-31" placeholderTextColor="#666" />
      <Text style={tacticalStyles.label}>Weight (g)</Text>
      <TextInput style={tacticalStyles.input} value={weightGrams} onChangeText={setWeightGrams} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#666" />
      <Text style={tacticalStyles.label}>Calories</Text>
      <TextInput style={tacticalStyles.input} value={calories} onChangeText={setCalories} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor="#666" />
      <View style={styles.switchRow}>
        <Text style={tacticalStyles.label}>Essential item</Text>
        <Switch
          value={isEssential}
          onValueChange={setIsEssential}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={isEssential ? tactical.black : tactical.zinc[400]}
        />
      </View>
      <Text style={tacticalStyles.label}>Notes</Text>
      <TextInput
        style={[tacticalStyles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes"
        placeholderTextColor="#666"
        multiline
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
});
