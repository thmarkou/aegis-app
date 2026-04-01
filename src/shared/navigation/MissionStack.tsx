/**
 * MISSION tab – Mission Prep checklist as root.
 */
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MissionPrepScreen } from '../../features/inventory/screens/MissionPrepScreen';
import { KitListScreen } from '../../features/inventory/screens/KitListScreen';
import { KitDetailScreen } from '../../features/inventory/screens/KitDetailScreen';
import { KitFormScreen } from '../../features/inventory/screens/KitFormScreen';
import { ItemFormScreen } from '../../features/inventory/screens/ItemFormScreen';
import { ProfileScreen } from '../../features/inventory/screens/ProfileScreen';
import { ProfileFormScreen } from '../../features/inventory/screens/ProfileFormScreen';
import { LogisticsScreen } from '../../features/inventory/screens/LogisticsScreen';
import { PowerDeviceFormScreen } from '../../features/inventory/screens/PowerDeviceFormScreen';
import { PoolPickerScreen } from '../../features/inventory/screens/PoolPickerScreen';
import { InventoryPoolScreen } from '../../features/inventory/screens/InventoryPoolScreen';
import { MissionPresetListScreen } from '../../features/inventory/screens/MissionPresetListScreen';
import { MissionPresetFormScreen } from '../../features/inventory/screens/MissionPresetFormScreen';
import { TemplateListScreen } from '../../features/inventory/screens/TemplateListScreen';
import { TemplateFormScreen } from '../../features/inventory/screens/TemplateFormScreen';
import { tactical } from '../tacticalStyles';

export type MissionStackParamList = {
  MissionPrep: undefined;
  Logistics: undefined;
  PowerDeviceForm: { deviceId?: string };
  KitList: undefined;
  KitDetail: { kitId: string; highlightedPackItemId?: string };
  KitForm: { kitId?: string };
  ItemForm: { kitId?: string; poolItemId?: string; packItemId?: string };
  PoolPicker: { kitId: string };
  InventoryPool: { filter?: 'needs_charge' };
  MissionPresetList: undefined;
  MissionPresetForm: { presetId?: string };
  TemplateList: undefined;
  TemplateForm: { templateId?: string };
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
        options={({ navigation }) => ({
          title: 'MISSION PREP',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('MissionPresetList')}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: tactical.amber, fontSize: 14, fontWeight: '600' }}>Edit Presets</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="Logistics" component={LogisticsScreen} options={{ title: 'LOGISTICS' }} />
      <Stack.Screen
        name="PowerDeviceForm"
        component={PowerDeviceFormScreen}
        options={({ route }) => ({
          title: route.params?.deviceId ? 'Edit device' : 'New device',
        })}
      />
      <Stack.Screen name="KitList" component={KitListScreen} options={{ title: 'Kits' }} />
      <Stack.Screen name="KitDetail" component={KitDetailScreen} options={{ title: 'Kit' }} />
      <Stack.Screen
        name="KitForm"
        component={KitFormScreen}
        options={({ route }) => ({
          title: route.params?.kitId ? 'Edit Kit' : 'New Kit',
        })}
      />
      <Stack.Screen
        name="ItemForm"
        component={ItemFormScreen}
        options={{ title: 'Item' }}
      />
      <Stack.Screen name="PoolPicker" component={PoolPickerScreen} options={{ title: 'Add from Pool' }} />
      <Stack.Screen name="InventoryPool" component={InventoryPoolScreen} options={{ title: 'Inventory Pool' }} />
      <Stack.Screen
        name="MissionPresetList"
        component={MissionPresetListScreen}
        options={{ title: 'Mission Presets' }}
      />
      <Stack.Screen
        name="MissionPresetForm"
        component={MissionPresetFormScreen}
        options={({ route }) => ({
          title: route.params?.presetId ? 'Edit Preset' : 'New Preset',
        })}
      />
      <Stack.Screen name="TemplateList" component={TemplateListScreen} options={{ title: 'Blueprints' }} />
      <Stack.Screen
        name="TemplateForm"
        component={TemplateFormScreen}
        options={({ route }) => ({
          title: route.params?.templateId ? 'Edit Template' : 'New Template',
        })}
      />
      <Stack.Screen name="Profiles" component={ProfileScreen} options={{ title: 'Profiles' }} />
      <Stack.Screen name="ProfileForm" component={ProfileFormScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}
