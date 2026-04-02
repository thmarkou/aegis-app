import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
  Animated,
  TextInput,
  Easing,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type KitPackItem from '../../../database/models/KitPackItem';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import type Profile from '../../../database/models/Profile';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { POOL_CATEGORY_LABELS, type PoolCategory } from '../../../shared/constants/poolCategories';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { formatWeightGrams } from '../../../shared/utils/formatWeight';
import { formatDateEuFromMs } from '../../../shared/utils/formatDateEu';
import { useWeightWarning } from '../hooks/useWeightWarning';
import { BlinkingAmberWarning } from '../components/BlinkingAmberWarning';
import { BlinkingRedWarning } from '../components/BlinkingRedWarning';
import { BarcodeScannerModal, type BarcodeScanResult } from '../components/BarcodeScannerModal';
import * as SecureSettings from '../../../shared/services/secureSettings';

const EXPIRY_WARN_DAYS = 30;
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

export type PackLine = { pack: KitPackItem; pool: InventoryPoolItem };

type Nav = NativeStackNavigationProp<SharedStackParamList, 'KitDetail'>;

export function KitDetailScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'KitDetail'>>();
  const { kitId, highlightedPackItemId } = route.params;
  const navigation = useNavigation<Nav>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [lines, setLines] = useState<PackLine[]>([]);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const [weightPercent, setWeightPercent] = useState(20);
  const [sortByExpiry, setSortByExpiry] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeScannerVisible, setBarcodeScannerVisible] = useState(false);
  const highlightOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlightedPackItemId) return;
    highlightOpacity.setValue(1);
    const anim = Animated.timing(highlightOpacity, {
      toValue: 0,
      duration: 5000,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    });
    anim.start();
    const t = setTimeout(() => {
      navigation.setParams({ highlightedPackItemId: undefined });
    }, 5000);
    return () => {
      anim.stop();
      clearTimeout(t);
    };
  }, [highlightedPackItemId, highlightOpacity, navigation]);

  const load = useCallback(async () => {
    const k = await database.get<Kit>('kits').find(kitId);
    const packs = await database.get<KitPackItem>('kit_pack_items').query(Q.where('kit_id', kitId)).fetch();
    const hydrated: PackLine[] = await Promise.all(
      packs.map(async (pack) => ({
        pack,
        pool: await pack.poolItem.fetch(),
      }))
    );
    setKit(k);
    setLines(hydrated);
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

  useEffect(() => {
    if (!kit) return;
    navigation.setOptions({
      title: kit.name,
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('KitForm', { kitId })}
          hitSlop={12}
          accessibilityLabel="Edit kit name and capacity"
        >
          <Ionicons name="create-outline" size={22} color={tactical.amber} />
        </Pressable>
      ),
    });
  }, [kit, kitId, navigation]);

  const sortedLines = sortByExpiry
    ? [...lines].sort((a, b) => {
        if (!a.pool.expiryDate) return 1;
        if (!b.pool.expiryDate) return -1;
        return a.pool.expiryDate - b.pool.expiryDate;
      })
    : lines;

  const filteredLines = searchQuery.trim()
    ? sortedLines.filter(
        ({ pool }) =>
          pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (pool.barcode != null && pool.barcode.includes(searchQuery))
      )
    : sortedLines;

  const handleBarcodeScanSearch = (result: BarcodeScanResult) => {
    setSearchQuery(result.barcode);
    setBarcodeScannerVisible(false);
  };

  const itemsWeightGrams = lines.reduce((sum, { pack, pool }) => sum + pack.quantity * pool.weightGrams, 0);
  const waterLiters = kit?.waterReservoirLiters ?? 0;
  const waterWeightKg = waterLiters * KG_PER_LITER;
  const totalWeightGrams = itemsWeightGrams + waterWeightKg * 1000;
  const totalKg = totalWeightGrams / 1000;
  const totalCalories = lines.reduce(
    (sum, { pack, pool }) => sum + (pool.calories ?? 0) * pack.quantity,
    0
  );

  const limitKg =
    bodyWeightKg != null && bodyWeightKg > 0 ? bodyWeightKg * (weightPercent / 100) : null;
  const isOverLimit = limitKg != null && totalKg > limitKg;
  const bodyWeightPct =
    bodyWeightKg != null && bodyWeightKg > 0 ? Math.round((totalKg / bodyWeightKg) * 100) : null;

  const { warningPercent } = useWeightWarning(totalWeightGrams, bodyWeightKg, weightPercent);

  const handleAddItem = () => navigation.navigate('ItemForm', { kitId });
  const handleAddFromPool = () => navigation.navigate('PoolPicker', { kitId });

  const handleDeleteLine = (line: PackLine) => {
    Alert.alert('Remove from kit', `Remove "${line.pool.name}" from this kit? (Pool catalog entry is kept.)`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await database.write(async () => await line.pack.markAsDeleted());
          await load();
        },
      },
    ]);
  };

  if (!kit) return <View style={tacticalStyles.screen} />;

  const weightDisplay = isOverLimit ? (
    <BlinkingRedWarning text={`PKG_WT: ${totalKg.toFixed(2)} KG`} />
  ) : (
    <Text style={styles.telemetryLabel}>PKG_WT: {totalKg.toFixed(2)} KG</Text>
  );

  return (
    <View style={tacticalStyles.screen}>
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

      <View style={[styles.telemetryBlock, isOverLimit && styles.weightWarn]}>
        {weightDisplay}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{lines.length} lines</Text>
          {totalCalories > 0 && <Text style={styles.caloriesText}>{Math.round(totalCalories)} kcal</Text>}
        </View>
        {warningPercent != null && (
          <Text style={styles.warningText}>
            ⚠ {warningPercent}% of body weight (limit: {weightPercent}%)
          </Text>
        )}
      </View>

      <View style={styles.addFromPoolRow}>
        <TouchableOpacity style={styles.addFromPoolBtn} onPress={handleAddFromPool} activeOpacity={0.8}>
          <Ionicons name="albums-outline" size={18} color={tactical.black} />
          <Text style={styles.addFromPoolBtnText}>Add from Pool</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search items or scan barcode..."
          placeholderTextColor={tactical.zinc[500]}
        />
        <TouchableOpacity style={styles.searchScanBtn} onPress={() => setBarcodeScannerVisible(true)}>
          <Ionicons name="barcode-outline" size={22} color={tactical.amber} />
        </TouchableOpacity>
      </View>
      <BarcodeScannerModal
        visible={barcodeScannerVisible}
        onClose={() => setBarcodeScannerVisible(false)}
        onScan={handleBarcodeScanSearch}
      />
      <FlatList
        data={filteredLines}
        keyExtractor={(line) => line.pack.id}
        renderItem={({ item: line }) => {
          const { pack, pool } = line;
          const showExpiryWarn = isExpiredOrExpiringSoon(pool.expiryDate);
          const expiryStatus = getExpiryStatus(pool.expiryDate);
          const itemCal = pool.calories != null ? pack.quantity * pool.calories : 0;
          const isHighlighted = highlightedPackItemId === pack.id;
          const catKey = pool.poolCategory as PoolCategory;
          const catLabel = POOL_CATEGORY_LABELS[catKey] ?? pool.poolCategory;
          return (
            <View style={styles.itemCardWrap}>
              <TouchableOpacity
                style={[styles.itemCard, pool.isEssential && styles.essentialCard]}
                onPress={() => navigation.navigate('ItemForm', { kitId, packItemId: pack.id })}
                onLongPress={() => handleDeleteLine(line)}
              >
                <View style={styles.itemNameRow}>
                  {pool.isEssential && (
                    <Ionicons name="star" size={18} color={tactical.amber} style={styles.essentialIcon} />
                  )}
                  <Text style={[styles.itemName, pool.isEssential && styles.essentialText]}>{pool.name}</Text>
                  {pool.latitude != null && pool.longitude != null && (
                    <Ionicons name="location" size={16} color={tactical.amber} style={styles.locationIcon} />
                  )}
                  {showExpiryWarn && <BlinkingAmberWarning />}
                </View>
                <Text style={styles.poolCategoryTag}>{catLabel}</Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemMeta}>
                    {pack.quantity} {pool.unit} · {formatWeightGrams(pool.weightGrams)} g / unit
                    {itemCal > 0 && ` · ${Math.round(itemCal)} kcal`}
                  </Text>
                </View>
                <View style={styles.itemTagsRow}>
                  {pool.barcode && (
                    <View style={styles.barcodeTag}>
                      <Ionicons name="barcode-outline" size={12} color={tactical.amber} />
                      <Text style={styles.barcodeTagText} numberOfLines={1}>
                        {truncateBarcode(pool.barcode)}
                      </Text>
                    </View>
                  )}
                  {pool.condition && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {pool.condition.charAt(0).toUpperCase() + pool.condition.slice(1)}
                      </Text>
                    </View>
                  )}
                  {expiryStatus && (
                    <View
                      style={[
                        styles.tag,
                        expiryStatus === 'ok' && styles.tagOk,
                        expiryStatus === 'expiring_soon' && styles.tagExpiringSoon,
                        expiryStatus === 'expired' && styles.tagExpired,
                      ]}
                    >
                      <Text style={styles.tagText}>
                        {expiryStatus === 'expired' && 'EXPIRED'}
                        {expiryStatus === 'expiring_soon' && 'EXPIRING SOON'}
                        {expiryStatus === 'ok' && 'OK'}
                      </Text>
                    </View>
                  )}
                  {pool.expiryDate && (
                    <Text style={styles.expiryDateText}>
                      Exp: {formatDateEuFromMs(pool.expiryDate)}
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
        ListEmptyComponent={
          lines.length === 0 && !searchQuery.trim() ? (
            <View style={styles.emptyKitBanner}>
              <Text style={styles.emptyKitTitle}>Your kit is empty.</Text>
              <Text style={styles.emptyKitBody}>
                Tap &quot;Add from Pool&quot; to pack items from your Warehouse.
              </Text>
            </View>
          ) : (
            <Text style={tacticalStyles.emptyText}>No items match search.</Text>
          )
        }
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAddItem}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  addFromPoolRow: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  addFromPoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: tactical.amber,
  },
  addFromPoolBtnText: {
    color: tactical.black,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyKitBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tactical.amber,
    backgroundColor: 'rgba(255, 191, 0, 0.08)',
  },
  emptyKitTitle: {
    color: tactical.amber,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyKitBody: {
    color: tactical.zinc[400],
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: tactical.zinc[900],
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  searchScanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: tactical.zinc[900],
    borderWidth: 1,
    borderColor: tactical.amber,
    alignItems: 'center',
    justifyContent: 'center',
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
  poolCategoryTag: {
    color: tactical.zinc[500],
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
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
