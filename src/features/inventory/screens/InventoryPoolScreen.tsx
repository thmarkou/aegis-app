import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  InteractionManager,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
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
import type KitPackItem from '../../../database/models/KitPackItem';
import {
  BATTERY_POOL_CATEGORY_KEYS,
  POOL_CATEGORY_KEYS,
  POOL_CATEGORY_LABELS,
  type PoolCategory,
} from '../../../shared/constants/poolCategories';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { getPoolItemAlertDisplay, poolItemNeedsAttention } from '../../../services/alertLeadTime';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { formatWeightGrams } from '../../../shared/utils/formatWeight';
import { deleteInventoryPoolItemCascade } from '../../../services/inventoryPoolDelete';
import { refreshInventoryNotifications } from '../services/refreshInventoryNotifications';
import {
  importPoolCsv,
  readTextFileLenientUtf8,
  type CsvTemplateKind,
} from '../services/poolCsvImport';
import {
  buildPoolExportCsv,
  filterItemsForExportKind,
  writePoolCsvAndShare,
} from '../services/poolCsvExport';

type Section = { title: string; data: InventoryPoolItem[] };

type FilterMode = 'all' | PoolCategory | 'needs_charge';

type CategoryKitStats = { assigned: number; total: number };

type PoolKitSummary = {
  byCategory: Record<PoolCategory, CategoryKitStats>;
  warehouse: CategoryKitStats;
  needsAttentionCount: number;
};

function initialKitSummary(): PoolKitSummary {
  const byCategory = POOL_CATEGORY_KEYS.reduce(
    (acc, k) => {
      acc[k] = { assigned: 0, total: 0 };
      return acc;
    },
    {} as Record<PoolCategory, CategoryKitStats>
  );
  return { byCategory, warehouse: { assigned: 0, total: 0 }, needsAttentionCount: 0 };
}

export function InventoryPoolScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<SharedStackParamList, 'InventoryPool'>>();
  const [sections, setSections] = useState<Section[]>([]);
  const [filterCat, setFilterCat] = useState<FilterMode>('all');
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [kitSummary, setKitSummary] = useState<PoolKitSummary>(initialKitSummary);

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
    const packs = await database.get<KitPackItem>('kit_pack_items').query().fetch();
    const poolIdsInAnyKit = new Set(packs.map((line) => line.poolItemId));

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
      if (rows.length > 0) {
        next.push({ title: POOL_CATEGORY_LABELS[key], data: rows });
      }
    }
    setSections(next);

    const byCategory = POOL_CATEGORY_KEYS.reduce(
      (acc, k) => {
        const rows = byCat[k];
        acc[k] = {
          total: rows.length,
          assigned: rows.reduce((n, p) => n + (poolIdsInAnyKit.has(p.id) ? 1 : 0), 0),
        };
        return acc;
      },
      {} as Record<PoolCategory, CategoryKitStats>
    );
    setKitSummary({
      byCategory,
      warehouse: {
        total: pools.length,
        assigned: pools.reduce((n, p) => n + (poolIdsInAnyKit.has(p.id) ? 1 : 0), 0),
      },
      needsAttentionCount: pools.filter((p) => poolItemNeedsAttention(p)).length,
    });
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
          data: s.data.filter((item) => poolItemNeedsAttention(item)),
        }))
        .filter((s) => s.data.length > 0);
    }
    return sections.filter((s) => s.title === POOL_CATEGORY_LABELS[filterCat]);
  }, [sections, filterCat]);

  const totalPoolItems = useMemo(
    () => sections.reduce((sum, s) => sum + s.data.length, 0),
    [sections]
  );

  /** Prevents overlapping DocumentPicker sessions (iOS: "Different document picking in progress"). */
  const csvImportInFlightRef = useRef(false);
  const csvExportInFlightRef = useRef(false);

  const runCsvImport = useCallback(
    async (kind: CsvTemplateKind) => {
      if (csvImportInFlightRef.current) return;
      csvImportInFlightRef.current = true;
      setImportModalVisible(false);
      try {
        // Let the import modal finish dismissing before opening the system file UI; otherwise
        // getDocumentAsync can fail before any file is chosen.
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(resolve, 450);
          });
        });
        const pick = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          type: '*/*',
        });
        if (pick.canceled || !pick.assets?.length) return;
        const text = await readTextFileLenientUtf8(pick.assets[0].uri);
        const out = await importPoolCsv(text, kind);
        let message = `Imported ${out.imported} item(s).`;
        if (out.errors.length > 0) {
          const shown = out.errors.slice(0, 8);
          message += `\n\n${shown.join('\n')}`;
          if (out.errors.length > 8) message += `\n… +${out.errors.length - 8} more`;
        }
        Alert.alert(out.imported > 0 || out.errors.length === 0 ? 'Import' : 'Import issues', message);
        if (out.imported > 0) void load();
      } catch (e) {
        Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
      } finally {
        csvImportInFlightRef.current = false;
      }
    },
    [load]
  );

  const runCsvExport = useCallback(async (kind: CsvTemplateKind) => {
    if (csvExportInFlightRef.current) return;
    csvExportInFlightRef.current = true;
    setExportModalVisible(false);
    try {
      const pools = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();
      const filtered = filterItemsForExportKind(kind, pools);
      const csv = buildPoolExportCsv(kind, filtered);
      await writePoolCsvAndShare(kind, csv);
      if (filtered.length === 0) {
        Alert.alert('Export', 'No items in this template group — file has the header row only.');
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      csvExportInFlightRef.current = false;
    }
  }, []);

  const handleDeleteItem = (poolItem: InventoryPoolItem) => {
    Alert.alert('Delete item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteInventoryPoolItemCascade(poolItem.id);
              await load();
              refreshInventoryNotifications().catch(() => {});
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Delete failed');
            }
          })();
        },
      },
    ]);
  };

  return (
    <View style={tacticalStyles.screen}>
      <Text style={styles.intro}>
        Physical warehouse catalog: one list for all pool items. Use + to add an item manually, or
        Import / Export CSV (four UTF-8 templates under assets/import-templates/). Alert lead applies where
        expiry or battery maintenance is used — not for Tools. &quot;Needs attention&quot; filters
        expiry or maintenance alerts. Category chips show (in kits / total): pool lines linked to at
        least one kit vs all rows in that category.
      </Text>
      <View style={styles.importExportRow}>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={() => setImportModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.importBtnText}>Import CSV…</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={() => setExportModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.importBtnText}>Export CSV…</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.chipsWrap}>
        <TouchableOpacity
          style={[styles.chip, filterCat === 'all' && styles.chipOn]}
          onPress={() => applyFilter('all')}
          activeOpacity={0.85}
        >
          <Text style={[styles.chipText, filterCat === 'all' && styles.chipTextOn]}>
            All ({kitSummary.warehouse.assigned}/{kitSummary.warehouse.total})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filterCat === 'needs_charge' && styles.chipAlertOn]}
          onPress={() => applyFilter('needs_charge')}
          activeOpacity={0.85}
        >
          <Text style={[styles.chipText, filterCat === 'needs_charge' && styles.chipTextAlertOn]}>
            Needs attention ({kitSummary.needsAttentionCount})
          </Text>
        </TouchableOpacity>
        {POOL_CATEGORY_KEYS.map((key) => {
          const on = filterCat === key;
          const { assigned, total } = kitSummary.byCategory[key];
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => applyFilter(key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={2}>
                {POOL_CATEGORY_LABELS[key]} ({assigned}/{total})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {totalPoolItems === 0 ? (
        <View style={styles.emptyWarehouse}>
          <Text style={styles.emptyWarehouseTitle}>Your Warehouse is empty.</Text>
          <Text style={styles.emptyWarehouseBody}>
            Add physical items with &quot;+&quot; — everything here is created and saved by you.
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
            const display = getPoolItemAlertDisplay(item);
            const showBadge = display !== 'ok';
            return (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => navigation.navigate('ItemForm', { poolItemId: item.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.rowTitleRow}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    {showBadge ? (
                      <Text
                        style={[
                          styles.battBadge,
                          display === 'warning' ? styles.battBadgeOrange : styles.battBadgeRed,
                        ]}
                        numberOfLines={1}
                      >
                        {display === 'missing_data'
                          ? 'MISSING'
                          : display === 'critical'
                            ? 'DUE'
                            : 'SOON'}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.rowMeta}>
                    {formatWeightGrams(item.weightGrams)} g / unit
                    {item.poolCategory === 'consumables' && item.calories != null
                      ? ` · ${item.calories} kcal`
                      : ''}
                    {item.poolCategory === 'water' && item.waterLitersPerUnit != null
                      ? ` · ${item.waterLitersPerUnit} L/unit`
                      : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteRowBtn}
                  onPress={() => handleDeleteItem(item)}
                  activeOpacity={0.75}
                  accessibilityLabel="Delete item"
                >
                  <Text style={styles.deleteRowBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={tacticalStyles.emptyText}>
              {filterCat === 'all'
                ? 'No pool items in this view.'
                : filterCat === 'needs_charge'
                  ? 'No items in warning or critical state.'
                  : `No items in ${POOL_CATEGORY_LABELS[filterCat as PoolCategory]}. Pick another category or add an item.`}
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
      <TouchableOpacity style={tacticalStyles.fab} onPress={() => navigation.navigate('ItemForm', {})}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={importModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setImportModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Import warehouse CSV</Text>
            <Text style={styles.modalHint}>
              Use the matching template header row exactly (UTF-8 from Excel). Templates:
              assets/import-templates/
            </Text>
            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvImport('tools')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>1 · Tools</Text>
                <Text style={styles.modalRowSub}>category: tools only</Text>
                <Text style={styles.modalRowDetail}>
                  No expiry or alert_lead columns. Required: name; category (tools).{'\n'}
                  If left blank: unit defaults to pcs, weight_grams to 0.{'\n'}
                  Optional: condition, notes, barcode, is_essential.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvImport('general')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>2 · Medical &amp; shelter</Text>
                <Text style={styles.modalRowSub}>medical, shelter_clothing</Text>
                <Text style={styles.modalRowDetail}>
                  Required: name; category (medical | shelter_clothing).{'\n'}
                  medical: expiry optional (DD-MM-YYYY); alert_lead_days defaults to 14 if blank.{'\n'}
                  shelter_clothing: leave expiry and alert_lead_days empty (ignored).{'\n'}
                  Optional: condition, notes, barcode, is_essential.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvImport('food_water')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>3 · Food &amp; water</Text>
                <Text style={styles.modalRowSub}>consumables, water</Text>
                <Text style={styles.modalRowDetail}>
                  Required: name; category (consumables | water).{'\n'}
                  consumables: fill calories (kcal per unit) when applicable.{'\n'}
                  water: fill liters_per_unit when applicable.{'\n'}
                  Expiry: optional — if filled, DD-MM-YYYY. Same defaults for unit, weight, alert_lead_days
                  when blank.{'\n'}
                  Optional: condition, notes, barcode, is_essential.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvImport('battery')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>4 · Battery / power</Text>
                <Text style={styles.modalRowSub}>
                  {BATTERY_POOL_CATEGORY_KEYS.join(', ')}
                </Text>
                <Text style={styles.modalRowDetail}>
                  Required: name; category (one of the keys above); battery_type; last_charge_date
                  (YYYY-MM-DD in the file). No expiry column — maintenance uses last charge + cycle.{'\n'}
                  If blank: maintenance_cycle_days defaults to 90, alert_lead_days to 14.{'\n'}
                  Optional: battery_capacity_mah, charging_requirements, notes, barcode, is_essential.
                </Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setImportModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setExportModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Export warehouse CSV</Text>
            <Text style={styles.modalHint}>
              Pick the same template group as Import. Only rows in those categories are included
              (re-importable UTF-8). Use the share sheet to save to Files, AirDrop, etc.
            </Text>
            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvExport('tools')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>1 · Tools</Text>
                <Text style={styles.modalRowSub}>category: tools only</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvExport('general')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>2 · Medical &amp; shelter</Text>
                <Text style={styles.modalRowSub}>medical, shelter_clothing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvExport('food_water')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>3 · Food &amp; water</Text>
                <Text style={styles.modalRowSub}>consumables, water</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => void runCsvExport('battery')}
                activeOpacity={0.8}
              >
                <Text style={styles.modalRowTitle}>4 · Battery / power</Text>
                <Text style={styles.modalRowSub}>{BATTERY_POOL_CATEGORY_KEYS.join(', ')}</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setExportModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  importExportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginLeft: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  importBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  importBtnText: {
    color: tactical.amber,
    fontSize: 13,
    fontWeight: '700',
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
    padding: 16,
  },
  modalTitle: {
    color: tactical.amber,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalHint: {
    color: tactical.zinc[500],
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  modalScroll: {
    maxHeight: 420,
    marginBottom: 4,
  },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  modalRowTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalRowSub: { color: tactical.zinc[500], fontSize: 12, marginTop: 4 },
  modalRowDetail: {
    color: tactical.zinc[400],
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  modalCancel: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: tactical.zinc[500], fontSize: 14, fontWeight: '600' },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 12,
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
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextOn: { color: tactical.amber },
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
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: tactical.zinc[900],
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    padding: 14,
    minWidth: 0,
  },
  deleteRowBtn: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: tactical.zinc[700],
    backgroundColor: 'rgba(185, 28, 28, 0.12)',
  },
  deleteRowBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
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
