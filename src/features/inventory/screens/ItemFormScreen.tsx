import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import type KitPackItem from '../../../database/models/KitPackItem';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { deleteInventoryPoolItemCascade } from '../../../services/inventoryPoolDelete';
import { BarcodeScannerModal, type BarcodeScanResult } from '../components/BarcodeScannerModal';
import { refreshInventoryNotifications } from '../services/refreshInventoryNotifications';
import { POOL_CATEGORY_KEYS, POOL_CATEGORY_LABELS, type PoolCategory } from '../../../shared/constants/poolCategories';
import {
  findPowerDeviceByPoolItemId,
  syncPowerDeviceNameFromPoolItem,
} from '../../../services/powerDevicePoolSync';
import * as SecureSettings from '../../../shared/services/secureSettings';
import {
  BATTERY_TYPE_OPTIONS,
  poolCategoryRequiresBattery,
  getBatteryAttentionLevel,
  formatNextReviewDate,
} from '../../../services/batteryInventoryReview';

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
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [linkedPowerDeviceId, setLinkedPowerDeviceId] = useState<string | null>(null);
  const [batteryType, setBatteryType] = useState('');
  const [lastChargeDate, setLastChargeDate] = useState('');
  const [batteryCapacityMah, setBatteryCapacityMah] = useState('');
  const [chargingRequirements, setChargingRequirements] = useState('');
  const [batteryTypeModalVisible, setBatteryTypeModalVisible] = useState(false);
  const [showLastChargePicker, setShowLastChargePicker] = useState(false);
  const [maintenanceMonths, setMaintenanceMonths] = useState(6);

  /** New rows: always create a Global Inventory Pool row; optionally link to kit via pack line. */
  const isNewItem = poolItemId == null && packItemId == null;
  const isPoolOnlyEdit = poolItemId != null && kitId == null;
  const isEditingPackLine = packItemId != null && kitId != null;

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

  useEffect(() => {
    if (!poolItemId) {
      setLinkedPowerDeviceId(null);
      return;
    }
    void findPowerDeviceByPoolItemId(poolItemId).then((d) => setLinkedPowerDeviceId(d?.id ?? null));
  }, [poolItemId]);

  useEffect(() => {
    void SecureSettings.getMaintenanceAlertThresholdMonths().then(setMaintenanceMonths);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void SecureSettings.getMaintenanceAlertThresholdMonths().then(setMaintenanceMonths);
    }, [])
  );

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
    setBatteryType(pool.batteryType ?? '');
    setLastChargeDate(
      pool.lastChargeAt != null ? new Date(pool.lastChargeAt).toISOString().slice(0, 10) : ''
    );
    setBatteryCapacityMah(pool.batteryCapacityMah != null ? String(pool.batteryCapacityMah) : '');
    setChargingRequirements(pool.chargingRequirements ?? '');
  }

  const hasLocation = latitude != null && longitude != null;
  const showQuantity = kitId != null && !isPoolOnlyEdit;
  const showBatterySection = poolCategoryRequiresBattery(poolCategory);

  const formBatteryLevel = useMemo(() => {
    const ms = lastChargeDate.trim()
      ? new Date(lastChargeDate.trim() + 'T12:00:00').getTime()
      : null;
    return getBatteryAttentionLevel(poolCategory, ms, maintenanceMonths);
  }, [poolCategory, lastChargeDate, maintenanceMonths]);

  const nextReviewLabel = useMemo(() => {
    const ms = lastChargeDate.trim()
      ? new Date(lastChargeDate.trim() + 'T12:00:00').getTime()
      : null;
    return formatNextReviewDate(ms, maintenanceMonths);
  }, [lastChargeDate, maintenanceMonths]);

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

    setScannedBarcode(result.barcode);
    setBarcode(result.barcode);
    Alert.alert(
      'New Barcode',
      `Barcode ${result.barcode} scanned. Enter item details and save.`,
      [{ text: 'OK' }]
    );
    setName('');
    setPoolCategory('tools');
    setWeightGrams('');
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
    if (!isEditingPackLine && !isPoolOnlyEdit && !isNewItem) {
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
    if (linkedPowerDeviceId && poolCategory !== 'power') {
      Alert.alert(
        'Category locked',
        'This warehouse row is linked to a power device in Logistics. Keep category Power or edit the device under Logistics & charging.'
      );
      return;
    }
    if (poolCategoryRequiresBattery(poolCategory)) {
      if (!batteryType.trim() || !lastChargeDate.trim()) {
        Alert.alert(
          'Battery required',
          'Battery type and last charge / check date are required for this category.'
        );
        return;
      }
    }
    const expiry = expiryDate.trim() ? new Date(expiryDate).getTime() : null;

    const battFields = poolCategoryRequiresBattery(poolCategory)
      ? {
          batteryType: batteryType.trim() || null,
          lastChargeAt: new Date(lastChargeDate.trim() + 'T12:00:00').getTime(),
          batteryCapacityMah: (() => {
            const t = batteryCapacityMah.trim().replace(',', '.');
            if (!t) return null;
            const n = parseFloat(t);
            return !isNaN(n) && n >= 0 ? n : null;
          })(),
          chargingRequirements: chargingRequirements.trim() || null,
        }
      : {
          batteryType: null,
          lastChargeAt: null,
          batteryCapacityMah: null,
          chargingRequirements: null,
        };

    let poolIdForPowerSync: string | null = null;

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
          r.batteryType = battFields.batteryType;
          r.lastChargeAt = battFields.lastChargeAt;
          r.batteryCapacityMah = battFields.batteryCapacityMah;
          r.chargingRequirements = battFields.chargingRequirements;
          r.updatedAt = new Date();
        });
        poolIdForPowerSync = pool.id;
      };

      if (isEditingPackLine && packItemId && kitId) {
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
      } else if (isNewItem) {
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
          r.batteryType = battFields.batteryType;
          r.lastChargeAt = battFields.lastChargeAt;
          r.batteryCapacityMah = battFields.batteryCapacityMah;
          r.chargingRequirements = battFields.chargingRequirements;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
        if (kitId) {
          await packs.create((r) => {
            r.kitId = kitId;
            r.poolItemId = newPool.id;
            r.quantity = q;
            r.createdAt = new Date();
            r.updatedAt = new Date();
          });
        }
      }
    });

    if (poolIdForPowerSync) {
      await syncPowerDeviceNameFromPoolItem(poolIdForPowerSync, name.trim());
    }

    refreshInventoryNotifications().catch(() => {});
    navigation.goBack();
  };

  const canDeleteExistingPoolItem = poolItemId != null || packItemId != null;

  const handleDeletePoolItem = () => {
    Alert.alert('Delete item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            let pid = poolItemId ?? null;
            if (!pid && packItemId) {
              const pack = await database.get<KitPackItem>('kit_pack_items').find(packItemId);
              pid = pack.poolItemId;
            }
            if (!pid) return;
            try {
              await deleteInventoryPoolItemCascade(pid);
              refreshInventoryNotifications().catch(() => {});
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
            }
          })();
        },
      },
    ]);
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
          placeholder="Item name"
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={styles.iconBtn} onPress={() => setBarcodeScannerVisible(true)}>
          <Ionicons name="barcode-outline" size={24} color={tactical.amber} />
        </TouchableOpacity>
      </View>
      <BarcodeScannerModal
        visible={barcodeScannerVisible}
        onClose={() => setBarcodeScannerVisible(false)}
        onScan={handleBarcodeScan}
      />
      <Text style={tacticalStyles.label}>Category *</Text>
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
      {showBatterySection ? (
        <View style={styles.batterySection}>
          <Text style={styles.batterySectionTitle}>Battery & Charging Management</Text>
          <Text style={styles.batterySectionHint}>
            Next review = last charge + {maintenanceMonths} mo (Settings · Maintenance alert threshold).
          </Text>
          {formBatteryLevel === 'needs_charge' || formBatteryLevel === 'missing_data' ? (
            <Text style={styles.battAlertRed}>NEEDS CHARGE</Text>
          ) : formBatteryLevel === 'upcoming' ? (
            <Text style={styles.battAlertOrange}>UPCOMING MAINTENANCE</Text>
          ) : null}
          <Text style={tacticalStyles.label}>Battery type *</Text>
          <TouchableOpacity
            style={[tacticalStyles.input, styles.dropdownBtn]}
            onPress={() => setBatteryTypeModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={batteryType ? styles.dropdownText : styles.dropdownPlaceholder}>
              {batteryType || 'Select battery type'}
            </Text>
          </TouchableOpacity>
          <Text style={tacticalStyles.label}>Last charge / check date *</Text>
          <TouchableOpacity
            style={[tacticalStyles.input, styles.dropdownBtn]}
            onPress={() => setShowLastChargePicker(true)}
            activeOpacity={0.85}
          >
            <Text style={lastChargeDate ? styles.dropdownText : styles.dropdownPlaceholder}>
              {lastChargeDate || 'Tap to select date'}
            </Text>
          </TouchableOpacity>
          {showLastChargePicker && (
            <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={lastChargeDate ? new Date(lastChargeDate + 'T12:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  if (Platform.OS === 'android') setShowLastChargePicker(false);
                  if (date) setLastChargeDate(date.toISOString().slice(0, 10));
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[tacticalStyles.btnPrimary, styles.datePickerDone]}
                  onPress={() => setShowLastChargePicker(false)}
                >
                  <Text style={tacticalStyles.btnPrimaryText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <Text style={tacticalStyles.label}>Battery capacity (optional, mAh or Ah)</Text>
          <TextInput
            style={tacticalStyles.input}
            value={batteryCapacityMah}
            onChangeText={setBatteryCapacityMah}
            keyboardType="decimal-pad"
            placeholder="e.g. 5000 mAh or 2.6 Ah as number"
            placeholderTextColor="#666"
          />
          <Text style={tacticalStyles.label}>Charging requirements (optional)</Text>
          <TextInput
            style={tacticalStyles.input}
            value={chargingRequirements}
            onChangeText={setChargingRequirements}
            placeholder="e.g. 12V / 2A USB-C"
            placeholderTextColor="#666"
          />
          <Text style={tacticalStyles.label}>Next review date (read-only)</Text>
          <Text style={styles.readOnlyValue}>{nextReviewLabel}</Text>
        </View>
      ) : null}
      <Modal
        visible={batteryTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBatteryTypeModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setBatteryTypeModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Battery type</Text>
            {BATTERY_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.modalRow}
                onPress={() => {
                  setBatteryType(opt);
                  setBatteryTypeModalVisible(false);
                }}
              >
                <Text style={styles.modalRowText}>{opt}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setBatteryTypeModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
      {canDeleteExistingPoolItem ? (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePoolItem} activeOpacity={0.85}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={() => void handleSave()}>
        <Text style={tacticalStyles.btnPrimaryText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 32 },
  deleteBtn: {
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b91c1c',
    backgroundColor: 'rgba(185, 28, 28, 0.15)',
    alignItems: 'center',
  },
  deleteBtnText: { color: '#f87171', fontSize: 16, fontWeight: '700' },
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
  batterySection: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  batterySectionTitle: {
    color: tactical.amber,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  batterySectionHint: {
    color: tactical.zinc[500],
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  battAlertRed: {
    color: '#f87171',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 10,
  },
  battAlertOrange: {
    color: '#fb923c',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dropdownBtn: { justifyContent: 'center', marginBottom: 16 },
  dropdownText: { color: '#ffffff', fontSize: 16 },
  dropdownPlaceholder: { color: '#666', fontSize: 16 },
  readOnlyValue: {
    color: tactical.zinc[400],
    fontSize: 16,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: tactical.zinc[900],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    paddingVertical: 8,
    maxHeight: '70%',
  },
  modalTitle: {
    color: tactical.amber,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: tactical.zinc[700],
  },
  modalRowText: { color: '#fff', fontSize: 16 },
  modalClose: { padding: 16, alignItems: 'center' },
  modalCloseText: { color: tactical.zinc[500], fontSize: 15, fontWeight: '600' },
});
