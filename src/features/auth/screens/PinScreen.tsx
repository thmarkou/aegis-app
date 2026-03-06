import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAdminPin } from '../../../db/repositories/settings';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * 4-digit PIN entry for admin access.
 * Shakes and clears on wrong PIN.
 */
export function PinScreen({ onSuccess, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleKey = async (key: string) => {
    if (checking) return;

    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }

    if (key === '' || pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);
    setError(false);

    if (next.length === PIN_LENGTH) {
      setChecking(true);
      const correct = await getAdminPin();
      if (next === correct) {
        onSuccess();
      } else {
        Vibration.vibrate([0, 50, 50, 50]);
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
          setChecking(false);
        }, 600);
      }
    }
  };

  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={onCancel}>
        <Ionicons name="arrow-back" size={24} color="#94a3b8" />
      </TouchableOpacity>

      <Text style={styles.title}>Admin PIN</Text>
      <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>

      <View style={styles.dotsRow}>
        {dots.map((filled, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              filled && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>Incorrect PIN</Text>}

      <View style={styles.keypad}>
        {KEYS.map((key, i) => {
          if (key === '') return <View key={i} style={styles.keyPlaceholder} />;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.key, key === 'del' && styles.keyDel]}
              onPress={() => handleKey(key)}
              activeOpacity={0.7}
            >
              {key === 'del' ? (
                <Ionicons name="backspace-outline" size={24} color="#f1f5f9" />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.hint}>Default PIN: 1234 — change in Settings</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    paddingTop: 24,
  },
  back: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  dotError: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    marginTop: 32,
    gap: 16,
    justifyContent: 'center',
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  keyDel: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#f1f5f9',
  },
  hint: {
    marginTop: 40,
    fontSize: 13,
    color: '#334155',
  },
});
