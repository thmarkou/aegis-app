import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getColors } from '../../../shared/theme';
import { getAllKits, insertKit, deleteKit } from '../../../db/repositories/kits';
import type { Kit } from '../../../shared/types';

type Nav = NativeStackNavigationProp<InventoryStackParamList, 'KitList'>;

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function KitListScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useAppStore((s) => (s.shtfModeEnabled ? 'shtf' : s.theme));
  const isAdmin = useAppStore((s) => s.authRole === 'admin');
  const colors = getColors(theme);
  const [kits, setKits] = useState<Kit[]>([]);

  const load = useCallback(async () => {
    const list = await getAllKits();
    setKits(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    const id = uuid();
    await insertKit({ id, name: 'New Kit', description: null });
    await load();
    navigation.navigate('KitDetail', { kitId: id });
  }, [load, navigation]);

  const handleDelete = useCallback(
    (kit: Kit) => {
      Alert.alert('Delete kit', `Delete "${kit.name}" and all its items?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteKit(kit.id);
            await load();
          },
        },
      ]);
    },
    [load]
  );

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <FlatList
        data={kits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('KitDetail', { kitId: item.id })}
            onLongPress={() => isAdmin && handleDelete(item)}
          >
            <Text style={styles.name}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.desc} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No kits yet. Add one to get started.</Text>
        }
      />
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={handleAdd}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    name: { fontSize: 18, fontWeight: '600', color: colors.text },
    desc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    empty: {
      padding: 24,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabText: { fontSize: 28, color: colors.primaryText, fontWeight: '300' },
  });
}
