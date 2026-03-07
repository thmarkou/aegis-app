import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import { tacticalStyles } from '../../../shared/tacticalStyles';

type Nav = { navigate: (screen: string, params?: { kitId: string }) => void };

export function KitListScreen() {
  const navigation = useNavigation<Nav>();
  const [kits, setKits] = useState<Kit[]>([]);

  const load = useCallback(async () => {
    const list = await database.get<Kit>('kits').query().fetch();
    setKits(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    await database.write(async () => {
      const kitsCollection = database.get<Kit>('kits');
      await kitsCollection.create((record) => {
        record.name = 'New Kit';
        record.description = null;
        record.createdAt = new Date();
        record.updatedAt = new Date();
      });
    });
    await load();
    const list = await database.get<Kit>('kits').query().fetch();
    const last = list[list.length - 1];
    if (last) navigation.navigate('KitDetail', { kitId: last.id });
  }, [load, navigation]);

  const handleDelete = useCallback(
    (kit: Kit) => {
      Alert.alert('Delete kit', `Delete "${kit.name}" and all its items?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await database.write(async () => {
              await kit.markAsDeleted();
            });
            await load();
          },
        },
      ]);
    },
    [load]
  );

  return (
    <View style={tacticalStyles.screen}>
      <FlatList
        data={kits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tacticalStyles.card}
            onPress={() => navigation.navigate('KitDetail', { kitId: item.id })}
            onLongPress={() => handleDelete(item)}
          >
            <Text style={tacticalStyles.cardText}>{item.name}</Text>
            {item.description ? (
              <Text style={tacticalStyles.cardSubtext} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>No kits yet. Add one to get started.</Text>
        }
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAdd}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
