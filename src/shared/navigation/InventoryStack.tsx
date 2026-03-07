import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { KitListScreen } from '../../features/inventory/screens/KitListScreen';
import { KitDetailScreen } from '../../features/inventory/screens/KitDetailScreen';
import { KitFormScreen } from '../../features/inventory/screens/KitFormScreen';
import { ItemFormScreen } from '../../features/inventory/screens/ItemFormScreen';
import { ProfileScreen } from '../../features/inventory/screens/ProfileScreen';
import { ProfileFormScreen } from '../../features/inventory/screens/ProfileFormScreen';

export type InventoryStackParamList = {
  KitList: undefined;
  KitDetail: { kitId: string };
  KitForm: { kitId: string };
  ItemForm: { kitId: string; itemId?: string };
  Profiles: undefined;
  ProfileForm: { profileId?: string };
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

const TACTICAL_HEADER = {
  headerStyle: { backgroundColor: '#000000' },
  headerTintColor: '#FFBF00',
  headerTitleStyle: { color: '#ffffff' },
  headerLargeTitleStyle: { color: '#ffffff' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#000000' },
};

export function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ ...TACTICAL_HEADER, headerLargeTitle: true }}>
      <Stack.Screen
        name="KitList"
        component={KitListScreen}
        options={({ navigation }) => ({
          title: 'Kits',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Profiles')} style={{ marginRight: 8 }}>
              <Ionicons name="people-outline" size={24} color="#FFBF00" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="KitDetail"
        component={KitDetailScreen}
        options={({ route, navigation }) => ({
          title: 'Kit',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('KitForm', { kitId: route.params.kitId })}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="pencil-outline" size={22} color="#FFBF00" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="KitForm" component={KitFormScreen} options={{ title: 'Edit Kit' }} />
      <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: 'Item' }} />
      <Stack.Screen name="Profiles" component={ProfileScreen} options={{ title: 'Profiles' }} />
      <Stack.Screen name="ProfileForm" component={ProfileFormScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}
