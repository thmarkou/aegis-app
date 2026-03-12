/**
 * Tactical COMMS – dual mode: RADIO (beacon, last packet) and MESSAGING (SOS, draft, send).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { setPacketRouterCallbacks } from '../../../services/DecodedPacketRouter';
import { runDirectTest } from '../../../services/LoopbackTestService';
import { sendBeaconWithUserGps } from '../../../services/BeaconService';
import { database } from '../../../database';
import { WaveformMonitor } from '../components/WaveformMonitor';
import type MessageLog from '../../../database/models/MessageLog';

const AMBER = '#FFBF00';
const BLACK = '#000000';
const ZINC_900 = '#18181b';
const ZINC_700 = '#3f3f46';
const ZINC_500 = '#71717a';

const QUICK_ACTIONS = {
  SOS: ['SOS: MEDICAL', 'SOS: INJURED', 'SOS: LOST'],
  Status: ['ALL OK', 'EN ROUTE', 'STATIONARY'],
  Resources: ['LOW WATER', 'LOW POWER', 'RESUPPLY NEEDED'],
} as const;

const BOX = {
  backgroundColor: ZINC_900,
  borderWidth: 1,
  borderColor: ZINC_700,
  borderRadius: 12,
  padding: 14,
  marginBottom: 16,
};

export function CommsScreenContent() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<'RADIO' | 'MESSAGING'>('RADIO');
  const [telemetry, setTelemetry] = useState({ station: '—', lat: '—', lon: '—', time: '—' });
  const [lastPacket, setLastPacket] = useState<string>('');
  const [waveformPcm, setWaveformPcm] = useState<Int16Array | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [loggedMessages, setLoggedMessages] = useState<{ id: string; message: string; sentAt: number }[]>([]);

  useEffect(() => {
    setPacketRouterCallbacks({
      onIncomingStation: (station, lat, lon) => {
        setTelemetry({
          station,
          lat: lat.toFixed(5),
          lon: lon.toFixed(5),
          time: new Date().toISOString(),
        });
      },
      onRawPacket: (raw) => setLastPacket(raw),
    });
    return () => setPacketRouterCallbacks(null);
  }, []);

  useEffect(() => {
    const collection = database.get<MessageLog>('message_logs');
    const subscription = collection.query().observe().subscribe((rows) => {
      setLoggedMessages(
        rows.map((r) => ({ id: r.id, message: r.message, sentAt: r.sentAt })).sort((a, b) => b.sentAt - a.sentAt)
      );
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleQuickAction = (label: string) => setMessageDraft(label);

  const handlePushToSend = () => {
    if (messageDraft.trim()) setMessageDraft('');
  };

  const handleSendBeacon = async () => {
    setWaveformPcm(null);
    const result = await sendBeaconWithUserGps({
      onWaveform: (pcm) => setWaveformPcm(pcm),
    });
    if (result.success) {
      setLastPacket(result.packet);
      navigation.navigate('Map' as never, { focusOnNewStation: true } as never);
    }
  };

  const handleLoopbackTest = async () => {
    const result = await runDirectTest();
    if (result.success) {
      setTelemetry((prev) =>
        prev.station === '—'
          ? { station: 'TAKTICAL-1', lat: '37.97150', lon: '23.72570', time: new Date().toISOString() }
          : prev
      );
      navigation.navigate('Map' as never, { focusOnNewStation: true } as never);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Mode Toggle: RADIO | MESSAGING */}
      <View style={styles.modeToggle}>
        <Text style={[styles.modeLabel, mode === 'RADIO' && styles.modeLabelActive]}>RADIO</Text>
        <Switch
          value={mode === 'MESSAGING'}
          onValueChange={(v) => setMode(v ? 'MESSAGING' : 'RADIO')}
          trackColor={{ false: ZINC_700, true: AMBER }}
          thumbColor={mode === 'MESSAGING' ? BLACK : ZINC_400}
        />
        <Text style={[styles.modeLabel, mode === 'MESSAGING' && styles.modeLabelActive]}>MESSAGING</Text>
      </View>

      {mode === 'RADIO' ? (
        <>
          {/* RADIO Mode: LINK status, SEND BEACON, Last Packet */}
          <View style={styles.box}>
            <Text style={styles.telemetryLabel}>LINK: VOX/ANALOG</Text>
          </View>
          <TouchableOpacity style={styles.sendBeaconBtn} onPress={handleSendBeacon} activeOpacity={0.8}>
            <Text style={styles.sendBeaconText}>SEND BEACON</Text>
          </TouchableOpacity>
          <WaveformMonitor pcm={waveformPcm} />
          <View style={styles.box}>
            <Text style={styles.sectionLabel}>Last Packet</Text>
            <Text style={styles.lastPacketText} selectable>
              {lastPacket || '—'}
            </Text>
          </View>
        </>
      ) : (
        <>
          {/* MESSAGING Mode */}
          <View style={styles.box}>
            <Text style={styles.telemetryLabel}>STATION: {telemetry.station}</Text>
            <Text style={styles.telemetryLabel}>LAT: {telemetry.lat}</Text>
            <Text style={styles.telemetryLabel}>LON: {telemetry.lon}</Text>
            <Text style={styles.telemetryLabel}>TIME: {telemetry.time}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.sectionLabel}>SOS</Text>
            <View style={styles.grid}>
              {QUICK_ACTIONS.SOS.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.quickBtn, styles.quickBtnSos]}
                  onPress={() => handleQuickAction(label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickBtnText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.grid}>
              {QUICK_ACTIONS.Status.map((label) => (
                <TouchableOpacity key={label} style={styles.quickBtn} onPress={() => handleQuickAction(label)} activeOpacity={0.7}>
                  <Text style={styles.quickBtnText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Resources</Text>
            <View style={styles.grid}>
              {QUICK_ACTIONS.Resources.map((label) => (
                <TouchableOpacity key={label} style={styles.quickBtn} onPress={() => handleQuickAction(label)} activeOpacity={0.7}>
                  <Text style={styles.quickBtnText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.box}>
            <Text style={styles.sectionLabel}>Message Draft</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type or tap above..."
              placeholderTextColor={ZINC_500}
              value={messageDraft}
              onChangeText={setMessageDraft}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={handlePushToSend} activeOpacity={0.8}>
            <Text style={styles.sendBtnText}>PUSH TO SEND (APRS)</Text>
          </TouchableOpacity>
          <View style={styles.box}>
            <Text style={styles.sectionLabel}>LOGGED MESSAGES</Text>
            <View style={styles.logArea}>
              {loggedMessages.length === 0 ? (
                <Text style={styles.logEmpty}>No messages sent yet</Text>
              ) : (
                loggedMessages.map((m) => (
                  <View key={m.id} style={styles.logItem}>
                    <Text style={styles.logText}>{m.message}</Text>
                    <Text style={styles.logTime}>{new Date(m.sentAt).toLocaleString()}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </>
      )}

      {/* Debug: Loopback Test */}
      <TouchableOpacity style={styles.loopbackBtn} onPress={handleLoopbackTest} activeOpacity={0.8}>
        <Text style={styles.loopbackText}>[INT_LOOPBACK_TEST]</Text>
      </TouchableOpacity>

      <Text style={styles.notice}>NOTICE: ALL TRANSMISSIONS ARE PUBLIC. NO ENCRYPTION.</Text>
    </ScrollView>
  );
}

const ZINC_400 = '#a1a1aa';

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BLACK },
  content: { padding: 16, paddingBottom: 48 },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: ZINC_900,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZINC_700,
  },
  modeLabel: { color: ZINC_500, fontSize: 14, fontWeight: '600' },
  modeLabelActive: { color: AMBER },
  box: { ...BOX },
  telemetryLabel: { color: AMBER, fontSize: 14, marginBottom: 4 },
  sectionLabel: { color: AMBER, fontSize: 12, marginBottom: 8, marginTop: 4 },
  sendBeaconBtn: {
    backgroundColor: ZINC_900,
    borderWidth: 1,
    borderColor: AMBER,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendBeaconText: { color: AMBER, fontSize: 16, fontWeight: '700' },
  lastPacketText: { color: AMBER, fontSize: 12, fontFamily: 'monospace' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  quickBtn: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: ZINC_900,
    borderWidth: 1,
    borderColor: ZINC_700,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quickBtnSos: {
    borderColor: AMBER,
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
  },
  quickBtnText: { color: AMBER, fontSize: 13, fontWeight: '600' },
  messageInput: {
    backgroundColor: ZINC_900,
    borderWidth: 1,
    borderColor: ZINC_700,
    borderRadius: 8,
    padding: 14,
    color: AMBER,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: ZINC_900,
    borderWidth: 1,
    borderColor: AMBER,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  logArea: {
    backgroundColor: ZINC_900,
    borderWidth: 1,
    borderColor: ZINC_700,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
  },
  logEmpty: { color: ZINC_500, textAlign: 'center', paddingVertical: 24 },
  logItem: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: ZINC_700 },
  logText: { color: AMBER, fontSize: 14 },
  logTime: { color: ZINC_500, fontSize: 11, marginTop: 4 },
  loopbackBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  loopbackText: { color: ZINC_500, fontSize: 11 },
  notice: { color: ZINC_500, fontSize: 11, textAlign: 'center', marginBottom: 24 },
});
