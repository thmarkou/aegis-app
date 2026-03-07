// NativeWind disabled - causes expo start to hang
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { database } from './src/database';
import { useAppStore } from './src/shared/store/useAppStore';
import { TabNavigator } from './src/shared/navigation/TabNavigator';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { loadSettingsIntoStore } from './src/shared/store/settingsSync';
import { scheduleExpiryNotifications } from './src/features/inventory/services/expirationNotifications';

function AppContent() {
  const authRole = useAppStore((s) => s.authRole);

  if (!authRole) return <LoginScreen />;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <TabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const adapter = database.adapter as { initializingPromise?: Promise<void> };
        await (adapter.initializingPromise ?? Promise.resolve());
        if (cancelled) return;
        await loadSettingsIntoStore();
        scheduleExpiryNotifications().catch((e) => console.warn('[AEGIS] Expiry notifications:', e));
      } catch (err) {
        console.error('[AEGIS] DB init failed:', err);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
