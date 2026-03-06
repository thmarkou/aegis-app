import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getColors } from '../../../shared/theme';
import { getSettings, setSettings, getAdminPin, setAdminPin } from '../../../db/repositories/settings';
import { persistTheme, persistShtfMode } from '../../../shared/store/settingsSync';
import type { ThemeMode } from '../../../shared/types';

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'shtf', label: 'SHTF (OLED black)' },
];

export function SettingsScreen() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const shtfMode = useAppStore((s) => s.shtfModeEnabled);
  const isAdmin = useAppStore((s) => s.authRole === 'admin');
  const logout = useAppStore((s) => s.logout);
  const colors = getColors(shtfMode ? 'shtf' : theme);

  const [expiryDays, setExpiryDays] = useState('14');
  const [weightPercent, setWeightPercent] = useState('20');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    getSettings().then((s) => {
      setExpiryDays(String(s.expiryNotificationDays));
      setWeightPercent(String(s.weightWarningPercent));
    });
  }, []);

  const handleThemeChange = async (t: ThemeMode) => {
    setTheme(t);
    await persistTheme(t);
    if (t === 'shtf') await persistShtfMode(true);
  };

  const handleSaveExpiry = async () => {
    const n = parseInt(expiryDays, 10);
    if (isNaN(n) || n < 1 || n > 365) {
      Alert.alert('Invalid', 'Enter 1–365 days');
      return;
    }
    await setSettings({ expiryNotificationDays: n });
  };

  const handleSaveWeight = async () => {
    const n = parseInt(weightPercent, 10);
    if (isNaN(n) || n < 1 || n > 100) {
      Alert.alert('Invalid', 'Enter 1–100%');
      return;
    }
    await setSettings({ weightWarningPercent: n });
  };

  const handleChangePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }
    await setAdminPin(newPin);
    setNewPin('');
    Alert.alert('Done', 'Admin PIN updated');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Return to login screen?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Theme</Text>
      <View style={styles.themeRow}>
        {THEMES.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[styles.themeBtn, theme === value && styles.themeBtnActive]}
            onPress={() => handleThemeChange(value)}
          >
            <Text style={[styles.themeBtnText, theme === value && styles.themeBtnTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Expiry notifications</Text>
      <Text style={styles.hint}>Notify this many days before item expiry.</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={expiryDays}
          onChangeText={setExpiryDays}
          onBlur={handleSaveExpiry}
          keyboardType="number-pad"
        />
        <Text style={styles.unit}>days</Text>
      </View>

      <Text style={styles.sectionTitle}>Weight warning</Text>
      <Text style={styles.hint}>Warn when kit weight exceeds this % of body weight.</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={weightPercent}
          onChangeText={setWeightPercent}
          onBlur={handleSaveWeight}
          keyboardType="number-pad"
        />
        <Text style={styles.unit}>%</Text>
      </View>

      {isAdmin && (
        <>
          <Text style={styles.sectionTitle}>Change admin PIN</Text>
          <Text style={styles.hint}>Enter a new 4-digit PIN.</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity onPress={handleChangePin} style={styles.savePin}>
              <Text style={styles.savePinText}>Save</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>AEGIS v0.1 · Offline-first</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 24, paddingBottom: 48 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 24, marginBottom: 8 },
    hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    themeBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    themeBtnText: { color: colors.text, fontSize: 14 },
    themeBtnTextActive: { color: colors.primaryText },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    input: {
      width: 80,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    unit: { fontSize: 16, color: colors.textSecondary },
    savePin: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    savePinText: { color: colors.primaryText, fontWeight: '600' },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 40,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 8,
    },
    logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
    footer: { marginTop: 24, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  });
}
