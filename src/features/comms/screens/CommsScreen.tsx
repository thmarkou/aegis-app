import React, { useCallback, useEffect, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type MessageLog from '../../../database/models/MessageLog';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { buildPositionPacket, buildStatusPacket } from '../../../services/AprsService';
import { useGarminStore, buildBioString } from '../../../shared/store/useGarminStore';
import { playAFSKPacket } from '../../../services/AudioEngine';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { useBatteryTelemetry } from '../../../shared/hooks/useBatteryTelemetry';
import { BatteryTelemetry } from '../../../shared/components/BatteryTelemetry';

const QUICK_MESSAGES = {
  SOS: [
    { label: 'SOS: MEDICAL', value: 'SOS: MEDICAL' },
    { label: 'SOS: INJURED', value: 'SOS: INJURED' },
    { label: 'SOS: LOST', value: 'SOS: LOST' },
  ],
  Status: [
    { label: 'ALL OK', value: 'ALL OK' },
    { label: 'EN ROUTE', value: 'EN ROUTE' },
    { label: 'STATIONARY', value: 'STATIONARY' },
  ],
  Resources: [
    { label: 'LOW WATER', value: 'LOW WATER' },
    { label: 'LOW POWER', value: 'LOW POWER' },
    { label: 'RESUPPLY NEEDED', value: 'RESUPPLY NEEDED' },
  ],
} as const;

type CommsRouteParams = { emergencyMessage?: string; emergencyAttachGps?: boolean };

export function CommsScreen() {
  const route = useRoute<RouteProp<{ Comms: CommsRouteParams }, 'Comms'>>();
  const [message, setMessage] = useState('');
  const [attachGps, setAttachGps] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [callsign, setCallsign] = useState('SY2EYH');
  const [ssid, setSsid] = useState(7);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [sentLogs, setSentLogs] = useState<MessageLog[]>([]);
  const { pct: batteryPct, battColor } = useBatteryTelemetry();
  const garminState = useGarminStore((s) => ({
    connected: s.connected,
    heartRate: s.heartRate,
    spo2: s.spo2,
  }));
  const bioString = buildBioString(garminState);

  const loadSettings = useCallback(async () => {
    const [c, s] = await Promise.all([SecureSettings.getCallsign(), SecureSettings.getSsid()]);
    setCallsign(c);
    setSsid(s);
  }, []);

  const loadLogs = useCallback(async () => {
    const logs = await database
      .get<MessageLog>('message_logs')
      .query(Q.sortBy('sent_at', Q.desc))
      .fetch();
    setSentLogs(logs);
  }, []);

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, [loadSettings, loadLogs]);

  useEffect(() => {
    const params = route.params as CommsRouteParams | undefined;
    if (params?.emergencyMessage) {
      setMessage(params.emergencyMessage);
      setAttachGps(params.emergencyAttachGps ?? true);
    }
  }, [route.params]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleQuickMessage = (value: string) => {
    setMessage((prev) => (prev ? `${prev}\n${value}` : value));
  };

  const getEffectiveMessage = useCallback(() => {
    let text = message.trim();
    if (attachGps && location) {
      text = text ? `${text} [${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}]` : `[${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}]`;
    }
    return text;
  }, [message, attachGps, location]);

  const handleSend = useCallback(async () => {
    const text = getEffectiveMessage();
    if (!text.trim()) return;

    if (attachGps && !location) return;

    setIsTransmitting(true);
    try {
      let packet: string;
      if (attachGps && location) {
        packet = buildPositionPacket(callsign, ssid, {
          latitude: location.lat,
          longitude: location.lon,
          comment: message.trim() || undefined,
        }, batteryPct, bioString);
      } else {
        packet = buildStatusPacket(callsign, ssid, message.trim(), batteryPct, bioString);
      }

      await playAFSKPacket(packet);

      await database.write(async () => {
        await database.get<MessageLog>('message_logs').create((r) => {
          r.message = text;
          r.sentAt = Date.now();
        });
      });
      await loadLogs();
      setMessage('');
    } catch (e) {
      console.error('[Comms] Send failed:', e);
    } finally {
      setIsTransmitting(false);
    }
  }, [getEffectiveMessage, message, attachGps, location, callsign, ssid, loadLogs, batteryPct, bioString]);

  const canSend = getEffectiveMessage().trim().length > 0 && (!attachGps || location);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={tacticalStyles.titleAmber}>Tactical Messaging Center</Text>
        <BatteryTelemetry pct={batteryPct} battColor={battColor} />
      </View>

      {/* Quick Message Grid */}
      <Text style={styles.sectionLabel}>SOS</Text>
      <View style={styles.grid}>
        {QUICK_MESSAGES.SOS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.gridBtn, styles.sosBtn]}
            onPress={() => handleQuickMessage(m.value)}
          >
            <Text style={styles.sosBtnText}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Status</Text>
      <View style={styles.grid}>
        {QUICK_MESSAGES.Status.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.gridBtn, styles.statusBtn]}
            onPress={() => handleQuickMessage(m.value)}
          >
            <Text style={styles.gridBtnText}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Resources</Text>
      <View style={styles.grid}>
        {QUICK_MESSAGES.Resources.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.gridBtn, styles.resourceBtn]}
            onPress={() => handleQuickMessage(m.value)}
          >
            <Text style={styles.gridBtnText}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Terminal-style Input */}
      <Text style={styles.sectionLabel}>Message Draft</Text>
      <TextInput
        style={styles.terminalInput}
        value={message}
        onChangeText={setMessage}
        placeholder="Type or tap above..."
        placeholderTextColor={tactical.zinc[500]}
        multiline
        editable={!isTransmitting}
      />

      {/* Attach GPS Toggle */}
      <View style={styles.gpsRow}>
        <Text style={tacticalStyles.label}>Attach GPS</Text>
        <Switch
          value={attachGps}
          onValueChange={setAttachGps}
          trackColor={{ false: tactical.zinc[700], true: tactical.amber }}
          thumbColor={attachGps ? tactical.black : tactical.zinc[400]}
        />
      </View>
      {attachGps && location && (
        <Text style={styles.gpsHint}>
          Will append [Lat, Lon] to message
        </Text>
      )}

      {/* TRANSMITTING Animation */}
      {isTransmitting && (
        <View style={styles.transmittingWrap}>
          <WaveformVisualizer isActive color={tactical.amber} />
          <Text style={styles.transmittingText}>TRANSMITTING...</Text>
        </View>
      )}

      {/* PUSH TO SEND */}
      <TouchableOpacity
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!canSend || isTransmitting}
      >
        {isTransmitting ? (
          <ActivityIndicator color={tactical.black} size="large" />
        ) : (
          <Text style={styles.sendBtnText}>PUSH TO SEND (APRS)</Text>
        )}
      </TouchableOpacity>

      {/* Sent Messages Log */}
      <Text style={styles.sectionLabel}>Sent Messages</Text>
      <View style={styles.logBox}>
        {sentLogs.length === 0 ? (
          <Text style={styles.logEmpty}>No messages sent yet</Text>
        ) : (
          sentLogs.slice(0, 20).map((log) => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logTime}>
                {new Date(log.sentAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.logMsg} numberOfLines={2}>
                {log.message}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={tacticalStyles.warningLabel}>
        NOTICE: ALL TRANSMISSIONS ARE PUBLIC. NO ENCRYPTION.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    color: tactical.amber,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  sosBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: tactical.amber,
  },
  sosBtnText: {
    color: tactical.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  statusBtn: {
    backgroundColor: tactical.zinc[900],
    borderColor: tactical.zinc[700],
  },
  gridBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  resourceBtn: {
    backgroundColor: tactical.zinc[900],
    borderColor: tactical.zinc[700],
  },
  terminalInput: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: tactical.amber,
    borderRadius: 8,
    padding: 12,
    color: tactical.amber,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  gpsHint: {
    color: tactical.zinc[500],
    fontSize: 12,
    marginTop: 4,
  },
  transmittingWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  transmittingText: {
    color: tactical.amber,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  sendBtn: {
    marginTop: 24,
    paddingVertical: 20,
    borderRadius: 12,
    backgroundColor: tactical.amber,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tactical.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  sendBtnDisabled: {
    backgroundColor: tactical.zinc[700],
    shadowOpacity: 0,
  },
  sendBtnText: {
    color: tactical.black,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  logBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: tactical.zinc[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  logEmpty: {
    color: tactical.zinc[500],
    fontSize: 14,
    textAlign: 'center',
  },
  logRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: tactical.zinc[700],
  },
  logTime: {
    color: tactical.zinc[500],
    fontSize: 11,
    marginBottom: 2,
  },
  logMsg: {
    color: tactical.zinc[400],
    fontSize: 13,
  },
});
