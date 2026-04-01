import React, { useCallback, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import {
  POOL_CATEGORY_KEYS,
  POOL_CATEGORY_LABELS,
  type PoolCategory,
} from '../../../shared/constants/poolCategories';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { AddFromTemplatesModal } from '../components/AddFromTemplatesModal';

type Section = { title: string; data: InventoryPoolItem[] };

export function InventoryPoolScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [sections, setSections] = useState<Section[]>([]);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);

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
      rows.sort((a, b) => a.name.localeCompare(b.name));
      next.push({ title: POOL_CATEGORY_LABELS[key], data: rows });
    }
    setSections(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={tacticalStyles.screen}>
      <Text style={styles.intro}>
        Warehouse catalog: items you own. Assign them to kits from kit detail (Add from Pool).
      </Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setTemplatesModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.actionBtnText}>Add from Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={() => navigation.navigate('TemplateList')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnSecondaryText}>Manage templates</Text>
        </TouchableOpacity>
      </View>
      <AddFromTemplatesModal
        visible={templatesModalVisible}
        onClose={() => setTemplatesModalVisible(false)}
        onAdded={load}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ItemForm', { poolItemId: item.id })}
            activeOpacity={0.75}
          >
            <Text style={styles.rowName}>{item.name}</Text>
            <Text style={styles.rowMeta}>
              {(item.weightGrams / 1000).toFixed(2)} kg / unit
              {item.calories != null ? ` · ${item.calories} kcal` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>No pool items yet. Tap + or Add from Templates.</Text>
        }
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={() => navigation.navigate('ItemForm', {})}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: tactical.zinc[500],
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: tactical.amber,
    alignItems: 'center',
  },
  actionBtnText: {
    color: tactical.black,
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flexGrow: 1,
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    color: tactical.zinc[400],
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: { paddingBottom: 96 },
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
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: tactical.zinc[900],
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  rowName: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  rowMeta: { color: tactical.zinc[500], fontSize: 13, marginTop: 4 },
});
