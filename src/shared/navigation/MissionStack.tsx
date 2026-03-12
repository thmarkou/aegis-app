/**
 * MISSION tab – Mission Prep checklist as root.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MissionPrepScreen } from '../../features/inventory/screens/MissionPrepScreen';
import { KitListScreen } from '../../features/inventory/screens/KitListScreen';
import { KitDetailScreen } from '../../features/inventory/screens/KitDetailScreen';
import { KitFormScreen } from '../../features/inventory/screens/KitFormScreen';
import { ItemFormScreen } from '../../features/inventory/screens/ItemFormScreen';
import { ProfileScreen } from '../../features/inventory/screens/ProfileScreen';
import { ProfileFormScreen } from '../../features/inventory/screens/ProfileFormScreen';

export type MissionStackParamList = {
  MissionPrep: undefined;
  KitList: undefined;
  KitDetail: { kitId: string };
  KitForm: { kitId: string };
  ItemForm: { kitId: string; itemId?: string };
  Profiles: undefined;
  ProfileForm: { profileId?: string };
};

const Stack = createNativeStackNavigator<MissionStackParamList>();

const TACTICAL_HEADER = {
  headerStyle: { backgroundColor: '#000000' },
  headerTintColor: '#FFBF00',
  headerTitleStyle: { color: '#ffffff' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#000000' },
};

export function MissionStack() {
  return (
    <Stack.Navigator screenOptions={TACTICAL_HEADER}>
      <Stack.Screen
        name="MissionPrep"
        component={MissionPrepScreen}
        options={{ title: 'MISSION PREP' }}
      />
      <Stack.Screen name="KitList" component={KitListScreen} options={{ title: 'Kits' }} />
      <Stack.Screen name="KitDetail" component={KitDetailScreen} options={{ title: 'Kit' }} />
      <Stack.Screen name="KitForm" component={KitFormScreen} options={{ title: 'Edit Kit' }} />
      <Stack.Screen
        name="ItemForm"
        component={ItemFormScreen}
        options={{ title: 'Item' }}
      />
      <Stack.Screen name="Profiles" component={ProfileScreen} options={{ title: 'Profiles' }} />
      <Stack.Screen name="ProfileForm" component={ProfileFormScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}
