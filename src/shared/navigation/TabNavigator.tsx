import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../../features/dashboard/screens/DashboardScreen';
import { MissionStack } from './MissionStack';
import { MapScreen } from '../../features/map/screens/MapScreen';
import { CommsScreen } from '../../features/comms/screens/CommsScreen';
import { SettingsStack } from './SettingsStack';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Dashboard: { active: 'speedometer', inactive: 'speedometer-outline' },
  Mission: { active: 'checkbox', inactive: 'checkbox-outline' },
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
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#1a1a1a',
          zIndex: 9999,
          elevation: 9999,
        },
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
      <Tab.Screen
        name="Mission"
        component={MissionStack}
        options={{ headerShown: false, tabBarLabel: 'MISSION' }}
      />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen
        name="Comms"
        component={CommsScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'COMMS',
        }}
      />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
