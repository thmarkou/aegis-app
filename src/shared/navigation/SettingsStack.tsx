import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../../features/crisis/screens/SettingsScreen';
import { TemplateListScreen } from '../../features/inventory/screens/TemplateListScreen';
import { TemplateFormScreen } from '../../features/inventory/screens/TemplateFormScreen';

export type SettingsStackParamList = {
  Settings: undefined;
  TemplateList: undefined;
  TemplateForm: { templateId?: string };
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

const TACTICAL_HEADER = {
  headerStyle: { backgroundColor: '#000000' },
  headerTintColor: '#FFBF00',
  headerTitleStyle: { color: '#ffffff' },
  headerLargeTitle: false,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#000000' },
};

export function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={TACTICAL_HEADER}>
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen
        name="TemplateList"
        component={TemplateListScreen}
        options={{ title: 'Inventory Templates' }}
      />
      <Stack.Screen
        name="TemplateForm"
        component={TemplateFormScreen}
        options={({ route }) => ({ title: route.params?.templateId ? 'Edit Template' : 'New Template' })}
      />
    </Stack.Navigator>
  );
}
