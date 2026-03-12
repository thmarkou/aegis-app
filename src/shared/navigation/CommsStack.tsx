import React from 'react';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommsScreen } from '../../features/comms/screens/CommsScreen';

export type CommsStackParamList = {
  CommsMain: { emergencyMessage?: string; emergencyAttachGps?: boolean } | undefined;
};

const Stack = createNativeStackNavigator<CommsStackParamList>();

const TACTICAL_HEADER = {
  headerStyle: { backgroundColor: '#000000' },
  headerTintColor: '#FFBF00',
  headerTitleStyle: { color: '#ffffff' },
  headerLargeTitle: false,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#000000' },
};

export function CommsStack() {
  const parentRoute = useRoute();
  const params = (parentRoute.params as { emergencyMessage?: string; emergencyAttachGps?: boolean } | undefined) ?? undefined;

  return (
    <Stack.Navigator screenOptions={TACTICAL_HEADER}>
      <Stack.Screen
        name="CommsMain"
        component={CommsScreen}
        initialParams={params}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
