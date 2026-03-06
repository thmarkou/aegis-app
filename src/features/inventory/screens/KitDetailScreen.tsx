import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { InventoryStackParamList } from '../../../shared/navigation/InventoryStack';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getColors } from '../../../shared/theme';
import { getKitById } from '../../../db/repositories/kits';
import { getItemsByKitId, deleteItem } from '../../../db/repositories/items';
import { getAllProfiles } from '../../../db/repositories/profiles';
import { getSettings } from '../../../db/repositories/settings';
import type { Kit } from '../../../shared/types';
import type { InventoryItem } from '../../../shared/types';
import { getTotalWeightGrams } from '../utils/weightUtils';
import { useWeightWarning } from '../hooks/useWeightWarning';
import { getRequiredForPeopleAndDays } from '../utils/scalingUtils';
import { DEFAULT_PLAN_DAYS } from '../../../shared/constants';

type Nav = NativeStackNavigationProp<InventoryStackParamList, 'KitDetail'>;

export function KitDetailScreen() {
  const route = useRoute<RouteProp<InventoryStackParamList, 'KitDetail'>>();
  const kitId = route.params.kitId;
  const navigation = useNavigation<Nav>();
  const theme = useAppStore((s) => (s.shtfModeEnabled ? 'shtf' : s.theme));
  const isAdmin = useAppStore((s) => s.authRole === 'admin');
  const colors = getColors(theme);
  const [kit, setKit] = useState<Kit | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(70);
  const [weightWarningPercent, setWeightWarningPercent] = useState(20);
  const [profileCount, setProfileCount] = useState(0);

  const load = useCallback(async () => {
    const [k, list, profiles, settings] = await Promise.all([
      getKitById(kitId),
      getItemsByKitId(kitId),
      getAllProfiles(),
      getSettings(),
    ]);
    setKit(k ?? null);
    setItems(list);
    const first = profiles[0];
    setBodyWeightKg(first ? first.bodyWeightKg : null);
    setWeightWarningPercent(settings.weightWarningPercent);
    setProfileCount(profiles.length);
  }, [kitId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalWeightGrams = getTotalWeightGrams(items);
  const { warningPercent } = useWeightWarning(
    totalWeightGrams,
    bodyWeightKg,
    weightWarningPercent
  );
  const showWeightWarning = warningPercent != null;
  const { waterLiters, calories } = getRequiredForPeopleAndDays(
    profileCount || 1,
    DEFAULT_PLAN_DAYS
  );

  const handleAddItem = useCallback(() => {
    navigation.navigate('ItemForm', { kitId });
  }, [navigation, kitId]);

  const handleDeleteItem = useCallback(
    (item: InventoryItem) => {
      Alert.alert('Delete item', `Remove "${item.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteItem(item.id);
            await load();
          },
        },
      ]);
    },
    [load]
  );

  const styles = makeStyles(colors);

  if (!kit) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {showWeightWarning && bodyWeightKg != null && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Kit weight is {warningPercent}% of body weight ({(totalWeightGrams / 1000).toFixed(1)} kg). Consider reducing for mobility.
          </Text>
        </View>
      )}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total weight: {(totalWeightGrams / 1000).toFixed(1)} kg · {items.length} items
        </Text>
        {profileCount > 0 && (
          <Text style={styles.summaryText}>
            For {profileCount} people, {DEFAULT_PLAN_DAYS} days: need ~{waterLiters} L water, ~{calories.toLocaleString()} kcal
          </Text>
        )}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => isAdmin && navigation.navigate('ItemForm', { kitId, itemId: item.id })}
            onLongPress={() => isAdmin && handleDeleteItem(item)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.quantity} {item.unit} · {(item.weightGrams / 1000).toFixed(2)} kg
              {item.expiryDate ? ` · Exp: ${item.expiryDate}` : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No items. Tap + to add.</Text>
        }
      />
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={handleAddItem}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    warningBanner: {
      backgroundColor: colors.warning,
      padding: 12,
      marginHorizontal: 16,
      marginTop: 8,
      borderRadius: 8,
    },
    warningText: { color: colors.text, fontSize: 14 },
    summary: { padding: 16 },
    summaryText: { color: colors.textSecondary, fontSize: 14 },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    meta: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    empty: { padding: 24, textAlign: 'center', color: colors.textSecondary },
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
