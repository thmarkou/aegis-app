import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppStore } from '../../../shared/store/useAppStore';
import { getColors } from '../../../shared/theme';
import { persistShtfMode } from '../../../shared/store/settingsSync';

/**
 * SHTF (Crisis) screen: one-tap to enter/exit "blackout" mode.
 * When SHTF is on, the entire app uses OLED-black theme to save battery.
 */
export function CrisisScreen() {
  const shtfMode = useAppStore((s) => s.shtfModeEnabled);
  const toggleShtf = useAppStore((s) => s.toggleShtfMode);
  const theme = useAppStore((s) => (s.shtfModeEnabled ? 'shtf' : s.theme));
  const colors = getColors(theme);

  const handleToggle = async () => {
    const next = !shtfMode;
    toggleShtf();
    await persistShtfMode(next);
  };

  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {shtfMode ? 'Crisis mode active' : 'Crisis mode'}
      </Text>
      <Text style={styles.subtitle}>
        {shtfMode
          ? 'OLED black UI is on. Minimal power use.'
          : 'Tap below to switch to blackout UI (OLED black) to save battery.'}
      </Text>
      <TouchableOpacity
        style={[styles.button, shtfMode && styles.buttonActive]}
        onPress={handleToggle}
      >
        <Text style={[styles.buttonText, shtfMode && styles.buttonTextActive]}>
          {shtfMode ? 'Exit crisis mode' : 'Enter crisis mode'}
        </Text>
      </TouchableOpacity>
      {shtfMode && (
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusText}>Ready. Critical info on Battery tab.</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 24,
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 32,
    },
    button: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.primary,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    buttonText: { fontSize: 18, fontWeight: '600', color: colors.primary },
    buttonTextActive: { color: colors.primaryText },
    statusBlock: {
      marginTop: 48,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    statusLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    statusText: { fontSize: 16, color: colors.text },
  });
}
