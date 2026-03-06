import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { getColors } from '../theme';
import { KitListScreen } from '../../features/inventory/screens/KitListScreen';
import { KitDetailScreen } from '../../features/inventory/screens/KitDetailScreen';
import { ItemFormScreen } from '../../features/inventory/screens/ItemFormScreen';
import { ProfileScreen } from '../../features/inventory/screens/ProfileScreen';

export type InventoryStackParamList = {
  KitList: undefined;
  KitDetail: { kitId: string };
  ItemForm: { kitId: string; itemId?: string };
  Profiles: undefined;
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export function InventoryStack() {
  const shtfMode = useAppStore((s) => s.shtfModeEnabled);
  const theme = useAppStore((s) => s.theme);
  const colors = getColors(shtfMode ? 'shtf' : theme);

  const headerBase = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: { color: colors.text },
    headerLargeTitleStyle: { color: colors.text },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  } as const;

  return (
    <Stack.Navigator screenOptions={{ ...headerBase, headerLargeTitle: true }}>
      <Stack.Screen
        name="KitList"
        component={KitListScreen}
        options={({ navigation }) => ({
          title: 'Kits',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profiles')}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="people-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="KitDetail" component={KitDetailScreen} options={{ title: 'Kit' }} />
      <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: 'Item' }} />
      <Stack.Screen name="Profiles" component={ProfileScreen} options={{ title: 'Profiles' }} />
    </Stack.Navigator>
  );
}
