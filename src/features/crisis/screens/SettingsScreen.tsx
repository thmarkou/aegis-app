import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StyleSheet, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from '../../../shared/navigation/SettingsStack';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../shared/store/useAppStore';
import * as SecureSettings from '../../../shared/services/secureSettings';
import {
    setGarminLinked,
    connectGarminDevice,
  } from '../../../shared/services/GarminSyncService';
import { useGarminStore } from '../../../shared/store/useGarminStore';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { getCacheSizeBytes, clearCache } from '../../map/services/TileCacheService';

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const isAdmin = useAppStore((s) => s.authRole === 'admin');
  const logout = useAppStore((s) => s.logout);
  const [expiryDays, setExpiryDays] = useState('14');
  const [weightPercent, setWeightPercent] = useState('20');
  const [callsign, setCallsign] = useState('SY2EYH');
  const [ssid, setSsid] = useState('7');
  const [newPin, setNewPin] = useState('');
  const [cacheSizeMb, setCacheSizeMb] = useState<string>('—');
  const [sortByExpiry, setSortByExpiry] = useState(false);
  const [txDelayMs, setTxDelayMs] = useState(300);
  const [digitalGain, setDigitalGain] = useState(1.0);
  const garminConnected = useGarminStore((s) => s.connected);
  const [garminLoading, setGarminLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCacheSizeBytes().then((bytes) => {
        setCacheSizeMb((bytes / (1024 * 1024)).toFixed(1));
      });
    }, [])
  );

  useEffect(() => {
    Promise.all([
      SecureSettings.getExpiryDays(),
      SecureSettings.getWeightPercent(),
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
      SecureSettings.getSortByExpiry(),
      SecureSettings.getTxDelayMs(),
      SecureSettings.getDigitalGain(),
    ]).then(([d, p, c, s, sort, tx, gain]) => {
      setExpiryDays(String(d));
      setWeightPercent(String(p));
      setCallsign(c);
      setSsid(String(s));
      setSortByExpiry(sort);
      setTxDelayMs(tx);
      setDigitalGain(gain);
    });
  }, []);

  const handleSaveExpiry = async () => {
    const n = parseInt(expiryDays, 10);
    if (isNaN(n) || n < 1 || n > 365) {
      Alert.alert('Invalid', 'Enter 1–365 days');
      return;
    }
    await SecureSettings.setExpiryDays(n);
  };

  const handleSaveWeight = async () => {
    const n = parseInt(weightPercent, 10);
    if (isNaN(n) || n < 1 || n > 100) {
      Alert.alert('Invalid', 'Enter 1–100%');
      return;
    }
    await SecureSettings.setWeightPercent(n);
  };

  const handleChangePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }
    await SecureSettings.setAdminPin(newPin);
    setNewPin('');
    Alert.alert('Done', 'Admin PIN updated');
  };

  const handleClearCache = async () => {
    Alert.alert('Clear Map Cache', 'Remove all offline map tiles?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearCache();
          setCacheSizeMb('0');
          Alert.alert('Done', 'Map cache cleared');
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Return to login screen?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={tacticalStyles.sectionTitle}>Inventory Templates</Text>
      <Text style={tacticalStyles.sectionDesc}>
        Manage item templates. Use them when adding items to quickly fill name, category, and weight.
      </Text>
      <TouchableOpacity
        style={[tacticalStyles.btnSecondary, { flexDirection: 'row', alignItems: 'center' }]}
        onPress={() => navigation.navigate('TemplateList')}
      >
        <Ionicons name="layers-outline" size={18} color="#FFBF00" />
        <Text style={[tacticalStyles.btnSecondaryText, { marginLeft: 8 }]}>Manage Templates</Text>
      </TouchableOpacity>

      <Text style={tacticalStyles.sectionTitle}>Sort by Expiry</Text>
      <Text style={tacticalStyles.sectionDesc}>
        In kit detail, sort items by expiry date (soonest first).
      </Text>
      <View style={[tacticalStyles.rowInline, { justifyContent: 'space-between' }]}>
        <Text style={tacticalStyles.label}>Sort by Expiry</Text>
        <Switch
          value={sortByExpiry}
          onValueChange={async (v) => {
            setSortByExpiry(v);
            await SecureSettings.setSortByExpiry(v);
          }}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={sortByExpiry ? tactical.black : tactical.zinc[400]}
        />
      </View>

      <Text style={tacticalStyles.sectionTitle}>Expiry notifications</Text>
      <Text style={tacticalStyles.sectionDesc}>Notify this many days before item expiry.</Text>
      <View style={tacticalStyles.rowInline}>
        <TextInput
          style={tacticalStyles.inputSmall}
          value={expiryDays}
          onChangeText={setExpiryDays}
          onBlur={handleSaveExpiry}
          keyboardType="number-pad"
        />
        <Text style={{ color: tactical.zinc[500], fontSize: 16 }}>days</Text>
      </View>

      <Text style={tacticalStyles.sectionTitle}>APRS / Radio</Text>
      <Text style={tacticalStyles.sectionDesc}>Callsign and SSID for APRS packets.</Text>
      <View style={tacticalStyles.rowInline}>
        <Text style={[tacticalStyles.label, { marginBottom: 0 }]}>Callsign</Text>
        <TextInput
          style={[tacticalStyles.inputSmall, { width: 120 }]}
          value={callsign}
          onChangeText={(t) => setCallsign(t.toUpperCase().slice(0, 9))}
          onBlur={async () => await SecureSettings.setCallsign(callsign)}
          placeholder="SY2EYH"
          placeholderTextColor="#666"
          autoCapitalize="characters"
        />
      </View>
      <View style={tacticalStyles.rowInline}>
        <Text style={[tacticalStyles.label, { marginBottom: 0 }]}>SSID</Text>
        <TextInput
          style={tacticalStyles.inputSmall}
          value={ssid}
          onChangeText={(t) => setSsid(t.replace(/\D/g, '').slice(0, 2))}
          onBlur={async () => {
            const n = parseInt(ssid, 10);
            if (!isNaN(n)) await SecureSettings.setSsid(n);
          }}
          keyboardType="number-pad"
          placeholder="7"
          placeholderTextColor="#666"
        />
        <Text style={{ color: tactical.zinc[500], fontSize: 14 }}>(0–15)</Text>
      </View>

      <Text style={tacticalStyles.sectionTitle}>Audio Calibration</Text>
      <Text style={tacticalStyles.sectionDesc}>
        TX preamble and digital gain for Quansheng/iPhone adapter. Saved automatically.
      </Text>
      <View style={styles.sliderRow}>
        <Text style={tacticalStyles.label}>TX Delay (Preamble)</Text>
        <Text style={styles.sliderValue}>{txDelayMs} ms</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={SecureSettings.TX_DELAY_MIN_MS}
        maximumValue={SecureSettings.TX_DELAY_MAX_MS}
        step={50}
        value={txDelayMs}
        onValueChange={(v) => {
          const rounded = Math.round(v);
          setTxDelayMs(rounded);
          SecureSettings.setTxDelayMs(rounded);
        }}
        minimumTrackTintColor={tactical.amber}
        maximumTrackTintColor={tactical.zinc[700]}
        thumbTintColor={tactical.amber}
      />
      <View style={styles.sliderRow}>
        <Text style={tacticalStyles.label}>Digital Gain</Text>
        <Text style={styles.sliderValue}>{digitalGain.toFixed(2)}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={SecureSettings.DIGITAL_GAIN_MIN}
        maximumValue={SecureSettings.DIGITAL_GAIN_MAX}
        step={0.05}
        value={digitalGain}
        onValueChange={(v) => {
          const rounded = Math.round(v * 100) / 100;
          setDigitalGain(rounded);
          SecureSettings.setDigitalGain(rounded);
        }}
        minimumTrackTintColor={tactical.amber}
        maximumTrackTintColor={tactical.zinc[700]}
        thumbTintColor={tactical.amber}
      />

      <Text style={tacticalStyles.sectionTitle}>Link Garmin Device</Text>
      <Text style={tacticalStyles.sectionDesc}>
        Read heart rate from Apple Health (Garmin Fenix syncs via Garmin Connect). Grants Health access on toggle.
      </Text>
      <View style={[tacticalStyles.rowInline, { justifyContent: 'space-between' }]}>
        <Text style={tacticalStyles.label}>
          {garminLoading ? 'Requesting access...' : 'Link Garmin Device'}
        </Text>
        <Switch
          value={garminConnected}
          disabled={garminLoading}
          onValueChange={async (v) => {
            if (v) {
              setGarminLoading(true);
              const ok = await connectGarminDevice();
              setGarminLoading(false);
              if (!ok) {
                await setGarminLinked(false);
                const err = useGarminStore.getState().error;
                if (err === 'HEALTH_ACCESS_DENIED') {
                  Alert.alert('HEALTH_ACCESS_DENIED', 'Grant Health access in Settings → Health → Data Access.');
                }
              }
            } else {
              await setGarminLinked(false);
            }
          }}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={garminConnected ? tactical.black : tactical.zinc[400]}
        />
      </View>

      <Text style={tacticalStyles.sectionTitle}>Map cache</Text>
      <Text style={tacticalStyles.sectionDesc}>
        Offline tiles: {cacheSizeMb} MB / 500 MB max
      </Text>
      <TouchableOpacity
        style={[tacticalStyles.btnSecondary, { flexDirection: 'row', alignItems: 'center' }]}
        onPress={handleClearCache}
      >
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
        <Text style={[tacticalStyles.btnSecondaryText, { marginLeft: 8 }]}>Clear cache</Text>
      </TouchableOpacity>

      <Text style={tacticalStyles.sectionTitle}>Weight warning</Text>
      <Text style={tacticalStyles.sectionDesc}>Warn when kit weight exceeds this % of body weight.</Text>
      <View style={tacticalStyles.rowInline}>
        <TextInput
          style={tacticalStyles.inputSmall}
          value={weightPercent}
          onChangeText={setWeightPercent}
          onBlur={handleSaveWeight}
          keyboardType="number-pad"
        />
        <Text style={{ color: tactical.zinc[500], fontSize: 16 }}>%</Text>
      </View>

      {isAdmin && (
        <>
          <Text style={tacticalStyles.sectionTitle}>Change admin PIN</Text>
          <Text style={tacticalStyles.sectionDesc}>Enter a new 4-digit PIN.</Text>
          <View style={tacticalStyles.rowInline}>
            <TextInput
              style={tacticalStyles.inputSmall}
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#666"
            />
            <TouchableOpacity style={tacticalStyles.btnSmall} onPress={handleChangePin}>
              <Text style={tacticalStyles.btnSmallText}>Save</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity style={tacticalStyles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={tacticalStyles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={tacticalStyles.footer}>AEGIS v0.2 · Offline-first · WatermelonDB</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 24, paddingBottom: 48 },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderValue: {
    color: tactical.amber,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 16,
  },
});
