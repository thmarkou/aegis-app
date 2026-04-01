// NativeWind disabled - causes expo start to hang
import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { database } from './src/database';
import { TacticalSplashScreen } from './src/shared/components/TacticalSplashScreen';
import { useAppStore } from './src/shared/store/useAppStore';
import { TabNavigator } from './src/shared/navigation/TabNavigator';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { loadSettingsIntoStore } from './src/shared/store/settingsSync';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { refreshInventoryNotifications } from './src/features/inventory/services/refreshInventoryNotifications';
import { seedPowerDevices } from './src/database/seedPowerDevices';
import { seedDefaultItemTemplates } from './src/database/seedItemTemplates';
import { seedBugOutKit } from './src/database/seedBugOutKit';
import { seedMissionPresets } from './src/database/seedMissionPresets';
import { initGarminService } from './src/shared/services/GarminSyncService';
import { GlobalEmergencyOverlay } from './src/shared/components/GlobalEmergencyOverlay';
import { navigationRef } from './src/shared/navigation/navigationRef';

function AppContent() {
  const authRole = useAppStore((s) => s.authRole);

  useEffect(() => {
    if (!authRole) return;
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      if (notification.request.content.title?.includes('AEGIS')) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    });
    return () => sub.remove();
  }, [authRole]);

  if (!authRole) return <LoginScreen />;

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <TabNavigator />
    </NavigationContainer>
  );
}

SplashScreen.preventAutoHideAsync();

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
        await seedDefaultItemTemplates();
        await seedPowerDevices();
        await seedBugOutKit();
        await seedMissionPresets();
        refreshInventoryNotifications().catch((e) => console.warn('[AEGIS] Inventory notifications:', e));
        initGarminService().catch((e) => console.warn('[AEGIS] Garmin BLE init:', e));
      } catch (err) {
        console.error('[AEGIS] DB init failed:', err);
      } finally {
        if (!cancelled) {
          await SplashScreen.hideAsync().catch(() => {});
          setReady(true);
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <TacticalSplashScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} pointerEvents="box-none">
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <SafeAreaProvider style={{ flex: 1 }} pointerEvents="box-none">
          <AppContent />
          <GlobalEmergencyOverlay />
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
