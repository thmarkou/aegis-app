import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { KitListScreen } from '../../features/inventory/screens/KitListScreen';
import { KitDetailScreen } from '../../features/inventory/screens/KitDetailScreen';
import { KitFormScreen } from '../../features/inventory/screens/KitFormScreen';
import { ItemFormScreen } from '../../features/inventory/screens/ItemFormScreen';
import { ProfileScreen } from '../../features/inventory/screens/ProfileScreen';
import { ProfileFormScreen } from '../../features/inventory/screens/ProfileFormScreen';
import { MissionPrepScreen } from '../../features/inventory/screens/MissionPrepScreen';
import { LogisticsScreen } from '../../features/inventory/screens/LogisticsScreen';
import { PoolPickerScreen } from '../../features/inventory/screens/PoolPickerScreen';
import { InventoryPoolScreen } from '../../features/inventory/screens/InventoryPoolScreen';

export type InventoryStackParamList = {
  KitList: undefined;
  KitDetail: { kitId: string; highlightedPackItemId?: string };
  KitForm: { kitId?: string };
  ItemForm: { kitId?: string; poolItemId?: string; packItemId?: string };
  PoolPicker: { kitId: string };
  InventoryPool: { filter?: 'needs_charge' };
  MissionPrep: undefined;
  Logistics: undefined;
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
          headerLargeTitle: false,
          headerRight: () => (
            <View style={styles.headerRightRow}>
              <TouchableOpacity onPress={() => navigation.navigate('MissionPrep')} style={styles.headerBtn}>
                <View style={styles.headerBtnInner}>
                  <Ionicons name="checkbox-outline" size={22} color="#FFBF00" style={styles.iconCentered} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Profiles')} style={styles.headerBtn}>
                <View style={styles.headerBtnInner}>
                  <Ionicons
                    name="people-outline"
                    size={24}
                    color="#FFBF00"
                    style={styles.iconCentered}
                  />
                </View>
              </TouchableOpacity>
            </View>
          ),
        })}
      />
      <Stack.Screen name="MissionPrep" component={MissionPrepScreen} options={{ title: 'Mission Prep' }} />
      <Stack.Screen name="Logistics" component={LogisticsScreen} options={{ title: 'LOGISTICS' }} />
      <Stack.Screen
        name="KitDetail"
        component={KitDetailScreen}
        options={({ route, navigation }) => ({
          title: 'Kit', // Overridden by KitDetailScreen via setOptions when kit loads
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('KitForm', { kitId: route.params.kitId })}
              style={styles.headerBtn}
            >
              <View style={styles.headerBtnInner}>
                <Ionicons
                  name="pencil-outline"
                  size={22}
                  color="#FFBF00"
                  style={styles.iconCentered}
                />
              </View>
            </TouchableOpacity>
          ),
        })}
      />
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
        options={{ title: 'Item', headerLargeTitle: false }}
      />
      <Stack.Screen name="PoolPicker" component={PoolPickerScreen} options={{ title: 'Add from Pool' }} />
      <Stack.Screen name="InventoryPool" component={InventoryPoolScreen} options={{ title: 'Inventory Pool' }} />
      <Stack.Screen name="Profiles" component={ProfileScreen} options={{ title: 'Profiles' }} />
      <Stack.Screen name="ProfileForm" component={ProfileFormScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRightRow: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { marginRight: 8 },
  headerBtnInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ionicons have known alignment offset; nudge up-left for optical centering
  iconCentered: {
    textAlign: 'center',
    transform: [{ translateX: -0.5 }, { translateY: -1 }],
  },
});
