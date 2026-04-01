import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type { KitIconType } from '../../../shared/types';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

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
  const navigation = useNavigation<NativeStackNavigationProp<SharedStackParamList, 'KitList'>>();
  const [kits, setKits] = useState<Kit[]>([]);
  const [activeKitId, setActiveKitId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await database.get<Kit>('kits').query().fetch();
    setKits(list);
    setActiveKitId(await SecureSettings.getActiveKitId());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleAdd = useCallback(() => {
    navigation.navigate('KitForm', {});
  }, [navigation]);

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
            const still = await SecureSettings.getActiveKitId();
            if (still === kit.id) {
              const remaining = await database.get<Kit>('kits').query().fetch();
              await SecureSettings.setActiveKitId(remaining[0]?.id ?? null);
            }
            await load();
          },
        },
      ]);
    },
    [load]
  );

  const setAsActive = async (kit: Kit) => {
    await SecureSettings.setActiveKitId(kit.id);
    setActiveKitId(kit.id);
  };

  return (
    <View style={tacticalStyles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.newKitCta} onPress={handleAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={22} color={tactical.black} />
          <Text style={styles.newKitCtaText}>New kit</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Dashboard readiness and PKG_WT use only the kit marked Active. Tap &quot;Set active&quot; to choose.
      </Text>
      <FlatList
        data={kits}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isActive = activeKitId === item.id;
          return (
            <View style={styles.cardWrap}>
              <TouchableOpacity
                style={tacticalStyles.card}
                onPress={() => navigation.navigate('KitDetail', { kitId: item.id })}
                onLongPress={() => handleDelete(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardRow}>
                  <Ionicons name={getKitIcon(item.iconType)} size={24} color={tactical.amber} style={styles.kitIcon} />
                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <Text style={tacticalStyles.cardText} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    {item.description ? (
                      <Text style={tacticalStyles.cardSubtext} numberOfLines={1}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
              {!isActive ? (
                <TouchableOpacity
                  style={styles.setActiveBtn}
                  onPress={() => void setAsActive(item)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.setActiveBtnText}>Set as active</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>No kits yet. Use New kit or + to create one.</Text>
        }
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAdd} accessibilityLabel="Add new kit">
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  newKitCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: tactical.amber,
  },
  newKitCtaText: {
    color: tactical.black,
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    color: tactical.zinc[500],
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listContent: { paddingTop: 4, paddingBottom: 96 },
  cardWrap: {
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kitIcon: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 191, 0, 0.2)',
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  activeBadgeText: {
    color: tactical.amber,
    fontSize: 11,
    fontWeight: '800',
  },
  setActiveBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    backgroundColor: tactical.zinc[900],
  },
  setActiveBtnText: {
    color: tactical.zinc[400],
    fontSize: 13,
    fontWeight: '700',
  },
});
