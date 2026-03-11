import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type InventoryItem from '../../../database/models/InventoryItem';
import type Profile from '../../../database/models/Profile';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { useWeightWarning } from '../hooks/useWeightWarning';
import { BlinkingAmberWarning } from '../components/BlinkingAmberWarning';
import * as SecureSettings from '../../../shared/services/secureSettings';

const EXPIRY_WARN_DAYS = 30;

function isExpiredOrExpiringSoon(expiryDate: number | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= EXPIRY_WARN_DAYS;
}

type Nav = { navigate: (screen: string, params?: { kitId: string; itemId?: string }) => void };

export function KitDetailScreen() {
  const route = useRoute<RouteProp<InventoryStackParamList, 'KitDetail'>>();
  const kitId = route.params.kitId;
  const navigation = useNavigation<Nav>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const [weightPercent, setWeightPercent] = useState(20);
  const [sortByExpiry, setSortByExpiry] = useState(false);

  const load = useCallback(async () => {
    const k = await database.get<Kit>('kits').find(kitId);
    const list = await database.get<InventoryItem>('inventory_items').query(Q.where('kit_id', kitId)).fetch();
    setKit(k);
    setItems(list);
  }, [kitId]);

  useEffect(() => {
    (async () => {
      const [profiles, pct, sort] = await Promise.all([
        database.get<Profile>('profiles').query().fetch(),
        SecureSettings.getWeightPercent(),
        SecureSettings.getSortByExpiry(),
      ]);
      setWeightPercent(pct);
      setSortByExpiry(sort);
      const first = profiles[0];
      setBodyWeightKg(first?.bodyWeightKg ?? null);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      SecureSettings.getSortByExpiry().then(setSortByExpiry);
    }, [load])
  );

  const sortedItems = sortByExpiry
    ? [...items].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate - b.expiryDate;
      })
    : items;

  const totalWeight = items.reduce((sum, i) => sum + i.quantity * i.weightGrams, 0);
  const totalKg = totalWeight / 1000;
  const { warningPercent } = useWeightWarning(totalWeight, bodyWeightKg, weightPercent);
  const WEIGHT_WARN_KG = 15;
  const isOverWeight = totalKg >= WEIGHT_WARN_KG;

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

  return (
    <View style={tacticalStyles.screen}>
      <View style={[tacticalStyles.header, isOverWeight && styles.weightWarn]}>
        <Text style={[styles.telemetryLabel, isOverWeight && styles.telemetryWarn]}>
          PKG_WT: {totalKg.toFixed(2)} KG
        </Text>
        <Text style={tacticalStyles.headerText}>
          {items.length} items
        </Text>
        {warningPercent != null && (
          <Text style={[tacticalStyles.headerText, { color: tactical.amber, marginTop: 4 }]}>
            ⚠ Weight is {warningPercent}% of body weight (limit: {weightPercent}%)
          </Text>
        )}
      </View>
      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const showExpiryWarn = isExpiredOrExpiringSoon(item.expiryDate);
          return (
            <TouchableOpacity
              style={tacticalStyles.card}
              onPress={() => navigation.navigate('ItemForm', { kitId, itemId: item.id })}
              onLongPress={() => handleDeleteItem(item)}
            >
              <View style={styles.itemNameRow}>
                <Text style={tacticalStyles.cardText}>{item.name}</Text>
                {showExpiryWarn && <BlinkingAmberWarning />}
              </View>
              <Text style={tacticalStyles.cardSubtext}>
                {item.quantity} {item.unit} · {(item.weightGrams / 1000).toFixed(2)} kg
                {item.expiryDate ? ` · Exp: ${new Date(item.expiryDate).toISOString().slice(0, 10)}` : ''}
              </Text>
            </TouchableOpacity>
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
  telemetryLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 18,
    fontWeight: '600',
    color: tactical.zinc[400],
    letterSpacing: 1,
  },
  telemetryWarn: {
    color: tactical.amber,
    textShadowColor: tactical.amber,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  weightWarn: {
    backgroundColor: 'rgba(255, 191, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 191, 0, 0.3)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
