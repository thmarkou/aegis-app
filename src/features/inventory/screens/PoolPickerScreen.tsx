import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
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

type Section = { title: string; data: InventoryPoolItem[] };

export function PoolPickerScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'PoolPicker'>>();
  const { kitId } = route.params;
  const navigation = useNavigation();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const pools = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();
    const byCat: Record<PoolCategory, InventoryPoolItem[]> = {
      tools: [],
      consumables: [],
      medical: [],
      shelter_clothing: [],
      comms_nav: [],
    };
    for (const p of pools) {
      const k = (POOL_CATEGORY_KEYS as readonly string[]).includes(p.poolCategory)
        ? (p.poolCategory as PoolCategory)
        : 'tools';
      byCat[k].push(p);
    }
    const next: Section[] = [];
    for (const key of POOL_CATEGORY_KEYS) {
      const rows = byCat[key];
      if (rows.length === 0) continue;
      rows.sort((a, b) => a.name.localeCompare(b.name));
      next.push({ title: POOL_CATEGORY_LABELS[key], data: rows });
    }
    setSections(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  if (loading) {
    return (
      <View style={[tacticalStyles.screen, styles.center]}>
        <ActivityIndicator color={tactical.amber} />
      </View>
    );
  }

  return (
    <View style={tacticalStyles.screen}>
      <Text style={styles.hint}>Pick an item from your global pool to pack in this kit.</Text>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => void addPoolToKit(item)} activeOpacity={0.75}>
            <View style={styles.rowText}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowMeta}>
                {(item.weightGrams / 1000).toFixed(2)} kg / unit
                {item.calories != null ? ` · ${item.calories} kcal/unit` : ''}
              </Text>
            </View>
            <Text style={styles.addHint}>+</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>No items in pool yet. Add items under Global Inventory Pool.</Text>
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
  sectionHeader: {
    color: tactical.amber,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: tactical.black,
  },
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
