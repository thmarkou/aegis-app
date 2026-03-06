import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getAdminPin } from '../../../db/repositories/settings';
import { PinScreen } from './PinScreen';

/**
 * Role-selection login screen shown on every app launch.
 * Admin → PIN entry → full access.
 * User  → direct access (read-only).
 */
export function LoginScreen() {
  const setAuthRole = useAppStore((s) => s.setAuthRole);
  const [showPin, setShowPin] = useState(false);

  const handleUserLogin = () => {
    setAuthRole('user');
  };

  const handleAdminAttempt = () => {
    setShowPin(true);
  };

  const handlePinSuccess = () => {
    setAuthRole('admin');
  };

  if (showPin) {
    return (
      <PinScreen
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPin(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={72} color="#22c55e" />
        <Text style={styles.title}>AEGIS</Text>
        <Text style={styles.subtitle}>Digital Survival OS</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} onPress={handleAdminAttempt} activeOpacity={0.8}>
          <View style={styles.cardIcon}>
            <Ionicons name="key" size={32} color="#22c55e" />
          </View>
          <Text style={styles.cardTitle}>Admin</Text>
          <Text style={styles.cardDesc}>Full access — manage kits, settings and profiles</Text>
          <View style={styles.pinHint}>
            <Ionicons name="lock-closed-outline" size={14} color="#6b7280" />
            <Text style={styles.pinHintText}>Requires PIN</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={handleUserLogin} activeOpacity={0.8}>
          <View style={styles.cardIcon}>
            <Ionicons name="eye-outline" size={32} color="#94a3b8" />
          </View>
          <Text style={styles.cardTitle}>User</Text>
          <Text style={styles.cardDesc}>View-only — browse inventory and kit status</Text>
          <View style={styles.pinHint}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#6b7280" />
            <Text style={styles.pinHintText}>No PIN required</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Offline · No internet required</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: 6,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  cards: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 12,
  },
  pinHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinHintText: {
    fontSize: 13,
    color: '#6b7280',
  },
  footer: {
    fontSize: 13,
    color: '#334155',
    letterSpacing: 1,
  },
});
