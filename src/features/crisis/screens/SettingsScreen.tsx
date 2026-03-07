import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../shared/store/useAppStore';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';

export function SettingsScreen() {
  const isAdmin = useAppStore((s) => s.authRole === 'admin');
  const logout = useAppStore((s) => s.logout);
  const [expiryDays, setExpiryDays] = useState('14');
  const [weightPercent, setWeightPercent] = useState('20');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    SecureSettings.getExpiryDays().then((d) => setExpiryDays(String(d)));
    SecureSettings.getWeightPercent().then((p) => setWeightPercent(String(p)));
  }, []);

  const handleSaveExpiry = async () => {
    const n = parseInt(expiryDays, 10);
    if (isNaN(n) || n < 1 || n > 365) {
      Alert.alert('Invalid', 'Enter 1–365 days');
      return;
    }
    await SecureSettings.setExpiryDays(n);
  };

  const handleSaveWeight = async () => {
    const n = parseInt(weightPercent, 10);
    if (isNaN(n) || n < 1 || n > 100) {
      Alert.alert('Invalid', 'Enter 1–100%');
      return;
    }
    await SecureSettings.setWeightPercent(n);
  };

  const handleChangePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }
    await SecureSettings.setAdminPin(newPin);
    setNewPin('');
    Alert.alert('Done', 'Admin PIN updated');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Return to login screen?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={tacticalStyles.sectionTitle}>Expiry notifications</Text>
      <Text style={tacticalStyles.sectionDesc}>Notify this many days before item expiry.</Text>
      <View style={tacticalStyles.rowInline}>
        <TextInput
          style={tacticalStyles.inputSmall}
          value={expiryDays}
          onChangeText={setExpiryDays}
          onBlur={handleSaveExpiry}
          keyboardType="number-pad"
        />
        <Text style={{ color: tactical.zinc[500], fontSize: 16 }}>days</Text>
      </View>

      <Text style={tacticalStyles.sectionTitle}>Weight warning</Text>
      <Text style={tacticalStyles.sectionDesc}>Warn when kit weight exceeds this % of body weight.</Text>
      <View style={tacticalStyles.rowInline}>
        <TextInput
          style={tacticalStyles.inputSmall}
          value={weightPercent}
          onChangeText={setWeightPercent}
          onBlur={handleSaveWeight}
          keyboardType="number-pad"
        />
        <Text style={{ color: tactical.zinc[500], fontSize: 16 }}>%</Text>
      </View>

      {isAdmin && (
        <>
          <Text style={tacticalStyles.sectionTitle}>Change admin PIN</Text>
          <Text style={tacticalStyles.sectionDesc}>Enter a new 4-digit PIN.</Text>
          <View style={tacticalStyles.rowInline}>
            <TextInput
              style={tacticalStyles.inputSmall}
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#666"
            />
            <TouchableOpacity style={tacticalStyles.btnSmall} onPress={handleChangePin}>
              <Text style={tacticalStyles.btnSmallText}>Save</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity style={tacticalStyles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={tacticalStyles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={tacticalStyles.footer}>AEGIS v0.2 · Offline-first · WatermelonDB</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 24, paddingBottom: 48 },
});
