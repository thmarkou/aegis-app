import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, StyleSheet, Switch } from 'react-native';
import { TacticalSlider } from '../../../shared/components/TacticalSlider';
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
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import { getCacheSizeBytes, clearCache } from '../../map/services/TileCacheService';

type Nav = NativeStackNavigationProp<SettingsStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const isAdmin = useAppStore((s) => s.authRole === 'admin');
  const logout = useAppStore((s) => s.logout);
  const [expiryDays, setExpiryDays] = useState('14');
  const [weightPercent, setWeightPercent] = useState('20');
  const [bodyWeightKg, setBodyWeightKg] = useState('');
  const [maxHeartRate, setMaxHeartRate] = useState('');
  const [callsign, setCallsign] = useState('SY2EYH');
  const [ssid, setSsid] = useState('7');
  const [newPin, setNewPin] = useState('');
  const [cacheSizeMb, setCacheSizeMb] = useState<string>('—');
  const [sortByExpiry, setSortByExpiry] = useState(false);
  const [txDelayMs, setTxDelayMs] = useState(300);
  const [digitalGain, setDigitalGain] = useState(1.0);
  const [appleHealthEnabled, setAppleHealthEnabled] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCacheSizeBytes().then((bytes) => {
        setCacheSizeMb((bytes / (1024 * 1024)).toFixed(1));
      });
      SecureSettings.getGarminLinked().then(setAppleHealthEnabled);
    }, [])
  );

  useEffect(() => {
    Promise.all([
      SecureSettings.getExpiryDays(),
      SecureSettings.getWeightPercent(),
      SecureSettings.getBodyWeightKg(),
      SecureSettings.getMaxHeartRate(),
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
      SecureSettings.getSortByExpiry(),
      SecureSettings.getTxDelayMs(),
      SecureSettings.getDigitalGain(),
    ]).then(([d, p, bw, mhr, c, s, sort, tx, gain]) => {
      setExpiryDays(String(d));
      setWeightPercent(String(p));
      setBodyWeightKg(bw != null ? String(bw) : '');
      setMaxHeartRate(mhr != null ? String(mhr) : '');
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

  const handleSaveMaxHeartRate = async () => {
    const trimmed = maxHeartRate.trim();
    if (!trimmed) {
      await SecureSettings.setMaxHeartRate(null);
      setMaxHeartRate('');
      return;
    }
    const n = parseInt(trimmed, 10);
    if (isNaN(n) || n < 60 || n > 250) {
      Alert.alert('Invalid', 'Enter 60–250 BPM');
      return;
    }
    await SecureSettings.setMaxHeartRate(n);
    Alert.alert('Saved', 'Max HR saved for Effort calculation.');
  };

  const handleSaveBodyWeight = async () => {
    const trimmed = bodyWeightKg.trim();
    if (!trimmed) {
      await SecureSettings.setBodyWeightKg(null);
      setBodyWeightKg('');
      return;
    }
    const w = parseFloat(trimmed);
    if (isNaN(w) || w < 1 || w > 500) {
      Alert.alert('Invalid', 'Enter 1–500 kg');
      return;
    }
    await SecureSettings.setBodyWeightKg(w);
    Alert.alert('Saved', 'Body weight saved. Load calculations will use this value.');
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
      <View style={styles.sliderBlock}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>TX Delay (Preamble)</Text>
          <Text style={styles.sliderValue}>{txDelayMs} ms</Text>
        </View>
        <Text style={styles.sliderRange}>100 – 1000 ms</Text>
        <View style={styles.sliderTrack}>
          <TacticalSlider
            value={txDelayMs}
            minimumValue={SecureSettings.TX_DELAY_MIN_MS}
            maximumValue={SecureSettings.TX_DELAY_MAX_MS}
            step={50}
            onValueChange={(v) => {
              const rounded = Math.round(v);
              setTxDelayMs(rounded);
              SecureSettings.setTxDelayMs(rounded);
            }}
            minimumTrackTintColor={tactical.amber}
            maximumTrackTintColor={tactical.zinc[700]}
            thumbTintColor={tactical.amber}
          />
        </View>
      </View>
      <View style={styles.sliderBlock}>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Digital Gain</Text>
          <Text style={styles.sliderValue}>{digitalGain.toFixed(2)}</Text>
        </View>
        <Text style={styles.sliderRange}>0.5 – 1.5</Text>
        <View style={styles.sliderTrack}>
          <TacticalSlider
            value={digitalGain}
            minimumValue={SecureSettings.DIGITAL_GAIN_MIN}
            maximumValue={SecureSettings.DIGITAL_GAIN_MAX}
            step={0.05}
            onValueChange={(v) => {
              const rounded = Math.round(v * 100) / 100;
              setDigitalGain(rounded);
              SecureSettings.setDigitalGain(rounded);
            }}
            minimumTrackTintColor={tactical.amber}
            maximumTrackTintColor={tactical.zinc[700]}
            thumbTintColor={tactical.amber}
          />
        </View>
      </View>

      <Text style={tacticalStyles.sectionTitle}>Apple Health</Text>
      <Text style={tacticalStyles.sectionDesc}>
        BPM, Effort, Active Calories from Apple Health. Grant read access on toggle.
      </Text>
      <Text style={tacticalStyles.label}>Your Maximum Heart Rate (Max HR)</Text>
      <Text style={[tacticalStyles.sectionDesc, { marginBottom: 8 }]}>
        For effort % only. Live BPM is never editable—it comes from Apple Health only.
      </Text>
      <View style={[styles.weightRow, { marginBottom: 16 }]}>
        <TextInput
          style={styles.bodyWeightInput}
          value={maxHeartRate}
          onChangeText={setMaxHeartRate}
          onBlur={handleSaveMaxHeartRate}
          keyboardType="number-pad"
          placeholder="e.g. 190 (effort % only)"
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={tacticalStyles.btnSmall} onPress={handleSaveMaxHeartRate}>
          <Text style={tacticalStyles.btnSmallText}>Save</Text>
        </TouchableOpacity>
      </View>
      <View style={[tacticalStyles.rowInline, { justifyContent: 'space-between' }]}>
        <Text style={[tacticalStyles.label, { color: appleHealthEnabled ? '#22c55e' : '#ef4444' }]}>
          Enable Apple Health
        </Text>
        <Switch
          value={appleHealthEnabled}
          onValueChange={async (v) => {
            setAppleHealthEnabled(v);
            await setGarminLinked(v);
            if (v) {
              connectGarminDevice().catch(() => {});
            }
          }}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={appleHealthEnabled ? tactical.black : tactical.zinc[400]}
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

      <Text style={tacticalStyles.sectionTitle}>Weight Warning</Text>
      <Text style={tacticalStyles.sectionDesc}>
        Your body weight and tactical limit %. Required for load calculations.
      </Text>
      <Text style={[tacticalStyles.label, { color: tactical.amber, fontWeight: '600' }]}>Your Body Weight (kg)</Text>
      <View style={styles.weightRow}>
        <TextInput
          style={styles.bodyWeightInput}
          value={bodyWeightKg}
          onChangeText={setBodyWeightKg}
          onBlur={handleSaveBodyWeight}
          keyboardType="decimal-pad"
          placeholder="e.g. 75"
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={tacticalStyles.btnSmall} onPress={handleSaveBodyWeight}>
          <Text style={tacticalStyles.btnSmallText}>Save</Text>
        </TouchableOpacity>
      </View>
      <Text style={tacticalStyles.label}>Tactical Limit (%)</Text>
      <View style={tacticalStyles.rowInline}>
        <TextInput
          style={tacticalStyles.inputSmall}
          value={weightPercent}
          onChangeText={setWeightPercent}
          onBlur={handleSaveWeight}
          keyboardType="number-pad"
        />
        <Text style={{ color: tactical.amber, fontSize: 16, fontWeight: '600' }}>%</Text>
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
  sliderBlock: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: tactical.zinc[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sliderValue: {
    color: tactical.amber,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  sliderRange: {
    color: tactical.zinc[500],
    fontSize: 12,
    marginBottom: 8,
  },
  sliderTrack: {
    height: 40,
    justifyContent: 'center',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bodyWeightInput: {
    width: 120,
    backgroundColor: tactical.zinc[900],
    borderWidth: 2,
    borderColor: tactical.amber,
    borderRadius: 12,
    padding: 14,
    color: tactical.amber,
    fontSize: 18,
    fontWeight: '700',
  },
});
