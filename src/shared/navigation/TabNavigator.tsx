import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../../features/dashboard/screens/DashboardScreen';
import { InventoryStack } from './InventoryStack';
import { MapScreen } from '../../features/map/screens/MapScreen';
import { CommsScreen } from '../../features/comms/screens/CommsScreen';
import { SettingsScreen } from '../../features/crisis/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Dashboard: { active: 'speedometer', inactive: 'speedometer-outline' },
  Inventory: { active: 'layers', inactive: 'layers-outline' },
  Map: { active: 'map', inactive: 'map-outline' },
  Comms: { active: 'radio', inactive: 'radio-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFBF00',
        tabBarStyle: { backgroundColor: '#000000', borderTopColor: '#1a1a1a' },
        tabBarActiveTintColor: '#FFBF00',
        tabBarInactiveTintColor: '#666666',
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const name = (focused ? icons.active : icons.inactive) as keyof typeof Ionicons.glyphMap;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Inventory" component={InventoryStack} options={{ headerShown: false }} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Comms" component={CommsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
