import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { database } from '../../../database';
import type Profile from '../../../database/models/Profile';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

export function ProfileFormScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'ProfileForm'>>();
  const profileId = route.params?.profileId;
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [bodyWeightKg, setBodyWeightKg] = useState('');

  useEffect(() => {
    if (!profileId) return;
    database.get<Profile>('profiles').find(profileId).then((p) => {
      setName(p.name);
      setBodyWeightKg(String(p.bodyWeightKg));
    });
  }, [profileId]);

  const handleSave = async () => {
    const w = parseFloat(bodyWeightKg);
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (isNaN(w) || w < 1 || w > 500) {
      Alert.alert('Error', 'Body weight must be 1–500 kg');
      return;
    }

    await database.write(async () => {
      const profiles = database.get<Profile>('profiles');
      if (profileId) {
        const p = await profiles.find(profileId);
        await p.update((r) => {
          r.name = name.trim();
          r.bodyWeightKg = w;
          r.updatedAt = new Date();
        });
      } else {
        await profiles.create((r) => {
          r.name = name.trim();
          r.bodyWeightKg = w;
          r.createdAt = new Date();
          r.updatedAt = new Date();
        });
      }
    });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={tacticalStyles.label}>Name</Text>
      <TextInput
        style={tacticalStyles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. John"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Body weight (kg)</Text>
      <TextInput
        style={tacticalStyles.input}
        value={bodyWeightKg}
        onChangeText={setBodyWeightKg}
        placeholder="70"
        placeholderTextColor="#666"
        keyboardType="decimal-pad"
      />
      <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={handleSave}>
        <Text style={tacticalStyles.btnPrimaryText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 32 },
});
