import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { tactical } from '../../../shared/tacticalStyles';
import { useDashboardData } from '../hooks/useDashboardData';
import { bearingToCardinal } from '../../../shared/utils/geoUtils';
import { useGarminStore } from '../../../shared/store/useGarminStore';
import { requestHealthPermissions, refreshHealthData } from '../../../shared/services/GarminSyncService';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { useAppStore } from '../../../shared/store/useAppStore';
import { sendEmergencyBroadcast, cancelEmergencyBroadcast } from '../../../services/EmergencyService';
import { navigateToMap } from '../../../shared/navigation/navigationRef';

const GAUGE_SIZE = 140;
const STROKE = 12;
const RADIUS = (GAUGE_SIZE - STROKE) / 2;

function ReadinessGauge({ score, isCompromised }: { score: number; isCompromised: boolean }) {
  const circumference = 2 * Math.PI * RADIUS;
  const halfCircle = circumference / 2;
  const progress = (score / 100) * halfCircle;
  const strokeColor = isCompromised ? '#ef4444' : '#22c55e';

  return (
    <View style={styles.gaugeWrap}>
      <Svg width={GAUGE_SIZE} height={GAUGE_SIZE / 2 + STROKE} viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE / 2 + STROKE}`}>
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          stroke={tactical.zinc[700]}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={halfCircle}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
        />
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          stroke={strokeColor}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={halfCircle}
          strokeDashoffset={halfCircle - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
        />
      </Svg>
      <View style={styles.gaugeLabel}>
        <Text style={[styles.gaugeValue, { color: strokeColor }]}>{Math.round(score)}%</Text>
        <Text style={styles.gaugeTitle}>READINESS</Text>
      </View>
    </View>
  );
}

function StatusBadge({
  isCompromised,
  statusText,
  statusColor,
}: {
  isCompromised: boolean;
  statusText: string;
  statusColor: string;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isCompromised) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      opacity.setValue(1);
    }
  }, [isCompromised, opacity]);
  return (
    <Animated.View
      style={[
        styles.statusBadge,
        isCompromised && styles.statusCompromised,
        isCompromised && { opacity },
      ]}
    >
      <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
    </Animated.View>
  );
}

const DEFAULT_MAX_HR = 190;

function computeEffort(
  hr: number | null,
  rhr: number | null,
  maxHr: number | null
): { value: string; zone?: string } {
  if (hr == null) return { value: '--' };
  const max = maxHr ?? DEFAULT_MAX_HR;
  const rest = rhr ?? 60;
  const ratio = Math.max(0, Math.min(1, (hr - rest) / (max - rest)));
  const pct = Math.round(ratio * 100);
  const zone =
    pct < 30 ? 'LIGHT' : pct < 60 ? 'MODERATE' : pct < 85 ? 'HARD' : 'MAX';
  return { value: `${pct}%`, zone };
}

/**
 * Bio-Metrics: BPM, Effort, Active Calories from HealthKit.
 * Static Text only—no TextInput. Always visible when Apple Health is enabled.
 */
function BioMetricsSection({
  heartRate,
  spo2,
  restingHeartRate,
  activeEnergyKcal,
  maxHeartRate,
}: {
  heartRate: number | null;
  spo2: number | null;
  restingHeartRate: number | null;
  activeEnergyKcal: number | null;
  maxHeartRate: number | null;
}) {
  const effort = computeEffort(heartRate, restingHeartRate, maxHeartRate);
  const hrDisplay = heartRate != null && heartRate > 0 ? `${heartRate} BPM` : '--';
  const effortDisplay = effort.value;
  const effortZone = effort.zone ? ` · ${effort.zone}` : '';
  const kcalDisplay = activeEnergyKcal != null && activeEnergyKcal > 0 ? `${activeEnergyKcal} kcal` : '--';
  const hasNoData = heartRate == null || heartRate === 0;

  return (
    <View style={[styles.bioSection, { minHeight: 120 }]} pointerEvents="box-none">
      <View style={styles.bioHeaderRow}>
        <Text style={styles.bioLabel}>BIO-METRICS</Text>
        <Text style={styles.bioSourceLabel}>Apple Health</Text>
      </View>
      <View style={styles.bioRow}>
        <View style={styles.bioItem} pointerEvents="none">
          <Ionicons name="heart" size={14} color={tactical.amber} />
          <Text style={styles.bioLabelSm}>BPM</Text>
          <Text style={[styles.bioValue, styles.bioValueBpm]} selectable={false}>{hrDisplay}</Text>
        </View>
        <View style={styles.bioItem} pointerEvents="none">
          <Text style={styles.bioLabelSm}>EFFORT</Text>
          <Text style={styles.bioValue} selectable={false}>{effortDisplay}{effortZone}</Text>
        </View>
        <View style={styles.bioItem} pointerEvents="none">
          <Ionicons name="flame" size={14} color={tactical.amber} />
          <Text style={styles.bioLabelSm}>ACTIVE</Text>
          <Text style={styles.bioValue} selectable={false}>{kcalDisplay}</Text>
        </View>
      </View>
      {hasNoData && (
        <Text style={styles.bioWaitingText}>Waiting for Apple Health data...</Text>
      )}
    </View>
  );
}

function TelemetryCard({
  label,
  value,
  subtext,
  glow,
}: {
  label: string;
  value: string;
  subtext?: string;
  glow?: boolean;
}) {
  return (
    <View style={[styles.telemetryCard, glow && styles.telemetryCardGlow]}>
      <Text style={styles.telemetryLabel}>{label}</Text>
      <Text style={[styles.telemetryValue, glow && styles.telemetryValueGlow]}>{value}</Text>
      {subtext ? <Text style={styles.telemetrySub}>{subtext}</Text> : null}
    </View>
  );
}

export function DashboardScreen() {
  const navigation = useNavigation();
  const {
    readinessScore,
    totalWeightKg,
    batteryPct,
    expAlerts,
    nextWp,
    location,
    altitudeM,
    distWalkedKm,
    weather,
    refresh,
  } = useDashboardData();

  const [sosProgress, setSosProgress] = React.useState(0);
  const sosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const garminBlinkOpacity = useRef(new Animated.Value(1)).current;
  const prevGarminConnected = useRef(false);

  const isGlobalEmergency = useAppStore((s) => s.isGlobalEmergency);
  const garminConnected = useGarminStore((s) => s.connected);
  const garminHeartRate = useGarminStore((s) => s.heartRate);
  const garminSpo2 = useGarminStore((s) => s.spo2);
  const garminRhr = useGarminStore((s) => s.restingHeartRate);
  const garminActiveKcal = useGarminStore((s) => s.activeEnergyKcal);
  const garminError = useGarminStore((s) => s.error);
  const [maxHeartRate, setMaxHeartRate] = React.useState<number | null>(null);
  const [appleHealthEnabled, setAppleHealthEnabled] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    refresh();
    refreshHealthData();
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, [refresh]);

  useFocusEffect(
    React.useCallback(() => {
      try {
        refresh();
        requestHealthPermissions().catch(() => {});
        SecureSettings.getMaxHeartRate().then(setMaxHeartRate).catch(() => {});
        SecureSettings.getGarminLinked().then(setAppleHealthEnabled).catch(() => {});
      } catch {
        // Never block Dashboard render
      }
      return () => {};
    }, [refresh])
  );

  useEffect(() => {
    if (garminConnected && !prevGarminConnected.current) {
      prevGarminConnected.current = true;
      Animated.sequence([
        Animated.timing(garminBlinkOpacity, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        Animated.timing(garminBlinkOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(garminBlinkOpacity, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        Animated.timing(garminBlinkOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else if (!garminConnected) {
      prevGarminConnected.current = false;
      garminBlinkOpacity.setValue(1);
    }
  }, [garminConnected, garminBlinkOpacity]);

  const isReady = readinessScore >= 100;
  const isCompromised = !isReady;
  const statusText = isReady ? 'MISSION READY' : 'MISSION COMPROMISED';
  const statusColor = isReady ? '#22c55e' : '#ef4444';

  const handleSosPressIn = () => {
    sosTimerRef.current = setInterval(() => {
      setSosProgress((p) => Math.min(1, p + 0.01));
    }, 30);
  };

  const setEmergencyOverlay = useAppStore((s) => s.setEmergencyOverlay);

  const [cancelLoading, setCancelLoading] = React.useState(false);
  const handleCancelEmergency = async () => {
    setCancelLoading(true);
    await cancelEmergencyBroadcast();
    setCancelLoading(false);
  };

  const handleSosPressOut = () => {
    if (sosTimerRef.current) {
      clearInterval(sosTimerRef.current);
      sosTimerRef.current = null;
    }
    if (sosProgress >= 1) {
      sendEmergencyBroadcast();
      navigateToMap({ centerOnUser: true });
      setEmergencyOverlay(false);
      setTimeout(() => {
        setEmergencyOverlay(true);
        setTimeout(() => setEmergencyOverlay(false), 5000);
      }, 500);
    }
    setSosProgress(0);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="never"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={tactical.amber}
          colors={[tactical.amber]}
          progressViewOffset={Platform.OS === 'android' ? 24 : 0}
        />
      }
    >
      <Text style={styles.title}>TACTICAL DASHBOARD</Text>
      <View style={styles.coordsRow}>
        {location ? (
          <Text style={styles.coordsHud}>
            LAT {location.lat.toFixed(5)} · LON {location.lon.toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.coordsHud}>LAT -- · LON --</Text>
        )}
        {garminError === 'HEALTH_ACCESS_DENIED' && (
          <Pressable
            style={styles.grantHealthBtn}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.grantHealthBtnText}>Grant Health Permissions</Text>
          </Pressable>
        )}
        {garminConnected && garminError !== 'HEALTH_ACCESS_DENIED' && (
          <Animated.View style={[styles.garminBadge, { opacity: garminBlinkOpacity }]}>
            <Text style={styles.garminText}>
              {garminHeartRate != null ? `HR: ${garminHeartRate} BPM` : 'FNX8_VIA_HEALTH'}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.gaugeSection}>
        <ReadinessGauge score={readinessScore} isCompromised={isCompromised} />
        <StatusBadge isCompromised={isCompromised} statusText={statusText} statusColor={statusColor} />
      </View>

      <View style={styles.telemetryGrid}>
        <TelemetryCard
          label="PKG_WT"
          value={`${totalWeightKg.toFixed(1)} KG`}
          glow={totalWeightKg >= 15}
        />
        <TelemetryCard
          label="BATT_STAT"
          value={batteryPct != null ? `${batteryPct}%` : '--'}
          subtext={batteryPct != null && batteryPct <= 20 ? 'LOW' : undefined}
          glow={batteryPct != null && batteryPct <= 20}
        />
        <TelemetryCard
          label="EXP_ALERTS"
          value={expAlerts > 0 ? `${expAlerts} WARNINGS` : '0'}
          glow={expAlerts > 0}
        />
        <TelemetryCard
          label="NEXT_WP"
          value={
            nextWp
              ? `${nextWp.km.toFixed(1)} km · ${Math.round(nextWp.bearing)}° ${bearingToCardinal(nextWp.bearing)}`
              : '--'
          }
          subtext={nextWp ? nextWp.name : undefined}
        />
        <TelemetryCard
          label="ALT"
          value={altitudeM != null ? `${altitudeM} m` : '--'}
        />
        <TelemetryCard
          label="DIST_WALKED"
          value={distWalkedKm != null ? `${distWalkedKm} km` : '--'}
        />
      </View>

      {weather && (
        <View style={styles.envSection}>
          <Text style={styles.envLabel}>ENV</Text>
          <Text style={styles.envValue}>
            {weather.tempC}°C · {weather.windKmh} km/h wind
          </Text>
        </View>
      )}

      {(appleHealthEnabled || garminConnected) && garminError !== 'HEALTH_ACCESS_DENIED' && (
        <BioMetricsSection
          heartRate={garminHeartRate}
          spo2={garminSpo2}
          restingHeartRate={garminRhr}
          activeEnergyKcal={garminActiveKcal}
          maxHeartRate={maxHeartRate}
        />
      )}

      {isGlobalEmergency && (
        <Pressable
          style={styles.cancelEmergencyBtn}
          onPress={handleCancelEmergency}
          disabled={cancelLoading}
        >
          <Ionicons name="close" size={20} color={tactical.black} />
          <Text style={styles.cancelEmergencyText}>
            {cancelLoading ? 'CANCELLING…' : 'CANCEL EMERGENCY'}
          </Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.sosBtn, sosProgress >= 1 && styles.sosBtnActive]}
        onPressIn={handleSosPressIn}
        onPressOut={handleSosPressOut}
      >
        <View style={[styles.sosProgress, { width: `${sosProgress * 100}%` }]} />
        <View style={styles.sosContent}>
          <Ionicons name="warning" size={24} color={sosProgress >= 1 ? tactical.black : '#ef4444'} />
          <View>
            <Text style={[styles.sosText, sosProgress >= 1 && styles.sosTextActive]}>
              EMERGENCY BROADCAST
            </Text>
            <Text style={styles.sosHint}>Hold 3 seconds to activate</Text>
          </View>
        </View>
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tactical.black },
  content: { padding: 16, paddingBottom: 48 },
  title: {
    color: tactical.amber,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  garminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: tactical.amber,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  grantHealthBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: tactical.amber,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  grantHealthBtnText: {
    color: tactical.black,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  garminBadgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  garminBadgeErrorText: {
    color: tactical.black,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  garminText: {
    color: tactical.black,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  coordsHud: {
    color: tactical.zinc[500],
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  gaugeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gaugeWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  gaugeLabel: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  gaugeTitle: {
    color: tactical.zinc[500],
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 191, 0, 0.15)',
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  statusCompromised: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  telemetryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  telemetryCardGlow: {
    borderColor: tactical.amber,
    shadowColor: tactical.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  telemetryLabel: {
    color: tactical.zinc[500],
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  telemetryValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  telemetryValueGlow: {
    color: tactical.amber,
    textShadowColor: tactical.amber,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  telemetrySub: {
    color: tactical.zinc[500],
    fontSize: 11,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  envSection: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    marginBottom: 24,
  },
  bioSection: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
    marginBottom: 24,
  },
  bioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bioLabel: {
    color: tactical.zinc[500],
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bioSourceLabel: {
    color: tactical.amber,
    fontSize: 9,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bioWaitingText: {
    color: tactical.zinc[500],
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  bioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bioLabelSm: {
    color: tactical.zinc[500],
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bioValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bioValueSpo2Low: {
    color: '#ef4444',
  },
  bioValueBpm: {
    color: '#ff00ff',
  },
  bioO2Icon: {
    color: tactical.amber,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  bioAlert: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  envLabel: {
    color: tactical.zinc[500],
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  envValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sosBtn: {
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: tactical.zinc[700],
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  sosBtnActive: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  sosProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  sosContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  sosText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sosTextActive: {
    color: tactical.black,
  },
  sosHint: {
    color: tactical.zinc[500],
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cancelEmergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: tactical.amber,
    marginBottom: 16,
  },
  cancelEmergencyText: {
    color: tactical.black,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
