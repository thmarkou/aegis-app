import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type InventoryItem from '../../../database/models/InventoryItem';
import type Profile from '../../../database/models/Profile';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { useWeightWarning } from '../hooks/useWeightWarning';
import * as SecureSettings from '../../../shared/services/secureSettings';

type Nav = { navigate: (screen: string, params?: { kitId: string; itemId?: string }) => void };

export function KitDetailScreen() {
  const route = useRoute<RouteProp<InventoryStackParamList, 'KitDetail'>>();
  const kitId = route.params.kitId;
  const navigation = useNavigation<Nav>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const [weightPercent, setWeightPercent] = useState(20);

  const load = useCallback(async () => {
    const k = await database.get<Kit>('kits').find(kitId);
    const list = await database.get<InventoryItem>('inventory_items').query(Q.where('kit_id', kitId)).fetch();
    setKit(k);
    setItems(list);
  }, [kitId]);

  useEffect(() => {
    (async () => {
      const [profiles, pct] = await Promise.all([
        database.get<Profile>('profiles').query().fetch(),
        SecureSettings.getWeightPercent(),
      ]);
      setWeightPercent(pct);
      const first = profiles[0];
      setBodyWeightKg(first?.bodyWeightKg ?? null);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalWeight = items.reduce((sum, i) => sum + i.quantity * i.weightGrams, 0);
  const { warningPercent } = useWeightWarning(totalWeight, bodyWeightKg, weightPercent);

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
      <View style={tacticalStyles.header}>
        <Text style={tacticalStyles.headerText}>
          Total: {(totalWeight / 1000).toFixed(1)} kg · {items.length} items
        </Text>
        {warningPercent != null && (
          <Text style={[tacticalStyles.headerText, { color: tactical.amber, marginTop: 4 }]}>
            ⚠ Weight is {warningPercent}% of body weight (limit: {weightPercent}%)
          </Text>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tacticalStyles.card}
            onPress={() => navigation.navigate('ItemForm', { kitId, itemId: item.id })}
            onLongPress={() => handleDeleteItem(item)}
          >
            <Text style={tacticalStyles.cardText}>{item.name}</Text>
            <Text style={tacticalStyles.cardSubtext}>
              {item.quantity} {item.unit} · {(item.weightGrams / 1000).toFixed(2)} kg
              {item.expiryDate ? ` · Exp: ${new Date(item.expiryDate).toISOString().slice(0, 10)}` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={tacticalStyles.emptyText}>No items. Tap + to add.</Text>}
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAddItem}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
