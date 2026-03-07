import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type InventoryItem from '../../../database/models/InventoryItem';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { tacticalStyles } from '../../../shared/tacticalStyles';

type Nav = { navigate: (screen: string, params?: { kitId: string; itemId?: string }) => void };

export function KitDetailScreen() {
  const route = useRoute<RouteProp<InventoryStackParamList, 'KitDetail'>>();
  const kitId = route.params.kitId;
  const navigation = useNavigation<Nav>();
  const [kit, setKit] = useState<Kit | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);

  const load = useCallback(async () => {
    const k = await database.get<Kit>('kits').find(kitId);
    const list = await database.get<InventoryItem>('inventory_items').query(Q.where('kit_id', kitId)).fetch();
    setKit(k);
    setItems(list);
  }, [kitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalWeight = items.reduce((sum, i) => sum + i.quantity * i.weightGrams, 0);

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
