import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { database } from '../../../database';
import type Kit from '../../../database/models/Kit';
import type { SharedStackParamList } from '../../../shared/navigation/sharedStackTypes';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

export function KitFormScreen() {
  const route = useRoute<RouteProp<SharedStackParamList, 'KitForm'>>();
  const { kitId } = route.params;
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    database.get<Kit>('kits').find(kitId).then((k) => {
      setName(k.name);
      setDescription(k.description ?? '');
    });
  }, [kitId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    await database.write(async () => {
      const kit = await database.get<Kit>('kits').find(kitId);
      await kit.update((r) => {
        r.name = name.trim();
        r.description = description.trim() || null;
        r.updatedAt = new Date();
      });
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
        placeholder="Kit name"
        placeholderTextColor="#666"
      />
      <Text style={tacticalStyles.label}>Description</Text>
      <TextInput
        style={[tacticalStyles.input, { minHeight: 80, textAlignVertical: 'top' }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Optional description"
        placeholderTextColor="#666"
        multiline
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
