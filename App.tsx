import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDb } from './src/db';
import { loadSettingsIntoStore } from './src/shared/store/settingsSync';
import { scheduleExpiryNotifications } from './src/features/inventory/services/expirationNotifications';
import { useAppStore } from './src/shared/store/useAppStore';
import { RootNavigator } from './src/shared/navigation/RootNavigator';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';

function AppContent() {
  const authRole = useAppStore((s) => s.authRole);

  if (!authRole) return <LoginScreen />;

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initDb();
      if (cancelled) return;
      await loadSettingsIntoStore();
      if (cancelled) return;
      await scheduleExpiryNotifications();
      if (cancelled) return;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
