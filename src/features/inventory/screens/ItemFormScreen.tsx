import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import type KitPackItem from '../../../database/models/KitPackItem';
import type ItemTemplate from '../../../database/models/ItemTemplate';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { TemplatePicker, type TemplatePickResult } from '../components/TemplatePicker';
import { BarcodeScannerModal, type BarcodeScanResult } from '../components/BarcodeScannerModal';
import { refreshInventoryNotifications } from '../services/refreshInventoryNotifications';
import {
  POOL_CATEGORY_KEYS,
  POOL_CATEGORY_LABELS,
  mapLegacyCategoryToPoolCategory,
  type PoolCategory,
} from '../../../shared/constants/poolCategories';

const CONDITIONS = ['New', 'Used'] as const;

export function ItemFormScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'ItemForm'>>();
  const { kitId, poolItemId, packItemId } = route.params ?? {};
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [poolCategory, setPoolCategory] = useState<PoolCategory>('tools');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [waterLitersPerUnit, setWaterLitersPerUnit] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [isEssential, setIsEssential] = useState(false);
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isWaypoint, setIsWaypoint] = useState(false);
  const [taggingLocation, setTaggingLocation] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isNewInKit = kitId != null && packItemId == null && poolItemId == null;
  const isPoolOnlyEdit = poolItemId != null && kitId == null;
  const isNewPoolOnly =
    kitId == null && poolItemId == null && packItemId == null;

  useEffect(() => {
    if (!poolItemId && !packItemId) return;

    const load = async () => {
      if (packItemId) {
        const pack = await database.get<KitPackItem>('kit_pack_items').find(packItemId);
        const pool = await pack.poolItem.fetch();
        setQuantity(String(pack.quantity));
        applyPoolToForm(pool);
        return;
      }
      if (poolItemId) {
        const pool = await database.get<InventoryPoolItem>('inventory_pool_items').find(poolItemId);
        applyPoolToForm(pool);
      }
    };
    load().catch(() => {});
  }, [poolItemId, packItemId]);

  function applyPoolToForm(pool: InventoryPoolItem) {
    setName(pool.name);
    setPoolCategory((pool.poolCategory as PoolCategory) ?? 'tools');
    setUnit(pool.unit);
    setExpiryDate(pool.expiryDate ? new Date(pool.expiryDate).toISOString().slice(0, 10) : '');
    setWeightGrams(String(pool.weightGrams));
    setCalories(pool.calories != null ? String(pool.calories) : '');
    setWaterLitersPerUnit(
      pool.waterLitersPerUnit != null ? String(pool.waterLitersPerUnit) : ''
    );
    setCondition(pool.condition ? pool.condition.charAt(0).toUpperCase() + pool.condition.slice(1) : null);
    setIsEssential(pool.isEssential);
    setNotes(pool.notes ?? '');
    setLatitude(pool.latitude ?? null);
    setLongitude(pool.longitude ?? null);
    setBarcode(pool.barcode ?? null);
    setIsWaypoint(pool.isWaypoint);
  }

  const hasLocation = latitude != null && longitude != null;
  const showQuantity = kitId != null && !isPoolOnlyEdit;

  const handleTemplateSelect = (r: TemplatePickResult) => {
    setName(r.name);
    setPoolCategory(mapLegacyCategoryToPoolCategory(r.category));
    setWeightGrams(String(r.weightGrams));
  };

  const handleBarcodeScan = async (result: BarcodeScanResult) => {
    const poolCollection = database.get<InventoryPoolItem>('inventory_pool_items');
    let currentPoolId = poolItemId ?? null;
    if (!currentPoolId && packItemId) {
      const pack = await database.get<KitPackItem>('kit_pack_items').find(packItemId);
      currentPoolId = pack.poolItemId;
    }
    const currentPool = currentPoolId
      ? await poolCollection.find(currentPoolId).catch(() => null)
      : null;

    if (kitId) {
      const packs = await database.get<KitPackItem>('kit_pack_items').query(Q.where('kit_id', kitId)).fetch();
      for (const p of packs) {
        if (packItemId && p.id === packItemId) continue;
        const pool = await p.poolItem.fetch();
        if (pool.barcode === result.barcode) {
          setBarcodeScannerVisible(false);
          Alert.alert(
            'Duplicate Barcode',
            `"${pool.name}" already uses this barcode in this kit.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'View line',
                onPress: () => {
                  (navigation.getParent() as { navigate: (s: string, p: object) => void })?.navigate('KitDetail', {
                    kitId,
                    highlightedPackItemId: p.id,
                  });
                  navigation.goBack();
                },
              },
            ]
          );
          return;
        }
      }
    }

    const dupGlobal = await poolCollection
      .query(Q.where('barcode', result.barcode))
      .fetch();
    const other = dupGlobal.find((row) => row.id !== currentPool?.id);
    if (other) {
      setBarcodeScannerVisible(false);
      Alert.alert(
        'Barcode in pool',
        `Another pool item "${other.name}" uses this barcode.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const templates = database.get<ItemTemplate>('item_templates');
    const match = await templates.query().fetch();
    const found = match.find((t) => t.barcode === result.barcode);
    if (found) {
      setName(found.name);
      setPoolCategory(mapLegacyCategoryToPoolCategory(found.category));
      setWeightGrams(String(found.weightGrams));
      setScannedBarcode(found.barcode ?? null);
      setBarcode(found.barcode ?? null);
    } else {
      setScannedBarcode(result.barcode);
      setBarcode(result.barcode);
      Alert.alert(
        'New Barcode',
        `Barcode ${result.barcode} not in catalog. Enter item name and save to add it for future scans.`,
        [{ text: 'OK' }]
      );
      setName('');
      setPoolCategory('tools');
      setWeightGrams('');
    }
  };

  const handleTagLocation = async () => {
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
      setLatitude(lat);
      setLongitude(lon);
      let pid = poolItemId ?? null;
      if (!pid && packItemId) {
        const pack = await database.get<KitPackItem>('kit_pack_items').find(packItemId);
        pid = pack.poolItemId;
      }
      const poolIdToSave = pid;
      if (poolIdToSave != null) {
        await database.write(async () => {
          const pool = await database
            .get<InventoryPoolItem>('inventory_pool_items')
            .find(poolIdToSave);
          await pool.update((r) => {
            r.latitude = lat;
            r.longitude = lon;
            r.updatedAt = new Date();
          });
        });
        Alert.alert('Tagged', 'Current location saved.');
      } else {
        Alert.alert('Tagged', 'Location will be saved with the new item.');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to get location');
    } finally {
      setTaggingLocation(false);
    }
  };

  const handleViewOnMap = async () => {
    let id = poolItemId ?? null;
    if (!id && packItemId) {
      const pack = await database.get<KitPackItem>('kit_pack_items').find(packItemId);
      id = pack.poolItemId;
    }
    if (!id || !hasLocation) return;
    (navigation.getParent() as { navigate: (s: string, p?: object) => void })?.navigate('Map', {
      focusItemId: id,
    });
  };

  const handleSave = async () => {
    if (!isNewInKit && !isNewPoolOnly && !isPoolOnlyEdit && !packItemId) {
      Alert.alert('Error', 'Invalid item form state');
      return;
    }
    const q = parseFloat(quantity) || 1;
    const w = parseFloat(weightGrams) || 0;
    const cal = calories.trim() ? parseFloat(calories) : null;
    const waterPer = waterLitersPerUnit.trim() ? parseFloat(waterLitersPerUnit) : null;
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    const expiry = expiryDate.trim() ? new Date(expiryDate).getTime() : null;

    await database.write(async () => {
      const pools = database.get<InventoryPoolItem>('inventory_pool_items');
      const packs = database.get<KitPackItem>('kit_pack_items');

      const writePool = async (pool: InventoryPoolItem) => {
        await pool.update((r) => {
          r.name = name.trim();
          r.poolCategory = poolCategory;
          r.unit = unit.trim() || 'pcs';
          r.expiryDate = expiry;
          r.weightGrams = w;
          r.calories = cal;
          r.waterLitersPerUnit = waterPer;
          r.condition = condition?.toLowerCase() || null;
          r.isEssential = isEssential;
          r.notes = notes.trim() || null;
          r.latitude = latitude;
          r.longitude = longitude;
          r.barcode = barcode || scannedBarcode || null;
          r.isWaypoint = isWaypoint;
          r.updatedAt = new Date();
        });
      };

      if (packItemId && kitId) {
        const pack = await packs.find(packItemId);
        const pool = await pack.poolItem.fetch();
        await writePool(pool);
        await pack.update((r) => {
          r.quantity = q;
          r.updatedAt = new Date();
        });
      } else if (isPoolOnlyEdit && poolItemId) {
        const pool = await pools.find(poolItemId);
        await writePool(pool);
      } else if (isNewInKit && kitId) {
        const newPool = await pools.create((r) => {
          r.name = name.trim();
          r.poolCategory = poolCategory;
          r.unit = unit.trim() || 'pcs';
          r.expiryDate = expiry;
          r.weightGrams = w;
          r.calories = cal;
          r.waterLitersPerUnit = waterPer;
          r.condition = condition?.toLowerCase() || null;
          r.isEssential = isEssential;
          r.notes = notes.trim() || null;
          r.latitude = latitude;
          r.longitude = longitude;
          r.barcode = barcode || scannedBarcode || null;
          r.isWaypoint = isWaypoint;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
        await packs.create((r) => {
          r.kitId = kitId;
          r.poolItemId = newPool.id;
          r.quantity = q;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      } else if (isNewPoolOnly) {
        await pools.create((r) => {
          r.name = name.trim();
          r.poolCategory = poolCategory;
          r.unit = unit.trim() || 'pcs';
          r.expiryDate = expiry;
          r.weightGrams = w;
          r.calories = cal;
          r.waterLitersPerUnit = waterPer;
          r.condition = condition?.toLowerCase() || null;
          r.isEssential = isEssential;
          r.notes = notes.trim() || null;
          r.latitude = latitude;
          r.longitude = longitude;
          r.barcode = barcode || scannedBarcode || null;
          r.isWaypoint = isWaypoint;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      }

      if (scannedBarcode) {
        const templates = database.get<ItemTemplate>('item_templates');
        await templates.create((r) => {
          r.name = name.trim();
          r.category = poolCategory;
          r.weightGrams = w;
          r.barcode = scannedBarcode;
        });
        setScannedBarcode(null);
      }
    });

    refreshInventoryNotifications().catch(() => {});
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
        <TouchableOpacity style={styles.iconBtn} onPress={() => setPickerVisible(true)}>
          <Ionicons name="search" size={20} color={tactical.amber} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setBarcodeScannerVisible(true)}>
          <Ionicons name="barcode-outline" size={24} color={tactical.amber} />
        </TouchableOpacity>
      </View>
      <TemplatePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleTemplateSelect}
      />
      <BarcodeScannerModal
        visible={barcodeScannerVisible}
        onClose={() => setBarcodeScannerVisible(false)}
        onScan={handleBarcodeScan}
      />
      <Text style={tacticalStyles.label}>Pool category</Text>
      <View style={[tacticalStyles.row, { flexWrap: 'wrap' }]}>
        {POOL_CATEGORY_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              tacticalStyles.categoryChip,
              poolCategory === key ? tacticalStyles.categoryChipActive : tacticalStyles.categoryChipInactive,
            ]}
            onPress={() => setPoolCategory(key)}
          >
            <Text
              style={
                poolCategory === key
                  ? tacticalStyles.categoryChipTextActive
                  : tacticalStyles.categoryChipTextInactive
              }
            >
              {POOL_CATEGORY_LABELS[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {showQuantity ? (
        <View style={[tacticalStyles.row, { flexWrap: 'nowrap' }]}>
          <View style={tacticalStyles.rowItem}>
            <Text style={tacticalStyles.label}>Qty in kit</Text>
            <TextInput
              style={tacticalStyles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={tacticalStyles.rowItem}>
            <Text style={tacticalStyles.label}>Unit</Text>
            <TextInput
              style={tacticalStyles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="pcs"
              placeholderTextColor="#666"
            />
          </View>
        </View>
      ) : (
        <View style={tacticalStyles.rowItem}>
          <Text style={tacticalStyles.label}>Unit</Text>
          <TextInput
            style={tacticalStyles.input}
            value={unit}
            onChangeText={setUnit}
            placeholder="pcs"
            placeholderTextColor="#666"
          />
        </View>
      )}
      <Text style={tacticalStyles.label}>Expiry</Text>
      <View style={styles.expiryRow}>
        <TouchableOpacity style={[tacticalStyles.input, styles.expiryInput]} onPress={() => setShowDatePicker(true)}>
          <Text style={expiryDate ? styles.expiryText : styles.expiryPlaceholder}>
            {expiryDate || 'Tap to select date'}
          </Text>
        </TouchableOpacity>
        {expiryDate ? (
          <TouchableOpacity style={styles.clearExpiryBtn} onPress={() => setExpiryDate('')}>
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
      <TextInput
        style={tacticalStyles.input}
        value={weightGrams}
        onChangeText={setWeightGrams}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#666"
      />
      {(barcode || scannedBarcode) && (
        <View style={styles.barcodeRow}>
          <Text style={tacticalStyles.label}>Barcode</Text>
          <View style={styles.barcodeDisplayRow}>
            <Text style={styles.barcodeText}>{barcode || scannedBarcode}</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setBarcodeScannerVisible(true)}>
              <Ionicons name="scan" size={20} color={tactical.amber} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Text style={tacticalStyles.label}>Calories (per unit)</Text>
      <TextInput
        style={tacticalStyles.input}
        value={calories}
        onChangeText={setCalories}
        keyboardType="decimal-pad"
        placeholder="Optional"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Water (L per unit)</Text>
      <TextInput
        style={tacticalStyles.input}
        value={waterLitersPerUnit}
        onChangeText={setWaterLitersPerUnit}
        keyboardType="decimal-pad"
        placeholder="e.g. 1 for a 1L bottle"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Condition</Text>
      <View style={tacticalStyles.row}>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              tacticalStyles.categoryChip,
              condition === c ? tacticalStyles.categoryChipActive : tacticalStyles.categoryChipInactive,
            ]}
            onPress={() => setCondition(condition === c ? null : c)}
          >
            <Text
              style={condition === c ? tacticalStyles.categoryChipTextActive : tacticalStyles.categoryChipTextInactive}
            >
              {c}
            </Text>
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
      <View style={styles.switchRow}>
        <Text style={tacticalStyles.label}>Map waypoint (base / vehicle cache)</Text>
        <Switch
          value={isWaypoint}
          onValueChange={setIsWaypoint}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={isWaypoint ? tactical.black : tactical.zinc[400]}
        />
      </View>
      <View style={styles.locationRow}>
        <TouchableOpacity
          style={[tacticalStyles.btnPrimary, styles.tagBtn]}
          onPress={() => void handleTagLocation()}
          disabled={taggingLocation}
        >
          {taggingLocation ? (
            <ActivityIndicator size="small" color={tactical.black} />
          ) : (
            <Ionicons name="location" size={20} color={tactical.black} />
          )}
          <Text style={[tacticalStyles.btnPrimaryText, { marginLeft: 8 }]}>Tag Current Location</Text>
        </TouchableOpacity>
        {hasLocation && (
          <View style={styles.locationCoordsRow}>
            <Text style={styles.locationCoordsText}>
              LAT {latitude!.toFixed(5)} · LON {longitude!.toFixed(5)}
            </Text>
            <TouchableOpacity
              style={[tacticalStyles.btnSecondary, styles.viewMapBtn]}
              onPress={() => {
                void handleViewOnMap();
              }}
            >
              <Ionicons name="map-outline" size={20} color="#ffffff" />
              <Text style={[tacticalStyles.btnSecondaryText, { marginLeft: 8 }]}>View on Map</Text>
            </TouchableOpacity>
          </View>
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
      <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={() => void handleSave()}>
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
  locationCoordsRow: { flexDirection: 'column', gap: 8 },
  locationCoordsText: {
    color: tactical.zinc[400],
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  tagBtn: { flexDirection: 'row', alignItems: 'center' },
  viewMapBtn: { flexDirection: 'row', alignItems: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  barcodeRow: { marginBottom: 16 },
  barcodeDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  barcodeText: {
    color: tactical.zinc[400],
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
});
