import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  useNavigation,
  useFocusEffect,
  useRoute,
  type NavigationProp,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import { database } from '../../../database';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import {
  POOL_CATEGORY_KEYS,
  POOL_CATEGORY_LABELS,
  type PoolCategory,
} from '../../../shared/constants/poolCategories';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { AddFromTemplatesModal } from '../components/AddFromTemplatesModal';
import * as SecureSettings from '../../../shared/services/secureSettings';
import {
  poolItemNeedsBatteryAttention,
  getBatteryAttentionLevel,
} from '../../../services/batteryInventoryReview';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';

type Section = { title: string; data: InventoryPoolItem[] };

type FilterMode = 'all' | PoolCategory | 'needs_charge';

export function InventoryPoolScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<SharedStackParamList, 'InventoryPool'>>();
  const [sections, setSections] = useState<Section[]>([]);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [filterCat, setFilterCat] = useState<FilterMode>('all');
  const [maintMonths, setMaintMonths] = useState(6);

  useEffect(() => {
    void SecureSettings.getMaintenanceAlertThresholdMonths().then(setMaintMonths);
  }, []);

  const applyFilter = useCallback(
    (mode: FilterMode) => {
      setFilterCat(mode);
      navigation.setParams({
        filter: mode === 'needs_charge' ? 'needs_charge' : undefined,
      });
    },
    [navigation]
  );

  const load = useCallback(async () => {
    const pools = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();
    const months = await SecureSettings.getMaintenanceAlertThresholdMonths();
    setMaintMonths(months);

    const byCat = POOL_CATEGORY_KEYS.reduce(
      (acc, k) => {
        acc[k] = [];
        return acc;
      },
      {} as Record<PoolCategory, InventoryPoolItem[]>
    );

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
      void load();
      if (route.params?.filter === 'needs_charge') {
        setFilterCat('needs_charge');
      }
    }, [load, route.params?.filter])
  );

  const sectionsToShow = useMemo(() => {
    if (filterCat === 'all') return sections;
    if (filterCat === 'needs_charge') {
      return sections
        .map((s) => ({
          ...s,
          data: s.data.filter((item) => poolItemNeedsBatteryAttention(item, maintMonths)),
        }))
        .filter((s) => s.data.length > 0);
    }
    return sections.filter((s) => s.title === POOL_CATEGORY_LABELS[filterCat]);
  }, [sections, filterCat, maintMonths]);

  const totalPoolItems = useMemo(
    () => sections.reduce((sum, s) => sum + s.data.length, 0),
    [sections]
  );

  return (
    <View style={tacticalStyles.screen}>
      <Text style={styles.intro}>
        Your inventory catalog: one list for all pool items. Use + to add an item, or Add from Blueprints.
        Category chips and &quot;Needs charge&quot; filter this same list.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        <TouchableOpacity
          style={[styles.chip, filterCat === 'all' && styles.chipOn]}
          onPress={() => applyFilter('all')}
          activeOpacity={0.85}
        >
          <Text style={[styles.chipText, filterCat === 'all' && styles.chipTextOn]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filterCat === 'needs_charge' && styles.chipAlertOn]}
          onPress={() => applyFilter('needs_charge')}
          activeOpacity={0.85}
        >
          <Text style={[styles.chipText, filterCat === 'needs_charge' && styles.chipTextAlertOn]}>
            Needs charge
          </Text>
        </TouchableOpacity>
        {POOL_CATEGORY_KEYS.map((key) => {
          const on = filterCat === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => applyFilter(key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{POOL_CATEGORY_LABELS[key]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setTemplatesModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.actionBtnText}>Add from Blueprints</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={() => navigation.navigate('TemplateList')}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnSecondaryText}>Manage blueprints</Text>
        </TouchableOpacity>
      </View>
      <AddFromTemplatesModal
        visible={templatesModalVisible}
        onClose={() => setTemplatesModalVisible(false)}
        onAdded={load}
      />
      {totalPoolItems === 0 ? (
        <View style={styles.emptyWarehouse}>
          <Text style={styles.emptyWarehouseTitle}>Your Warehouse is empty.</Text>
          <Text style={styles.emptyWarehouseBody}>
            Add items manually with &quot;+&quot; or use &quot;Add from Blueprints&quot;.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sectionsToShow}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }) => {
            const level = getBatteryAttentionLevel(item.poolCategory, item.lastChargeAt, maintMonths);
            const showBatt =
              level === 'needs_charge' || level === 'upcoming' || level === 'missing_data';
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('ItemForm', { poolItemId: item.id })}
                activeOpacity={0.75}
              >
                <View style={styles.rowTitleRow}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {showBatt ? (
                    <Text
                      style={[
                        styles.battBadge,
                        level === 'needs_charge' || level === 'missing_data'
                          ? styles.battBadgeRed
                          : styles.battBadgeOrange,
                      ]}
                      numberOfLines={1}
                    >
                      {level === 'missing_data' || level === 'needs_charge'
                        ? 'NEEDS CHARGE'
                        : 'UPCOMING'}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.rowMeta}>
                  {(item.weightGrams / 1000).toFixed(2)} kg / unit
                  {item.calories != null ? ` · ${item.calories} kcal` : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={tacticalStyles.emptyText}>
              {filterCat === 'all'
                ? 'No pool items in this view.'
                : filterCat === 'needs_charge'
                  ? 'No items past their battery review date.'
                  : `No items in ${POOL_CATEGORY_LABELS[filterCat as PoolCategory]}. Pick another category or add an item.`}
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
    lineHeight: 20,
  },
  chipsScroll: { maxHeight: 44, marginBottom: 8 },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  chipOn: {
    borderColor: tactical.amber,
    backgroundColor: 'rgba(255, 191, 0, 0.12)',
  },
  chipAlertOn: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  chipTextAlertOn: { color: '#fca5a5' },
  chipText: {
    color: tactical.zinc[400],
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextOn: { color: tactical.amber },
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
  emptyWarehouse: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tactical.amber,
    backgroundColor: 'rgba(255, 191, 0, 0.08)',
  },
  emptyWarehouseTitle: {
    color: tactical.amber,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyWarehouseBody: {
    color: tactical.zinc[400],
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
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
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: { color: '#ffffff', fontSize: 16, fontWeight: '600', flex: 1 },
  rowMeta: { color: tactical.zinc[500], fontSize: 13, marginTop: 4 },
  battBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  battBadgeRed: { color: '#f87171' },
  battBadgeOrange: { color: '#fb923c' },
});
