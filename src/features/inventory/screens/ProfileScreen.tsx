import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { database } from '../../../database';
import type Profile from '../../../database/models/Profile';
import { tacticalStyles } from '../../../shared/tacticalStyles';

type Nav = { navigate: (screen: string, params?: { profileId?: string }) => void };

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const load = useCallback(async () => {
    const list = await database.get<Profile>('profiles').query().fetch();
    setProfiles(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = () => navigation.navigate('ProfileForm', {});
  const handleEdit = (p: Profile) => navigation.navigate('ProfileForm', { profileId: p.id });
  const handleDelete = (p: Profile) => {
    Alert.alert('Delete profile', `Remove "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await database.write(async () => await p.markAsDeleted());
          await load();
        },
      },
    ]);
  };

  return (
    <View style={tacticalStyles.screen}>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tacticalStyles.card}
            onPress={() => handleEdit(item)}
            onLongPress={() => handleDelete(item)}
          >
            <Text style={tacticalStyles.cardText}>{item.name}</Text>
            <Text style={tacticalStyles.cardSubtext}>{item.bodyWeightKg} kg</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={tacticalStyles.emptyText}>
            No profiles. Add one for weight-based kit warnings.
          </Text>
        }
      />
      <TouchableOpacity style={tacticalStyles.fab} onPress={handleAdd}>
        <Text style={tacticalStyles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
