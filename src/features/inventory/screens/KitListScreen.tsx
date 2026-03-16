import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type { KitIconType } from '../../../shared/types';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

type Nav = { navigate: (screen: string, params?: { kitId: string }) => void };

const KIT_ICON_MAP: Record<KitIconType, keyof typeof Ionicons.glyphMap> = {
  backpack: 'bag-outline',
  car: 'car-outline',
  home: 'home-outline',
};

function getKitIcon(iconType: string | null): keyof typeof Ionicons.glyphMap {
  if (iconType && iconType in KIT_ICON_MAP) {
    return KIT_ICON_MAP[iconType as KitIconType];
  }
  return 'cube-outline';
}

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
        record.waterReservoirLiters = null;
        record.iconType = null;
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
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tacticalStyles.card}
            onPress={() => navigation.navigate('KitDetail', { kitId: item.id })}
            onLongPress={() => handleDelete(item)}
          >
            <View style={styles.cardRow}>
              <Ionicons name={getKitIcon(item.iconType)} size={24} color={tactical.amber} style={styles.kitIcon} />
              <View style={styles.cardContent}>
                <Text style={tacticalStyles.cardText}>{item.name}</Text>
                {item.description ? (
                  <Text style={tacticalStyles.cardSubtext} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>
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

const styles = StyleSheet.create({
  listContent: { paddingTop: 16, paddingBottom: 24 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kitIcon: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
});
