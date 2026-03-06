import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getColors } from '../../../shared/theme';
import { getAllProfiles } from '../../../db/repositories/profiles';
import { insertProfile, updateProfile, deleteProfile } from '../../../db/repositories/profiles';
import type { Profile } from '../../../shared/types';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function ProfileScreen() {
  const theme = useAppStore((s) => (s.shtfModeEnabled ? 'shtf' : s.theme));
  const isAdmin = useAppStore((s) => s.authRole === 'admin');
  const colors = getColors(theme);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const load = useCallback(async () => {
    const list = await getAllProfiles();
    setProfiles(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    const id = uuid();
    await insertProfile({
      id,
      name: 'New Member',
      bodyWeightKg: 70,
    });
    await load();
  }, [load]);

  const handleDelete = useCallback(
    (p: Profile) => {
      Alert.alert('Delete profile', `Remove "${p.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProfile(p.id);
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
      <Text style={styles.hint}>
        Profiles are used for scaling (water, calories) and weight analytics. Add yourself and family members.
      </Text>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProfileRow
            profile={item}
            colors={colors}
            onUpdate={async (updates) => {
              await updateProfile(item.id, updates);
              await load();
            }}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No profiles. Tap + to add.</Text>
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

function ProfileRow({
  profile,
  colors: c,
  onUpdate,
  onDelete,
}: {
  profile: Profile;
  colors: ReturnType<typeof getColors>;
  onUpdate: (u: Partial<Pick<Profile, 'name' | 'bodyWeightKg'>>) => Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [weight, setWeight] = useState(String(profile.bodyWeightKg));

  const save = async () => {
    const w = parseFloat(weight);
    if (!isNaN(w) && w > 0) {
      await onUpdate({ name: name.trim(), bodyWeightKg: w });
    } else {
      await onUpdate({ name: name.trim() });
    }
  };

  const styles = makeStyles(c);
  return (
    <View style={styles.card}>
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
        onBlur={save}
        placeholder="Name"
        placeholderTextColor={c.textSecondary}
      />
      <View style={styles.weightRow}>
        <Text style={styles.weightLabel}>Body weight (kg)</Text>
        <TextInput
          style={styles.weightInput}
          value={weight}
          onChangeText={setWeight}
          onBlur={save}
          keyboardType="decimal-pad"
        />
      </View>
      <TouchableOpacity style={styles.delBtn} onPress={onDelete}>
        <Text style={styles.delBtnText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hint: {
      padding: 16,
      fontSize: 13,
      color: colors.textSecondary,
    },
    empty: { padding: 24, textAlign: 'center', color: colors.textSecondary },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nameInput: { fontSize: 18, fontWeight: '600', color: colors.text },
    weightRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    weightLabel: { fontSize: 14, color: colors.textSecondary },
    weightInput: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 8,
      borderRadius: 6,
      fontSize: 16,
      color: colors.text,
    },
    delBtn: { marginTop: 12 },
    delBtnText: { color: colors.danger, fontSize: 14 },
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
