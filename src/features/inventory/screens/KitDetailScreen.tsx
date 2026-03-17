import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Platform, Animated } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type InventoryItem from '../../../database/models/InventoryItem';
import type Profile from '../../../database/models/Profile';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { useWeightWarning } from '../hooks/useWeightWarning';
import { BlinkingAmberWarning } from '../components/BlinkingAmberWarning';
import { BlinkingRedWarning } from '../components/BlinkingRedWarning';
import * as SecureSettings from '../../../shared/services/secureSettings';

const EXPIRY_WARN_DAYS = 30;
/** Water density: 1 kg per liter. */
const KG_PER_LITER = 1;

type ExpiryStatus = 'ok' | 'expiring_soon' | 'expired';

function getExpiryStatus(expiryDate: number | null): ExpiryStatus | null {
  if (!expiryDate) return null;
  const now = Date.now();
  const daysUntil = (expiryDate - now) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= EXPIRY_WARN_DAYS) return 'expiring_soon';
  return 'ok';
}

function isExpiredOrExpiringSoon(expiryDate: number | null): boolean {
  const status = getExpiryStatus(expiryDate);
  return status === 'expired' || status === 'expiring_soon';
}

function truncateBarcode(barcode: string, head = 3, tail = 3): string {
  if (barcode.length <= head + tail) return barcode;
  return `${barcode.slice(0, head)}...${barcode.slice(-tail)}`;
}

type Nav = NativeStackNavigationProp<SharedStackParamList, 'KitDetail'>;

export function KitDetailScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'KitDetail'>>();
  const { kitId, highlightedItemId } = route.params;
  const navigation = useNavigation<Nav>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const [weightPercent, setWeightPercent] = useState(20);
  const [sortByExpiry, setSortByExpiry] = useState(false);
  const highlightOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlightedItemId) return;
    highlightOpacity.setValue(1);
    const anim = Animated.timing(highlightOpacity, {
      toValue: 0,
      duration: 5000,
      useNativeDriver: true,
    });
    anim.start();
    const t = setTimeout(() => {
      navigation.setParams({ highlightedItemId: undefined });
    }, 5000);
    return () => {
      anim.stop();
      clearTimeout(t);
    };
  }, [highlightedItemId, highlightOpacity, navigation]);

  const load = useCallback(async () => {
    const k = await database.get<Kit>('kits').find(kitId);
    const list = await database.get<InventoryItem>('inventory_items').query(Q.where('kit_id', kitId)).fetch();
    setKit(k);
    setItems(list);
  }, [kitId]);

  useEffect(() => {
    (async () => {
      const [profiles, pct, sort, settingsBodyWeight] = await Promise.all([
        database.get<Profile>('profiles').query().fetch(),
        SecureSettings.getWeightPercent(),
        SecureSettings.getSortByExpiry(),
        SecureSettings.getBodyWeightKg(),
      ]);
      setWeightPercent(pct);
      setSortByExpiry(sort);
      // Settings body weight takes precedence; fallback to first profile
      const first = profiles[0];
      setBodyWeightKg(settingsBodyWeight ?? first?.bodyWeightKg ?? null);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      Promise.all([
        SecureSettings.getSortByExpiry(),
        SecureSettings.getBodyWeightKg(),
        database.get<Profile>('profiles').query().fetch(),
      ]).then(([sort, settingsBw, profiles]) => {
        setSortByExpiry(sort);
        const first = profiles[0];
        setBodyWeightKg(settingsBw ?? first?.bodyWeightKg ?? null);
      });
    }, [load])
  );

  // Update header title when kit loads (fixes Kit name not refreshing after edit)
  useEffect(() => {
    if (kit?.name) {
      navigation.setOptions({ title: kit.name });
    }
  }, [kit?.name, navigation]);

  const sortedItems = sortByExpiry
    ? [...items].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate - b.expiryDate;
      })
    : items;

  const itemsWeightGrams = items.reduce((sum, i) => sum + i.quantity * i.weightGrams, 0);
  const waterLiters = kit?.waterReservoirLiters ?? 0;
  const waterWeightKg = waterLiters * KG_PER_LITER;
  const totalWeightGrams = itemsWeightGrams + waterWeightKg * 1000;
  const totalKg = totalWeightGrams / 1000;
  const totalCalories = items.reduce((sum, i) => sum + (i.calories ?? 0) * i.quantity, 0);

  const limitKg = bodyWeightKg != null && bodyWeightKg > 0
    ? bodyWeightKg * (weightPercent / 100)
    : null;
  const isOverLimit = limitKg != null && totalKg > limitKg;
  const bodyWeightPct = bodyWeightKg != null && bodyWeightKg > 0
    ? Math.round((totalKg / bodyWeightKg) * 100)
    : null;

  const { warningPercent } = useWeightWarning(totalWeightGrams, bodyWeightKg, weightPercent);

  const handleAddItem = () => navigation.navigate('ItemForm', { kitId });
  const handleDeleteItem = (item: InventoryItem) => {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await database.write(async () => await item.markAsDeleted());
        await load();
      }},
    ]);
  };

  if (!kit) return <View style={tacticalStyles.screen} />;

  const weightDisplay = isOverLimit
    ? <BlinkingRedWarning text={`PKG_WT: ${totalKg.toFixed(2)} KG`} />
    : (
        <Text style={styles.telemetryLabel}>
          PKG_WT: {totalKg.toFixed(2)} KG
        </Text>
      );

  const handleEditHydration = () => navigation.navigate('KitForm', { kitId });

  return (
    <View style={tacticalStyles.screen}>
      {/* Load Bar - prominent at top */}
      <View style={[styles.loadBar, isOverLimit && styles.loadBarOver]}>
        <View style={styles.loadBarRow}>
          <Text style={styles.loadBarLabel}>LOAD</Text>
          <Text style={[styles.loadBarValue, isOverLimit && styles.loadBarValueOver]}>
            {totalKg.toFixed(1)} / {limitKg != null ? limitKg.toFixed(1) : '—'} kg
          </Text>
        </View>
        {limitKg != null && limitKg > 0 && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (totalKg / limitKg) * 100)}%`,
                  backgroundColor: isOverLimit ? '#ef4444' : tactical.amber,
                },
              ]}
            />
          </View>
        )}
        {bodyWeightPct != null && (
          <Text style={styles.loadBarSubtext}>Carrying {bodyWeightPct}% of body weight</Text>
        )}
      </View>

      {/* Telemetry block: weight, hydration, calories */}
      <View style={[styles.telemetryBlock, isOverLimit && styles.weightWarn]}>
        {weightDisplay}
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.hydrationBadge, waterLiters === 0 && styles.hydrationBadgeEmpty]}
            onPress={handleEditHydration}
          >
            <Ionicons name="water" size={18} color={tactical.amber} />
            <Text style={styles.hydrationText}>{waterLiters}L</Text>
            <Ionicons name="pencil" size={12} color={tactical.zinc[500]} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <Text style={styles.summaryText}>{items.length} items</Text>
          {totalCalories > 0 && (
            <Text style={styles.caloriesText}>{Math.round(totalCalories)} kcal</Text>
          )}
        </View>
        {warningPercent != null && (
          <Text style={styles.warningText}>
            ⚠ {warningPercent}% of body weight (limit: {weightPercent}%)
          </Text>
        )}
      </View>
      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const showExpiryWarn = isExpiredOrExpiringSoon(item.expiryDate);
          const expiryStatus = getExpiryStatus(item.expiryDate);
          const itemCal = item.calories != null ? item.quantity * item.calories : 0;
          const isHighlighted = highlightedItemId === item.id;
          return (
            <View style={styles.itemCardWrap}>
              <TouchableOpacity
                style={[
                  styles.itemCard,
                  item.isEssential && styles.essentialCard,
                ]}
                onPress={() => navigation.navigate('ItemForm', { kitId, itemId: item.id })}
                onLongPress={() => handleDeleteItem(item)}
              >
              <View style={styles.itemNameRow}>
                {item.isEssential && (
                  <Ionicons name="star" size={18} color={tactical.amber} style={styles.essentialIcon} />
                )}
                <Text style={[styles.itemName, item.isEssential && styles.essentialText]}>{item.name}</Text>
                {item.latitude != null && item.longitude != null && (
                  <Ionicons name="location" size={16} color={tactical.amber} style={styles.locationIcon} />
                )}
                {showExpiryWarn && <BlinkingAmberWarning />}
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.itemMeta}>
                  {item.quantity} {item.unit} · {(item.weightGrams / 1000).toFixed(2)} kg
                  {itemCal > 0 && ` · ${Math.round(itemCal)} kcal`}
                </Text>
              </View>
              <View style={styles.itemTagsRow}>
                {item.barcode && (
                  <View style={styles.barcodeTag}>
                    <Ionicons name="barcode-outline" size={12} color={tactical.amber} />
                    <Text style={styles.barcodeTagText} numberOfLines={1}>
                      {truncateBarcode(item.barcode)}
                    </Text>
                  </View>
                )}
                {item.condition && (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}</Text>
                  </View>
                )}
                {expiryStatus && (
                  <View style={[styles.tag, expiryStatus === 'ok' && styles.tagOk, expiryStatus === 'expiring_soon' && styles.tagExpiringSoon, expiryStatus === 'expired' && styles.tagExpired]}>
                    <Text style={styles.tagText}>
                      {expiryStatus === 'expired' && 'EXPIRED'}
                      {expiryStatus === 'expiring_soon' && 'EXPIRING SOON'}
                      {expiryStatus === 'ok' && 'OK'}
                    </Text>
                  </View>
                )}
                {item.expiryDate && (
                  <Text style={styles.expiryDateText}>
                    Exp: {new Date(item.expiryDate).toISOString().slice(0, 10)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            {isHighlighted && (
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.itemCardHighlightOverlay,
                  { opacity: highlightOpacity },
                ]}
              />
            )}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={tacticalStyles.emptyText}>No items. Tap + to add.</Text>}
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAddItem}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    backgroundColor: tactical.zinc[900],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: tactical.amber,
  },
  loadBarOver: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  loadBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadBarLabel: {
    color: tactical.amber,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  loadBarValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  loadBarValueOver: {
    color: '#ef4444',
  },
  progressTrack: {
    height: 8,
    backgroundColor: tactical.zinc[700],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  loadBarSubtext: {
    color: tactical.zinc[400],
    fontSize: 13,
  },
  telemetryBlock: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: tactical.zinc[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  weightWarn: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  telemetryLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 18,
    fontWeight: '600',
    color: tactical.zinc[400],
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  hydrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 191, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  hydrationBadgeEmpty: {
    backgroundColor: tactical.zinc[900],
    borderColor: tactical.zinc[700],
  },
  hydrationText: {
    color: tactical.amber,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryText: {
    color: tactical.zinc[400],
    fontSize: 14,
  },
  caloriesText: {
    color: tactical.amber,
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    color: tactical.amber,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  itemCardWrap: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: 'relative',
  },
  itemCard: {
    backgroundColor: tactical.zinc[900],
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  itemCardHighlightOverlay: {
    backgroundColor: 'rgba(255, 191, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: tactical.amber,
  },
  itemName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMetaRow: {
    marginTop: 4,
  },
  itemMeta: {
    color: tactical.zinc[400],
    fontSize: 14,
  },
  itemTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: tactical.zinc[700],
  },
  tagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  tagOk: {
    backgroundColor: '#166534',
  },
  tagExpiringSoon: {
    backgroundColor: 'rgba(255, 191, 0, 0.4)',
  },
  tagExpired: {
    backgroundColor: '#ef4444',
  },
  expiryDateText: {
    color: tactical.zinc[500],
    fontSize: 12,
  },
  essentialCard: {
    borderLeftWidth: 4,
    borderLeftColor: tactical.amber,
  },
  essentialText: {
    color: tactical.amber,
  },
  essentialIcon: {
    marginRight: 6,
  },
  locationIcon: {
    marginLeft: 6,
  },
  barcodeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 191, 0, 0.15)',
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  barcodeTagText: {
    color: tactical.amber,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
