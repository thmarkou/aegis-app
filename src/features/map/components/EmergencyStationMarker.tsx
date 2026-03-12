/**
 * High-priority tactical emergency marker: large red diamond, radar-style pulsing halo,
 * bold amber label on black background. Designed for immediate visual identification.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Callout } from 'react-native-maps';
import { tactical } from '../../../shared/tacticalStyles';

const HALO_COLOR = '#FF0000';
const HALO_RADIUS = 80;
const ICON_SIZE = 40;

type Station = {
  id: string;
  callsign: string;
  ssid: number;
  lat: number;
  lon: number;
};

export function EmergencyStationMarker({
  station,
  shouldPulse,
}: {
  station: Station;
  shouldPulse: boolean;
}) {
  const scaleRef = useRef(new Animated.Value(1)).current;
  const opacityRef = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!shouldPulse) {
      scaleRef.setValue(1);
      opacityRef.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleRef, {
            toValue: 2.5,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityRef, {
            toValue: 0.2,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleRef, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(opacityRef, {
            toValue: 0.85,
            duration: 80,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shouldPulse, scaleRef, opacityRef]);

  return (
    <>
      <View style={styles.wrapper}>
        {/* Label: bold amber on black, placed high above marker */}
        <View style={styles.labelTag}>
          <Text style={styles.labelText}>{station.callsign}-{station.ssid}</Text>
        </View>
        {/* Halo + diamond: halo centered behind diamond */}
        <View style={styles.iconContainer}>
          <Animated.View
            style={[
              styles.halo,
              {
                transform: [{ scale: scaleRef }],
                opacity: opacityRef,
              },
            ]}
            pointerEvents="none"
          />
          <View style={styles.diamond} />
        </View>
      </View>
      <Callout>
        <View style={styles.calloutContent}>
          <Text style={styles.calloutTitle}>🚨 {station.callsign}-{station.ssid}</Text>
          <Text style={styles.calloutCoords}>Lat: {station.lat.toFixed(5)}</Text>
          <Text style={styles.calloutCoords}>Lon: {station.lon.toFixed(5)}</Text>
        </View>
      </Callout>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    zIndex: 999999,
    paddingBottom: 6,
    overflow: 'visible',
  },
  labelTag: {
    backgroundColor: tactical.black,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  labelText: {
    color: tactical.amber,
    fontSize: 18,
    fontWeight: '700',
  },
  iconContainer: {
    width: HALO_RADIUS * 2,
    height: HALO_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  halo: {
    position: 'absolute',
    width: HALO_RADIUS * 2,
    height: HALO_RADIUS * 2,
    borderRadius: HALO_RADIUS,
    backgroundColor: HALO_COLOR,
  },
  diamond: {
    width: ICON_SIZE / Math.SQRT2,
    height: ICON_SIZE / Math.SQRT2,
    backgroundColor: HALO_COLOR,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  calloutContent: {
    padding: 8,
    minWidth: 140,
  },
  calloutTitle: {
    color: tactical.amber,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutCoords: {
    color: tactical.zinc[400],
    fontSize: 12,
  },
});
