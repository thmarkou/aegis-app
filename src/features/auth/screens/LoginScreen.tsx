import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../shared/store/useAppStore';
import { PinScreen } from './PinScreen';
import { tactical } from '../../../shared/tacticalStyles';

export function LoginScreen() {
  const setAuthRole = useAppStore((s) => s.setAuthRole);
  const [showPin, setShowPin] = useState(false);

  const handleUserLogin = () => setAuthRole('user');
  const handleAdminAttempt = () => setShowPin(true);
  const handlePinSuccess = () => setAuthRole('admin');

  if (showPin) {
    return <PinScreen onSuccess={handlePinSuccess} onCancel={() => setShowPin(false)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Ionicons name="shield-checkmark" size={72} color={tactical.amber} />
        <Text style={styles.title}>AEGIS</Text>
        <Text style={styles.subtitle}>Digital Survival OS</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.card} onPress={handleAdminAttempt} activeOpacity={0.8}>
          <View style={styles.iconCircle}>
            <Ionicons name="key" size={32} color={tactical.amber} />
          </View>
          <Text style={styles.cardTitle}>Admin</Text>
          <Text style={styles.cardDesc}>Full access — manage kits, settings and profiles</Text>
          <View style={styles.cardHint}>
            <Ionicons name="lock-closed-outline" size={14} color="#666" />
            <Text style={styles.hintText}>Requires PIN</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={handleUserLogin} activeOpacity={0.8}>
          <View style={styles.iconCircle}>
            <Ionicons name="eye-outline" size={32} color="#94a3b8" />
          </View>
          <Text style={styles.cardTitle}>User</Text>
          <Text style={styles.cardDesc}>View-only — browse inventory and kit status</Text>
          <View style={styles.cardHint}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#666" />
            <Text style={styles.hintText}>No PIN required</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Offline · No internet required</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tactical.black, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 48 },
  top: { alignItems: 'center' },
  title: { color: '#ffffff', fontSize: 36, fontWeight: '800', marginTop: 16, letterSpacing: 4 },
  subtitle: { color: '#71717a', fontSize: 14, letterSpacing: 4, marginTop: 8, textTransform: 'uppercase' },
  buttons: { width: '100%', paddingHorizontal: 24, gap: 16 },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: tactical.black, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  cardDesc: { color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardHint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintText: { color: '#71717a', fontSize: 14 },
  footer: { color: '#3f3f46', fontSize: 14, letterSpacing: 2 },
});
