import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { buildPositionPacket, buildSmsgtePacket } from '../../../services/AprsService';
import { playAFSKPacket } from '../../../services/AudioEngine';
import {
  getAudioOutputMode,
  initAudioRoutingListener,
} from '../../../services/AudioRoutingService';
import { WaveformVisualizer } from '../components/WaveformVisualizer';

type LinkMode = 'digital' | 'analog' | 'distress';

export function CommsScreen() {
  const [linkMode, setLinkMode] = useState<LinkMode>(
    () => getAudioOutputMode() as LinkMode
  );

  useEffect(() => {
    const unsubscribe = initAudioRoutingListener((mode) =>
      setLinkMode(mode as LinkMode)
    );
    return unsubscribe;
  }, []);
  const [distressMode, setDistressMode] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number; alt?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastPacket, setLastPacket] = useState<string | null>(null);
  const [lastBeaconTime, setLastBeaconTime] = useState<number | null>(null);
  const [callsign, setCallsign] = useState('SY2EYH');
  const [ssid, setSsid] = useState(7);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [showSmsForm, setShowSmsForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const loadSettings = useCallback(async () => {
    const [c, s] = await Promise.all([SecureSettings.getCallsign(), SecureSettings.getSsid()]);
    setCallsign(c);
    setSsid(s);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Location permission denied');
      return;
    }
    setLocationError(null);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        alt: loc.coords.altitude ?? undefined,
      });
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : 'Location failed');
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const sendBeacon = useCallback(async () => {
    if (!location) {
      Alert.alert('No GPS', 'Location not available. Check permissions.');
      return;
    }
    setSending(true);
    try {
      const packet = buildPositionPacket(callsign, ssid, {
        latitude: location.lat,
        longitude: location.lon,
        altitude: location.alt,
        comment: distressMode ? 'DISTRESS AEGIS' : undefined,
      });
      setLastPacket(packet);
      setLastBeaconTime(Date.now());
      setIsTransmitting(true);
      await playAFSKPacket(packet);
    } catch (e) {
      Alert.alert('Audio Error', e instanceof Error ? e.message : 'Failed to play AFSK');
    } finally {
      setIsTransmitting(false);
      setSending(false);
    }
  }, [location, callsign, ssid, distressMode]);

  const sendSmsPacket = useCallback(async () => {
    const phone = smsPhone.trim().replace(/\D/g, '');
    if (phone.length < 10) {
      Alert.alert('Invalid', 'Enter a valid phone number');
      return;
    }
    if (!smsMessage.trim()) {
      Alert.alert('Invalid', 'Enter a message');
      return;
    }
    setSending(true);
    try {
      const packet = buildSmsgtePacket(callsign, ssid, `+${phone}`, smsMessage.trim());
      setLastPacket(packet);
      setShowSmsForm(false);
      setSmsPhone('');
      setSmsMessage('');
      setIsTransmitting(true);
      await playAFSKPacket(packet);
    } catch (e) {
      Alert.alert('Audio Error', e instanceof Error ? e.message : 'Failed to play AFSK');
    } finally {
      setIsTransmitting(false);
      setSending(false);
    }
  }, [callsign, ssid, smsPhone, smsMessage]);

  // Distress mode: auto-beacon every 5 minutes
  useEffect(() => {
    if (!distressMode || !location) return;
    const interval = setInterval(() => {
      sendBeacon();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [distressMode, location, sendBeacon]);

  const effectiveLinkMode: LinkMode = distressMode ? 'distress' : linkMode;

  return (
    <ScrollView
      style={[styles.screen, distressMode && styles.screenDistress]}
      contentContainerStyle={styles.content}
    >
      {/* Status bar */}
      <View
        style={[
          tacticalStyles.statusBar,
          effectiveLinkMode === 'digital' && tacticalStyles.statusBarDigital,
          effectiveLinkMode === 'analog' && tacticalStyles.statusBarAnalog,
          effectiveLinkMode === 'distress' && tacticalStyles.statusBarDistress,
        ]}
      >
        <Ionicons
          name="radio"
          size={18}
          color={effectiveLinkMode === 'distress' ? '#ef4444' : '#ffffff'}
        />
        <Text style={tacticalStyles.statusText}>
          {effectiveLinkMode === 'digital'
            ? 'LINK: DIGITAL'
            : effectiveLinkMode === 'distress'
              ? 'DISTRESS MODE'
              : 'LINK: VOX/ANALOG'}
        </Text>
      </View>

      <Text style={[tacticalStyles.titleAmber, distressMode && styles.textDistress]}>
        Radio Comms
      </Text>

      <WaveformVisualizer
        isActive={isTransmitting}
        color={effectiveLinkMode === 'distress' ? '#ef4444' : tactical.amber}
      />

      {locationError && (
        <TouchableOpacity style={tacticalStyles.btnSecondary} onPress={requestLocation}>
          <Text style={tacticalStyles.btnSecondaryText}>Grant Location</Text>
        </TouchableOpacity>
      )}

      {location && (
        <Text style={tacticalStyles.subtext}>
          {location.lat.toFixed(5)}° {location.lon.toFixed(5)}°
        </Text>
      )}

      <TouchableOpacity
        style={[tacticalStyles.btnPrimary, styles.btnAction, distressMode && styles.btnDistress]}
        onPress={sendBeacon}
        disabled={!location || sending}
      >
        {sending ? (
          <ActivityIndicator color={tactical.black} />
        ) : (
          <Text style={tacticalStyles.btnPrimaryText}>SEND BEACON</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[tacticalStyles.btnSecondary, styles.btnAction]}
        onPress={() => setShowSmsForm(true)}
      >
        <Text style={tacticalStyles.btnSecondaryText}>RADIO SMS</Text>
      </TouchableOpacity>

      {showSmsForm && (
        <View style={styles.smsForm}>
          <Text style={tacticalStyles.label}>Destination</Text>
          <TextInput
            style={tacticalStyles.input}
            value={smsPhone}
            onChangeText={setSmsPhone}
            placeholder="+3069XXXXXXXX"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
          />
          <Text style={tacticalStyles.label}>Message</Text>
          <TextInput
            style={[tacticalStyles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            value={smsMessage}
            onChangeText={setSmsMessage}
            placeholder="Message text"
            placeholderTextColor="#666"
            multiline
          />
          <View style={styles.smsFormRow}>
            <TouchableOpacity style={tacticalStyles.btnSmall} onPress={sendSmsPacket}>
              <Text style={tacticalStyles.btnSmallText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tacticalStyles.btnSecondary}
              onPress={() => {
                setShowSmsForm(false);
                setSmsPhone('');
                setSmsMessage('');
              }}
            >
              <Text style={tacticalStyles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.distressRow}>
        <Text style={[tacticalStyles.label, { marginBottom: 0 }]}>DISTRESS MODE</Text>
        <Switch
          value={distressMode}
          onValueChange={setDistressMode}
          trackColor={{ false: tactical.zinc[700], true: '#ef4444' }}
          thumbColor={distressMode ? '#ffffff' : tactical.zinc[400]}
        />
      </View>

      <Text style={tacticalStyles.warningLabel}>
        NOTICE: ALL TRANSMISSIONS ARE PUBLIC. NO ENCRYPTION.
      </Text>

      {lastPacket && (
        <View style={styles.packetBox}>
          <Text style={tacticalStyles.label}>Last packet</Text>
          <Text style={styles.packetText} selectable>
            {lastPacket}
          </Text>
          {lastBeaconTime && (
            <Text style={tacticalStyles.cardSubtext}>
              {new Date(lastBeaconTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  screenDistress: { backgroundColor: '#1a0a0a' },
  content: { padding: 24, paddingBottom: 48 },
  btnAction: { marginTop: 16 },
  btnDistress: { backgroundColor: '#ef4444' },
  textDistress: { color: '#ef4444' },
  smsForm: { marginTop: 24, marginBottom: 16 },
  smsFormRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  distressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  packetBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: tactical.zinc[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  packetText: { color: tactical.zinc[400], fontSize: 12, fontFamily: 'monospace' },
});
