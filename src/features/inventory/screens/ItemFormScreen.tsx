import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Switch, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { database } from '../../../database';
import type InventoryItem from '../../../database/models/InventoryItem';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { TemplatePicker, type TemplatePickResult } from '../components/TemplatePicker';

const CATEGORIES = ['Food', 'Water', 'Medical', 'Gear', 'Radio', 'Vehicle', 'Base Camp'];
const CONDITIONS = ['New', 'Used'] as const;

export function ItemFormScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'ItemForm'>>();
  const { kitId, itemId } = route.params;
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Gear');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [isEssential, setIsEssential] = useState(false);
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [taggingLocation, setTaggingLocation] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      setCondition(item.condition ? item.condition.charAt(0).toUpperCase() + item.condition.slice(1) : null);
      setIsEssential(item.isEssential);
      setNotes(item.notes ?? '');
      setLatitude(item.latitude ?? null);
      setLongitude(item.longitude ?? null);
    });
  }, [itemId]);

  const hasLocation = latitude != null && longitude != null;

  const handleTemplateSelect = (r: TemplatePickResult) => {
    setName(r.name);
    setCategory(r.category);
    setWeightGrams(String(r.weightGrams));
  };

  const handleTagLocation = async () => {
    if (!itemId) {
      Alert.alert('Save First', 'Save the item before tagging location.');
      return;
    }
    setTaggingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Location permission required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      await database.write(async () => {
        const item = await database.get<InventoryItem>('inventory_items').find(itemId);
        await item.update((r) => {
          r.latitude = lat;
          r.longitude = lon;
          r.updatedAt = new Date();
        });
      });
      setLatitude(lat);
      setLongitude(lon);
      Alert.alert('Tagged', 'Current location saved.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to get location');
    } finally {
      setTaggingLocation(false);
    }
  };

  const handleViewOnMap = () => {
    if (!itemId || !hasLocation) return;
    (navigation.getParent() as { navigate: (s: string, p?: object) => void })?.navigate('Map', {
      focusItemId: itemId,
    });
  };

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
          r.condition = condition?.toLowerCase() || null;
          r.isEssential = isEssential;
          r.notes = notes.trim() || null;
          r.latitude = latitude;
          r.longitude = longitude;
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
          r.condition = condition?.toLowerCase() || null;
          r.isEssential = isEssential;
          r.notes = notes.trim() || null;
          r.latitude = latitude;
          r.longitude = longitude;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      }
    });
    navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={tacticalStyles.label}>Name</Text>
      <View style={styles.nameRow}>
        <TextInput
          style={[tacticalStyles.input, styles.nameInput]}
          value={name}
          onChangeText={setName}
          placeholder="Item name or select template"
          placeholderTextColor="#666"
        />
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setPickerVisible(true)}
        >
          <Ionicons name="search" size={20} color={tactical.amber} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            /* Barcode scanner placeholder - will be implemented later */
          }}
        >
          <Ionicons name="barcode-outline" size={24} color={tactical.amber} />
        </TouchableOpacity>
      </View>
      <TemplatePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleTemplateSelect}
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
      <Text style={tacticalStyles.label}>Expiry</Text>
      <View style={styles.expiryRow}>
        <TouchableOpacity
          style={[tacticalStyles.input, styles.expiryInput]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={expiryDate ? styles.expiryText : styles.expiryPlaceholder}>
            {expiryDate || 'Tap to select date'}
          </Text>
        </TouchableOpacity>
        {expiryDate ? (
          <TouchableOpacity
            style={styles.clearExpiryBtn}
            onPress={() => setExpiryDate('')}
          >
            <Text style={styles.clearExpiryText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {showDatePicker && (
        <View style={styles.datePickerWrap}>
          <DateTimePicker
            value={expiryDate ? new Date(expiryDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (date) setExpiryDate(date.toISOString().slice(0, 10));
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[tacticalStyles.btnPrimary, styles.datePickerDone]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={tacticalStyles.btnPrimaryText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Text style={tacticalStyles.label}>Weight (g)</Text>
      <TextInput style={tacticalStyles.input} value={weightGrams} onChangeText={setWeightGrams} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#666" />
      <Text style={tacticalStyles.label}>Calories</Text>
      <TextInput style={tacticalStyles.input} value={calories} onChangeText={setCalories} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor="#666" />
      <Text style={tacticalStyles.label}>Condition</Text>
      <View style={tacticalStyles.row}>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[tacticalStyles.categoryChip, condition === c ? tacticalStyles.categoryChipActive : tacticalStyles.categoryChipInactive]}
            onPress={() => setCondition(condition === c ? null : c)}
          >
            <Text style={condition === c ? tacticalStyles.categoryChipTextActive : tacticalStyles.categoryChipTextInactive}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.switchRow}>
        <Text style={tacticalStyles.label}>Essential item</Text>
        <Switch
          value={isEssential}
          onValueChange={setIsEssential}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={isEssential ? tactical.black : tactical.zinc[400]}
        />
      </View>
      <View style={styles.locationRow}>
        <TouchableOpacity
          style={[tacticalStyles.btnPrimary, styles.tagBtn]}
          onPress={handleTagLocation}
          disabled={!itemId || taggingLocation}
        >
          {taggingLocation ? (
            <ActivityIndicator size="small" color={tactical.black} />
          ) : (
            <Ionicons name="location" size={20} color={tactical.black} />
          )}
          <Text style={[tacticalStyles.btnPrimaryText, { marginLeft: 8 }]}>Tag Current Location</Text>
        </TouchableOpacity>
        {hasLocation && (
          <TouchableOpacity
            style={[tacticalStyles.btnSecondary, styles.viewMapBtn]}
            onPress={handleViewOnMap}
          >
            <Ionicons name="map-outline" size={20} color="#ffffff" />
            <Text style={[tacticalStyles.btnSecondaryText, { marginLeft: 8 }]}>View on Map</Text>
          </TouchableOpacity>
        )}
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  nameInput: { flex: 1, marginBottom: 0 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: tactical.zinc[900],
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  expiryInput: { flex: 1, marginBottom: 0, justifyContent: 'center' },
  expiryText: { color: '#ffffff', fontSize: 16 },
  expiryPlaceholder: { color: '#666', fontSize: 16 },
  clearExpiryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: tactical.zinc[700],
  },
  clearExpiryText: { color: tactical.zinc[400], fontSize: 14 },
  datePickerWrap: { marginBottom: 16 },
  datePickerDone: { marginTop: 12 },
  locationRow: { flexDirection: 'column', gap: 12, marginBottom: 16 },
  tagBtn: { flexDirection: 'row', alignItems: 'center' },
  viewMapBtn: { flexDirection: 'row', alignItems: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
});
