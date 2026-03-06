import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { getColors } from '../theme';
import { InventoryStack } from '../navigation/InventoryStack';
import { CrisisScreen } from '../../features/crisis/screens/CrisisScreen';
import { BatteryHubScreen } from '../../features/crisis/screens/BatteryHubScreen';
import { SettingsScreen } from '../../features/crisis/screens/SettingsScreen';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Inventory: { active: 'layers', inactive: 'layers-outline' },
  Crisis:    { active: 'warning', inactive: 'warning-outline' },
  Battery:   { active: 'battery-half', inactive: 'battery-half-outline' },
  Settings:  { active: 'settings', inactive: 'settings-outline' },
};

export function RootNavigator() {
  const shtfMode = useAppStore((s) => s.shtfModeEnabled);
  const theme = useAppStore((s) => s.theme);
  const effectiveTheme = shtfMode ? 'shtf' : theme;
  const colors = getColors(effectiveTheme);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          const name = focused ? icons.active : icons.inactive;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Inventory"
        component={InventoryStack}
        options={{ title: 'AEGIS', tabBarLabel: 'Inventory', headerShown: false }}
      />
      <Tab.Screen
        name="Crisis"
        component={CrisisScreen}
        options={{ tabBarLabel: 'SHTF', title: 'Crisis Mode' }}
      />
      <Tab.Screen
        name="Battery"
        component={BatteryHubScreen}
        options={{ tabBarLabel: 'Battery', title: 'Battery Hub' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
      />
    </Tab.Navigator>
  );
}
