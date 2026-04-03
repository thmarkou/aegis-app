import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import type KitPackItem from '../../../database/models/KitPackItem';
import {
  POOL_CATEGORY_KEYS,
  POOL_CATEGORY_LABELS,
  type PoolCategory,
} from '../../../shared/constants/poolCategories';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { formatWeightGrams } from '../../../shared/utils/formatWeight';

export function PoolPickerScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'PoolPicker'>>();
  const { kitId } = route.params;
  const navigation = useNavigation();
  const [items, setItems] = useState<InventoryPoolItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pools = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();
      pools.sort((a, b) => a.name.localeCompare(b.name));
      setItems(pools);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const addPoolToKit = async (pool: InventoryPoolItem) => {
    const packs = database.get<KitPackItem>('kit_pack_items');
    const existing = await packs
      .query(Q.and(Q.where('kit_id', kitId), Q.where('pool_item_id', pool.id)))
      .fetch();
    await database.write(async () => {
      if (existing.length > 0) {
        const line = existing[0];
        await line.update((r) => {
          r.quantity = r.quantity + 1;
          r.updatedAt = new Date();
        });
      } else {
        await packs.create((r) => {
          r.kitId = kitId;
          r.poolItemId = pool.id;
          r.quantity = 1;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      }
    });
    navigation.goBack();
  };

  const categoryLabel = (p: InventoryPoolItem) => {
    const raw = p.poolCategory as string;
    const key = (POOL_CATEGORY_KEYS as readonly string[]).includes(raw)
      ? (raw as PoolCategory)
      : 'tools';
    return POOL_CATEGORY_LABELS[key];
  };

  if (loading) {
    return (
      <View style={[tacticalStyles.screen, styles.center]}>
        <ActivityIndicator color={tactical.amber} />
      </View>
    );
  }

  return (
    <View style={tacticalStyles.screen}>
      <Text style={styles.hint}>
        Pick an item from your warehouse catalog (Global Inventory Pool) to add to this kit.
      </Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => void addPoolToKit(item)} activeOpacity={0.75}>
            <View style={styles.rowText}>
              <Text style={styles.catBadge}>{categoryLabel(item)}</Text>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {formatWeightGrams(item.weightGrams)} g / unit
                {item.poolCategory === 'consumables' && item.calories != null
                  ? ` · ${item.calories} kcal/unit`
                  : ''}
                {item.poolCategory === 'water' && item.waterLitersPerUnit != null
                  ? ` · ${item.waterLitersPerUnit} L/unit`
                  : ''}
              </Text>
            </View>
            <Text style={styles.addHint}>+</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>
            No items in your warehouse yet. Add them from Mission → Warehouse catalog (or Inventory tab) with +.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  hint: {
    color: tactical.zinc[500],
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContent: { paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: tactical.zinc[900],
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  rowText: { flex: 1, paddingRight: 12 },
  catBadge: {
    color: tactical.amber,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rowName: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  rowMeta: { color: tactical.zinc[500], fontSize: 13, marginTop: 4 },
  addHint: {
    color: tactical.amber,
    fontSize: 22,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
});
